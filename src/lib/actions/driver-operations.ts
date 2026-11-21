"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getDriverId } from "@/lib/session";
import { parseLagosDateTime } from "@/lib/dates";

export type DriverOperationState = { error?: string };

type LockedService = { id: string; routeId: string; busId: string; status: string; seatsTaken: number; seatsReserved: number; capacity: number; fareKobo: number };

async function lockApprovedService(
  tx: Prisma.TransactionClient,
  tripId: string,
  driverId: string,
  allowedStatuses: readonly ("SCHEDULED" | "BOARDING" | "IN_TRANSIT")[],
): Promise<LockedService | null> {
  const statuses = Prisma.join(allowedStatuses.map((status) => Prisma.sql`${status}`));
  const rows = await tx.$queryRaw<LockedService[]>(Prisma.sql`
    SELECT t.id, t."routeId", t."busId", t.status::text AS status,
      t."seatsTaken", t."seatsReserved", b.capacity, t."fareKobo"
    FROM "Trip" t
    JOIN "Bus" b ON b.id = t."busId"
    JOIN "Driver" d ON d.id = t."driverId"
    JOIN "DriverVehicleAssignment" a ON a."driverId" = d.id AND a."busId" = b.id AND a."revokedAt" IS NULL
    JOIN "DriverRouteApproval" r ON r."driverId" = d.id AND r."routeId" = t."routeId" AND r.status = 'APPROVED'
    WHERE t.id = ${tripId}
      AND t."driverId" = ${driverId}
      AND t.status::text IN (${statuses})
      AND d."verificationStatus" = 'APPROVED'
      AND d."phoneVerifiedAt" IS NOT NULL
      AND d."licenceExpiry" > NOW()
      AND b."verificationStatus" = 'APPROVED'
      AND b."registrationExpiry" > NOW()
      AND b."insuranceExpiry" > NOW()
      AND b."inspectionExpiry" > NOW()
    FOR UPDATE OF t
  `);
  return rows[0] ?? null;
}

