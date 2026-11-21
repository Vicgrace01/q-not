import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

type Purpose = "PASSENGER_LOGIN" | "DRIVER_LOGIN" | "PASSENGER_EMAIL_LOGIN" | "DRIVER_EMAIL_LOGIN" | "PASSENGER_EMAIL_LINK" | "PASSENGER_PHONE_LINK" | "DRIVER_PHONE_LINK" | "DRIVER_EMAIL_LINK";
type Channel = "SMS" | "EMAIL";
type Provider = "TERMII" | "RESEND" | "LOCAL";

const OTP_TTL_MINUTES = 10;
const MAX_REQUESTS_PER_WINDOW = 4;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function otpHash(identifier: string, purpose: Purpose, code: string): string {
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`${purpose}:${identifier}:${code}`)
    .digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normaliseNigerianPhone(input: string): string {
  const compact = input.trim().replace(/[\s()-]/g, "");
  const digits = compact.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;
  if (compact.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  throw new Error("Enter a valid phone number with country code, e.g. +234...");
}

function termiiPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

type ChallengeInput = {
  identifier: string;
  purpose: Purpose;
  channel: Channel;
  provider: Provider;
  codeHash?: string;
  expiresAt: Date;
  consumedAt?: Date;
};

// Serialize code requests per identifier + purpose. This keeps the request
// limit correct even when two requests arrive at the same time.
async function createRateLimitedChallenge(input: ChallengeInput) {
  return prisma.$transaction(async (tx) => {
    const lockKey = `qnot-otp:${input.purpose}:${input.identifier}`;
    await tx.$queryRaw<Array<{ acquired: number }>>`
      WITH advisory_lock AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
      )
      SELECT 1::int AS acquired
      FROM advisory_lock
    `;
    const since = new Date(Date.now() - RATE_WINDOW_MS);
    const count = await tx.otpChallenge.count({
      where: { identifier: input.identifier, purpose: input.purpose, createdAt: { gte: since } },
    });
    if (count >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error("Too many code requests. Please wait 15 minutes and try again.");
    }
    await tx.otpChallenge.updateMany({
      where: { identifier: input.identifier, purpose: input.purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return tx.otpChallenge.create({ data: input });
  });
}

async function sendTermiiOtp(phone: string, code: string): Promise<string> {
  if (!env.TERMII_API_KEY || !env.TERMII_SENDER_ID) {
    throw new Error("Phone verification is not configured. Add the Termii API key and approved sender ID.");
  }
  const baseUrl = (env.TERMII_BASE_URL ?? "https://api.ng.termii.com").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/sms/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.TERMII_API_KEY,
      to: termiiPhone(phone),
      from: env.TERMII_SENDER_ID,
      sms: `Your Q-not verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share this code.`,
      type: "plain",
      channel: env.TERMII_CHANNEL,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const payload = (await response.json().catch(() => ({}))) as { code?: string; message?: string; message_id?: string };
  if (!response.ok || (payload.code && payload.code !== "ok")) {
    throw new Error(payload.message ?? "The SMS provider could not send a code. Try again shortly.");
  }
  return payload.message_id ?? "accepted";
}

async function sendResendOtp(email: string, code: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    throw new Error("Email verification is not configured. Add the Resend API key and verified sender address.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      subject: "Your Q-not sign-in code",
      text: `Your Q-not sign-in code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share this code.`,
      html: `<div style="font-family:Arial,sans-serif"><h2>Sign in to Q-not</h2><p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in ${OTP_TTL_MINUTES} minutes. Do not share it.</p></div>`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email delivery failed${detail ? `: ${detail.slice(0, 180)}` : "."}`);
  }
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function requestPhoneCode(rawPhone: string, purpose: Purpose) {
  const phone = normaliseNigerianPhone(rawPhone);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  if (env.TERMII_API_KEY && env.TERMII_SENDER_ID) {
    const code = generateCode();
    const challenge = await createRateLimitedChallenge({
      identifier: phone, purpose, channel: "SMS", provider: "TERMII",
      codeHash: otpHash(phone, purpose, code), expiresAt,
    });
    try {
      await sendTermiiOtp(phone, code);
      return { identifier: phone, expiresAt, delivery: "SMS" as const };
    } catch (error) {
      await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      throw error;
    }
  }

  if (env.NODE_ENV === "production") {
    await createRateLimitedChallenge({
      identifier: phone, purpose, channel: "SMS", provider: "LOCAL", expiresAt, consumedAt: new Date(),
    });
    throw new Error("Phone verification is unavailable. The SMS provider has not been configured.");
  }

  const code = generateCode();
  await createRateLimitedChallenge({
    identifier: phone, purpose, channel: "SMS", provider: "LOCAL",
    codeHash: otpHash(phone, purpose, code), expiresAt,
  });
  console.info(`[Q-not local OTP] ${purpose} ${phone.slice(0, 4)}••••${phone.slice(-2)}: ${code}`);
  return { identifier: phone, expiresAt, delivery: "LOCAL" as const };
}

export async function requestEmailCode(rawEmail: string, purpose: Purpose = "PASSENGER_EMAIL_LOGIN") {
  const email = rawEmail.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const code = generateCode();
  const provider: Provider = env.RESEND_API_KEY && env.RESEND_FROM_EMAIL ? "RESEND" : "LOCAL";
  if (provider === "LOCAL" && env.NODE_ENV === "production") {
    await createRateLimitedChallenge({
      identifier: email, purpose, channel: "EMAIL", provider, expiresAt, consumedAt: new Date(),
    });
    throw new Error("Email verification is unavailable. The email provider has not been configured.");
  }
  const challenge = await createRateLimitedChallenge({
    identifier: email, purpose, channel: "EMAIL", provider,
    codeHash: otpHash(email, purpose, code), expiresAt,
  });
  if (provider === "RESEND") {
    try {
      await sendResendOtp(email, code);
    } catch (error) {
      await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      throw error;
    }
  } else {
    const [localPart, domain] = email.split("@");
    const masked = `${localPart.slice(0, 2)}•••@${domain}`;
    console.info(`[Q-not local email OTP] ${masked}: ${code}`);
  }
  return { identifier: email, expiresAt, delivery: provider === "RESEND" ? "EMAIL" as const : "LOCAL" as const };
}

export async function verifyLoginCode(identifierInput: string, purpose: Purpose, code: string) {
  const identifier = ["PASSENGER_EMAIL_LOGIN", "DRIVER_EMAIL_LOGIN", "PASSENGER_EMAIL_LINK", "DRIVER_EMAIL_LINK"].includes(purpose)
    ? identifierInput.trim().toLowerCase()
    : normaliseNigerianPhone(identifierInput);

  const challenge = await prisma.otpChallenge.findFirst({
    where: { identifier, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return { ok: false as const, reason: "not-found" as const };
  if (challenge.expiresAt.getTime() < Date.now()) {
    await prisma.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
    return { ok: false as const, reason: "expired" as const };
  }
  if (challenge.attempts >= 5) {
    await prisma.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
    return { ok: false as const, reason: "too-many-attempts" as const };
  }

  let verified = false;
  if (challenge.codeHash) {
    verified = safeEqualHex(challenge.codeHash, otpHash(identifier, purpose, code));
  }

  if (!verified) {
    const attempts = challenge.attempts + 1;
    const changed = await prisma.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, attempts: challenge.attempts },
      data: { attempts, ...(attempts >= 5 ? { consumedAt: new Date() } : {}) },
    });
    if (changed.count !== 1) return { ok: false as const, reason: "not-found" as const };
    return { ok: false as const, reason: attempts >= 5 ? "too-many-attempts" as const : "wrong" as const };
  }

  const consumed = await prisma.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 5 } },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) return { ok: false as const, reason: "not-found" as const };
  return { ok: true as const, identifier };
}
