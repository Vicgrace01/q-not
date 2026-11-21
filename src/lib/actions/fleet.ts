"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionOperatorId } from "@/lib/session";
import { normaliseNigerianPhone } from "@/lib/otp/persistent";
import { assertOperatorMayManageDriver } from "@/lib/driver/operator-association";

export async function createFleetVehicleAction(formData: FormData): Promise<void> {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");
  const parsed = z.object({
    plateNumber: z.string().trim().min(4).max(15).regex(/^[A-Za-z0-9 -]+$/),
    vehicleType: z.enum(["DANFO", "KOROPE", "HIACE", "COASTER", "SHUTTLE", "OTHER"]),
    capacity: z.coerce.number().int().min(2).max(60),
    make: z.string().trim().max(60).optional(),
    model: z.string().trim().max(60).optional(),
    modelYear: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
    colour: z.string().trim().min(2).max(40),
    registrationExpiry: z.string().min(1), insuranceExpiry: z.string().min(1), inspectionExpiry: z.string().min(1),
  }).safeParse({
    plateNumber: formData.get("plateNumber"), vehicleType: formData.get("vehicleType"), capacity: formData.get("capacity"),
    make: formData.get("make") ?? "", model: formData.get("model") ?? "", modelYear: formData.get("modelYear"), colour: formData.get("colour"),
    registrationExpiry: formData.get("registrationExpiry"), insuranceExpiry: formData.get("insuranceExpiry"), inspectionExpiry: formData.get("inspectionExpiry"),
  });
  if (!parsed.success) redirect("/dashboard/fleet?error=vehicle-details");
  const plateNumber = parsed.data.plateNumber.toUpperCase().replace(/\s+/g, " ");
  const registrationExpiry = new Date(`${parsed.data.registrationExpiry}T23:59:59.000Z`);
  const insuranceExpiry = new Date(`${parsed.data.insuranceExpiry}T23:59:59.000Z`);
  const inspectionExpiry = new Date(`${parsed.data.inspectionExpiry}T23:59:59.000Z`);
  if ([registrationExpiry, insuranceExpiry, inspectionExpiry].some((date) => Number.isNaN(date.getTime()) || date <= new Date())) redirect("/dashboard/fleet?error=vehicle-expiry");
  const existing = await prisma.bus.findUnique({ where: { plateNumber }, select: { id: true } });
  if (existing) redirect("/dashboard/fleet?error=plate-in-use");
  await prisma.bus.create({ data: {
    operatorId, plateNumber, vehicleType: parsed.data.vehicleType, capacity: parsed.data.capacity,
    make: parsed.data.make || null, model: parsed.data.model || null, modelYear: parsed.data.modelYear,
    colour: parsed.data.colour, registrationExpiry, insuranceExpiry, inspectionExpiry, verificationStatus: "PENDING",
  } });
  revalidatePath("/dashboard/fleet");
  revalidatePath("/network/verification");
  redirect("/dashboard/fleet?vehicle=registered");
}


export async function updateFleetVehicleAction(formData: FormData): Promise<void> {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");

  const parsed = z.object({
    busId: z.string().min(1),
    plateNumber: z.string().trim().min(4).max(15).regex(/^[A-Za-z0-9 -]+$/),
    vehicleType: z.enum(["DANFO", "KOROPE", "HIACE", "COASTER", "SHUTTLE", "OTHER"]),
    capacity: z.coerce.number().int().min(2).max(60),
    make: z.string().trim().max(60).optional(),
    model: z.string().trim().max(60).optional(),
    modelYear: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
    colour: z.string().trim().min(2).max(40),
    registrationExpiry: z.string().min(1),
    insuranceExpiry: z.string().min(1),
    inspectionExpiry: z.string().min(1),
  }).safeParse({
    busId: formData.get("busId"),
    plateNumber: formData.get("plateNumber"),
    vehicleType: formData.get("vehicleType"),
    capacity: formData.get("capacity"),
    make: formData.get("make") ?? "",
    model: formData.get("model") ?? "",
    modelYear: formData.get("modelYear"),
    colour: formData.get("colour"),
    registrationExpiry: formData.get("registrationExpiry"),
    insuranceExpiry: formData.get("insuranceExpiry"),
    inspectionExpiry: formData.get("inspectionExpiry"),
  });
  if (!parsed.success) redirect("/dashboard/fleet?error=vehicle-details");

  const plateNumber = parsed.data.plateNumber.toUpperCase().replace(/\s+/g, " ");
  const expiries = [parsed.data.registrationExpiry, parsed.data.insuranceExpiry, parsed.data.inspectionExpiry]
    .map((value) => new Date(`${value}T23:59:59.000Z`));
  if (expiries.some((date) => Number.isNaN(date.getTime()) || date <= new Date())) {
    redirect("/dashboard/fleet?error=vehicle-expiry");
  }

  const vehicle = await prisma.bus.findFirst({ where: { id: parsed.data.busId, operatorId }, select: { id: true } });
  if (!vehicle) redirect("/dashboard/fleet?error=vehicle-not-owned");
  const plateOwner = await prisma.bus.findUnique({ where: { plateNumber }, select: { id: true } });
  if (plateOwner && plateOwner.id !== vehicle.id) redirect("/dashboard/fleet?error=plate-in-use");

  await prisma.bus.updateMany({
    where: { id: vehicle.id, operatorId },
    data: {
      plateNumber,
      vehicleType: parsed.data.vehicleType,
      capacity: parsed.data.capacity,
      make: parsed.data.make || null,
      model: parsed.data.model || null,
      modelYear: parsed.data.modelYear,
      colour: parsed.data.colour,
      registrationExpiry: expiries[0],
      insuranceExpiry: expiries[1],
      inspectionExpiry: expiries[2],
      verificationStatus: "PENDING",
    },
  });
  revalidatePath("/dashboard/fleet");
  revalidatePath("/network/verification");
  revalidatePath("/network/dispatch");
  redirect("/dashboard/fleet?vehicle=updated");
}

