"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createOtp, verifyOtp } from "@/lib/otp";
import { setCommuterCookie } from "@/lib/session";

export type CommuterAuthState = {
  error?: string;
  phone?: string;
  devCode?: string; // v1: shown in the UI so we can test without SMS
};

const PhoneSchema = z
  .string()
  .min(7, "Phone too short")
  .max(20, "Phone too long")
  .regex(/^\+?[0-9\s-]+$/, "Invalid phone format");

export async function requestOtpAction(
  _prev: CommuterAuthState | undefined,
  formData: FormData,
): Promise<CommuterAuthState> {
  const parsed = PhoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const phone = parsed.data.replace(/[\s-]/g, "");
  const { code } = createOtp(phone);

  // v1: log to server console AND return to UI so we can test without SMS.
  // v2: send via SMS provider behind an OtpAdapter. Remove devCode.
  console.log(`[OTP] ${phone} → ${code}`);

  return { phone, devCode: code };
}

const VerifySchema = z.object({
  phone: z.string().min(7),
  code: z.string().length(6),
});

export async function verifyOtpAction(
  _prev: CommuterAuthState | undefined,
  formData: FormData,
): Promise<CommuterAuthState> {
  const parsed = VerifySchema.safeParse({
    phone: formData.get("phone"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { error: "Invalid code format" };
  }

  const result = verifyOtp(parsed.data.phone, parsed.data.code);
  if (!result.ok) {
    const messages: Record<string, string> = {
      expired: "Code expired. Request a new one.",
      wrong: "Wrong code. Try again.",
      "too-many-attempts": "Too many attempts. Request a new code.",
      "not-found": "No pending code for that number. Request one first.",
    };
    return { error: messages[result.reason], phone: parsed.data.phone };
  }

  // Upsert commuter by phone.
  const commuter = await prisma.commuter.upsert({
    where: { phone: parsed.data.phone },
    update: {},
    create: { phone: parsed.data.phone },
  });

  await setCommuterCookie(commuter.id);
  redirect("/");
}

export async function commuterLogoutAction(): Promise<void> {
  const { clearCommuterCookie } = await import("@/lib/session");
  await clearCommuterCookie();
  redirect("/c/login");
}
