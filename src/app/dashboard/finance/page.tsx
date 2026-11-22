import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperatorManagementAccess } from "@/lib/operator-access";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export default async function OperatorFinancePage() {
  const operatorId = await requireOperatorManagementAccess();

  // Scope through the route owner, not Trip.operatorId, so trips published by
  // approved independent owner-drivers on this operator's route are included.
  const scope = { purpose: "TRIP_FARE", trip: { is: { route: { is: { operatorId } } } } };
  const [received, pending, refunded, byProvider, recent] = await Promise.all([
    prisma.payment.aggregate({ where: { ...scope, status: "SUCCEEDED" }, _sum: { amountKobo: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { ...scope, status: "PENDING" }, _sum: { amountKobo: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { ...scope, status: "REFUNDED" }, _sum: { amountKobo: true }, _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["provider"], where: { ...scope, status: "SUCCEEDED" }, _sum: { amountKobo: true }, _count: { _all: true } }),
    prisma.payment.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true, reference: true, provider: true, amountKobo: true, status: true, paidAt: true, createdAt: true,
        trip: { select: { departureTime: true, route: { select: { origin: true, destination: true } }, bus: { select: { plateNumber: true } } } },
      },
    }),
  ]);

  const gross = received._sum.amountKobo ?? 0;
  const pendingAmount = pending._sum.amountKobo ?? 0;
  const refundedAmount = refunded._sum.amountKobo ?? 0;
  const cash = byProvider.find((row) => row.provider === "CASH");
  const online = byProvider.filter((row) => row.provider !== "CASH").reduce((sum, row) => sum + (row._sum.amountKobo ?? 0), 0);

  return (
    <div className="qnot-dashboard-content">
      <section className="qnot-dashboard-heading">
        <div><span className="qnot-page-eyebrow"><i /> FINANCE / OPERATOR LEDGER</span><h1>Fare collection <em>overview.</em></h1><p>Live transaction records for trips running on routes owned by this operator. This is a gross fare ledger, not a bank balance or payout statement.</p></div>
        <Link href="/network/dispatch" className="qnot-primary-action">Open dispatch <i>↗</i></Link>
      </section>

      <section className="qnot-ops-metrics" aria-label="Fare collection summary">
        <article className="qnot-ops-metric qnot-ops-metric--feature"><span>CONFIRMED GROSS FARES</span><strong>{money.format(gross / 100)}</strong><small>{received._count._all} successful fare records</small></article>
        <article className="qnot-ops-metric"><span>ONLINE COLLECTIONS</span><strong>{money.format(online / 100)}</strong><small>Successful non-cash provider records</small></article>
        <article className="qnot-ops-metric"><span>CASH RECORDED</span><strong>{money.format((cash?._sum.amountKobo ?? 0) / 100)}</strong><small>{cash?._count._all ?? 0} driver-recorded cash fares</small></article>
        <article className="qnot-ops-metric"><span>PENDING CHECKOUTS</span><strong>{money.format(pendingAmount / 100)}</strong><small>{pending._count._all} payment attempts not yet confirmed</small></article>
      </section>

      <section className="qnot-route-board">
        <div className="qnot-section-heading"><div><span className="qnot-page-eyebrow">RECONCILIATION / 01</span><h2>Recent fare transactions</h2></div><span className="qnot-count-pill">{recent.length} RECORDS</span></div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-neutral-800 bg-[#0c1714] p-4"><span className="text-xs font-bold tracking-wider text-neutral-400">REFUNDS RECORDED</span><strong className="mt-2 block text-2xl text-white">{money.format(refundedAmount / 100)}</strong><small className="text-neutral-500">{refunded._count._all} refunded records</small></article>
          <article className="rounded-xl border border-neutral-800 bg-[#0c1714] p-4"><span className="text-xs font-bold tracking-wider text-neutral-400">COLLECTION METHODS</span><div className="mt-2 flex flex-wrap gap-2">{byProvider.length ? byProvider.map((row) => <span key={row.provider} className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200">{row.provider === "CASH" ? "Cash" : row.provider} · {row._count._all}</span>) : <span className="text-sm text-neutral-500">No successful fares yet</span>}</div></article>
        </div>
        {recent.length === 0 ? (
          <div className="qnot-inline-empty"><strong>No fare transactions recorded yet.</strong><p>Once approved drivers publish trips and passengers complete Paystack or cash fare steps, those transaction records will appear here.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead><tr className="border-b border-neutral-800 text-[10px] font-bold tracking-[.15em] text-neutral-500"><th className="px-3 py-3">TRANSACTION / ROUTE</th><th className="px-3 py-3">METHOD</th><th className="px-3 py-3">DATE</th><th className="px-3 py-3">STATUS</th><th className="px-3 py-3 text-right">AMOUNT</th></tr></thead>
            <tbody>{recent.map((payment) => <tr key={payment.id} className="border-b border-neutral-800/70 text-neutral-200">
              <td className="px-3 py-3"><strong className="block text-white">{payment.trip ? `${payment.trip.route.origin} → ${payment.trip.route.destination}` : "Trip no longer linked"}</strong><span className="mt-1 block text-xs text-neutral-500">{payment.reference} {payment.trip?.bus.plateNumber ? `· ${payment.trip.bus.plateNumber}` : ""}</span></td>
              <td className="px-3 py-3">{payment.provider === "CASH" ? "Cash" : payment.provider}</td>
              <td className="px-3 py-3">{dateTime.format(payment.paidAt ?? payment.createdAt)}</td>
              <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${payment.status === "SUCCEEDED" ? "bg-emerald-300/10 text-emerald-200" : payment.status === "PENDING" ? "bg-amber-300/10 text-amber-100" : "bg-neutral-800 text-neutral-300"}`}>{statusLabel(payment.status)}</span></td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums">{money.format(payment.amountKobo / 100)}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>

      <section className="qnot-next-step-banner"><div><span className="qnot-page-eyebrow">FINANCIAL CONTROL / IMPORTANT</span><h3>Reconcile before settling operators or drivers.</h3><p>These amounts are gross database records. They do not include Paystack fees, bank settlement timing, taxes, refunds outside Q-not, operator commissions, driver payouts or cash physically verified by a supervisor. Reconcile against the payment-provider dashboard and a signed cash sheet.</p></div><div className="qnot-next-step-mark"><span>₦</span><i>01</i></div></section>
    </div>
  );
}