export async function registerOperatorDriverAction(formData: FormData): Promise<void> {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().min(7).max(25),
    routeId: z.string().min(1),
    busId: z.string().optional(),
  }).safeParse({ name: formData.get("name"), phone: formData.get("phone"), routeId: formData.get("routeId"), busId: formData.get("busId") || "" });
  if (!parsed.success) redirect("/dashboard/fleet?error=driver-details");
  let phone: string;
  try { phone = normaliseNigerianPhone(parsed.data.phone); }
  catch { redirect("/dashboard/fleet?error=driver-phone"); }

  try {
    await prisma.$transaction(async (tx) => {
      const route = await tx.route.findFirst({ where: { id: parsed.data.routeId, operatorId }, select: { id: true } });
      if (!route) throw new Error("route-not-owned");
      if (parsed.data.busId) {
        const bus = await tx.bus.findFirst({ where: { id: parsed.data.busId, operatorId }, select: { id: true } });
        if (!bus) throw new Error("vehicle-not-owned");
      }
      let driver = await tx.driver.findUnique({ where: { phone }, select: { id: true, operatorId: true } });
      const association = assertOperatorMayManageDriver(driver, operatorId);
      if (association === "CREATE_NEW") {
        driver = await tx.driver.create({ data: { name: parsed.data.name, phone, operatorId, verificationStatus: "PENDING" }, select: { id: true, operatorId: true } });
      } else if (driver) {
        driver = await tx.driver.update({ where: { id: driver.id }, data: { name: parsed.data.name }, select: { id: true, operatorId: true } });
      }
      if (!driver) throw new Error("driver-save-failed");
      await tx.driverRouteApproval.upsert({
        where: { driverId_routeId: { driverId: driver.id, routeId: route.id } },
        update: { status: "PENDING", reviewedAt: null },
        create: { driverId: driver.id, routeId: route.id, status: "PENDING" },
      });
      if (parsed.data.busId) {
        await tx.driverVehicleAssignment.upsert({
          where: { driverId_busId: { driverId: driver.id, busId: parsed.data.busId } },
          update: { revokedAt: null },
          create: { driverId: driver.id, busId: parsed.data.busId },
        });
      }
      for (const kind of ["IDENTITY", "DRIVING_LICENCE", ...(parsed.data.busId ? ["RIGHT_TO_OPERATE_VEHICLE"] : [])]) {
        const existingCheck = await tx.driverVerification.findFirst({ where: { driverId: driver.id, kind, status: { in: ["PENDING", "APPROVED"] } }, select: { id: true } });
        if (!existingCheck) await tx.driverVerification.create({ data: { driverId: driver.id, kind, status: "PENDING", notes: kind === "IDENTITY" ? "Identity proofing requires informed consent and an authorised verification provider." : kind === "DRIVING_LICENCE" ? "Confirm driving licence validity through an authorised FRSC service." : "Confirm operator authority to assign this vehicle to the driver." } });
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "driver-save-failed";
    const code = ["route-not-owned", "vehicle-not-owned", "driver-already-assigned", "driver-claim-required"].includes(reason) ? reason : "driver-save-failed";
    redirect(`/dashboard/fleet?error=${code}`);
  }
  revalidatePath("/dashboard/fleet");
  revalidatePath("/network/verification");
  redirect("/dashboard/fleet?driver=registered");
}
