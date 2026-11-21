import Link from "next/link";
import { QNotBrand } from "@/components/qnot-brand";
import { redirect } from "next/navigation";
import { getDriverId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DriverOnboardingForm } from "./form";

export const dynamic = "force-dynamic";

export default async function DriverOnboardingPage() {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const [driver, routes] = await Promise.all([
    prisma.driver.findUnique({ where: { id: driverId }, select: { name: true, phone: true, email: true, emailVerifiedAt: true, phoneVerifiedAt: true, operatorId: true, vehicleAssignments: { where: { revokedAt: null }, select: { busId: true } } } }),
    prisma.route.findMany({ orderBy: [{ origin: "asc" }, { destination: "asc" }], select: { id: true, origin: true, destination: true } }),
  ]);
  if (!driver) redirect("/driver/login");
  const operatorVehicles = driver.operatorId ? await prisma.bus.findMany({
    where: { operatorId: driver.operatorId }, orderBy: [{ verificationStatus: "asc" }, { plateNumber: "asc" }],
    select: { id: true, plateNumber: true, vehicleType: true, make: true, model: true, capacity: true, verificationStatus: true, registrationExpiry: true, insuranceExpiry: true, inspectionExpiry: true },
  }) : [];
  const allowedRoutes = driver.operatorId ? await prisma.route.findMany({
    where: { operatorId: driver.operatorId }, orderBy: [{ origin: "asc" }, { destination: "asc" }],
    select: { id: true, origin: true, destination: true },
  }) : routes;
  return <main className="qnot-driver-onboarding-page min-h-screen px-4 py-6 text-white sm:px-6 sm:py-8">
    <div className="qnot-driver-onboarding-shell mx-auto max-w-6xl">
      <header className="qnot-driver-onboarding-header mb-8 flex flex-wrap items-center justify-between gap-4"><QNotBrand /><nav><Link href="/driver/dashboard">Driver workspace</Link><Link href="/driver/profile">Profile &amp; Verification</Link></nav></header>
      <div className="qnot-driver-onboarding-intro mb-7 max-w-3xl"><p className="text-xs font-bold tracking-[.18em] text-lime-300">Q-NOT DRIVE / DRIVER REGISTRATION</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Bring your vehicle onto Q-not.</h1><p className="mt-3 text-base leading-relaxed text-neutral-300">Create your driver profile, register the vehicle you operate and request access to your preferred corridors. We review each part before a departure can be published.</p></div>
      {!driver.phoneVerifiedAt && <section className="qnot-driver-onboarding-phone-note mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 sm:p-5"><div><p className="text-base font-bold text-amber-100">You can complete onboarding without mobile verification.</p><p className="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-200">Save your driver and vehicle details now. Add and verify a mobile number later from Profile &amp; Verification. Mobile verification is required before you publish a service, open boarding or accept passengers.</p></div><Link href="/driver/profile" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200/30 bg-[#17251b] px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-[#203426]">Open Profile &amp; Verification <span aria-hidden="true" className="ml-2">↗</span></Link></section>}
      <DriverOnboardingForm driver={driver} routes={allowedRoutes} operatorVehicles={operatorVehicles}/>
    </div>
  </main>;
}
