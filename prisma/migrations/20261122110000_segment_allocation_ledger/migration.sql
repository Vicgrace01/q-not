-- Q-not Release 6B: persistent stop-to-stop allocation ledger.
-- Existing whole-trip bookings remain represented by Trip counters.
-- Existing matched journey requests are backfilled into this ledger.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "JourneyRequest" jr
    JOIN "Trip" t ON t.id = jr."matchedTripId"
    JOIN "Stop" boarding ON boarding.id = jr."boardingStopId"
    JOIN "Stop" alighting ON alighting.id = jr."alightingStopId"
    WHERE jr.status = 'MATCHED'
      AND jr."matchedTripId" IS NOT NULL
      AND (
        jr."routeId" <> t."routeId"
        OR boarding."routeId" <> t."routeId"
        OR alighting."routeId" <> t."routeId"
        OR boarding.sequence >= alighting.sequence
      )
  ) THEN
    RAISE EXCEPTION
      'Cannot backfill SegmentAllocation: at least one matched journey has invalid route stops.';
  END IF;
END $$;

CREATE TYPE "SegmentAllocationStatus" AS ENUM (
  'MATCHED',
  'HELD',
  'CONFIRMED',
  'BOARDED',
  'ALIGHTED',
  'RELEASED',
  'CANCELLED'
);

CREATE TABLE "SegmentAllocation" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "commuterId" TEXT NOT NULL,
  "journeyRequestId" TEXT,
  "paymentId" TEXT,
  "queueEntryId" TEXT,
  "ticketId" TEXT,
  "boardingStopId" TEXT NOT NULL,
  "alightingStopId" TEXT NOT NULL,
  "boardingSequence" INTEGER NOT NULL,
  "alightingSequence" INTEGER NOT NULL,
  "passengerCount" INTEGER NOT NULL DEFAULT 1,
  "status" "SegmentAllocationStatus" NOT NULL DEFAULT 'MATCHED',
  "holdExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SegmentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SegmentAllocation_stop_order_check"
    CHECK ("boardingSequence" < "alightingSequence"),
  CONSTRAINT "SegmentAllocation_passenger_count_check"
    CHECK ("passengerCount" > 0)
);

CREATE UNIQUE INDEX "SegmentAllocation_journeyRequestId_key"
  ON "SegmentAllocation"("journeyRequestId");

CREATE UNIQUE INDEX "SegmentAllocation_paymentId_key"
  ON "SegmentAllocation"("paymentId");

CREATE UNIQUE INDEX "SegmentAllocation_queueEntryId_key"
  ON "SegmentAllocation"("queueEntryId");

CREATE UNIQUE INDEX "SegmentAllocation_ticketId_key"
  ON "SegmentAllocation"("ticketId");

CREATE INDEX "SegmentAllocation_tripId_status_boardingSequence_idx"
  ON "SegmentAllocation"("tripId", "status", "boardingSequence");

CREATE INDEX "SegmentAllocation_commuterId_status_idx"
  ON "SegmentAllocation"("commuterId", "status");

CREATE INDEX "SegmentAllocation_holdExpiresAt_idx"
  ON "SegmentAllocation"("holdExpiresAt");

ALTER TABLE "SegmentAllocation"
  ADD CONSTRAINT "SegmentAllocation_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SegmentAllocation"
  ADD CONSTRAINT "SegmentAllocation_commuterId_fkey"
  FOREIGN KEY ("commuterId") REFERENCES "Commuter"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SegmentAllocation"
  ADD CONSTRAINT "SegmentAllocation_journeyRequestId_fkey"
  FOREIGN KEY ("journeyRequestId") REFERENCES "JourneyRequest"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SegmentAllocation"
  ADD CONSTRAINT "SegmentAllocation_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SegmentAllocation"
  ADD CONSTRAINT "SegmentAllocation_queueEntryId_fkey"
  FOREIGN KEY ("queueEntryId") REFERENCES "QueueEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SegmentAllocation"
  ADD CONSTRAINT "SegmentAllocation_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SegmentAllocation"
  ADD CONSTRAINT "SegmentAllocation_boardingStopId_fkey"
  FOREIGN KEY ("boardingStopId") REFERENCES "Stop"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SegmentAllocation"
  ADD CONSTRAINT "SegmentAllocation_alightingStopId_fkey"
  FOREIGN KEY ("alightingStopId") REFERENCES "Stop"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve existing MATCHED demand in the new ledger.
-- These rows expire at the departure time; existing whole-route queue,
-- ticket and payment counters are not copied or changed here.
INSERT INTO "SegmentAllocation" (
  "id",
  "tripId",
  "commuterId",
  "journeyRequestId",
  "boardingStopId",
  "alightingStopId",
  "boardingSequence",
  "alightingSequence",
  "passengerCount",
  "status",
  "holdExpiresAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy_match_' || jr.id,
  jr."matchedTripId",
  jr."commuterId",
  jr.id,
  jr."boardingStopId",
  jr."alightingStopId",
  boarding.sequence,
  alighting.sequence,
  jr."passengerCount",
  'MATCHED'::"SegmentAllocationStatus",
  trip."departureTime",
  jr."createdAt",
  CURRENT_TIMESTAMP
FROM "JourneyRequest" jr
JOIN "Trip" trip ON trip.id = jr."matchedTripId"
JOIN "Stop" boarding ON boarding.id = jr."boardingStopId"
JOIN "Stop" alighting ON alighting.id = jr."alightingStopId"
WHERE jr.status = 'MATCHED'
  AND jr."matchedTripId" IS NOT NULL;