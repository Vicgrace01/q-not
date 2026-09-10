import { prisma } from "@/lib/db";

export type JoinResult =
  | { ok: true; entryId: string; position: number }
  | { ok: false; reason: "trip-not-found" | "no-seats" | "already-queued" | "trip-not-boarding" };

/**
 * Join the queue for a trip. This is the ONLY place a commuter gets a seat.
 *
 * The concurrency problem:
 *   Without a lock, two requests both read "seatsTaken=14, capacity=15",
 *   both decide there's room, both increment, and the bus oversells.
 *
 * The fix:
 *   SELECT ... FOR UPDATE on the Trip row. Postgres locks it. Any other
 *   transaction that tries to lock the same row waits until we commit.
 *   Then it re-reads seatsTaken and sees the updated value.
 *
 * See DECISIONS.md ADR-005, tests/seat-race.test.ts, BUGS.md.
 */
export async function joinQueueTx(
  commuterId: string,
  tripId: string,
): Promise<JoinResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the Trip row. Any concurrent transaction on this same trip
    //    waits here until we finish.
    const locked = await tx.$queryRaw<Array<{ id: string; seatsTaken: number; status: string }>>`
      SELECT id, "seatsTaken", status FROM "Trip" WHERE id = ${tripId} FOR UPDATE
    `;

    if (locked.length === 0) {
      return { ok: false, reason: "trip-not-found" };
    }

    const trip = locked[0];

    if (trip.status !== "BOARDING" && trip.status !== "SCHEDULED") {
      return { ok: false, reason: "trip-not-boarding" };
    }

    // 2. Read capacity from the bus (not locked; capacity doesn't change).
    const bus = await tx.trip.findUnique({
      where: { id: tripId },
      select: { bus: { select: { capacity: true } } },
    });

    if (!bus) return { ok: false, reason: "trip-not-found" };

    // 3. Check seat availability — now safe, we hold the lock.
    if (trip.seatsTaken >= bus.bus.capacity) {
      return { ok: false, reason: "no-seats" };
    }

    // 4. Prevent duplicate queue entries.
    const existing = await tx.queueEntry.findUnique({
      where: { tripId_commuterId: { tripId, commuterId } },
    });
    if (existing) return { ok: false, reason: "already-queued" };

    // 5. Compute next position.
    const last = await tx.queueEntry.findFirst({
      where: { tripId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (last?.position ?? 0) + 1;

    // 6. Increment seats and create the entry. Both inside the lock.
    await tx.trip.update({
      where: { id: tripId },
      data: { seatsTaken: { increment: 1 } },
    });

    const entry = await tx.queueEntry.create({
      data: { tripId, commuterId, position, status: "WAITING" },
    });

    return { ok: true, entryId: entry.id, position };
  });
}
