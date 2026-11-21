import Link from "next/link";
import { redirect } from "next/navigation";
import { getDriverId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DriverPhoneLinkForm } from "./phone-link-form";

export const dynamic = "force-dynamic";
export default async function DriverPhoneLinkPage() {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { email: true, phone: true, phoneVerifiedAt: true } });
  if (!driver) redirect("/driver/login");
  if (driver.phone && driver.phoneVerifiedAt) redirect("/driver/onboarding");
  return <main className="min-h-screen bg-[#071311] px-4 py-10 text-white sm:px-6"><div className="mx-auto max-w-lg"><Link href="/" className="text-xl font-black">Q-not</Link><section className="mt-8 rounded-2xl border border-neutral-800 bg-[#0d1916] p-6 sm:p-8"><p className="text-xs font-bold tracking-[.18em] text-lime-300">DRIVER ACCOUNT / PHONE SECURITY</p><h1 className="mt-3 text-2xl font-black">Verify your mobile number.</h1><p className="mt-2 text-sm leading-relaxed text-neutral-400">You can finish your driver and vehicle profile without adding a mobile number first. Verify a phone before publishing a departure, opening boarding or accepting passengers. This number also supports trip communication and account recovery.</p><div className="mt-6"><DriverPhoneLinkForm email={driver.email}/></div></section></div></main>;
}
