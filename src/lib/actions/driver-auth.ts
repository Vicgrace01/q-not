"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normaliseNigerianPhone, requestPhoneCode, requestEmailCode, verifyLoginCode } from "@/lib/otp/persistent";
import { clearDriverCookie, getDriverId, setDriverCookie } from "@/lib/session";

export type DriverAuthState = { phone?: string; email?: string; error?: string; delivery?: "SMS" | "EMAIL" | "LOCAL" };

export async function requestDriverOtpAction(_prev: DriverAuthState | undefined, formData: FormData): Promise<DriverAuthState> {
  const parsed = z.string().min(7).max(25).safeParse(formData.get("phone"));
  if (!parsed.success) return { error: "Enter a valid phone number." };
  try {
    const result = await requestPhoneCode(parsed.data, "DRIVER_LOGIN");
    return { phone: result.identifier, delivery: result.delivery };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "We could not send your code." };
  }
}

export async function requestDriverEmailOtpAction(_prev: DriverAuthState | undefined, formData: FormData): Promise<DriverAuthState> {
  const parsed = z.string().email().max(254).safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  try {
    const result = await requestEmailCode(parsed.data, "DRIVER_EMAIL_LOGIN");
    return { email: result.identifier, delivery: result.delivery };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "We could not send your email code." };
  }
}

export async function verifyDriverEmailOtpAction(_prev: DriverAuthState | undefined, formData: FormData): Promise<DriverAuthState> {
  const parsed = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) }).safeParse({ email: formData.get("email"), code: formData.get("code") });
  if (!parsed.success) return { error: "Enter the six-digit code." };
  try {
    const email = parsed.data.email.toLowerCase().trim();
    const result = await verifyLoginCode(email, "DRIVER_EMAIL_LOGIN", parsed.data.code);
    if (!result.ok) return { email, error: result.reason === "wrong" ? "That code is not correct." : result.reason === "expired" ? "That code has expired." : "Request a new verification code." };
    const driver = await prisma.driver.upsert({
      where: { email },
      update: { emailVerifiedAt: new Date() },
      create: { email, emailVerifiedAt: new Date(), name: "Driver profile pending" },
      select: { id: true, name: true, licenceExpiry: true },
    });
    await setDriverCookie(driver.id);
    redirect(driver.name === "Driver profile pending" || !driver.licenceExpiry ? "/driver/onboarding" : "/driver/dashboard");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { email: parsed.data.email, error: error instanceof Error ? error.message : "We could not verify that email code." };
  }
}

export async function verifyDriverOtpAction(_prev: DriverAuthState | undefined, formData: FormData): Promise<DriverAuthState> {
  const parsed = z.object({ phone: z.string().min(7), code: z.string().regex(/^\d{6}$/) }).safeParse({
    phone: formData.get("phone"), code: formData.get("code"),
  });
  if (!parsed.success) return { error: "Enter the six-digit code." };
  try {
    const phone = normaliseNigerianPhone(parsed.data.phone);
    const result = await verifyLoginCode(phone, "DRIVER_LOGIN", parsed.data.code);
    if (!result.ok) return { phone, error: result.reason === "wrong" ? "That code is not correct." : result.reason === "expired" ? "That code has expired." : "Request a new verification code." };
    const driver = await prisma.driver.upsert({
      where: { phone },
      update: { phoneVerifiedAt: new Date() },
      create: { phone, name: "Driver profile pending", phoneVerifiedAt: new Date() },
      select: { id: true, name: true, email: true, licenceExpiry: true },
    });
    await setDriverCookie(driver.id);
    redirect(driver.name === "Driver profile pending" || !driver.licenceExpiry ? "/driver/onboarding" : "/driver/dashboard");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : "We could not sign you in." };
  }
}

export async function driverLogoutAction(): Promise<void> {
  await clearDriverCookie();
  redirect("/driver/login");
}

