import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getCommuterId } from "@/lib/session";
import {
  createPaystackReference,
  isDefinitivePaystackInitializationRejection,
  releasePendingTripPayment,
  verifyPaystackReference,
} from "@/lib/payments/paystack";

export const runtime = "nodejs";

function paymentReturnUrl(reference: string): string {
  return new URL(`/c/q-funds/return?reference=${encodeURIComponent(reference)}`, env.NEXT_PUBLIC_APP_URL).toString();
}

async function resolveUncertainInitialization(reference: string): Promise<NextResponse> {
  const verification = await verifyPaystackReference(reference);
  if (verification === "FAILED") {
    await releasePendingTripPayment(reference);
    return NextResponse.json(
      { error: "Paystack reports that this payment was not completed. The temporary seat hold has been released; you can try again." },
      { status: 502 },
    );
  }
  if (verification === "SUCCESS") {
    return NextResponse.json(
      { paymentStatus: "SUCCESS", returnUrl: paymentReturnUrl(reference) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // PENDING, NOT_FOUND and UNAVAILABLE are not enough to prove failure while
  // the original reservation window is still active.
  return NextResponse.json(
    { paymentStatus: "PENDING", returnUrl: paymentReturnUrl(reference) },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(_request: NextRequest, context: { params: Promise<{ tripId: string }> }) {
  const commuterId = await getCommuterId();
  if (!commuterId) return NextResponse.json({ error: "Sign in to reserve a seat." }, { status: 401 });
  if (!env.PAYSTACK_SECRET_KEY) return NextResponse.json({ error: "Online fare payment is not configured yet. Please try again later." }, { status: 503 });
  const { tripId } = await context.params;
  const commuter = await prisma.commuter.findUnique({ where: { id: commuterId }, select: { email: true, emailVerifiedAt: true } });
  if (!commuter?.email || !commuter.emailVerifiedAt) return NextResponse.json({ error: "Add and verify an email address in your passenger profile before paying online." }, { status: 409 });

  const reference = createPaystackReference();
  const expiresAt = new Date(Date.now() + 8 * 60 * 1000);
  let amountKobo = 0;
  let existingCheckoutUrl: string | null = null;
  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; busId: string; status: string; seatsTaken: number; seatsReserved: number; fareKobo: number }>>`
        SELECT t.id, t."busId", t.status, t."seatsTaken", t."seatsReserved", t."fareKobo"
        FROM "Trip" t
        JOIN "Bus" b ON b.id = t."busId"
        JOIN "Driver" d ON d.id = t."driverId"
        JOIN "DriverVehicleAssignment" a ON a."driverId" = d.id AND a."busId" = b.id AND a."revokedAt" IS NULL
        JOIN "DriverRouteApproval" r ON r."driverId" = d.id AND r."routeId" = t."routeId" AND r.status = 'APPROVED'
        WHERE t.id = ${tripId}
          AND t.status IN ('SCHEDULED','BOARDING')
          AND b."verificationStatus" = 'APPROVED'
          AND b."registrationExpiry" > NOW() AND b."insuranceExpiry" > NOW() AND b."inspectionExpiry" > NOW()
          AND d."verificationStatus" = 'APPROVED' AND d."phoneVerifiedAt" IS NOT NULL AND d."licenceExpiry" > NOW()
        FOR UPDATE OF t
      `;
      if (locked.length === 0) {
        const exists = await tx.trip.findUnique({ where: { id: tripId }, select: { id: true } });
        throw new Error(exists ? "TRIP_NOT_ELIGIBLE" : "TRIP_NOT_FOUND");
      }
      const trip = locked[0];
      const bus = await tx.bus.findUnique({ where: { id: trip.busId }, select: { capacity: true } });
      if (!bus) throw new Error("TRIP_NOT_ELIGIBLE");

      const paid = await tx.payment.findFirst({ where: { tripId, commuterId, status: "SUCCEEDED", purpose: "TRIP_FARE" }, select: { id: true } });
      if (paid) throw new Error("ALREADY_BOOKED");
      const pending = await tx.payment.findFirst({ where: { tripId, commuterId, status: "PENDING", purpose: "TRIP_FARE" }, orderBy: { createdAt: "desc" }, select: { checkoutUrl: true, expiresAt: true } });
      if (pending) {
        existingCheckoutUrl = pending.checkoutUrl;
        throw new Error(pending.checkoutUrl && pending.expiresAt && pending.expiresAt > new Date() ? "PAYMENT_ALREADY_OPEN" : "PAYMENT_RECONCILIATION_REQUIRED");
      }
      if (!["SCHEDULED", "BOARDING"].includes(trip.status)) throw new Error("TRIP_CLOSED");
      if (trip.fareKobo <= 0) throw new Error("FARE_NOT_SET");
      if (trip.seatsTaken + trip.seatsReserved >= bus.capacity) throw new Error("NO_SEATS");
      amountKobo = trip.fareKobo;
      await tx.trip.update({ where: { id: tripId }, data: { seatsReserved: { increment: 1 } } });
      await tx.payment.create({
        data: { commuterId, tripId, reference, amountKobo, currency: "NGN", status: "PENDING", expiresAt, purpose: "TRIP_FARE" },
      });
      return { amountKobo };
    });
    amountKobo = reservation.amountKobo;
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "PAYMENT_ALREADY_OPEN" && existingCheckoutUrl) {
      return NextResponse.json({ authorizationUrl: existingCheckoutUrl, existing: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const message = code === "TRIP_NOT_FOUND" ? "Trip not found."
      : code === "TRIP_NOT_ELIGIBLE" ? "This departure is not currently cleared for passenger bookings."
      : code === "TRIP_CLOSED" ? "This trip is no longer accepting bookings."
      : code === "FARE_NOT_SET" ? "The operator has not published a fare for this trip yet."
      : code === "NO_SEATS" ? "This trip has no seats available."
      : code === "ALREADY_BOOKED" ? "You already have a confirmed booking for this departure. Check your tickets."
      : code === "PAYMENT_RECONCILIATION_REQUIRED" ? "You have a payment awaiting confirmation. Open Q-Funds and check its status before starting another checkout."
      : "We could not reserve a seat. Try again.";
    return NextResponse.json({ error: message }, { status: code === "TRIP_NOT_FOUND" ? 404 : 409 });
  }

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: commuter.email,
        amount: amountKobo,
        currency: "NGN",
        reference,
        callback_url: new URL("/c/q-funds/return", env.NEXT_PUBLIC_APP_URL).toString(),
        metadata: { commuterId, tripId, paymentPurpose: "TRIP_FARE" },
      }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => null) as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } } | null;
    if (!response.ok || !result?.status || !result.data?.authorization_url || result.data.reference !== reference) {
      if (isDefinitivePaystackInitializationRejection(response.status, result?.status)) {
        await releasePendingTripPayment(reference);
        return NextResponse.json(
          { error: "Paystack rejected the checkout request. The temporary seat hold has been released; please try again." },
          { status: 502 },
        );
      }
      return resolveUncertainInitialization(reference);
    }
    await prisma.payment.update({ where: { reference }, data: { checkoutUrl: result.data.authorization_url, providerReference: result.data.reference } });
    return NextResponse.json({ authorizationUrl: result.data.authorization_url, reference }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // The provider may have created a transaction before the connection failed.
    // Do not release a seat on an ambiguous result; reconciliation will revisit it.
    return resolveUncertainInitialization(reference);
  }
}
