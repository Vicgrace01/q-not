import { Prisma } from "@/generated/prisma/client";

/**
 * Count CALLED entries that still claim capacity but are not already represented
 * by a pending trip-fare payment in Trip.seatsReserved.
 *
 * Exclude the current passenger during checkout so their own called place can
 * be converted into a payment-backed reservation without counting it twice.
 */
export async function countUnreservedCalledEntries(
  tx: Prisma.TransactionClient,
  tripId: string,
  excludeCommuterId?: string | null,
): Promise<number> {
  const excludeCurrentPassenger = excludeCommuterId
    ? Prisma.sql`AND q."commuterId" <> ${excludeCommuterId}`
    : Prisma.empty;

  const rows = await tx.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    SELECT COUNT(*)::INTEGER AS count
    FROM "QueueEntry" q
    WHERE q."tripId" = ${tripId}
      AND q.status = 'CALLED'
      ${excludeCurrentPassenger}
      AND NOT EXISTS (
        SELECT 1
        FROM "Payment" p
        WHERE p."tripId" = q."tripId"
          AND p."commuterId" = q."commuterId"
          AND p.purpose = 'TRIP_FARE'
          AND p.status = 'PENDING'
      )
  `);

  return rows[0]?.count ?? 0;
}