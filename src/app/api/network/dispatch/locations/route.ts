import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSessionOperatorId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) return NextResponse.json({ error: "Sign in to access network dispatch." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const operator = await prisma.operator.findUnique({ where: { id: operatorId }, select: { email: true } });
  if (!operator) return NextResponse.json({ error: "Operator account not found." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const admins = (env.QNOT_NETWORK_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const isNetworkAdmin = admins.includes(operator.email.toLowerCase());
  const routes = await prisma.route.findMany({ where: isNetworkAdmin ? {} : { operatorId }, select: { id: true } });
  const routeIds = routes.map((route) => route.id);
  const now = new Date();
  if (routeIds.length === 0) return NextResponse.json({ points: [], activeVehicles: 0, openRequests: 0, passengerDemand: 0, refreshedAt: now.toISOString() }, { headers: { "Cache-Control": "no-store" } });
  const gpsCutoff = new Date(now.getTime() - 45_000);
  const requestStart = new Date(now.getTime() - 30 * 60_000);
  const requestEnd = new Date(now.getTime() + 24 * 60 * 60_000);
  const [sessions, requests] = await Promise.all([
    prisma.driverSession.findMany({
      where: {
        status: "ACTIVE", endedAt: null, locationSharingEnabled: true,
        locationCapturedAt: { gte: gpsCutoff }, lastUpdateAt: { gte: gpsCutoff },
        lastLat: { not: null }, lastLng: { not: null },
        trip: { is: {
          routeId: { in: routeIds }, status: "IN_TRANSIT",
          bus: { is: { verificationStatus: "APPROVED", registrationExpiry: { gt: now }, insuranceExpiry: { gt: now }, inspectionExpiry: { gt: now } } },
          driver: { is: { verificationStatus: "APPROVED", phoneVerifiedAt: { not: null }, licenceExpiry: { gt: now } } },
        } },
      }, orderBy: { lastUpdateAt: "desc" }, take: 200,
      include: { trip: { select: {
        routeId: true, busId: true,
        bus: { select: { plateNumber: true } },
        driver: { select: {
          routeApprovals: { where: { status: "APPROVED" }, select: { routeId: true } },
          vehicleAssignments: { where: { revokedAt: null }, select: { busId: true } },
        } },
        route: { select: { origin: true, destination: true } },
      } } },
    }),
    prisma.journeyRequest.findMany({
      where: { routeId: { in: routeIds }, status: "OPEN", desiredDepartureAt: { gte: requestStart, lte: requestEnd } },
      select: { id: true, passengerCount: true, boardingStop: { select: { name: true, latitude: true, longitude: true } }, route: { select: { origin: true, destination: true } } },
      take: 200,
    }),
  ]);
  const eligibleSessions = sessions.filter((session) => !!session.trip.driver
    && session.trip.driver.routeApprovals.some((approval) => approval.routeId === session.trip.routeId)
    && session.trip.driver.vehicleAssignments.some((assignment) => assignment.busId === session.trip.busId));
  const points: Array<{ id: string; latitude: number; longitude: number; label: string; kind: "vehicle" | "demand"; updatedAt?: string | null }> = eligibleSessions.flatMap((session) => session.lastLat == null || session.lastLng == null ? [] : [{
    id: `vehicle-${session.id}`, latitude: session.lastLat, longitude: session.lastLng,
    label: `${session.trip.bus.plateNumber} · ${session.trip.route.origin} → ${session.trip.route.destination}`,
    kind: "vehicle", updatedAt: session.locationCapturedAt?.toISOString() ?? null,
  }]);
  for (const request of requests) points.push({
    id: `demand-${request.id}`, latitude: request.boardingStop.latitude, longitude: request.boardingStop.longitude,
    label: `${request.passengerCount} requested · ${request.boardingStop.name} · ${request.route.origin} → ${request.route.destination}`,
    kind: "demand",
  });
  return NextResponse.json({
    points, activeVehicles: eligibleSessions.length, openRequests: requests.length,
    passengerDemand: requests.reduce((sum, request) => sum + request.passengerCount, 0),
    refreshedAt: now.toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
