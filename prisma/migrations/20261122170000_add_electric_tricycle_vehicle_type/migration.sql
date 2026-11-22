-- Add the explicit Q-not vehicle class used by the UNN electric-tricycle pilot.
-- Additive only: existing vehicle records and values are unchanged.
ALTER TYPE "VehicleType" ADD VALUE IF NOT EXISTS 'ELECTRIC_TRICYCLE';