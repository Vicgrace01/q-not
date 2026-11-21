import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { reconcileExpiredTripPayments } from "@/lib/payments/paystack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: NextRequest): boolean {
  const secret = env.QNOT_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || supplied.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}

export async function POST(request: NextRequest) {
  if (!env.QNOT_CRON_SECRET) return NextResponse.json({ error: "Payment reconciliation is not configured." }, { status: 503 });
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const summary = await reconcileExpiredTripPayments(100);
  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
}