export async function publishDriverTripAction(_prev: DriverOperationState | undefined, formData: FormData): Promise<DriverOperationState> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const parsed = z.object({
    routeId: z.string().min(1), busId: z.string().min(1),
    departureTime: z.string().min(1),
    fareNaira: z.coerce.number().finite().positive().max(1_000_000),
  }).safeParse({
    routeId: formData.get("routeId"), busId: formData.get("busId"),
    departureTime: formData.get("departureTime"), fareNaira: formData.get("fareNaira"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the trip details." };
  const departureTime = parseLagosDateTime(parsed.data.departureTime);
  if (Number.isNaN(departureTime.getTime()) || departureTime < new Date(Date.now() - 60_000)) return { error: "Choose a departure time in the future." };
  const fareKobo = Math.round(parsed.data.fareNaira * 100);
  try {
    const [driver, assignment, routeApproval] = await Promise.all([
      prisma.driver.findUnique({ where: { id: driverId } }),
      prisma.driverVehicleAssignment.findFirst({ where: { driverId, busId: parsed.data.busId, revokedAt: null, bus: { verificationStatus: "APPROVED", registrationExpiry: { gt: new Date() }, insuranceExpiry: { gt: new Date() }, inspectionExpiry: { gt: new Date() } } }, include: { bus: true } }),
      prisma.driverRouteApproval.findUnique({ where: { driverId_routeId: { driverId, routeId: parsed.data.routeId } } }),
    ]);
    if (!driver || !driver.phoneVerifiedAt || driver.verificationStatus !== "APPROVED" || !driver.licenceExpiry || driver.licenceExpiry <= new Date()) return { error: "Your driver profile and driving licence must be approved before publishing a trip." };
    if (!assignment) return { error: "Select a vehicle assigned to you and approved for service." };
    if (!routeApproval || routeApproval.status !== "APPROVED") return { error: "This route has not yet been approved for your driver profile." };
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Driver" WHERE id = ${driverId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Bus" WHERE id = ${assignment.busId} FOR UPDATE`;
      const overlapStart = new Date(departureTime.getTime() - 3 * 60 * 60_000);
      const overlapEnd = new Date(departureTime.getTime() + 3 * 60 * 60_000);
      const [driverConflict, vehicleConflict] = await Promise.all([
        tx.trip.findFirst({ where: { driverId, status: { in: ["SCHEDULED", "BOARDING", "IN_TRANSIT"] }, departureTime: { gte: overlapStart, lte: overlapEnd } }, select: { id: true } }),
        tx.trip.findFirst({ where: { busId: assignment.busId, status: { in: ["SCHEDULED", "BOARDING", "IN_TRANSIT"] }, departureTime: { gte: overlapStart, lte: overlapEnd } }, select: { id: true } }),
      ]);
      if (driverConflict) throw new Error("This driver already has a service close to that departure time.");
      if (vehicleConflict) throw new Error("This vehicle already has a service close to that departure time.");
      await tx.trip.create({ data: { routeId: parsed.data.routeId, busId: assignment.busId, operatorId: assignment.bus.operatorId ?? driver.operatorId, driverId, departureTime, fareKobo, status: "SCHEDULED" } });
    });
    revalidatePath("/driver/dashboard");
    revalidatePath("/trips");
    redirect("/driver/dashboard?published=1");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : "The trip could not be published." };
  }
}

// FormData-only adapter for ordinary HTML form actions. The underlying action
// retains its useActionState-compatible signature for any future interactive form.
export async function publishDriverTripFormAction(formData: FormData): Promise<void> {
  const result = await publishDriverTripAction(undefined, formData);
  if (result.error) {
    redirect(`/driver/dashboard?error=publish-failed&detail=${encodeURIComponent(result.error.slice(0, 160))}`);
  }
}

export async function openTripBoardingAction(formData: FormData): Promise<void> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const tripId = String(formData.get("tripId") ?? "");
  try {
    await prisma.$transaction(async (tx) => {
      const eligible = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT t.id FROM "Trip" t
        JOIN "Bus" b ON b.id = t."busId"
        JOIN "Driver" d ON d.id = t."driverId"
        JOIN "DriverVehicleAssignment" a ON a."driverId" = d.id AND a."busId" = b.id AND a."revokedAt" IS NULL
        JOIN "DriverRouteApproval" ra ON ra."driverId" = d.id AND ra."routeId" = t."routeId" AND ra.status = 'APPROVED'
        WHERE t.id = ${tripId} AND t."driverId" = ${driverId} AND t.status = 'SCHEDULED'
          AND d."verificationStatus" = 'APPROVED' AND d."phoneVerifiedAt" IS NOT NULL AND d."licenceExpiry" > NOW()
          AND b."verificationStatus" = 'APPROVED' AND b."registrationExpiry" > NOW()
          AND b."insuranceExpiry" > NOW() AND b."inspectionExpiry" > NOW()
        FOR UPDATE OF t
      `;
      if (!eligible.length) throw new Error("driver-or-service-not-approved");
      await tx.trip.update({ where: { id: tripId }, data: { status: "BOARDING" } });
    });
  } catch {
    redirect("/driver/dashboard?error=boarding-could-not-open");
  }
  revalidatePath("/driver/dashboard");
  revalidatePath("/trips");
  redirect("/driver/dashboard?trip=boarding-open");
}