export async function completeDriverOnboardingAction(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const currentDriver = await prisma.driver.findUnique({ where: { id: driverId }, select: { phone: true, phoneVerifiedAt: true, email: true, emailVerifiedAt: true, operatorId: true } });
  if (!currentDriver) redirect("/driver/login");
  if (!currentDriver.phoneVerifiedAt && !currentDriver.emailVerifiedAt) {
    return { error: "Verify an email address or mobile number before saving your driver profile. You can complete mobile verification later, before publishing a service or accepting passengers." };
  }
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.union([z.string().email().max(254), z.literal("")]),
    experienceYears: z.coerce.number().int().min(0).max(60),
    licenceLastFour: z.string().regex(/^\d{4}$/),
    licenceExpiry: z.string().min(1),
    operatorBusId: z.string().optional(),
    vehicleType: z.enum(["DANFO", "KOROPE", "HIACE", "COASTER", "SHUTTLE", "OTHER"]).optional(),
    plateNumber: z.string().trim().min(4).max(15).regex(/^[A-Za-z0-9 -]+$/).optional(),
    capacity: z.coerce.number().int().min(2).max(60).optional(),
    make: z.string().trim().max(60).optional(),
    model: z.string().trim().max(60).optional(),
    modelYear: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
    colour: z.string().trim().min(2).max(40).optional(),
    registrationExpiry: z.string().optional(),
    insuranceExpiry: z.string().optional(),
    inspectionExpiry: z.string().optional(),
    routeIds: z.array(z.string()).max(20),
  }).safeParse({
    name: formData.get("name"), email: formData.get("email") || "",
    experienceYears: formData.get("experienceYears"), licenceLastFour: formData.get("licenceLastFour"),
    licenceExpiry: formData.get("licenceExpiry"), operatorBusId: String(formData.get("operatorBusId") || "") || undefined,
    vehicleType: formData.get("vehicleType") || undefined, plateNumber: String(formData.get("plateNumber") || "") || undefined,
    capacity: formData.get("capacity") || undefined, make: String(formData.get("make") || "").trim(), model: String(formData.get("model") || "").trim(),
    modelYear: formData.get("modelYear") || undefined, colour: String(formData.get("colour") || "") || undefined,
    registrationExpiry: String(formData.get("registrationExpiry") || "") || undefined,
    insuranceExpiry: String(formData.get("insuranceExpiry") || "") || undefined,
    inspectionExpiry: String(formData.get("inspectionExpiry") || "") || undefined,
    routeIds: formData.getAll("routeIds").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  const data = parsed.data;
  const verifiedEmail = currentDriver.emailVerifiedAt && currentDriver.email
    ? currentDriver.email.toLowerCase().trim()
    : null;
  if (data.email && data.email.toLowerCase().trim() !== verifiedEmail) {
    return { error: "Verify and link this email to your driver account before using it on your profile." };
  }
  const licenceExpiry = new Date(`${data.licenceExpiry}T23:59:59.000Z`);
  if (Number.isNaN(licenceExpiry.getTime()) || licenceExpiry <= new Date()) return { error: "Your driving licence must be current." };

  const selfVehicle = !currentDriver.operatorId;
  let vehicleData: { vehicleType: "DANFO" | "KOROPE" | "HIACE" | "COASTER" | "SHUTTLE" | "OTHER"; plateNumber: string; capacity: number; make: string | null; model: string | null; modelYear: number; colour: string; registrationExpiry: Date; insuranceExpiry: Date; inspectionExpiry: Date } | null = null;
  let selectedOperatorBusId: string | null = null;
  if (selfVehicle) {
    if (!data.vehicleType || !data.plateNumber || !data.capacity || !data.colour || !data.registrationExpiry || !data.insuranceExpiry || !data.inspectionExpiry || !data.modelYear) {
      return { error: "Complete all vehicle registration, capacity, colour and document expiry fields." };
    }
    const registrationExpiry = new Date(`${data.registrationExpiry}T23:59:59.000Z`);
    const insuranceExpiry = new Date(`${data.insuranceExpiry}T23:59:59.000Z`);
    const inspectionExpiry = new Date(`${data.inspectionExpiry}T23:59:59.000Z`);
    if ([registrationExpiry, insuranceExpiry, inspectionExpiry].some((date) => Number.isNaN(date.getTime()) || date <= new Date())) return { error: "Vehicle registration, insurance and inspection must all be current." };
    vehicleData = { vehicleType: data.vehicleType, plateNumber: data.plateNumber.toUpperCase().replace(/\s+/g, " "), capacity: data.capacity, make: data.make || null, model: data.model || null, modelYear: data.modelYear, colour: data.colour, registrationExpiry, insuranceExpiry, inspectionExpiry };
  } else {
    if (!data.operatorBusId) return { error: "Select the actual vehicle assigned by your transport operator." };
    const bus = await prisma.bus.findFirst({ where: { id: data.operatorBusId, operatorId: currentDriver.operatorId }, select: { id: true, registrationExpiry: true, insuranceExpiry: true, inspectionExpiry: true } });
    if (!bus) return { error: "That vehicle is not part of your operator's fleet." };
    if ([bus.registrationExpiry, bus.insuranceExpiry, bus.inspectionExpiry].some((date) => !date || date <= new Date())) return { error: "The selected vehicle has expired documents. Ask your fleet administrator to update them." };
    selectedOperatorBusId = bus.id;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const routes = data.routeIds.length ? await tx.route.findMany({ where: currentDriver.operatorId ? { id: { in: data.routeIds }, operatorId: currentDriver.operatorId } : { id: { in: data.routeIds } }, select: { id: true } }) : [];
      if (routes.length !== data.routeIds.length) throw new Error("One or more selected routes are not available to this driver.");
      await tx.driver.update({ where: { id: driverId }, data: {
        name: data.name, email: verifiedEmail, experienceYears: data.experienceYears,
        licenceLastFour: data.licenceLastFour, licenceExpiry, verificationStatus: "PENDING",
      } });

      let busId: string;
      if (selectedOperatorBusId) {
        const bus = await tx.bus.findFirst({ where: { id: selectedOperatorBusId, operatorId: currentDriver.operatorId }, select: { id: true, registrationExpiry: true, insuranceExpiry: true, inspectionExpiry: true } });
        if (!bus || [bus.registrationExpiry, bus.insuranceExpiry, bus.inspectionExpiry].some((date) => !date || date <= new Date())) throw new Error("The selected fleet vehicle is no longer eligible.");
        busId = bus.id;
      } else {
        if (!vehicleData) throw new Error("Vehicle details are missing.");
        const existingBus = await tx.bus.findUnique({ where: { plateNumber: vehicleData.plateNumber }, select: { id: true, ownerDriverId: true } });
        if (existingBus && existingBus.ownerDriverId !== driverId) throw new Error("That registration number is already linked to another vehicle account.");
        const bus = existingBus
          ? await tx.bus.update({ where: { id: existingBus.id }, data: { ...vehicleData, verificationStatus: "PENDING" } })
          : await tx.bus.create({ data: { ...vehicleData, ownerDriverId: driverId, verificationStatus: "PENDING" } });
        busId = bus.id;
      }
      await tx.driverVehicleAssignment.upsert({ where: { driverId_busId: { driverId, busId } }, update: { revokedAt: null }, create: { driverId, busId } });

      for (const kind of ["DRIVING_LICENCE", "IDENTITY", "RIGHT_TO_OPERATE_VEHICLE"]) {
        const existing = await tx.driverVerification.findFirst({ where: { driverId, kind, status: { in: ["PENDING", "APPROVED"] } }, select: { id: true } });
        if (!existing) await tx.driverVerification.create({ data: { driverId, kind, status: "PENDING", notes: kind === "DRIVING_LICENCE"
          ? "Licence expiry and last four digits recorded. Confirm validity through an authorised FRSC service."
          : kind === "IDENTITY"
            ? "Identity proofing requires informed consent and an authorised verification provider."
            : "Confirm the driver's ownership or the operator's authority to assign this vehicle." } });
      }
      for (const routeId of data.routeIds) await tx.driverRouteApproval.upsert({ where: { driverId_routeId: { driverId, routeId } }, update: { status: "PENDING", reviewedAt: null }, create: { driverId, routeId, status: "PENDING" } });
    });
    redirect("/driver/dashboard");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : "We could not save your driver profile." };
  }
}

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}


