"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOperatorManagementAccess } from "@/lib/operator-access";
import { parseLagosDateTime } from "@/lib/dates";

export type RouteFormState = {
  error?: {
    origin?: string[];
    destination?: string[];
    _form?: string[];
  };
};

const RouteSchema = z.object({
  origin: z.string().min(1, "Origin required").max(100),
  destination: z.string().min(1, "Destination required").max(100),
});

export async function createRouteAction(
  _prev: RouteFormState | undefined,
  formData: FormData,
): Promise<RouteFormState> {
  const operatorId = await requireOperatorManagementAccess();

  const parsed = RouteSchema.safeParse({
    origin: formData.get("origin"),
    destination: formData.get("destination"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { origin, destination } = parsed.data;

  await prisma.route.create({
    data: {
      operatorId,
      origin,
      destination,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}


export async function addRouteStopAction(formData: FormData): Promise<void> {
  const operatorId = await requireOperatorManagementAccess();
  const parsed = z.object({
    routeId: z.string().min(1),
    name: z.string().trim().min(2).max(100),
    latitude: z.preprocess((value) => value === "" || value == null ? undefined : Number(value), z.number().finite().min(-90).max(90)),
    longitude: z.preprocess((value) => value === "" || value == null ? undefined : Number(value), z.number().finite().min(-180).max(180)),
  }).safeParse({
    routeId: formData.get("routeId"), name: formData.get("name"),
    latitude: formData.get("latitude"), longitude: formData.get("longitude"),
  });
  if (!parsed.success) redirect(`/dashboard/routes/${String(formData.get("routeId") ?? "")}?error=stop-details`);
  try {
    await prisma.$transaction(async (tx) => {
      const route = await tx.route.findFirst({ where: { id: parsed.data.routeId, operatorId }, select: { id: true } });
      if (!route) throw new Error("route-not-owned");
      await tx.$queryRaw`SELECT id FROM "Route" WHERE id = ${route.id} FOR UPDATE`;
      const last = await tx.stop.aggregate({ where: { routeId: route.id }, _max: { sequence: true } });
      await tx.stop.create({ data: { routeId: route.id, name: parsed.data.name, latitude: parsed.data.latitude, longitude: parsed.data.longitude, sequence: (last._max.sequence ?? 0) + 1 } });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "stop-save-failed";
    redirect(`/dashboard/routes/${encodeURIComponent(parsed.data.routeId)}?error=${reason === "route-not-owned" ? reason : "stop-save-failed"}`);
  }
  revalidatePath(`/dashboard/routes/${parsed.data.routeId}`);
  revalidatePath("/c/requests/new");
  revalidatePath("/network/dispatch");
  redirect(`/dashboard/routes/${parsed.data.routeId}?stop=added`);
}


export async function createOperatorTripAction(formData: FormData): Promise<void> {
  const operatorId = await requireOperatorManagementAccess();
  const parsed = z.object({
    routeId: z.string().min(1),
    assignmentId: z.string().min(1),
    departureTime: z.string().min(1),
    fareNaira: z.coerce.number().finite().positive().max(1_000_000),
  }).safeParse({
    routeId: formData.get("routeId"), assignmentId: formData.get("assignmentId"),
    departureTime: formData.get("departureTime"), fareNaira: formData.get("fareNaira"),
  });
  if (!parsed.success) redirect(`/dashboard/routes/${String(formData.get("routeId") ?? "")}?error=trip-details`);
  const departureTime = parseLagosDateTime(parsed.data.departureTime);
  if (Number.isNaN(departureTime.getTime()) || departureTime < new Date(Date.now() + 5 * 60_000)) {
    redirect(`/dashboard/routes/${parsed.data.routeId}?error=trip-time`);
  }
  const fareKobo = Math.round(parsed.data.fareNaira * 100);
  const now = new Date();
  try {
    await prisma.$transaction(async (tx) => {
      const route = await tx.route.findFirst({ where: { id: parsed.data.routeId, operatorId }, select: { id: true } });
      if (!route) throw new Error("route-not-owned");
      const stopCount = await tx.stop.count({ where: { routeId: route.id } });
      if (stopCount < 2) throw new Error("route-needs-stops");
      const assignment = await tx.driverVehicleAssignment.findFirst({
        where: {
          id: parsed.data.assignmentId,
          revokedAt: null,
          driver: { operatorId, verificationStatus: "APPROVED", phoneVerifiedAt: { not: null }, licenceExpiry: { gt: now }, routeApprovals: { some: { routeId: route.id, status: "APPROVED" } } },
          bus: { operatorId, verificationStatus: "APPROVED", registrationExpiry: { gt: now }, insuranceExpiry: { gt: now }, inspectionExpiry: { gt: now } },
        },
        select: { id: true, driverId: true, busId: true },
      });
      if (!assignment) throw new Error("driver-vehicle-not-cleared");
      const driverId = assignment.driverId;
      const busId = assignment.busId;
      // Serialize schedule checks on both resources so parallel operator
      // requests cannot allocate the same driver or vehicle twice.
      await tx.$queryRaw`SELECT id FROM "Driver" WHERE id = ${driverId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Bus" WHERE id = ${busId} FOR UPDATE`;
      const overlapStart = new Date(departureTime.getTime() - 3 * 60 * 60_000);
      const overlapEnd = new Date(departureTime.getTime() + 3 * 60 * 60_000);
      const [driverConflict, vehicleConflict] = await Promise.all([
        tx.trip.findFirst({ where: { driverId, status: { in: ["SCHEDULED", "BOARDING", "IN_TRANSIT"] }, departureTime: { gte: overlapStart, lte: overlapEnd } }, select: { id: true } }),
        tx.trip.findFirst({ where: { busId, status: { in: ["SCHEDULED", "BOARDING", "IN_TRANSIT"] }, departureTime: { gte: overlapStart, lte: overlapEnd } }, select: { id: true } }),
      ]);
      if (driverConflict) throw new Error("driver-schedule-conflict");
      if (vehicleConflict) throw new Error("vehicle-schedule-conflict");
      await tx.trip.create({ data: { routeId: route.id, busId, operatorId, driverId, departureTime, fareKobo, status: "SCHEDULED" } });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "trip-create-failed";
    const safe = ["route-not-owned", "route-needs-stops", "driver-vehicle-not-cleared", "driver-schedule-conflict", "vehicle-schedule-conflict"].includes(reason) ? reason : "trip-create-failed";
    redirect(`/dashboard/routes/${parsed.data.routeId}?error=${safe}`);
  }
  revalidatePath(`/dashboard/routes/${parsed.data.routeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/trips");
  revalidatePath("/");
  redirect(`/dashboard/routes/${parsed.data.routeId}?trip=published`);
}