export async function callNextPassengerAction(formData: FormData): Promise<void> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const tripId = String(formData.get("tripId") ?? "");
  try {
    await prisma.$transaction(async (tx) => {
      const service = await lockApprovedService(tx, tripId, driverId, ["BOARDING"]);
      if (!service) throw new Error("boarding-not-open");
      const calledCount = await tx.queueEntry.count({ where: { tripId, status: "CALLED" } });
      if (service.seatsTaken + service.seatsReserved + calledCount >= service.capacity) throw new Error("vehicle-full");
      const next = await tx.queueEntry.findFirst({ where: { tripId, status: "WAITING" }, orderBy: [{ position: "asc" }, { joinedAt: "asc" }] });
      if (!next) throw new Error("queue-empty");
      await tx.queueEntry.update({ where: { id: next.id }, data: { status: "CALLED" } });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "call-failed";
    const safe = ["boarding-not-open", "vehicle-full", "queue-empty"].includes(reason) ? reason : "call-failed";
    redirect(`/driver/dashboard?error=${safe}`);
  }
  revalidatePath("/driver/dashboard");
  revalidatePath("/c/dashboard");
  redirect("/driver/dashboard?boarding=called");
}

export async function acceptCashFareAction(formData: FormData): Promise<void> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const tripId = String(formData.get("tripId") ?? "");
  const queueEntryId = String(formData.get("queueEntryId") ?? "");
  try {
    await prisma.$transaction(async (tx) => {
      const service = await lockApprovedService(tx, tripId, driverId, ["BOARDING"]);
      if (!service) throw new Error("boarding-not-open");
      const entry = await tx.queueEntry.findFirst({ where: { id: queueEntryId, tripId, status: "CALLED" }, include: { commuter: { select: { id: true } } } });
      if (!entry) throw new Error("passenger-not-called");
      if (service.seatsTaken + service.seatsReserved >= service.capacity) throw new Error("vehicle-full");
      if (service.fareKobo <= 0) throw new Error("fare-not-set");
      const existingPaid = await tx.payment.findFirst({ where: { tripId, commuterId: entry.commuterId, status: "SUCCEEDED", purpose: "TRIP_FARE" }, select: { id: true } });
      if (existingPaid) throw new Error("fare-already-paid");
      const reference = `qnot_cash_${Date.now()}_${randomBytes(4).toString("hex")}`;
      await tx.payment.create({ data: { commuterId: entry.commuterId, tripId, provider: "CASH", reference, amountKobo: service.fareKobo, currency: "NGN", status: "SUCCEEDED", purpose: "TRIP_FARE", paidAt: new Date() } });
      await tx.queueEntry.update({ where: { id: entry.id }, data: { status: "CONFIRMED", resolvedAt: null } });
      await tx.ticket.create({ data: { tripId, commuterId: entry.commuterId, code: `QN-${randomBytes(5).toString("hex").toUpperCase()}` } });
      await tx.trip.update({ where: { id: tripId }, data: { seatsReserved: { increment: 1 } } });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "cash-fare-failed";
    const safe = ["boarding-not-open", "passenger-not-called", "vehicle-full", "fare-already-paid", "fare-not-set"].includes(reason) ? reason : "cash-fare-failed";
    redirect(`/driver/dashboard?error=${safe}`);
  }
  revalidatePath("/driver/dashboard");
  revalidatePath("/c/dashboard");
  revalidatePath("/c/tickets");
  revalidatePath("/c/q-funds");
  redirect("/driver/dashboard?boarding=paid");
}

export async function startDriverTripAction(formData: FormData): Promise<void> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const tripId = String(formData.get("tripId") ?? "");
  if (!tripId) redirect("/driver/dashboard?error=trip-not-found");
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; seatsReserved: number }>>`
        SELECT t.id, t."seatsReserved" FROM "Trip" t
        JOIN "Bus" b ON b.id = t."busId"
        JOIN "Driver" d ON d.id = t."driverId"
        JOIN "DriverVehicleAssignment" a ON a."driverId" = d.id AND a."busId" = b.id AND a."revokedAt" IS NULL
        JOIN "DriverRouteApproval" ra ON ra."driverId" = d.id AND ra."routeId" = t."routeId" AND ra.status = 'APPROVED'
        WHERE t.id = ${tripId} AND t."driverId" = ${driverId} AND t.status = 'BOARDING'
          AND d."verificationStatus" = 'APPROVED' AND d."phoneVerifiedAt" IS NOT NULL AND d."licenceExpiry" > NOW()
          AND b."verificationStatus" = 'APPROVED' AND b."registrationExpiry" > NOW()
          AND b."insuranceExpiry" > NOW() AND b."inspectionExpiry" > NOW()
        FOR UPDATE OF t
      `;
      if (!locked.length) throw new Error("driver-or-service-not-approved");
      if (locked[0].seatsReserved > 0) throw new Error("unboarded-bookings");
      await tx.queueEntry.updateMany({ where: { tripId, status: { in: ["WAITING", "CALLED"] } }, data: { status: "EXPIRED", resolvedAt: new Date() } });
      await tx.trip.update({ where: { id: tripId }, data: { status: "IN_TRANSIT" } });
      await tx.driverSession.updateMany({ where: { tripId, driverId, status: "ACTIVE" }, data: { status: "ENDED", endedAt: new Date() } });
      await tx.driverSession.create({ data: { tripId, driverId, status: "ACTIVE" } });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "trip-start-failed";
    redirect(`/driver/dashboard?error=${reason === "unboarded-bookings" ? reason : "trip-not-ready"}`);
  }
  revalidatePath("/driver/dashboard");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  redirect("/driver/dashboard?trip=started");
}

