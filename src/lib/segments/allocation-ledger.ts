import { Prisma } from "@/generated/prisma/client";
import { countUnreservedCalledEntries } from "@/lib/queue/capacity";
import {
  calculateSegmentLoads,
  getSegmentAvailability,
  type SegmentCapacityInput,
} from "@/lib/segments/capacity";

type LockedTripCapacity = {
  id: string;
  routeId: string;
  departureTime: Date;
  seatsTaken: number;
  seatsReserved: number;
  capacity: number;
};

export type TripSegmentCapacitySnapshot = {
  tripId: string;
  routeId: string;
  capacity: number;
  departureTime: Date;
  legacyWholeRouteOccupancy: number;
  stopSequences: number[];
  allocations: SegmentCapacityInput["allocations"];
  loads: ReturnType<typeof calculateSegmentLoads>;
};

async function loadTripCapacitySnapshot(
  tx: Prisma.TransactionClient,
  tripId: string,
  excludeAllocationId?: string,
): Promise<TripSegmentCapacitySnapshot> {
  // Every allocator must take this same parent-trip lock before reading
  // or writing segment allocations. This serializes competing reservations.
  const lockedTrips = await tx.$queryRaw<LockedTripCapacity[]>`
    SELECT
      t.id,
      t."routeId",
      t."departureTime",
      t."seatsTaken",
      t."seatsReserved",
      b.capacity
    FROM "Trip" t
    JOIN "Bus" b ON b.id = t."busId"
    WHERE t.id = ${tripId}
    FOR UPDATE OF t
  `;

  const trip = lockedTrips[0];
  if (!trip) throw new Error("SEGMENT_TRIP_NOT_FOUND");

  // Refuse to calculate capacity if an old MATCHED request was not
  // backfilled by the Release 6B migration.
  const unbackfilled = await tx.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::INTEGER AS count
    FROM "JourneyRequest" request
    WHERE request."matchedTripId" = ${tripId}
      AND request.status = 'MATCHED'
      AND NOT EXISTS (
        SELECT 1
        FROM "SegmentAllocation" allocation
        WHERE allocation."journeyRequestId" = request.id
      )
  `;

  if ((unbackfilled[0]?.count ?? 0) > 0) {
    throw new Error("SEGMENT_ALLOCATION_BACKFILL_REQUIRED");
  }

  const [stops, rows, calledClaims] = await Promise.all([
    tx.stop.findMany({
      where: { routeId: trip.routeId },
      orderBy: { sequence: "asc" },
      select: { id: true, sequence: true },
    }),

    tx.segmentAllocation.findMany({
      where: {
        tripId,
        ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
      },
      select: {
        boardingSequence: true,
        alightingSequence: true,
        passengerCount: true,
        status: true,
        holdExpiresAt: true,
      },
    }),

    countUnreservedCalledEntries(tx, tripId),
  ]);

  const allocations = rows.map((row) => ({
    boardingSequence: row.boardingSequence,
    alightingSequence: row.alightingSequence,
    passengerCount: row.passengerCount,
    status: row.status,
    holdExpiresAt: row.holdExpiresAt,
  }));

  // Legacy whole-trip counters remain conservative full-route occupancy.
  // CALLED entries are included only when they are not already represented
  // by a pending online payment in seatsReserved.
  const legacyWholeRouteOccupancy =
    trip.seatsTaken + trip.seatsReserved + calledClaims;

  const input: SegmentCapacityInput = {
    stopSequences: stops.map((stop) => stop.sequence),
    capacity: trip.capacity,
    legacyWholeRouteOccupancy,
    allocations,
  };

  return {
    tripId,
    routeId: trip.routeId,
    capacity: trip.capacity,
    departureTime: trip.departureTime,
    legacyWholeRouteOccupancy,
    stopSequences: input.stopSequences,
    allocations,
    loads: calculateSegmentLoads(input),
  };
}

/**
 * Reads segment availability while holding the Trip row lock.
 *
 * Call this inside the transaction that will make the corresponding
 * allocation change. Do not calculate capacity outside that transaction.
 */
export async function getSegmentAvailabilityTx(
  tx: Prisma.TransactionClient,
  input: {
    tripId: string;
    boardingStopId: string;
    alightingStopId: string;
    excludeAllocationId?: string;
  },
): Promise<{
  available: number;
  boardingSequence: number;
  alightingSequence: number;
  snapshot: TripSegmentCapacitySnapshot;
}> {
  const snapshot = await loadTripCapacitySnapshot(
    tx,
    input.tripId,
    input.excludeAllocationId,
  );

  const [boarding, alighting] = await Promise.all([
    tx.stop.findFirst({
      where: {
        id: input.boardingStopId,
        routeId: snapshot.routeId,
      },
      select: { sequence: true },
    }),
    tx.stop.findFirst({
      where: {
        id: input.alightingStopId,
        routeId: snapshot.routeId,
      },
      select: { sequence: true },
    }),
  ]);

  if (!boarding || !alighting || boarding.sequence >= alighting.sequence) {
    throw new Error("SEGMENT_ROUTE_STOPS_INVALID");
  }

  const available = getSegmentAvailability(
    {
      stopSequences: snapshot.stopSequences,
      capacity: snapshot.capacity,
      legacyWholeRouteOccupancy: snapshot.legacyWholeRouteOccupancy,
      allocations: snapshot.allocations,
    },
    boarding.sequence,
    alighting.sequence,
  );

  return {
    available,
    boardingSequence: boarding.sequence,
    alightingSequence: alighting.sequence,
    snapshot,
  };
}