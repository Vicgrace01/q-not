import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionOperatorId } from "@/lib/session";
import { updateOperatorProfileAction } from "@/lib/actions/operator-profile";

export const dynamic = "force-dynamic";

function verificationLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/(^|\\s)\\S/g, (letter) => letter.toUpperCase());
}

export default async function OperatorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");

  const [operator, routeCount, vehicleCount, driverCount, params] = await Promise.all([
    prisma.operator.findUnique({
      where: { id: operatorId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerifiedAt: true,
        verificationStatus: true,
        createdAt: true,
      },
    }),
    prisma.route.count({ where: { operatorId } }),
    prisma.bus.count({ where: { operatorId } }),
    prisma.driver.count({ where: { operatorId } }),
    searchParams,
  ]);

  if (!operator) redirect("/login");

  const statusClass = operator.verificationStatus === "APPROVED"
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
    : operator.verificationStatus === "REJECTED"
      ? "border-red-400/20 bg-red-400/10 text-red-200"
      : "border-amber-300/20 bg-amber-300/10 text-amber-100";

  return (
    <div className="qnot-dashboard-content">
      <section className="qnot-dashboard-heading">
        <div>
          <span className="qnot-page-eyebrow"><i /> ACCOUNT / OPERATOR IDENTITY</span>
          <h1>Your <em>operator profile.</em></h1>
          <p>Manage the organisation name shown across your Q-not workspace and review the account details connected to your network.</p>
        </div>
        <Link href="/dashboard" className="qnot-primary-action">Back to overview <i>↗</i></Link>
      </section>

      {params.saved === "1" && <p role="status" className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">Operator profile updated.</p>}
      {params.error === "name" && <p role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">Enter an organisation name between 2 and 100 characters.</p>}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(270px,.85fr)]">
        <article className="rounded-2xl border border-white/10 bg-[#0d1d15] p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-lime-300/25 bg-lime-300/10 text-2xl font-black text-lime-200">{operator.name.trim().slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-[.16em] text-lime-300">OPERATOR ACCOUNT</p>
              <h2 className="mt-1 break-words text-2xl font-black">{operator.name}</h2>
              <p className="mt-1 break-all text-sm text-neutral-400">{operator.email}</p>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass}`}>{verificationLabel(operator.verificationStatus)}</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#09150f] p-4">
              <span className="text-xs text-neutral-500">Registered email</span>
              <strong className="mt-1 block break-all text-sm text-white">{operator.email}</strong>
              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] ${operator.emailVerifiedAt ? "bg-emerald-400/10 text-emerald-200" : "bg-amber-300/10 text-amber-100"}`}>{operator.emailVerifiedAt ? "Email verified" : "Email not verified"}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#09150f] p-4">
              <span className="text-xs text-neutral-500">Registered phone</span>
              <strong className="mt-1 block text-sm text-white">{operator.phone ?? "No phone number linked"}</strong>
              <span className="mt-2 inline-flex rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] text-neutral-300">{operator.phone ? "Recorded; verification not available yet" : "Not supplied"}</span>
            </div>
          </div>

          <form action={updateOperatorProfileAction} className="mt-7 border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold">Organisation display name</h3>
            <p className="mt-1 text-sm leading-relaxed text-neutral-400">This is the name displayed in your operator workspace. Your registered email and phone are kept read-only here because changing account contacts requires a verified change process.</p>
            <label className="mt-4 block text-sm font-medium text-neutral-200">Organisation name
              <input name="name" required minLength={2} maxLength={100} defaultValue={operator.name} className="mt-2 min-h-12 w-full rounded-xl border border-neutral-700 bg-[#091310] px-4 py-3 text-base text-white outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-300/15" />
            </label>
            <button type="submit" className="mt-4 min-h-11 rounded-xl bg-lime-300 px-5 py-3 text-sm font-extrabold text-[#102016] transition hover:bg-lime-200">Save organisation name</button>
          </form>
        </article>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-white/10 bg-[#0d1d15] p-5 sm:p-6">
            <p className="text-[10px] font-bold tracking-[.16em] text-lime-300">NETWORK FOOTPRINT</p>
            <h2 className="mt-2 text-xl font-bold">Your Q-not network</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-[#09150f] p-3"><strong className="block text-2xl">{routeCount}</strong><span className="mt-1 block text-[11px] text-neutral-400">Routes</span></div>
              <div className="rounded-xl border border-white/10 bg-[#09150f] p-3"><strong className="block text-2xl">{vehicleCount}</strong><span className="mt-1 block text-[11px] text-neutral-400">Vehicles</span></div>
              <div className="rounded-xl border border-white/10 bg-[#09150f] p-3"><strong className="block text-2xl">{driverCount}</strong><span className="mt-1 block text-[11px] text-neutral-400">Drivers</span></div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-neutral-400">These counts reflect records currently linked to this operator account. They do not imply that routes, vehicles or drivers have passed verification.</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0d1d15] p-5 sm:p-6">
            <p className="text-[10px] font-bold tracking-[.16em] text-lime-300">ACCOUNT SECURITY</p>
            <h2 className="mt-2 text-xl font-bold">Keep access controlled</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">Operator sign-in currently uses your registered account credentials or the identity provider configured for your account. Contact changes and organisation verification remain separate review processes.</p>
            <p className="mt-4 border-t border-white/10 pt-4 text-xs text-neutral-500">Account created {operator.createdAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" })}.</p>
            <Link href="/dashboard/fleet" className="mt-4 inline-flex text-sm font-semibold text-lime-200 underline underline-offset-4">Manage fleet records ↗</Link>
          </article>
        </aside>
      </section>
    </div>
  );
}
