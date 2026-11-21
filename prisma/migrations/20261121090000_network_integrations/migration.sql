CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUSPENDED');
CREATE TYPE "VehicleType" AS ENUM ('DANFO', 'KOROPE', 'HIACE', 'COASTER', 'SHUTTLE', 'OTHER');
CREATE TYPE "AuthRole" AS ENUM ('PASSENGER', 'OPERATOR', 'DRIVER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
CREATE TYPE "JourneyRequestStatus" AS ENUM ('OPEN', 'MATCHED', 'CANCELLED', 'EXPIRED');
ALTER TABLE "Driver" ALTER COLUMN "phone" DROP NOT NULL;

CREATE TYPE "QueueStatus_new" AS ENUM ('WAITING', 'CALLED', 'CONFIRMED', 'SEATED', 'CANCELLED', 'EXPIRED');

ALTER TABLE "Operator" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "Operator" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "Operator" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3), ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING';

ALTER TABLE "Commuter" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "Commuter" ADD COLUMN "email" TEXT, ADD COLUMN "emailVerifiedAt" TIMESTAMP(3), ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3), ADD COLUMN "emergencyContactName" TEXT, ADD COLUMN "emergencyContactPhone" TEXT, ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Commuter_email_key" ON "Commuter"("email");

ALTER TABLE "Driver" ALTER COLUMN "operatorId" DROP NOT NULL;
ALTER TABLE "Driver" ADD COLUMN "email" TEXT, ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3), ADD COLUMN "emailVerifiedAt" TIMESTAMP(3), ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING', ADD COLUMN "licenceLastFour" TEXT, ADD COLUMN "licenceExpiry" TIMESTAMP(3), ADD COLUMN "experienceYears" INTEGER, ADD COLUMN "profilePhotoUrl" TEXT, ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Driver_email_key" ON "Driver"("email");
CREATE INDEX "Driver_operatorId_verificationStatus_idx" ON "Driver"("operatorId", "verificationStatus");

ALTER TABLE "Route" ALTER COLUMN "operatorId" DROP NOT NULL;
ALTER TABLE "Bus" ALTER COLUMN "operatorId" DROP NOT NULL;
ALTER TABLE "Bus" ADD COLUMN "ownerDriverId" TEXT, ADD COLUMN "vehicleType" "VehicleType" NOT NULL DEFAULT 'KOROPE', ADD COLUMN "make" TEXT, ADD COLUMN "model" TEXT, ADD COLUMN "modelYear" INTEGER, ADD COLUMN "colour" TEXT, ADD COLUMN "photoUrl" TEXT, ADD COLUMN "registrationExpiry" TIMESTAMP(3), ADD COLUMN "insuranceExpiry" TIMESTAMP(3), ADD COLUMN "inspectionExpiry" TIMESTAMP(3), ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING', ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Bus_operatorId_verificationStatus_idx" ON "Bus"("operatorId", "verificationStatus");
CREATE INDEX "Bus_ownerDriverId_idx" ON "Bus"("ownerDriverId");

ALTER TABLE "Trip" ALTER COLUMN "operatorId" DROP NOT NULL;
-- Keep existing records safe while allowing independent owner-drivers and operator-independent routes/vehicles.
ALTER TABLE "Driver" DROP CONSTRAINT "Driver_operatorId_fkey";
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Route" DROP CONSTRAINT "Route_operatorId_fkey";
ALTER TABLE "Route" ADD CONSTRAINT "Route_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Bus" DROP CONSTRAINT "Bus_operatorId_fkey";
ALTER TABLE "Bus" ADD CONSTRAINT "Bus_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_operatorId_fkey";
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Stop" DROP CONSTRAINT "Stop_routeId_fkey";
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverSession" DROP CONSTRAINT "DriverSession_tripId_fkey";
ALTER TABLE "DriverSession" ADD CONSTRAINT "DriverSession_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DriverSession" DROP CONSTRAINT "DriverSession_driverId_fkey";
ALTER TABLE "DriverSession" ADD CONSTRAINT "DriverSession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Trip" ADD COLUMN "seatsReserved" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "fareKobo" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'NGN';
CREATE INDEX "Trip_driverId_status_idx" ON "Trip"("driverId", "status");

ALTER TABLE "DriverSession" ADD COLUMN "accuracyMeters" DOUBLE PRECISION, ADD COLUMN "headingDegrees" DOUBLE PRECISION, ADD COLUMN "speedKph" DOUBLE PRECISION, ADD COLUMN "locationCapturedAt" TIMESTAMP(3), ADD COLUMN "locationSharingEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "DriverSession_tripId_status_idx" ON "DriverSession"("tripId", "status");
CREATE INDEX "DriverSession_driverId_status_idx" ON "DriverSession"("driverId", "status");

ALTER TABLE "QueueEntry" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "QueueEntry" ALTER COLUMN "status" TYPE "QueueStatus_new" USING ("status"::text::"QueueStatus_new");
DROP TYPE "QueueStatus";
ALTER TYPE "QueueStatus_new" RENAME TO "QueueStatus";
ALTER TABLE "QueueEntry" ALTER COLUMN "status" SET DEFAULT 'WAITING'::"QueueStatus";

-- Older Q-not queue joins incremented seatsTaken before a passenger actually boarded.
-- Rebuild occupancy from the SEATED state so historical WAITING/CANCELLED entries
-- do not consume seats after this accounting correction.
UPDATE "Trip" t
SET "seatsTaken" = (
  SELECT COUNT(*)::INTEGER FROM "QueueEntry" q
  WHERE q."tripId" = t.id AND q.status = 'SEATED'
),
"seatsReserved" = 0;

