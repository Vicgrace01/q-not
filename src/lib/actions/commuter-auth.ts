"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requestEmailCode, requestPhoneCode, verifyLoginCode, normaliseNigerianPhone } from "@/lib/otp/persistent";
import { setCommuterCookie } from "@/lib/session";

export type CommuterAuthState = {
  error?: string;
  phone?: string;
  email?: string;
  delivery?: "SMS" | "EMAIL" | "LOCAL";
};

export async function requestOtpAction(
  _prev: CommuterAuthState | undefined,
  formData: FormData,
): Promise<CommuterAuthState> {
  const parsed = z.string().min(7).max(25).safeParse(formData.get("phone"));
  if (!parsed.success) return { error: "Enter a valid phone number." };
  try {
    const result = await requestPhoneCode(parsed.data, "PASSENGER_LOGIN");
    return { phone: result.identifier, delivery: result.delivery };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "We could not send your code. Try again." };
  }
}

export async function verifyOtpAction(
  _prev: CommuterAuthState | undefined,
  formData: FormData,
): Promise<CommuterAuthState> {
  const parsed = z.object({ phone: z.string().min(7), code: z.string().regex(/^\d{6}$/) }).safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: "Enter the six-digit code." };

  try {
    const result = await verifyLoginCode(parsed.data.phone, "PASSENGER_LOGIN", parsed.data.code);
    if (!result.ok) return { error: otpError(result.reason), phone: parsed.data.phone };
    const phone = normaliseNigerianPhone(parsed.data.phone);
    const commuter = await prisma.commuter.upsert({
      where: { phone },
      update: { phoneVerifiedAt: new Date() },
      create: { phone, phoneVerifiedAt: new Date() },
    });
    await setCommuterCookie(commuter.id);
    redirect("/c/dashboard");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : "We could not verify that code." };
  }
}

export async function requestEmailOtpAction(
  _prev: CommuterAuthState | undefined,
  formData: FormData,
): Promise<CommuterAuthState> {
  const parsed = z.string().email().max(254).safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  try {
    const result = await requestEmailCode(parsed.data);
    return { email: result.identifier, delivery: result.delivery };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "We could not send your email code." };
  }
}

export async function verifyEmailOtpAction(
  _prev: CommuterAuthState | undefined,
  formData: FormData,
): Promise<CommuterAuthState> {
  const parsed = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) }).safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { error: "Enter the six-digit code." };
  try {
    const email = parsed.data.email.toLowerCase().trim();
    const result = await verifyLoginCode(email, "PASSENGER_EMAIL_LOGIN", parsed.data.code);
    if (!result.ok) return { error: otpError(result.reason), email };
    const commuter = await prisma.commuter.upsert({
      where: { email },
      update: { emailVerifiedAt: new Date() },
      create: { email, emailVerifiedAt: new Date() },
    });
    await setCommuterCookie(commuter.id);
    redirect("/c/dashboard");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : "We could not verify that code." };
  }
}

function otpError(reason: string): string {
  const messages: Record<string, string> = {
    expired: "That code has expired. Request a new one.",
    wrong: "That code is not correct. Try again.",
    "too-many-attempts": "Too many attempts. Request a new code.",
    "not-found": "No active code was found. Request a new one.",
  };
  return messages[reason] ?? "We could not verify that code.";
}

// Next redirects are control-flow exceptions and must not be converted to form errors.
function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export async function commuterLogoutAction(): Promise<void> {
  const { clearCommuterCookie } = await import("@/lib/session");
  await clearCommuterCookie();
  redirect("/c/login");
}