export async function requestDriverPhoneLinkAction(_prev: DriverAuthState | undefined, formData: FormData): Promise<DriverAuthState> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const parsed = z.string().min(7).max(25).safeParse(formData.get("phone"));
  if (!parsed.success) return { error: "Enter a valid phone number." };
  try {
    const phone = normaliseNigerianPhone(parsed.data);
    const existing = await prisma.driver.findUnique({ where: { phone }, select: { id: true } });
    if (existing && existing.id !== driverId) return { error: "That phone number is already linked to another driver account." };
    const result = await requestPhoneCode(phone, "DRIVER_PHONE_LINK");
    return { phone: result.identifier, delivery: result.delivery };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "We could not send your verification code." };
  }
}

export async function verifyDriverPhoneLinkAction(_prev: DriverAuthState | undefined, formData: FormData): Promise<DriverAuthState> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const parsed = z.object({ phone: z.string().min(7), code: z.string().regex(/^\d{6}$/) }).safeParse({ phone: formData.get("phone"), code: formData.get("code") });
  if (!parsed.success) return { error: "Enter the six-digit verification code." };
  try {
    const phone = normaliseNigerianPhone(parsed.data.phone);
    const existing = await prisma.driver.findUnique({ where: { phone }, select: { id: true } });
    if (existing && existing.id !== driverId) return { error: "That phone number is already linked to another driver account." };
    const result = await verifyLoginCode(phone, "DRIVER_PHONE_LINK", parsed.data.code);
    if (!result.ok) return { phone, error: result.reason === "wrong" ? "That code is not correct." : result.reason === "expired" ? "That code has expired." : "Request a new code." };
    await prisma.driver.update({ where: { id: driverId }, data: { phone, phoneVerifiedAt: new Date() } });
    redirect("/driver/onboarding");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: error instanceof Error ? error.message : "We could not verify that phone number." };
  }
}


