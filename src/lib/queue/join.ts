import { prisma } from "@/lib/db";

export type JoinResult =
  | { ok: true; entryId: string; position: number }
  | { ok: false; reason: "trip-not-found" | "already-queued" | "trip-not-boarding" };

/**
 * Join the virtual departure queue. Queue demand is NOT a physical seat hold.
 * Confirmed bookings increment Trip.seatsReserved, and boarding moves one
 * reserved seat into Trip.seatsTaken. This separation prevents a queue click
 * from consuming capacity before a passenger has a confirmed booking.
 */
export async function joinQueueTx(commuterId: string, tripId: string): Promise<JoinResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT t.id, t.status
      FROM "Trip" t
      JOIN "Bus" b ON b.id = t."busId"
      JOIN "Driver" d ON d.id = t."driverId"
      JOIN "DriverVehicleAssignment" a ON a."driverId" = d.id AND a."busId" = b.id AND a."revokedAt" IS NULL
      JOIN "DriverRouteApproval" r ON r."driverId" = d.id AND r."routeId" = t."routeId" AND r.status = 'APPROVED'
      WHERE t.id = ${tripId}
        AND t.status IN ('BOARDING','SCHEDULED')
        AND b."verificationStatus" = 'APPROVED'
        AND b."registrationExpiry" > NOW() AND b."insuranceExpiry" > NOW() AND b."inspectionExpiry" > NOW()
        AND d."verificationStatus" = 'APPROVED' AND d."phoneVerifiedAt" IS NOT NULL AND d."licenceExpiry" > NOW()
      FOR UPDATE OF t
    `;
    if (locked.length === 0) {
      const exists = await tx.trip.findUnique({ where: { id: tripId }, select: { id: true } });
      return exists ? { ok: false, reason: "trip-not-boarding" } : { ok: false, reason: "trip-not-found" };
    }

    const existing = await tx.queueEntry.findUnique({
      where: { tripId_commuterId: { tripId, commuterId } },
    });
    if (existing && !["CANCELLED", "EXPIRED"].includes(existing.status)) return { ok: false, reason: "already-queued" };

    const last = await tx.queueEntry.findFirst({
      where: { tripId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (last?.position ?? 0) + 1;
    const entry = existing
      ? await tx.queueEntry.update({
          where: { id: existing.id },
          data: { position, status: "WAITING", joinedAt: new Date(), resolvedAt: null },
        })
      : await tx.queueEntry.create({
          data: { tripId, commuterId, position, status: "WAITING" },
        });
    return { ok: true, entryId: entry.id, position };
  });
}
