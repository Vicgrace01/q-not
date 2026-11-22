"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSessionOperatorId } from "@/lib/session";

async function requireNetworkAdmin() {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");
  const operator = await prisma.operator.findUnique({ where: { id: operatorId }, select: { email: true } });
  const allowed = (env.QNOT_NETWORK_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!operator || !allowed.includes(operator.email.toLowerCase())) redirect("/dashboard");
  return operatorId;
}

export async function updateNetworkReviewAction(formData: FormData): Promise<void> {
  const adminId = await requireNetworkAdmin();
  const parsed = z.object({
    target: z.enum(["OPERATOR", "DRIVER_CHECK", "VEHICLE", "ROUTE"]),
    id: z.string().min(1),
    decision: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
    notes: z.string().max(500).optional(),
  }).safeParse({
    target: formData.get("target"), id: formData.get("id"), decision: formData.get("decision"), notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) throw new Error("Invalid review action.");

  const { target, id, decision, notes } = parsed.data;
  if (target === "OPERATOR" && id === adminId) redirect("/network/verification?error=operator-self-review");
  await prisma.$transaction(async (tx) => {
    if (target === "OPERATOR") {
      const pendingOperator = await tx.operator.findUnique({ where: { id }, select: { id: true } });
      if (!pendingOperator) throw new Error("Operator account not found.");
      await tx.operator.update({ where: { id }, data: { verificationStatus: decision } });
    } else if (target === "DRIVER_CHECK") {
      const check = await tx.driverVerification.findUnique({ where: { id }, select: { id: true, driverId: true, kind: true } });
      if (!check) throw new Error("Driver verification record not found.");
      await tx.driverVerification.update({ where: { id }, data: { status: decision, reviewedAt: new Date(), notes: notes || `Reviewed by network operator ${adminId}.` } });
      const checks = await tx.driverVerification.findMany({ where: { driverId: check.driverId, kind: { in: ["IDENTITY", "DRIVING_LICENCE", "RIGHT_TO_OPERATE_VEHICLE"] } }, orderBy: { createdAt: "desc" }, select: { kind: true, status: true } });
      const latestByKind = new Map<string, string>();
      for (const item of checks) if (!latestByKind.has(item.kind)) latestByKind.set(item.kind, item.status);
      const allChecksApproved = ["IDENTITY", "DRIVING_LICENCE", "RIGHT_TO_OPERATE_VEHICLE"].every((kind) => latestByKind.get(kind) === "APPROVED");
      const driver = await tx.driver.findUnique({ where: { id: check.driverId }, select: { licenceExpiry: true, phoneVerifiedAt: true } });
      const driverStatus = decision === "SUSPENDED" ? "SUSPENDED" : decision === "REJECTED" ? "REJECTED" : allChecksApproved && !!driver?.phoneVerifiedAt && !!driver.licenceExpiry && driver.licenceExpiry > new Date() ? "APPROVED" : "PENDING";
      await tx.driver.update({ where: { id: check.driverId }, data: { verificationStatus: driverStatus } });
    } else if (target === "VEHICLE") {
      const bus = await tx.bus.findUnique({ where: { id }, select: { id: true, registrationExpiry: true, insuranceExpiry: true, inspectionExpiry: true } });
      if (!bus) throw new Error("Vehicle not found.");
      if (decision === "APPROVED" && [bus.registrationExpiry, bus.insuranceExpiry, bus.inspectionExpiry].some((date) => !date || date <= new Date())) {
        redirect("/network/verification?error=vehicle-documents-expired");
      }
      await tx.bus.update({ where: { id }, data: { verificationStatus: decision } });
    } else {
      await tx.driverRouteApproval.update({ where: { id }, data: { status: decision, reviewedAt: new Date() } });
    }
  });
  revalidatePath("/network/verification");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fleet");
  revalidatePath("/network/dispatch");
  revalidatePath("/dashboard/finance");
  revalidatePath("/driver/dashboard");
  redirect("/network/verification?reviewed=1");
}
