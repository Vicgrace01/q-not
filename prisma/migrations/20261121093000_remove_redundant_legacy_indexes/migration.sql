-- Remove obsolete single-column indexes.
-- Their composite replacements are maintained in the Prisma schema.

DROP INDEX IF EXISTS "Bus_operatorId_idx";
DROP INDEX IF EXISTS "Driver_operatorId_idx";
DROP INDEX IF EXISTS "DriverSession_tripId_idx";