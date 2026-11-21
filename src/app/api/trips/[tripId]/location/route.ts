import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await context.params;
  const commuterId = await getCommuterId();
  if (!commuterId) return NextResponse.json({ error: "Sign in to view live vehicle location." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      status: true,
      routeId: true,
      busId: true,
      driverId: true,
      bus: { select: { plateNumber: true, verificationStatus: true, registrationExpiry: true, insuranceExpiry: true, inspectionExpiry: true } },
      driver: { select: {
        verificationStatus: true, phoneVerifiedAt: true, licenceExpiry: true,
        routeApprovals: { where: { status: "APPROVED" }, select: { routeId: true } },
        vehicleAssignments: { where: { revokedAt: null }, select: { busId: true } },
      } },
      route: { select: { stops: { orderBy: { sequence: "asc" }, select: { id: true, name: true, latitude: true, longitude: true, sequence: true } } } },
    },
  });
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  const [usedTicket, issuedTicket] = await Promise.all([
    prisma.ticket.findFirst({ where: { tripId, commuterId, status: "USED" }, select: { id: true } }),
    prisma.ticket.findFirst({ where: { tripId, commuterId, status: "ISSUED" }, select: { id: true } }),
  ]);
  if (!usedTicket && !issuedTicket) return NextResponse.json({ error: "A confirmed ticket is required to view live vehicle location." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (trip.status === "COMPLETED" && usedTicket) {
    return NextResponse.json({ completed: true }, { headers: { "Cache-Control": "no-store" } });
  }
  const now = new Date();
  const serviceApproved = !!trip.driverId
    && trip.bus.verificationStatus === "APPROVED"
    && !!trip.bus.registrationExpiry && trip.bus.registrationExpiry > now
    && !!trip.bus.insuranceExpiry && trip.bus.insuranceExpiry > now
    && !!trip.bus.inspectionExpiry && trip.bus.inspectionExpiry > now
    && !!trip.driver && trip.driver.verificationStatus === "APPROVED"
    && !!trip.driver.phoneVerifiedAt && !!trip.driver.licenceExpiry && trip.driver.licenceExpiry > now
    && trip.driver.routeApprovals.some((approval) => approval.routeId === trip.routeId)
    && trip.driver.vehicleAssignments.some((assignment) => assignment.busId === trip.busId);
  if (trip.status !== "IN_TRANSIT" || !serviceApproved) {
    return NextResponse.json({ available: false, stops: trip.route.stops, vehicle: { plateNumber: trip.bus.plateNumber } }, { headers: { "Cache-Control": "no-store" } });
  }

  const session = await prisma.driverSession.findFirst({
    where: { tripId, driverId: trip.driverId!, status: "ACTIVE", endedAt: null, locationSharingEnabled: true, lastLat: { not: null }, lastLng: { not: null }, locationCapturedAt: { not: null } },
    orderBy: { locationCapturedAt: "desc" },
    select: { lastLat: true, lastLng: true, accuracyMeters: true, lastUpdateAt: true, locationCapturedAt: true },
  });
  if (!session?.locationCapturedAt || session.lastLat == null || session.lastLng == null) {
    return NextResponse.json({ available: false, stops: trip.route.stops }, { headers: { "Cache-Control": "no-store" } });
  }

  const ageMs = Date.now() - session.locationCapturedAt.getTime();
  const available = ageMs <= 5 * 60 * 1000;
  return NextResponse.json({
    available,
    stale: ageMs > 45 * 1000,
    location: available ? {
      latitude: session.lastLat,
      longitude: session.lastLng,
      accuracyMeters: session.accuracyMeters,
      updatedAt: session.locationCapturedAt.toISOString(),
    } : undefined,
    vehicle: { plateNumber: trip.bus.plateNumber },
    stops: trip.route.stops,
  }, { headers: { "Cache-Control": "no-store" } });
}
