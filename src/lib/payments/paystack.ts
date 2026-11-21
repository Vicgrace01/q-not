import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export type PaystackVerificationStatus = "SUCCESS" | "FAILED" | "PENDING" | "UNAVAILABLE";

export function paystackSignatureIsValid(rawBody: string, currentSignature: string | null, legacySignature: string | null): boolean {
  // New Paystack webhooks use a timestamped signature and a dedicated whsec_ secret.
  if (currentSignature) {
    if (!env.PAYSTACK_WEBHOOK_SECRET) return false;
    const parts = currentSignature.split(",").map((part) => part.trim());
    const timestampPart = parts.find((part) => part.startsWith("t="));
    const timestamp = timestampPart ? Number(timestampPart.slice(2)) : Number.NaN;
    if (!Number.isInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
    const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
    if (signatures.length === 0) return false;
    const expected = createHmac("sha512", env.PAYSTACK_WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`).digest("hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    return signatures.some((candidate) => {
      const splitAt = candidate.indexOf(":");
      const hex = splitAt >= 0 ? candidate.slice(splitAt + 1) : candidate;
      if (!/^[a-f0-9]{128}$/i.test(hex)) return false;
      const received = Buffer.from(hex, "hex");
      return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
    });
  }

  // Backward compatibility for X-Paystack-Signature while an account migrates.
  if (!env.PAYSTACK_SECRET_KEY || !legacySignature || !/^[a-f0-9]{128}$/i.test(legacySignature)) return false;
  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const received = Buffer.from(legacySignature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export async function releasePendingTripPayment(reference: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string; tripId: string | null; status: string }>>`
      SELECT id, "tripId", status FROM "Payment" WHERE reference = ${reference} FOR UPDATE
    `;
    const payment = locked[0];
    if (!payment || payment.status !== "PENDING") return;
    if (payment.tripId) {
      await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${payment.tripId} FOR UPDATE`;
      await tx.$executeRaw`UPDATE "Trip" SET "seatsReserved" = GREATEST("seatsReserved" - 1, 0) WHERE id = ${payment.tripId}`;
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  });
}

export async function settleSuccessfulTripPayment(input: {
  reference: string;
  amountKobo: number;
  currency: string;
  providerReference?: string;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const lockedPayments = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Payment" WHERE reference = ${input.reference} FOR UPDATE
    `;
    if (lockedPayments.length === 0) return false;
    const payment = await tx.payment.findUnique({ where: { id: lockedPayments[0].id } });
    if (!payment) return false;
    if (payment.status === "SUCCEEDED") return true;
    if (payment.status !== "PENDING" || payment.amountKobo !== input.amountKobo || payment.currency !== input.currency || input.currency !== "NGN") return false;

    if (payment.tripId) {
      const lockedTrips = await tx.$queryRaw<Array<{ id: string; seatsReserved: number; seatsTaken: number; capacity: number }>>`
        SELECT t.id, t."seatsReserved", t."seatsTaken", b.capacity
        FROM "Trip" t JOIN "Bus" b ON b.id = t."busId"
        WHERE t.id = ${payment.tripId} FOR UPDATE OF t
      `;
      if (lockedTrips.length === 0 || lockedTrips[0].seatsReserved < 1 || lockedTrips[0].seatsTaken >= lockedTrips[0].capacity) return false;
      const tripId = lockedTrips[0].id;
      const existingEntry = await tx.queueEntry.findUnique({
        where: { tripId_commuterId: { tripId, commuterId: payment.commuterId } },
      });
      if (!existingEntry || !["CONFIRMED", "SEATED"].includes(existingEntry.status)) {
        const last = await tx.queueEntry.findFirst({ where: { tripId }, orderBy: { position: "desc" }, select: { position: true } });
        const position = existingEntry?.position ?? (last?.position ?? 0) + 1;
        if (existingEntry) {
          await tx.queueEntry.update({ where: { id: existingEntry.id }, data: { status: "CONFIRMED", position, resolvedAt: null } });
        } else {
          await tx.queueEntry.create({ data: { tripId, commuterId: payment.commuterId, position, status: "CONFIRMED" } });
        }
      }
      const existingTicket = await tx.ticket.findFirst({ where: { tripId, commuterId: payment.commuterId, status: { in: ["ISSUED", "USED"] } }, select: { id: true } });
      if (!existingTicket) {
        await tx.ticket.create({ data: { tripId, commuterId: payment.commuterId, code: `QN-${randomBytes(5).toString("hex").toUpperCase()}` } });
      }
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", paidAt: new Date(), providerReference: input.providerReference ?? input.reference },
    });
    return true;
  });
}

export async function verifyPaystackReference(reference: string): Promise<PaystackVerificationStatus> {
  if (!env.PAYSTACK_SECRET_KEY) return "UNAVAILABLE";
  let response: Response;
  try {
    response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    });
  } catch {
    return "UNAVAILABLE";
  }
  if (!response.ok) return "UNAVAILABLE";
  const result = await response.json().catch(() => null) as {
    status?: boolean;
    data?: { status?: string; amount?: number; currency?: string; reference?: string };
  } | null;
  if (!result?.status || !result.data || result.data.reference !== reference) return "UNAVAILABLE";
  if (result.data.status === "success") {
    const settled = await settleSuccessfulTripPayment({
      reference,
      amountKobo: Number(result.data.amount),
      currency: String(result.data.currency),
      providerReference: reference,
    });
    return settled ? "SUCCESS" : "UNAVAILABLE";
  }
  if (["failed", "abandoned", "reversed"].includes(String(result.data.status).toLowerCase())) return "FAILED";
  return "PENDING";
}


export async function reconcileExpiredTripPayments(limit = 100) {
  const expired = await prisma.payment.findMany({
    where: { provider: "PAYSTACK", status: "PENDING", expiresAt: { lt: new Date() } },
    orderBy: { expiresAt: "asc" },
    take: Math.min(Math.max(limit, 1), 250),
    select: { reference: true },
  });
  const summary = { checked: expired.length, succeeded: 0, failed: 0, stillPending: 0, unavailable: 0 };
  for (const payment of expired) {
    const status = await verifyPaystackReference(payment.reference);
    if (status === "SUCCESS") summary.succeeded += 1;
    else if (status === "FAILED") {
      await releasePendingTripPayment(payment.reference);
      summary.failed += 1;
    } else if (status === "PENDING") summary.stillPending += 1;
    else summary.unavailable += 1;
  }
  return summary;
}
