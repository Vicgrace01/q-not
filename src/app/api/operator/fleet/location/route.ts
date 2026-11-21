import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionOperatorId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) return NextResponse.json({ error: "Operator sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const now = new Date();
  const cutoff = new Date(now.getTime() - 45_000);
  const routes = await prisma.route.findMany({ where: { operatorId }, select: { id: true } });
  const routeIds = routes.map((route) => route.id);
  if (routeIds.length === 0) return NextResponse.json({ points: [], activeVehicles: 0, refreshedAt: now.toISOString() }, { headers: { "Cache-Control": "no-store" } });

  const sessions = await prisma.driverSession.findMany({
    where: {
      status: "ACTIVE", endedAt: null, locationSharingEnabled: true,
      locationCapturedAt: { gte: cutoff }, lastUpdateAt: { gte: cutoff },
      lastLat: { not: null }, lastLng: { not: null },
      trip: { is: {
        routeId: { in: routeIds }, status: "IN_TRANSIT",
        bus: { is: { verificationStatus: "APPROVED", registrationExpiry: { gt: now }, insuranceExpiry: { gt: now }, inspectionExpiry: { gt: now } } },
        driver: { is: { verificationStatus: "APPROVED", phoneVerifiedAt: { not: null }, licenceExpiry: { gt: now } } },
      } },
    },
    orderBy: { lastUpdateAt: "desc" }, take: 100,
    include: { trip: { select: {
      id: true, routeId: true, busId: true,
      bus: { select: { plateNumber: true } },
      driver: { select: {
        routeApprovals: { where: { status: "APPROVED" }, select: { routeId: true } },
        vehicleAssignments: { where: { revokedAt: null }, select: { busId: true } },
      } },
      route: { select: { origin: true, destination: true } },
    } } },
  });
  const eligible = sessions.filter((session) => !!session.trip.driver
    && session.trip.driver.routeApprovals.some((approval) => approval.routeId === session.trip.routeId)
    && session.trip.driver.vehicleAssignments.some((assignment) => assignment.busId === session.trip.busId));
  const points = eligible.flatMap((session) => session.lastLat == null || session.lastLng == null ? [] : [{
    id: session.id, latitude: session.lastLat, longitude: session.lastLng,
    label: `${session.trip.bus.plateNumber} · ${session.trip.route.origin} → ${session.trip.route.destination}`,
    kind: "vehicle" as const,
    updatedAt: session.locationCapturedAt?.toISOString() ?? null,
  }]);
  return NextResponse.json({ points, activeVehicles: points.length, refreshedAt: now.toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
