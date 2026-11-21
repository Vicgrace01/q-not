"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { normaliseNigerianPhone, requestEmailCode, requestPhoneCode, verifyLoginCode } from "@/lib/otp/persistent";

export async function updatePassengerProfileAction(formData: FormData): Promise<void> {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login");
  const parsed = z.object({
    displayName: z.string().trim().min(2).max(80),
    emergencyContactName: z.string().trim().max(80).optional(),
    emergencyContactPhone: z.string().trim().max(25).optional(),
  }).safeParse({
    displayName: formData.get("displayName"),
    emergencyContactName: formData.get("emergencyContactName") ?? "",
    emergencyContactPhone: formData.get("emergencyContactPhone") ?? "",
  });
  if (!parsed.success) redirect("/c/profile?error=profile-details");
  let emergencyContactPhone: string | null = null;
  if (parsed.data.emergencyContactPhone) {
    try { emergencyContactPhone = normaliseNigerianPhone(parsed.data.emergencyContactPhone); }
    catch { redirect("/c/profile?error=emergency-phone"); }
  }
  await prisma.commuter.update({
    where: { id: commuterId },
    data: {
      displayName: parsed.data.displayName,
      emergencyContactName: parsed.data.emergencyContactName || null,
      emergencyContactPhone,
    },
  });
  revalidatePath("/c/profile");
  revalidatePath("/c/dashboard");
  redirect("/c/profile?saved=1");
}

export async function requestPassengerEmailLinkAction(formData: FormData): Promise<void> {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login");
  const parsed = z.string().email().max(254).safeParse(formData.get("email"));
  if (!parsed.success) redirect("/c/profile?error=email-invalid");
  const email = parsed.data.toLowerCase().trim();
  const existing = await prisma.commuter.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== commuterId) redirect("/c/profile?error=email-in-use");
  try {
    await requestEmailCode(email, "PASSENGER_EMAIL_LINK");
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Email verification could not start.";
    redirect(`/c/profile?error=${encodeURIComponent(reason.slice(0, 120))}`);
  }
  redirect(`/c/profile?emailSent=1&email=${encodeURIComponent(email)}`);
}

export async function verifyPassengerEmailLinkAction(formData: FormData): Promise<void> {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login");
  const parsed = z.object({ email: z.string().email().max(254), code: z.string().regex(/^\d{6}$/) }).safeParse({
    email: formData.get("email"), code: formData.get("code"),
  });
  if (!parsed.success) redirect("/c/profile?error=email-code");
  const email = parsed.data.email.toLowerCase().trim();
  const result = await verifyLoginCode(email, "PASSENGER_EMAIL_LINK", parsed.data.code);
  if (!result.ok) redirect(`/c/profile?emailSent=1&email=${encodeURIComponent(email)}&error=${result.reason}`);
  const conflict = await prisma.commuter.findUnique({ where: { email }, select: { id: true } });
  if (conflict && conflict.id !== commuterId) redirect("/c/profile?error=email-in-use");
  try {
    await prisma.commuter.update({ where: { id: commuterId }, data: { email, emailVerifiedAt: new Date() } });
  } catch {
    redirect("/c/profile?error=email-in-use");
  }
  revalidatePath("/c/profile");
  revalidatePath("/c/dashboard");
  revalidatePath("/c/q-funds");
  redirect("/c/profile?emailLinked=1");
}


export async function requestPassengerPhoneLinkAction(formData: FormData): Promise<void> {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login");
  const parsed = z.string().min(7).max(25).safeParse(formData.get("phone"));
  if (!parsed.success) redirect("/c/profile?error=phone-invalid");
  let phone: string;
  try { phone = normaliseNigerianPhone(parsed.data); } catch { redirect("/c/profile?error=phone-invalid"); }
  const existing = await prisma.commuter.findUnique({ where: { phone }, select: { id: true } });
  if (existing && existing.id !== commuterId) redirect("/c/profile?error=phone-in-use");
  try { await requestPhoneCode(phone, "PASSENGER_PHONE_LINK"); }
  catch (error) { const reason = error instanceof Error ? error.message : "Phone verification could not start."; redirect(`/c/profile?error=${encodeURIComponent(reason.slice(0, 120))}`); }
  redirect(`/c/profile?phoneSent=1&phone=${encodeURIComponent(phone)}`);
}

export async function verifyPassengerPhoneLinkAction(formData: FormData): Promise<void> {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login");
  const parsed = z.object({ phone: z.string().min(7), code: z.string().regex(/^\d{6}$/) }).safeParse({ phone: formData.get("phone"), code: formData.get("code") });
  if (!parsed.success) redirect("/c/profile?error=phone-code");
  let phone: string;
  try { phone = normaliseNigerianPhone(parsed.data.phone); } catch { redirect("/c/profile?error=phone-invalid"); }
  const result = await verifyLoginCode(phone, "PASSENGER_PHONE_LINK", parsed.data.code);
  if (!result.ok) redirect(`/c/profile?phoneSent=1&phone=${encodeURIComponent(phone)}&error=${result.reason}`);
  const existing = await prisma.commuter.findUnique({ where: { phone }, select: { id: true } });
  if (existing && existing.id !== commuterId) redirect("/c/profile?error=phone-in-use");
  try { await prisma.commuter.update({ where: { id: commuterId }, data: { phone, phoneVerifiedAt: new Date() } }); }
  catch { redirect("/c/profile?error=phone-in-use"); }
  revalidatePath("/c/profile");
  revalidatePath("/c/dashboard");
  redirect("/c/profile?phoneLinked=1");
}
