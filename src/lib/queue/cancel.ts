import { prisma } from "@/lib/db";

/**
 * Cancel a passenger's waiting/called queue entry.
 *
 * Cash acceptance and other seat-settlement operations lock the parent Trip
 * row before reading or changing a queue entry. Cancellation takes that same
 * lock, then re-reads and conditionally updates the entry. This serializes the
 * two operations and prevents a late cancellation from overwriting CONFIRMED.
 */
export async function cancelQueueEntryTx(
  tripId: string,
  commuterId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const lockedTrip = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Trip" WHERE id = ${tripId} FOR UPDATE
    `;
    if (lockedTrip.length === 0) return false;

    const entry = await tx.queueEntry.findUnique({
      where: { tripId_commuterId: { tripId, commuterId } },
      select: { id: true, status: true },
    });
    if (!entry || (entry.status !== "WAITING" && entry.status !== "CALLED")) {
      return false;
    }

    // A pending online checkout already holds a physical seat. Do not cancel
    // its queue entry while Paystack may still confirm the charge; let webhook
    // reconciliation settle or release that hold first.
    const pendingPayment = await tx.payment.findFirst({
      where: { tripId, commuterId, purpose: "TRIP_FARE", status: "PENDING" },
      select: { id: true },
    });
    if (pendingPayment) return false;

    const changed = await tx.queueEntry.updateMany({
      where: { id: entry.id, status: { in: ["WAITING", "CALLED"] } },
      data: { status: "CANCELLED", resolvedAt: new Date() },
    });
    return changed.count === 1;
  });
}
