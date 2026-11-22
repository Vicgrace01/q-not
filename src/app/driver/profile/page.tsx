import Link from "next/link";
import { redirect } from "next/navigation";
import { getDriverId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { QNotBrand } from "@/components/qnot-brand";
import { QNotWorkspaceDock } from "@/components/qnot-workspace-navigation";

export const dynamic = "force-dynamic";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function dateLabel(value: Date | null) {
  return value ? value.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }) : "Not supplied";
}

export default async function DriverProfilePage() {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      vehicleAssignments: { where: { revokedAt: null }, include: { bus: true } },
      routeApprovals: { include: { route: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!driver) redirect("/driver/login");

  return <main className="qnot-driver-workspace qnot-workspace-page min-h-screen bg-[#07130f] px-4 py-8 text-white sm:px-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <QNotBrand />
        <nav className="flex flex-wrap items-center gap-4 text-sm"><Link href="/driver/dashboard" className="text-neutral-300 hover:text-lime-200">Driver workspace</Link><Link href="/driver/onboarding" className="text-lime-200 underline underline-offset-4">Edit driver & vehicle details</Link></nav>
      </header>
      <div className="mb-7 max-w-3xl"><p className="text-xs font-extrabold tracking-[.18em] text-lime-300">Q-NOT DRIVE / ACCOUNT & VERIFICATION</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Your driver profile.</h1><p className="mt-3 text-sm leading-relaxed text-neutral-400">Keep your contact details, driving credentials, vehicle records and route permissions current. You can explore your workspace while checks are pending; service publishing stays locked until the required checks pass.</p></div>
      <section className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-[#0d1d15] p-4 sm:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,.7fr))] sm:items-center sm:p-5" aria-label="Driver account summary">
        <div className="flex min-w-0 items-center gap-3"><span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-lime-300/25 bg-lime-300/10 text-xl font-black text-lime-200">{driver.name.trim().slice(0, 1).toUpperCase()}</span><div className="min-w-0"><span className="text-[10px] font-bold tracking-[.16em] text-lime-300">DRIVER ACCOUNT</span><strong className="mt-1 block truncate text-lg">{driver.name}</strong><p className="mt-1 truncate text-xs text-neutral-400">{driver.email ?? driver.phone ?? "No contact method linked"}</p></div></div>
        <div className="rounded-xl border border-white/10 bg-[#09150f] p-3"><span className="block text-[10px] tracking-wider text-neutral-500">ACCOUNT REVIEW</span><strong className="mt-1 block text-sm text-white">{label(driver.verificationStatus)}</strong></div>
        <div className="rounded-xl border border-white/10 bg-[#09150f] p-3"><span className="block text-[10px] tracking-wider text-neutral-500">ASSIGNED VEHICLES</span><strong className="mt-1 block text-sm text-white">{driver.vehicleAssignments.length}</strong></div>
        <div className="rounded-xl border border-white/10 bg-[#09150f] p-3"><span className="block text-[10px] tracking-wider text-neutral-500">APPROVED ROUTES</span><strong className="mt-1 block text-sm text-white">{driver.routeApprovals.filter((item) => item.status === "APPROVED").length}</strong></div>
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <article className="rounded-2xl border border-white/10 bg-[#0d1d15] p-5 sm:p-7">
          <p className="text-xs font-bold tracking-[.16em] text-lime-300">PERSONAL DETAILS</p>
          <h2 className="mt-2 text-2xl font-bold">{driver.name}</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-neutral-500">Verified email</dt><dd className="mt-1 break-all text-sm text-neutral-100">{driver.email ?? "Not added"}</dd></div>
            <div><dt className="text-xs text-neutral-500">Mobile number</dt><dd className="mt-1 text-sm text-neutral-100">{driver.phone ?? "Not added"}</dd></div>
            <div><dt className="text-xs text-neutral-500">Driving licence (last four)</dt><dd className="mt-1 text-sm text-neutral-100">{driver.licenceLastFour ? `•••• ${driver.licenceLastFour}` : "Not supplied"}</dd></div>
            <div><dt className="text-xs text-neutral-500">Licence expiry</dt><dd className="mt-1 text-sm text-neutral-100">{dateLabel(driver.licenceExpiry)}</dd></div>
            <div><dt className="text-xs text-neutral-500">Driving experience</dt><dd className="mt-1 text-sm text-neutral-100">{driver.experienceYears == null ? "Not supplied" : `${driver.experienceYears} years`}</dd></div>
            <div><dt className="text-xs text-neutral-500">Driver review</dt><dd className="mt-1 text-sm text-neutral-100">{label(driver.verificationStatus)}</dd></div>
          </dl>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#0d1d15] p-5 sm:p-7">
          <p className="text-xs font-bold tracking-[.16em] text-lime-300">CONTACT VERIFICATION</p>
          <div className="mt-4 flex items-start justify-between gap-4 border-b border-white/10 pb-4"><div><strong className="text-sm">Email</strong><p className="mt-1 text-xs text-neutral-400">{driver.email ?? "No email linked"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${driver.emailVerifiedAt ? "bg-emerald-950 text-emerald-200" : "bg-amber-950 text-amber-200"}`}>{driver.emailVerifiedAt ? "Verified" : "Pending"}</span></div>
          <div className="mt-4 flex items-start justify-between gap-4"><div><strong className="text-sm">Mobile number</strong><p className="mt-1 text-xs text-neutral-400">{driver.phone ?? "Add a number when ready"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${driver.phoneVerifiedAt ? "bg-emerald-950 text-emerald-200" : "bg-amber-950 text-amber-200"}`}>{driver.phoneVerifiedAt ? "Verified" : "Not verified"}</span></div>
          {!driver.phoneVerifiedAt && <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-sm font-semibold text-amber-100">Needed before passenger service</p><p className="mt-1 text-xs leading-relaxed text-neutral-300">Mobile verification is not required to browse or complete your profile. It is required before publishing a departure, opening boarding or accepting passengers.</p><Link href="/driver/onboarding/phone" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-lime-300 px-4 py-2 text-xs font-bold text-[#102016]">Verify mobile number ↗</Link></div>}
        </article>
      </section>
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#0d1d15] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-[.16em] text-lime-300">YOUR VEHICLES</p><h2 className="mt-1 text-xl font-bold">Vehicle garage</h2></div><Link href="/driver/onboarding" className="text-xs font-semibold text-lime-200 underline">Manage vehicles ↗</Link></div>
          <div className="mt-4 space-y-2">{driver.vehicleAssignments.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-neutral-400">No vehicle registered yet. Add the vehicle you operate to continue.</p> : driver.vehicleAssignments.map(({ bus }) => <div key={bus.id} className="rounded-xl border border-white/10 bg-[#09150f] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{bus.plateNumber}</strong><span className="text-xs text-neutral-300">{label(bus.verificationStatus)}</span></div><p className="mt-1 text-sm text-neutral-300">{label(bus.vehicleType)} · {bus.make ?? "Make not entered"} {bus.model ?? ""}</p><p className="mt-1 text-xs text-neutral-500">{bus.capacity} seats · Registration expires {dateLabel(bus.registrationExpiry)}</p></div>)}</div>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#0d1d15] p-5 sm:p-6"><p className="text-xs font-bold tracking-[.16em] text-lime-300">CORRIDOR ACCESS</p><h2 className="mt-1 text-xl font-bold">Route approvals</h2><div className="mt-4 space-y-2">{driver.routeApprovals.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-neutral-400">No route requests yet. Add your preferred corridors from driver onboarding.</p> : driver.routeApprovals.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#09150f] p-4"><span className="text-sm">{item.route.origin} <span className="text-lime-300">→</span> {item.route.destination}</span><span className="text-xs text-neutral-300">{label(item.status)}</span></div>)}</div></article>
      </section>
      <p className="mt-7 text-xs leading-relaxed text-neutral-500">Q-not verifies driver identity, driving credentials, vehicles, operating authority and route access separately. A completed form is not an approval to carry passengers.</p>
    </div>
    <QNotWorkspaceDock role="driver" />
  </main>;
}
