import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { commuterLogoutAction } from "@/lib/actions/commuter-auth";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });

export default async function QFundsPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login?next=%2Fc%2Fq-funds");
  const [payments, summary, params] = await Promise.all([
    prisma.payment.findMany({ where: { commuterId }, orderBy: { createdAt: "desc" }, take: 30, include: { trip: { include: { route: true, bus: { select: { plateNumber: true } } } } } }),
    prisma.payment.aggregate({ where: { commuterId, status: "SUCCEEDED" }, _sum: { amountKobo: true }, _count: { id: true } }),
    searchParams,
  ]);
  return <div className="qnot-basic-page"><header className="border-b border-neutral-800"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="text-lg font-bold">Q-not</Link><nav className="flex items-center gap-4 text-sm"><Link href="/c/dashboard">Passenger dashboard</Link><form action={commuterLogoutAction}><button type="submit" className="text-neutral-400 underline">Sign out</button></form></nav></div></header>
    <main className="mx-auto max-w-5xl px-5 py-8">
      <p className="text-xs font-bold tracking-[.18em] text-lime-300">Q-FUNDS / TRANSPORT PAYMENTS</p><h1 className="mt-2 text-3xl font-black">Your journey finances.</h1><p className="mt-2 max-w-2xl text-sm text-neutral-400">Your transport payment history and booking confirmations in one place.</p>
      {params.payment === "success" && <p className="mt-5 rounded-lg bg-emerald-950 px-4 py-3 text-sm text-emerald-200">Your payment has been confirmed and the ticket is available in your account.</p>}
      {params.payment === "failed" && <p className="mt-5 rounded-lg bg-amber-950 px-4 py-3 text-sm text-amber-100">The payment provider marked that attempt as unsuccessful. Its seat hold has been released.</p>}
      {params.payment === "processing" && <p className="mt-5 rounded-lg bg-amber-950 px-4 py-3 text-sm text-amber-100">The provider is still processing that payment. We have kept the seat hold in place while its status is checked.</p>}
      {params.payment === "checking" && <p className="mt-5 rounded-lg bg-amber-950 px-4 py-3 text-sm text-amber-100">We could not reach the payment provider to confirm the result. Your seat hold remains protected. Check again shortly.</p>}
      <section className="mt-7 grid gap-3 sm:grid-cols-3"><article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><span className="text-xs text-neutral-400">TOTAL FARES PAID</span><strong className="mt-3 block text-3xl">{money.format((summary._sum.amountKobo ?? 0) / 100)}</strong></article><article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><span className="text-xs text-neutral-400">COMPLETED PAYMENTS</span><strong className="mt-3 block text-3xl">{summary._count.id}</strong></article><article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><span className="text-xs text-neutral-400">RECENT TRANSACTIONS</span><strong className="mt-3 block text-3xl">{payments.length}</strong></article></section>
      <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Payment activity</h2><p className="mt-1 text-xs text-neutral-400">Verified fare payments, boarding bookings and cash fare records.</p></div><Link href="/trips" className="text-sm font-semibold text-lime-300 underline">Find a departure</Link></div>
        {payments.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-neutral-700 p-8 text-center"><h3 className="font-semibold">Your transport payments will appear here.</h3><p className="mt-2 text-sm text-neutral-400">Choose a departure with a published fare to reserve a seat and pay securely.</p><Link href="/trips" className="mt-4 inline-flex rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-bold text-neutral-950">Browse departures</Link></div> : <div className="mt-5 divide-y divide-neutral-800">{payments.map((payment) => <article key={payment.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-semibold">{payment.trip ? `${payment.trip.route.origin} → ${payment.trip.route.destination}` : payment.purpose.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-neutral-400">{payment.trip?.bus.plateNumber ?? "Q-not"} · {payment.reference}</p><p className="mt-1 text-xs text-neutral-500">{payment.createdAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })}</p></div><div className="text-right"><strong>{money.format(payment.amountKobo / 100)}</strong><span className={`mt-1 block text-xs ${payment.status === "SUCCEEDED" ? "text-emerald-300" : payment.status === "FAILED" ? "text-red-300" : "text-amber-200"}`}>{payment.status}</span>{payment.status === "PENDING" && payment.provider === "PAYSTACK" && <Link href={`/c/q-funds/return?reference=${encodeURIComponent(payment.reference)}`} className="mt-2 inline-block text-xs font-semibold text-lime-300 underline">Check payment status</Link>}</div></article>)}</div>}
      </section>
      <p className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-100/80">Q-Funds is your transport payment centre. It records fare payments, cash collection entries and booking transactions. Stored-value balances, withdrawals and automated refunds require a licensed financial or payment partner and are not enabled in this account.</p>
    </main>
  </div>;
}
