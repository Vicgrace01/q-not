import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionOperatorId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { updateNetworkReviewAction } from "@/lib/actions/network-verification";
import { QNotWorkspaceDock } from "@/components/qnot-workspace-navigation";

export const dynamic = "force-dynamic";
type ReviewTarget = "OPERATOR" | "DRIVER_CHECK" | "VEHICLE" | "ROUTE";

function ReviewForm({ target, id }: { target: ReviewTarget; id: string }) {
  return <form action={updateNetworkReviewAction} className="mt-3 flex flex-wrap items-center gap-2">
    <input type="hidden" name="target" value={target} /><input type="hidden" name="id" value={id} />
    {target === "DRIVER_CHECK" && <input name="notes" placeholder="Verification note" className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-[#08100e] px-3 py-2 text-xs" maxLength={500} />}
    <button name="decision" value="APPROVED" className="rounded-lg bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-200">Approve</button>
    <button name="decision" value="REJECTED" className="rounded-lg bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200">Reject</button>
  </form>;
}

export default async function NetworkVerificationPage({ searchParams }: { searchParams: Promise<{ reviewed?: string; error?: string }> }) {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");
  const operator = await prisma.operator.findUnique({ where: { id: operatorId }, select: { email: true } });
  const admins = (env.QNOT_NETWORK_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!operator || !admins.includes(operator.email.toLowerCase())) redirect("/dashboard");

  const [operators, driverChecks, vehicles, routes, params] = await Promise.all([
    prisma.operator.findMany({ where: { verificationStatus: "PENDING", id: { not: operatorId } }, orderBy: { createdAt: "asc" }, take: 100, select: { id: true, name: true, email: true, phone: true, createdAt: true } }),
    prisma.driverVerification.findMany({ where: { status: "PENDING" }, include: { driver: true }, orderBy: { createdAt: "asc" }, take: 100 }),
    prisma.bus.findMany({ where: { verificationStatus: "PENDING" }, include: { ownerDriver: true }, orderBy: { createdAt: "asc" }, take: 100 }),
    prisma.driverRouteApproval.findMany({ where: { status: "PENDING" }, include: { driver: true, route: { include: { operator: { select: { name: true, email: true } } } } }, orderBy: { createdAt: "asc" }, take: 100 }),
    searchParams,
  ]);

  return <main className="qnot-network-workspace qnot-workspace-page min-h-screen bg-[#071311] px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex items-center justify-between"><Link href="/dashboard" className="text-xl font-black">Q-not / Network</Link><span className="text-xs text-neutral-400">Authorised review workspace</span></header>
    <p className="text-xs font-bold tracking-[.18em] text-lime-300">NETWORK TRUST / OPERATIONS</p><h1 className="mt-3 text-3xl font-black">Verification review</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">Approve an operator only after checking its legal identity and authority to run the stated service. Approve drivers, vehicles and route access only after the corresponding original evidence and external permissions have been checked.</p>
    {params.reviewed === "1" && <p className="mt-5 rounded-lg bg-emerald-950/70 px-4 py-3 text-sm text-emerald-200">Review decision recorded.</p>}
    {params.error === "vehicle-documents-expired" && <p className="mt-5 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-200">Vehicle approval requires current registration, insurance and inspection expiry dates.</p>}
    {params.error === "operator-self-review" && <p className="mt-5 rounded-lg bg-amber-950 px-4 py-3 text-sm text-amber-100">A network administrator cannot approve their own operator account. A second allowlisted reviewer must check it.</p>}
    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: "Operators", value: operators.length }, { label: "Driver checks", value: driverChecks.length }, { label: "Vehicles", value: vehicles.length }, { label: "Route requests", value: routes.length }].map((item) => <div key={item.label} className="rounded-xl border border-neutral-800 bg-[#0d1916] p-4"><span className="text-xs text-neutral-400">{item.label}</span><strong className="mt-2 block text-3xl">{item.value}</strong></div>)}</div>

    <section className="mt-8"><h2 className="text-xl font-bold">Operator identity and authority</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-400">Check business identity, authorised representative, bank/settlement ownership, relevant state permits, insurance and any campus/terminal agreement outside the app. The current database stores operator verification status but does not store an uploaded permit or review note. Keep evidence and reference numbers in the approved restricted operations register. Self-approval is blocked.</p><div className="mt-3 space-y-3">{operators.length === 0 ? <p className="rounded-lg border border-neutral-800 p-5 text-sm text-neutral-400">No other operator accounts are waiting for review.</p> : operators.map((account) => <article key={account.id} className="rounded-xl border border-neutral-800 bg-[#0d1916] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{account.name}</strong><span className="text-xs text-amber-200">PENDING REVIEW</span></div><p className="mt-1 text-xs text-neutral-400">{account.email} · {account.phone ?? "No phone"}</p><p className="mt-1 text-xs text-neutral-500">Registered {account.createdAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium" })}</p><ReviewForm target="OPERATOR" id={account.id} /></article>)}</div></section>

    <section className="mt-8"><h2 className="text-xl font-bold">Driver identity and licence checks</h2><div className="mt-3 space-y-3">{driverChecks.length === 0 ? <p className="rounded-lg border border-neutral-800 p-5 text-sm text-neutral-400">No driver checks are waiting for review.</p> : driverChecks.map((check) => <article key={check.id} className="rounded-xl border border-neutral-800 bg-[#0d1916] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{check.driver.name}</strong><span className="text-xs text-neutral-400">{check.kind.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-neutral-400">{check.driver.phone} · {check.driver.email ?? "No email"} · licence ends {check.driver.licenceLastFour ?? "not recorded"}</p><ReviewForm target="DRIVER_CHECK" id={check.id} /></article>)}</div></section>

    <section className="mt-8"><h2 className="text-xl font-bold">Vehicle registration and inspection</h2><div className="mt-3 space-y-3">{vehicles.length === 0 ? <p className="rounded-lg border border-neutral-800 p-5 text-sm text-neutral-400">No vehicles are waiting for review.</p> : vehicles.map((bus) => <article key={bus.id} className="rounded-xl border border-neutral-800 bg-[#0d1916] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{bus.plateNumber}</strong><span className="text-xs text-neutral-400">{bus.vehicleType} · {bus.capacity} seats</span></div><p className="mt-1 text-xs text-neutral-400">{bus.ownerDriver?.name ?? "No owner-driver"} · {bus.make ?? "Make not provided"} {bus.model ?? ""}</p><p className="mt-1 text-xs text-neutral-500">Registration expiry: {bus.registrationExpiry?.toLocaleDateString("en-NG") ?? "Not recorded"} · Insurance: {bus.insuranceExpiry?.toLocaleDateString("en-NG") ?? "Not recorded"} · Inspection: {bus.inspectionExpiry?.toLocaleDateString("en-NG") ?? "Not recorded"}</p><ReviewForm target="VEHICLE" id={bus.id} /></article>)}</div></section>

    <section className="mt-8"><h2 className="text-xl font-bold">Operating route permissions</h2><p className="mt-1 text-xs leading-relaxed text-neutral-400">This approval is per driver and route. Before approval for a UNN/terminal route, verify that the operator has written permission for the exact corridor, stops, vehicle class and service hours. The app stores the decision and timestamp, not the University&apos;s permit attachment or an auditable permit number.</p><div className="mt-3 space-y-3">{routes.length === 0 ? <p className="rounded-lg border border-neutral-800 p-5 text-sm text-neutral-400">No route permissions are waiting for review.</p> : routes.map((approval) => <article key={approval.id} className="rounded-xl border border-neutral-800 bg-[#0d1916] p-4"><strong>{approval.route.origin} → {approval.route.destination}</strong><p className="mt-1 text-xs text-neutral-400">Operator: {approval.route.operator?.name ?? "Unassigned operator"} · {approval.route.operator?.email ?? "No operator email"}</p><p className="mt-1 text-xs text-neutral-400">Requested by {approval.driver.name} · {approval.driver.phone}</p><ReviewForm target="ROUTE" id={approval.id} /></article>)}</div></section>

    <p className="mt-9 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-100/80">This workspace records manual decisions; it does not call NIMC, FRSC or an inspection authority. A green approval must be backed by an actual external check. NIN and full licence numbers are not stored here. Do not approve an operator or route using only a signup form.</p>
  </div><QNotWorkspaceDock role="network" /></main>;
}