export async function requestDriverEmailLinkAction(formData: FormData): Promise<void> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const parsed = z.string().email().max(254).safeParse(formData.get("email"));
  if (!parsed.success) redirect("/driver/onboarding/email?error=email-invalid");
  const email = parsed.data.toLowerCase().trim();
  const existing = await prisma.driver.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== driverId) redirect("/driver/onboarding/email?error=email-in-use");
  try { await requestEmailCode(email, "DRIVER_EMAIL_LINK"); }
  catch (error) {
    const reason = error instanceof Error ? error.message : "Email verification could not start.";
    redirect(`/driver/onboarding/email?error=${encodeURIComponent(reason.slice(0, 120))}`);
  }
  redirect(`/driver/onboarding/email?sent=1&email=${encodeURIComponent(email)}`);
}

export async function verifyDriverEmailLinkAction(formData: FormData): Promise<void> {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const parsed = z.object({ email: z.string().email().max(254), code: z.string().regex(/^\d{6}$/) }).safeParse({
    email: formData.get("email"), code: formData.get("code"),
  });
  if (!parsed.success) redirect("/driver/onboarding/email?error=email-code");
  const email = parsed.data.email.toLowerCase().trim();
  const result = await verifyLoginCode(email, "DRIVER_EMAIL_LINK", parsed.data.code);
  if (!result.ok) redirect(`/driver/onboarding/email?sent=1&email=${encodeURIComponent(email)}&error=${result.reason}`);
  const existing = await prisma.driver.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== driverId) redirect("/driver/onboarding/email?error=email-in-use");
  try {
    await prisma.driver.update({ where: { id: driverId }, data: { email, emailVerifiedAt: new Date() } });
  } catch {
    redirect("/driver/onboarding/email?error=email-in-use");
  }
  revalidatePath("/driver/onboarding");
  revalidatePath("/driver/dashboard");
  redirect("/driver/onboarding/email?linked=1");
}
