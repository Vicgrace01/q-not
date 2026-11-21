import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getDriverId } from "@/lib/session";
import { saveDriverLocationTx, setDriverLocationSharingTx } from "@/lib/driver/location-sharing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LocationSchema = z.object({
  tripId: z.string().min(1),
  capturedAt: z.string().datetime(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracyMeters: z.number().finite().min(0).max(10_000).optional().nullable(),
  headingDegrees: z.number().finite().min(0).max(360).optional().nullable(),
  speedMetersPerSecond: z.number().finite().min(0).max(100).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const driverId = await getDriverId();
  if (!driverId) return NextResponse.json({ error: "Driver sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const tripId = request.nextUrl.searchParams.get("tripId");
  if (!tripId) return NextResponse.json({ error: "Trip reference is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId, status: { in: ["BOARDING", "IN_TRANSIT"] } },
    select: {
      id: true,
      status: true,
      bus: { select: { plateNumber: true } },
      route: { select: {
        id: true,
        origin: true,
        destination: true,
        stops: { orderBy: { sequence: "asc" }, select: { id: true, name: true, latitude: true, longitude: true, sequence: true } },
      } },
    },
  });
  if (!trip) return NextResponse.json({ error: "This active trip does not belong to your driver account." }, { status: 404, headers: { "Cache-Control": "no-store" } });

  if (trip.status !== "IN_TRANSIT") {
    return NextResponse.json({ available: false, stops: trip.route.stops, route: { id: trip.route.id, origin: trip.route.origin, destination: trip.route.destination }, vehicle: trip.bus }, { headers: { "Cache-Control": "no-store" } });
  }

  const session = await prisma.driverSession.findFirst({
    where: { tripId, driverId, status: "ACTIVE", endedAt: null, locationSharingEnabled: true, lastLat: { not: null }, lastLng: { not: null }, locationCapturedAt: { not: null } },
    orderBy: { locationCapturedAt: "desc" },
    select: { lastLat: true, lastLng: true, accuracyMeters: true, headingDegrees: true, speedKph: true, locationCapturedAt: true },
  });
  if (!session?.locationCapturedAt || session.lastLat == null || session.lastLng == null) {
    return NextResponse.json({ available: false, stops: trip.route.stops, route: { id: trip.route.id, origin: trip.route.origin, destination: trip.route.destination }, vehicle: trip.bus }, { headers: { "Cache-Control": "no-store" } });
  }
  const ageMs = Date.now() - session.locationCapturedAt.getTime();
  const available = ageMs <= 5 * 60_000;
  return NextResponse.json({
    available,
    stale: ageMs > 45_000,
    location: available ? {
      latitude: session.lastLat,
      longitude: session.lastLng,
      accuracyMeters: session.accuracyMeters,
      headingDegrees: session.headingDegrees,
      speedKph: session.speedKph,
      updatedAt: session.locationCapturedAt.toISOString(),
    } : undefined,
    stops: trip.route.stops,
    route: { id: trip.route.id, origin: trip.route.origin, destination: trip.route.destination },
    vehicle: trip.bus,
  }, { headers: { "Cache-Control": "no-store" } });
}

async function getEligibleLocationTrip(driverId: string, tripId: string) {
  const now = new Date();
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      driverId,
      status: "IN_TRANSIT",
      driver: { is: { verificationStatus: "APPROVED", phoneVerifiedAt: { not: null }, licenceExpiry: { gt: now } } },
      bus: { verificationStatus: "APPROVED", registrationExpiry: { gt: now }, insuranceExpiry: { gt: now }, inspectionExpiry: { gt: now } },
    },
    select: { id: true, routeId: true, busId: true },
  });
  if (!trip) return null;

  const [routeApproval, assignment] = await Promise.all([
    prisma.driverRouteApproval.findUnique({
      where: { driverId_routeId: { driverId, routeId: trip.routeId } },
      select: { status: true },
    }),
    prisma.driverVehicleAssignment.findFirst({
      where: { driverId, busId: trip.busId, revokedAt: null },
      select: { id: true },
    }),
  ]);
  if (routeApproval?.status !== "APPROVED" || !assignment) return null;
  return trip;
}

/** Explicitly grant GPS sharing for the active trip before the browser starts sampling. */
export async function PATCH(request: NextRequest) {
  const driverId = await getDriverId();
  if (!driverId) return NextResponse.json({ error: "Driver sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const body = await request.json().catch(() => null) as { tripId?: unknown } | null;
  if (!body || typeof body.tripId !== "string" || body.tripId.length < 1) {
    return NextResponse.json({ error: "Trip reference is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const trip = await getEligibleLocationTrip(driverId, body.tripId);
  if (!trip) return NextResponse.json({ error: "This driver does not have an approved active service matching this request." }, { status: 403, headers: { "Cache-Control": "no-store" } });

  const started = await prisma.$transaction((tx) => setDriverLocationSharingTx(tx, trip.id, driverId, true));
  if (!started) return NextResponse.json({ error: "Start the trip before sharing GPS location." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ ok: true, sharing: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const driverId = await getDriverId();
  if (!driverId) return NextResponse.json({ error: "Driver sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const parsed = LocationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Location payload is invalid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const input = parsed.data;
  const capturedAt = new Date(input.capturedAt);
  const now = new Date();
  if (capturedAt.getTime() < now.getTime() - 60_000 || capturedAt.getTime() > now.getTime() + 10_000) {
    return NextResponse.json({ error: "The GPS fix is too old or has an invalid device timestamp. Waiting for a fresh location." }, { status: 422, headers: { "Cache-Control": "no-store" } });
  }
  const trip = await getEligibleLocationTrip(driverId, input.tripId);
  if (!trip) return NextResponse.json({ error: "This driver does not have an approved active service matching this update." }, { status: 403, headers: { "Cache-Control": "no-store" } });

  const result = await prisma.$transaction((tx) => saveDriverLocationTx(tx, {
    tripId: trip.id,
    driverId,
    capturedAt,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters,
    headingDegrees: input.headingDegrees,
    speedMetersPerSecond: input.speedMetersPerSecond,
  }, now));

  if (!result.ok) {
    const status = result.reason === "session-not-found" ? 409
      : result.reason === "sharing-stopped" ? 409
      : result.reason === "update-too-soon" ? 429
      : 409;
    const error = result.reason === "session-not-found" ? "Start the trip before sharing GPS location."
      : result.reason === "sharing-stopped" ? "Location sharing has been stopped. Start sharing again to send a new GPS fix."
      : result.reason === "update-too-soon" ? "Location update received too soon."
      : "This GPS fix has already been received. Waiting for a newer position.";
    return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "5" } : {}) } });
  }

  return NextResponse.json({ ok: true, receivedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  const driverId = await getDriverId();
  if (!driverId) return NextResponse.json({ error: "Driver sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const body = await request.json().catch(() => null) as { tripId?: unknown } | null;
  if (!body || typeof body.tripId !== "string" || body.tripId.length < 1) return NextResponse.json({ error: "Trip reference is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const trip = await prisma.trip.findFirst({ where: { id: body.tripId, driverId, status: "IN_TRANSIT" }, select: { id: true } });
  if (!trip) return NextResponse.json({ error: "This trip is no longer active." }, { status: 409, headers: { "Cache-Control": "no-store" } });

  // Uses the same row lock as POST, so an in-flight GPS request cannot turn
  // sharing back on after this operation commits.
  const stopped = await prisma.$transaction((tx) => setDriverLocationSharingTx(tx, trip.id, driverId, false));
  return NextResponse.json({ ok: true, stopped }, { headers: { "Cache-Control": "no-store" } });
}
