import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const COOKIE_NAME = "qnot_session";
const SESSION_TTL_DAYS = 30;

function sign(value: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(value).digest("hex");
}

export function createSessionToken(operatorId: string): string {
  const sig = sign(operatorId);
  return `${operatorId}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [operatorId, sig] = parts;
  if (!operatorId || !sig) return null;

  const expected = sign(operatorId);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  return operatorId;
}

export async function setSessionCookie(operatorId: string): Promise<void> {
  const token = createSessionToken(operatorId);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionOperatorId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
