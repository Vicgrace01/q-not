"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId, getSessionOperatorId } from "@/lib/session";
import { env } from "@/lib/env";
import { parseLagosDateTime } from "@/lib/dates";

export async function createJourneyRequestAction(formData: FormData): Promise<void> {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login?next=%2Fc%2Frequests%2Fnew");
  const parsed = z.object({
    routeId: z.string().min(1),
    boardingStopId: z.string().min(1),
    alightingStopId: z.string().min(1),
    desiredDepartureAt: z.string().min(1),
    passengerCount: z.coerce.number().int().min(1).max(8),
  }).safeParse({
    routeId: formData.get("routeId"), boardingStopId: formData.get("boardingStopId"),
    alightingStopId: formData.get("alightingStopId"), desiredDepartureAt: formData.get("desiredDepartureAt"),
    passengerCount: formData.get("passengerCount"),
  });
  if (!parsed.success) redirect("/c/requests/new?error=details");
  const departure = parseLagosDateTime(parsed.data.desiredDepartureAt);
  if (Number.isNaN(departure.getTime()) || departure.getTime() < Date.now() + 5 * 60_000) redirect("/c/requests/new?error=time");
  const [boarding, alighting] = await Promise.all([
    prisma.stop.findFirst({ where: { id: parsed.data.boardingStopId, routeId: parsed.data.routeId } }),
    prisma.stop.findFirst({ where: { id: parsed.data.alightingStopId, routeId: parsed.data.routeId } }),
  ]);
  if (!boarding || !alighting || boarding.sequence >= alighting.sequence) redirect("/c/requests/new?error=stops");
  const alreadyOpen = await prisma.journeyRequest.findFirst({
    where: { commuterId, routeId: parsed.data.routeId, status: "OPEN", desiredDepartureAt: { gte: new Date(Date.now() - 30 * 60_000), lte: new Date(Date.now() + 6 * 60 * 60_000) } },
    select: { id: true },
  });
  if (alreadyOpen) redirect("/c/requests?created=existing");
  await prisma.journeyRequest.create({ data: {
    commuterId, routeId: parsed.data.routeId,
    boardingStopId: parsed.data.boardingStopId, alightingStopId: parsed.data.alightingStopId,
    desiredDepartureAt: departure, passengerCount: parsed.data.passengerCount,
  } });
  revalidatePath("/network/dispatch");
  revalidatePath("/c/requests");
  redirect("/c/requests?created=1");
}

export async function cancelJourneyRequestAction(formData: FormData): Promise<void> {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login");
  const requestId = String(formData.get("requestId") ?? "");
  await prisma.journeyRequest.updateMany({
    where: { id: requestId, commuterId, status: { in: ["OPEN", "MATCHED"] } },
    data: { status: "CANCELLED", matchedTripId: null },
  });
  revalidatePath("/c/requests");
  revalidatePath("/network/dispatch");
  redirect("/c/requests?cancelled=1");
}

async function requireDispatchAccess() {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");
  const operator = await prisma.operator.findUnique({ where: { id: operatorId }, select: { email: true } });
  if (!operator) redirect("/login");
  const admins = (env.QNOT_NETWORK_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return { operatorId, isNetworkAdmin: admins.includes(operator.email.toLowerCase()) };
}

export async function matchJourneyRequestAction(formData: FormData): Promise<void> {
  const { operatorId, isNetworkAdmin } = await requireDispatchAccess();
  const parsed = z.object({ requestId: z.string().min(1), tripId: z.string().min(1) }).safeParse({
    requestId: formData.get("requestId"), tripId: formData.get("tripId"),
  });
  if (!parsed.success) redirect("/network/dispatch?error=invalid");
  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.journeyRequest.findUnique({
        where: { id: parsed.data.requestId },
        include: { route: { select: { operatorId: true } }, boardingStop: true, alightingStop: true },
      });
      if (!request || request.status !== "OPEN") throw new Error("request-unavailable");
      if (!isNetworkAdmin && request.route.operatorId !== operatorId) throw new Error("not-authorised");
      const tripRows = await tx.$queryRaw<Array<{ id: string; departureTime: Date; seatsTaken: number; seatsReserved: number; capacity: number }>>`
        SELECT t.id, t."departureTime", t."seatsTaken", t."seatsReserved", t."driverId", b.capacity
        FROM "Trip" t
        JOIN "Bus" b ON b.id = t."busId"
        JOIN "Driver" d ON d.id = t."driverId"
        JOIN "DriverVehicleAssignment" assignment
          ON assignment."driverId" = d.id AND assignment."busId" = b.id AND assignment."revokedAt" IS NULL
        JOIN "DriverRouteApproval" route_approval
          ON route_approval."driverId" = d.id AND route_approval."routeId" = t."routeId" AND route_approval.status = 'APPROVED'
        WHERE t.id = ${parsed.data.tripId} AND t."routeId" = ${request.routeId}
          AND t.status IN ('SCHEDULED','BOARDING')
          AND b."verificationStatus" = 'APPROVED'
          AND b."registrationExpiry" > NOW() AND b."insuranceExpiry" > NOW() AND b."inspectionExpiry" > NOW()
          AND d."verificationStatus" = 'APPROVED' AND d."phoneVerifiedAt" IS NOT NULL
          AND d."licenceExpiry" > NOW()
        FOR UPDATE OF t
      `;
      if (!tripRows.length) throw new Error("trip-unavailable");
      const trip = tripRows[0];
      const timeDifference = Math.abs(trip.departureTime.getTime() - request.desiredDepartureAt.getTime());
      if (timeDifference > 30 * 60_000) throw new Error("departure-window");
      const [routeStops, matchedDemand] = await Promise.all([
        tx.stop.findMany({ where: { routeId: request.routeId, id: { in: [request.boardingStopId, request.alightingStopId] } }, select: { id: true, sequence: true } }),
        tx.journeyRequest.aggregate({ where: { matchedTripId: trip.id, status: "MATCHED" }, _sum: { passengerCount: true } }),
      ]);
      const boarding = routeStops.find((stop) => stop.id === request.boardingStopId);
      const alighting = routeStops.find((stop) => stop.id === request.alightingStopId);
      if (!boarding || !alighting || boarding.sequence >= alighting.sequence) throw new Error("route-stops-invalid");
      const available = trip.capacity - trip.seatsTaken - trip.seatsReserved - (matchedDemand._sum.passengerCount ?? 0);
      if (available < request.passengerCount) throw new Error("insufficient-capacity");
      const matched = await tx.journeyRequest.updateMany({ where: { id: request.id, status: "OPEN" }, data: { status: "MATCHED", matchedTripId: trip.id } });
      if (matched.count !== 1) throw new Error("request-unavailable");
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "match-failed";
    const safe = ["request-unavailable", "not-authorised", "trip-unavailable", "departure-window", "route-stops-invalid", "insufficient-capacity"].includes(reason) ? reason : "match-failed";
    redirect(`/network/dispatch?error=${safe}`);
  }
  revalidatePath("/network/dispatch");
  revalidatePath("/c/requests");
  redirect("/network/dispatch?matched=1");
}
