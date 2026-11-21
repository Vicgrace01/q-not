import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const COOKIE_NAME = "qnot_session";
const SESSION_TTL_DAYS = 30;

function sign(value: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(value).digest("hex");
}

const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;
type SessionRole = "operator" | "commuter" | "driver";

function createRoleToken(id: string, role: SessionRole): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${role}:${id}:${issuedAt}:${expiresAt}:${nonce}`;
  return `${id}.${issuedAt}.${expiresAt}.${nonce}.${sign(payload)}`;
}

export function createSessionToken(operatorId: string): string {
  return createRoleToken(operatorId, "operator");
}

function verifySessionToken(token: string, role: SessionRole): string | null {
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [id, issuedAtRaw, expiresAtRaw, nonce, supplied] = parts;
  if (!id || !/^\d+$/.test(issuedAtRaw) || !/^\d+$/.test(expiresAtRaw) || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(supplied)) return null;
  const issuedAt = Number(issuedAtRaw);
  const expiresAt = Number(expiresAtRaw);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)
    || issuedAt > now + 60 || expiresAt <= now || expiresAt <= issuedAt
    || expiresAt - issuedAt > SESSION_TTL_SECONDS) return null;
  const expected = sign(`${role}:${id}:${issuedAt}:${expiresAt}:${nonce}`);
  const a = Buffer.from(supplied, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export async function setSessionCookie(operatorId: string): Promise<void> {
  const token = createRoleToken(operatorId, "operator");
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
  return verifySessionToken(token, "operator");
}

// ---------- Commuter sessions ----------
// Separate cookie name so operator and commuter sessions can coexist.
// See DECISIONS.md ADR-014 (multi-role sessions).

const COMMUTER_COOKIE = "qnot_commuter";

export async function setCommuterCookie(commuterId: string): Promise<void> {
  const token = createRoleToken(commuterId, "commuter");
  const jar = await cookies();
  jar.set(COMMUTER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearCommuterCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COMMUTER_COOKIE);
}

export async function getCommuterId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COMMUTER_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, "commuter");
}

// Driver sessions use an independent cookie so one account may hold more than
// one product role without overwriting its passenger or operator session.
const DRIVER_COOKIE = "qnot_driver";

export async function setDriverCookie(driverId: string): Promise<void> {
  const token = createRoleToken(driverId, "driver");
  const jar = await cookies();
  jar.set(DRIVER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearDriverCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(DRIVER_COOKIE);
}

export async function getDriverId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(DRIVER_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, "driver");
}