CREATE UNIQUE INDEX "Stop_routeId_sequence_key" ON "Stop"("routeId", "sequence");

CREATE TABLE "AuthIdentity" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "role" "AuthRole" NOT NULL,
  "email" TEXT NOT NULL,
  "operatorId" TEXT,
  "commuterId" TEXT,
  "driverId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AuthIdentity_provider_providerAccountId_role_key" ON "AuthIdentity"("provider", "providerAccountId", "role");
CREATE INDEX "AuthIdentity_operatorId_idx" ON "AuthIdentity"("operatorId");
CREATE INDEX "AuthIdentity_commuterId_idx" ON "AuthIdentity"("commuterId");
CREATE INDEX "AuthIdentity_driverId_idx" ON "AuthIdentity"("driverId");
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_commuterId_fkey" FOREIGN KEY ("commuterId") REFERENCES "Commuter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_role_owner_check" CHECK (
  ("role" = 'OPERATOR' AND "operatorId" IS NOT NULL AND "commuterId" IS NULL AND "driverId" IS NULL) OR
  ("role" = 'PASSENGER' AND "operatorId" IS NULL AND "commuterId" IS NOT NULL AND "driverId" IS NULL) OR
  ("role" = 'DRIVER' AND "operatorId" IS NULL AND "commuterId" IS NULL AND "driverId" IS NOT NULL)
);

CREATE TABLE "OtpChallenge" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerReference" TEXT,
  "codeHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OtpChallenge_identifier_purpose_createdAt_idx" ON "OtpChallenge"("identifier", "purpose", "createdAt");
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

CREATE TABLE "DriverVehicleAssignment" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "busId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverVehicleAssignment_driverId_busId_key" ON "DriverVehicleAssignment"("driverId", "busId");
CREATE INDEX "DriverVehicleAssignment_driverId_revokedAt_idx" ON "DriverVehicleAssignment"("driverId", "revokedAt");
CREATE INDEX "DriverVehicleAssignment_busId_revokedAt_idx" ON "DriverVehicleAssignment"("busId", "revokedAt");
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DriverRouteApproval" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverRouteApproval_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverRouteApproval_driverId_routeId_key" ON "DriverRouteApproval"("driverId", "routeId");
CREATE INDEX "DriverRouteApproval_routeId_status_idx" ON "DriverRouteApproval"("routeId", "status");
ALTER TABLE "DriverRouteApproval" ADD CONSTRAINT "DriverRouteApproval_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverRouteApproval" ADD CONSTRAINT "DriverRouteApproval_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DriverVerification" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "provider" TEXT,
  "providerRef" TEXT,
  "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "consentAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverVerification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverVerification_driverId_kind_status_idx" ON "DriverVerification"("driverId", "kind", "status");
ALTER TABLE "DriverVerification" ADD CONSTRAINT "DriverVerification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bus" ADD CONSTRAINT "Bus_ownerDriverId_fkey" FOREIGN KEY ("ownerDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "commuterId" TEXT NOT NULL,
  "tripId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
  "reference" TEXT NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "purpose" TEXT NOT NULL DEFAULT 'TRIP_FARE',
  "checkoutUrl" TEXT,
  "providerReference" TEXT,
  "paidAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");
CREATE INDEX "Payment_commuterId_createdAt_idx" ON "Payment"("commuterId", "createdAt");
CREATE INDEX "Payment_tripId_status_idx" ON "Payment"("tripId", "status");
CREATE INDEX "Payment_status_expiresAt_idx" ON "Payment"("status", "expiresAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_commuterId_fkey" FOREIGN KEY ("commuterId") REFERENCES "Commuter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "JourneyRequest" (
  "id" TEXT NOT NULL,
  "commuterId" TEXT NOT NULL,
  "routeId" TEXT NOT NULL,
  "boardingStopId" TEXT NOT NULL,
  "alightingStopId" TEXT NOT NULL,
  "desiredDepartureAt" TIMESTAMP(3) NOT NULL,
  "passengerCount" INTEGER NOT NULL DEFAULT 1,
  "status" "JourneyRequestStatus" NOT NULL DEFAULT 'OPEN',
  "matchedTripId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JourneyRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JourneyRequest_routeId_status_desiredDepartureAt_idx" ON "JourneyRequest"("routeId", "status", "desiredDepartureAt");
CREATE INDEX "JourneyRequest_matchedTripId_idx" ON "JourneyRequest"("matchedTripId");
CREATE INDEX "JourneyRequest_commuterId_createdAt_idx" ON "JourneyRequest"("commuterId", "createdAt");
ALTER TABLE "JourneyRequest" ADD CONSTRAINT "JourneyRequest_commuterId_fkey" FOREIGN KEY ("commuterId") REFERENCES "Commuter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JourneyRequest" ADD CONSTRAINT "JourneyRequest_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JourneyRequest" ADD CONSTRAINT "JourneyRequest_boardingStopId_fkey" FOREIGN KEY ("boardingStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JourneyRequest" ADD CONSTRAINT "JourneyRequest_alightingStopId_fkey" FOREIGN KEY ("alightingStopId") REFERENCES "Stop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JourneyRequest" ADD CONSTRAINT "JourneyRequest_matchedTripId_fkey" FOREIGN KEY ("matchedTripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

