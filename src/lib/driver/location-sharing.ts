import { Prisma } from "@/generated/prisma/client";

export type DriverLocationUpdate = {
  tripId: string;
  driverId: string;
  capturedAt: Date;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  headingDegrees?: number | null;
  speedMetersPerSecond?: number | null;
};

export type SaveLocationResult =
  | { ok: true }
  | { ok: false; reason: "session-not-found" | "sharing-stopped" | "update-too-soon" | "stale-fix" };

async function lockLatestActiveSession(
  tx: Prisma.TransactionClient,
  tripId: string,
  driverId: string,
): Promise<string | null> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM "DriverSession"
    WHERE "tripId" = ${tripId}
      AND "driverId" = ${driverId}
      AND status = 'ACTIVE'
      AND "endedAt" IS NULL
    ORDER BY "startedAt" DESC
    LIMIT 1
    FOR UPDATE
  `);
  return rows[0]?.id ?? null;
}

/**
 * Explicitly starts or stops GPS sharing while holding the session row lock.
 * A location POST uses the same lock, so DELETE cannot be followed by a late
 * POST that re-enables sharing.
 */
export async function setDriverLocationSharingTx(
  tx: Prisma.TransactionClient,
  tripId: string,
  driverId: string,
  enabled: boolean,
): Promise<boolean> {
  const sessionId = await lockLatestActiveSession(tx, tripId, driverId);
  if (!sessionId) return false;

  const updated = await tx.driverSession.updateMany({
    where: { id: sessionId, status: "ACTIVE", endedAt: null },
    data: {
      locationSharingEnabled: enabled,
      lastLat: null,
      lastLng: null,
      accuracyMeters: null,
      headingDegrees: null,
      speedKph: null,
      locationCapturedAt: null,
      lastUpdateAt: null,
    },
  });
  return updated.count === 1;
}

/** Save a GPS fix only for a currently enabled sharing session. Never enables it. */
export async function saveDriverLocationTx(
  tx: Prisma.TransactionClient,
  input: DriverLocationUpdate,
  now = new Date(),
): Promise<SaveLocationResult> {
  const sessionId = await lockLatestActiveSession(tx, input.tripId, input.driverId);
  if (!sessionId) return { ok: false, reason: "session-not-found" };

  const session = await tx.driverSession.findUnique({
    where: { id: sessionId },
    select: { locationSharingEnabled: true, lastUpdateAt: true, locationCapturedAt: true },
  });
  if (!session) return { ok: false, reason: "session-not-found" };
  if (!session.locationSharingEnabled) return { ok: false, reason: "sharing-stopped" };
  if (session.lastUpdateAt && now.getTime() - session.lastUpdateAt.getTime() < 5_000) {
    return { ok: false, reason: "update-too-soon" };
  }
  if (session.locationCapturedAt && input.capturedAt.getTime() <= session.locationCapturedAt.getTime()) {
    return { ok: false, reason: "stale-fix" };
  }

  const updated = await tx.driverSession.updateMany({
    where: {
      id: sessionId,
      status: "ACTIVE",
      endedAt: null,
      locationSharingEnabled: true,
      OR: [
        { locationCapturedAt: null },
        { locationCapturedAt: { lt: input.capturedAt } },
      ],
    },
    data: {
      lastLat: input.latitude,
      lastLng: input.longitude,
      accuracyMeters: input.accuracyMeters ?? null,
      headingDegrees: input.headingDegrees ?? null,
      speedKph: input.speedMetersPerSecond == null ? null : input.speedMetersPerSecond * 3.6,
      locationCapturedAt: input.capturedAt,
      lastUpdateAt: now,
    },
  });

  return updated.count === 1
    ? { ok: true }
    : { ok: false, reason: "sharing-stopped" };
}
