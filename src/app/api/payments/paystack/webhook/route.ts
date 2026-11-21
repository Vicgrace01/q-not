import { NextRequest, NextResponse } from "next/server";
import { paystackSignatureIsValid, releasePendingTripPayment, settleSuccessfulTripPayment } from "@/lib/payments/paystack";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const currentSignature = request.headers.get("paystack-signature");
  const legacySignature = request.headers.get("x-paystack-signature");
  if (!paystackSignatureIsValid(rawBody, currentSignature, legacySignature)) {
    return NextResponse.json({ error: "Invalid payment signature." }, { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string; status?: string; amount?: number; currency?: string } };
  try { event = JSON.parse(rawBody) as typeof event; } catch { return NextResponse.json({ error: "Invalid event payload." }, { status: 400 }); }
  const reference = event.data?.reference;
  if (!reference) return NextResponse.json({ received: true });
  if (event.event === "charge.success" && event.data?.status === "success") {
    const settled = await settleSuccessfulTripPayment({ reference, amountKobo: Number(event.data.amount), currency: String(event.data.currency) });
    if (!settled) return NextResponse.json({ error: "Payment could not be reconciled against the reserved fare." }, { status: 409 });
  } else if (event.event === "charge.failed") {
    await releasePendingTripPayment(reference);
  }
  return NextResponse.json({ received: true });
}
