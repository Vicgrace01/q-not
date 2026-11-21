import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestedRole = request.nextUrl.searchParams.get("role");
  const role = requestedRole === "operator" || requestedRole === "driver" ? requestedRole : "passenger";
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    const path = role === "operator" ? "/login" : role === "driver" ? "/driver/login" : "/c/login";
    return NextResponse.redirect(new URL(`${path}?error=google-not-configured`, request.url));
  }

  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const jar = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  jar.set("qnot_google_state", state, cookieOptions);
  jar.set("qnot_google_nonce", nonce, cookieOptions);
  jar.set("qnot_google_role", role, cookieOptions);
  jar.set("qnot_google_pkce", codeVerifier, cookieOptions);

  const callbackUrl = new URL("/api/auth/google/callback", env.NEXT_PUBLIC_APP_URL).toString();
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return NextResponse.redirect(authorize);
}