export async function markPassengerBoardedAction(formData: FormData): Promise<void> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const tripId = String(formData.get("tripId") ?? "");
  const ticketCode = String(formData.get("ticketCode") ?? "").trim().toUpperCase();
  if (!tripId || !/^QN-[A-F0-9]{10}$/.test(ticketCode)) redirect("/driver/dashboard?error=invalid-boarding-code");
  try {
    await prisma.$transaction(async (tx) => {
      const service = await lockApprovedService(tx, tripId, driverId, ["BOARDING", "IN_TRANSIT"]);
      if (!service) throw new Error("trip-not-active");
      const ticket = await tx.ticket.findUnique({ where: { code: ticketCode }, select: { id: true, tripId: true, commuterId: true, status: true } });
      if (!ticket || ticket.tripId !== tripId || ticket.status !== "ISSUED") throw new Error("ticket-invalid");
      const payment = await tx.payment.findFirst({ where: { tripId, commuterId: ticket.commuterId, status: "SUCCEEDED", purpose: "TRIP_FARE" }, select: { id: true } });
      if (!payment) throw new Error("payment-not-confirmed");
      const queueEntry = await tx.queueEntry.findUnique({ where: { tripId_commuterId: { tripId, commuterId: ticket.commuterId } } });
      if (!queueEntry || queueEntry.status !== "CONFIRMED") throw new Error("booking-not-confirmed");
      if (service.seatsReserved < 1 || service.seatsTaken >= service.capacity) throw new Error("capacity-state-invalid");
      await tx.ticket.update({ where: { id: ticket.id }, data: { status: "USED", usedAt: new Date() } });
      await tx.queueEntry.update({ where: { id: queueEntry.id }, data: { status: "SEATED", resolvedAt: new Date() } });
      await tx.trip.update({ where: { id: tripId }, data: { seatsReserved: { decrement: 1 }, seatsTaken: { increment: 1 } } });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "boarding-failed";
    const safe = ["trip-not-active", "ticket-invalid", "payment-not-confirmed", "booking-not-confirmed", "capacity-state-invalid"].includes(reason) ? reason : "boarding-failed";
    redirect(`/driver/dashboard?error=${safe}`);
  }
  revalidatePath("/driver/dashboard");
  revalidatePath("/c/tickets");
  revalidatePath("/c/dashboard");
  redirect("/driver/dashboard?boarding=confirmed");
}

export async function completeDriverTripAction(formData: FormData): Promise<void> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const tripId = String(formData.get("tripId") ?? "");
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; seatsReserved: number }>>`
        SELECT id, "seatsReserved" FROM "Trip" WHERE id = ${tripId} AND "driverId" = ${driverId} AND status = 'IN_TRANSIT' FOR UPDATE
      `;
      if (!locked.length) throw new Error("trip-not-active");
      if (locked[0].seatsReserved > 0) throw new Error("pending-bookings");
      await tx.driverSession.updateMany({ where: { tripId, driverId, status: "ACTIVE" }, data: { status: "ENDED", endedAt: new Date() } });
      await tx.trip.update({ where: { id: tripId }, data: { status: "COMPLETED" } });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "trip-completion-failed";
    redirect(`/driver/dashboard?error=${reason === "pending-bookings" ? reason : "trip-completion-failed"}`);
  }
  revalidatePath("/driver/dashboard");
  revalidatePath("/trips");
  redirect("/driver/dashboard?trip=completed");
}

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && typeof (error as { digest?: unknown }).digest === "string" && (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}
