import { randomInt, createHash } from "crypto";

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;

/**
 * In-memory OTP store.
 * v1: process-local. Restart clears all pending codes.
 * v2: move to DB (table: OtpChallenge) so restarts and multi-instance
 * deploys don't break login. Documented in DECISIONS.md.
 */
type OtpEntry = {
  code: string;
  expiresAt: number;
  attempts: number;
};

const store = new Map<string, OtpEntry>();

function hashPhone(phone: string): string {
  // Don't store the phone in memory in plain form; store a hash.
  return createHash("sha256").update(phone).digest("hex");
}

function generateCode(): string {
  let out = "";
  for (let i = 0; i < OTP_LENGTH; i += 1) {
    out += String(randomInt(0, 10));
  }
  return out;
}

/**
 * Create an OTP for a phone number. Returns the plain code so the caller
 * can log it (v1) or send it via SMS (v2).
 */
export function createOtp(phone: string): { code: string; expiresAt: Date } {
  const code = generateCode();
  const expiresAt = Date.now() + OTP_TTL_MINUTES * 60 * 1000;
  store.set(hashPhone(phone), { code, expiresAt, attempts: 0 });
  return { code, expiresAt: new Date(expiresAt) };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "wrong" | "too-many-attempts" | "not-found" };

export function verifyOtp(phone: string, code: string): VerifyResult {
  const key = hashPhone(phone);
  const entry = store.get(key);
  if (!entry) return { ok: false, reason: "not-found" };

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return { ok: false, reason: "expired" };
  }

  if (entry.attempts >= 5) {
    store.delete(key);
    return { ok: false, reason: "too-many-attempts" };
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    return { ok: false, reason: "wrong" };
  }

  store.delete(key);
  return { ok: true };
}
