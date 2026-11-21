import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { setCommuterCookie, setSessionCookie, setDriverCookie } from "@/lib/session";

export const runtime = "nodejs";
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function failure(request: NextRequest, role: string, reason: string) {
  const path = role === "operator" ? "/login" : role === "driver" ? "/driver/login" : "/c/login";
  return NextResponse.redirect(new URL(`${path}?error=${encodeURIComponent(reason)}`, request.url));
}

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const rawRole = jar.get("qnot_google_role")?.value;
  const role = rawRole === "operator" || rawRole === "driver" ? rawRole : "passenger";
  const expectedState = jar.get("qnot_google_state")?.value;
  const expectedNonce = jar.get("qnot_google_nonce")?.value;
  const codeVerifier = jar.get("qnot_google_pkce")?.value;
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");

  const clearOAuthCookies = () => {
    jar.delete("qnot_google_state");
    jar.delete("qnot_google_nonce");
    jar.delete("qnot_google_role");
    jar.delete("qnot_google_pkce");
  };

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !expectedState || !expectedNonce || !codeVerifier || !state || state !== expectedState || !code) {
    clearOAuthCookies();
    return failure(request, role, "google-verification-failed");
  }

  let stage = "Google token exchange";
  try {
    const callbackUrl = new URL("/api/auth/google/callback", env.NEXT_PUBLIC_APP_URL).toString();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!tokenResponse.ok) throw new Error("Google token exchange failed");
    const tokenPayload = await tokenResponse.json() as { id_token?: string };
    if (!tokenPayload.id_token) throw new Error("Google did not return an identity token");

    stage = "Google identity verification";
    const verified = await jwtVerify(tokenPayload.id_token, googleJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: env.GOOGLE_CLIENT_ID,
    });
    const claims = verified.payload;
    if (claims.nonce !== expectedNonce || claims.email_verified !== true || typeof claims.sub !== "string" || typeof claims.email !== "string") {
      throw new Error("Google identity claims were incomplete or not verified");
    }

    const email = claims.email.toLowerCase().trim();
    const displayName = typeof claims.name === "string" ? claims.name : email.split("@")[0];

    stage = "Q-not account lookup and session creation";

    if (role === "driver") {
      const existingIdentity = await prisma.authIdentity.findUnique({
        where: { provider_providerAccountId_role: { provider: "GOOGLE", providerAccountId: claims.sub, role: "DRIVER" } },
        select: { driverId: true },
      });
      let driver = existingIdentity?.driverId
        ? await prisma.driver.findUnique({ where: { id: existingIdentity.driverId } })
        : await prisma.driver.findUnique({ where: { email } });
      if (!driver) {
        driver = await prisma.driver.create({ data: { name: displayName, email, phone: null, emailVerifiedAt: new Date() } });
      } else {
        driver = await prisma.driver.update({ where: { id: driver.id }, data: { emailVerifiedAt: driver.emailVerifiedAt ?? new Date(), name: driver.name === "Driver profile pending" ? displayName : driver.name } });
      }
      await prisma.authIdentity.upsert({
        where: { provider_providerAccountId_role: { provider: "GOOGLE", providerAccountId: claims.sub, role: "DRIVER" } },
        update: { email, driverId: driver.id, operatorId: null, commuterId: null },
        create: { provider: "GOOGLE", providerAccountId: claims.sub, role: "DRIVER", email, driverId: driver.id },
      });
      await setDriverCookie(driver.id);
      clearOAuthCookies();
      return NextResponse.redirect(new URL(!driver.licenceExpiry || driver.name === "Driver profile pending" ? "/driver/onboarding" : "/driver/dashboard", request.url));
    }

    if (role === "operator") {
      const existingIdentity = await prisma.authIdentity.findUnique({
        where: { provider_providerAccountId_role: { provider: "GOOGLE", providerAccountId: claims.sub, role: "OPERATOR" } },
        select: { operatorId: true },
      });
      let operator = existingIdentity?.operatorId
        ? await prisma.operator.findUnique({ where: { id: existingIdentity.operatorId } })
        : await prisma.operator.findUnique({ where: { email } });
      if (!operator) {
        operator = await prisma.operator.create({
          data: { name: `${displayName}'s transport`, email, phone: null, passwordHash: null, emailVerifiedAt: new Date() },
        });
      } else if (!operator.emailVerifiedAt) {
        operator = await prisma.operator.update({ where: { id: operator.id }, data: { emailVerifiedAt: new Date() } });
      }
      await prisma.authIdentity.upsert({
        where: { provider_providerAccountId_role: { provider: "GOOGLE", providerAccountId: claims.sub, role: "OPERATOR" } },
        update: { email, operatorId: operator.id, commuterId: null, driverId: null },
        create: { provider: "GOOGLE", providerAccountId: claims.sub, role: "OPERATOR", email, operatorId: operator.id },
      });
      await setSessionCookie(operator.id);
      clearOAuthCookies();
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const existingIdentity = await prisma.authIdentity.findUnique({
      where: { provider_providerAccountId_role: { provider: "GOOGLE", providerAccountId: claims.sub, role: "PASSENGER" } },
      select: { commuterId: true },
    });
    let commuter = existingIdentity?.commuterId
      ? await prisma.commuter.findUnique({ where: { id: existingIdentity.commuterId } })
      : await prisma.commuter.findUnique({ where: { email } });
    if (!commuter) {
      commuter = await prisma.commuter.create({ data: { email, emailVerifiedAt: new Date(), displayName } });
    } else {
      commuter = await prisma.commuter.update({
        where: { id: commuter.id },
        data: { emailVerifiedAt: commuter.emailVerifiedAt ?? new Date(), displayName: commuter.displayName ?? displayName },
      });
    }
    await prisma.authIdentity.upsert({
      where: { provider_providerAccountId_role: { provider: "GOOGLE", providerAccountId: claims.sub, role: "PASSENGER" } },
      update: { email, commuterId: commuter.id, operatorId: null, driverId: null },
      create: { provider: "GOOGLE", providerAccountId: claims.sub, role: "PASSENGER", email, commuterId: commuter.id },
    });
    await setCommuterCookie(commuter.id);
    clearOAuthCookies();
    return NextResponse.redirect(new URL("/c/dashboard", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`Q-not Google sign-in failed during ${stage}:`, message);
    clearOAuthCookies();
    const databaseUnavailable = stage.includes("account") && /timeout|terminated|connection|P1001|P1008|ECONN/i.test(message);
    const googleUnavailable = stage.startsWith("Google") && /timeout|network|fetch|socket|TLS|ECONN|terminated/i.test(message);
    return failure(
      request,
      role,
      databaseUnavailable
        ? "account-service-unavailable"
        : googleUnavailable
          ? "google-service-unavailable"
          : "google-sign-in-failed",
    );
  }
}
