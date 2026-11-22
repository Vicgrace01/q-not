import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { createJourneyRequestAction } from "@/lib/actions/journey-requests";
import { QNotWorkspaceDock } from "@/components/qnot-workspace-navigation";

export const dynamic = "force-dynamic";
const field = "mt-1 w-full rounded-lg border border-neutral-700 bg-[#09110f] px-3 py-2.5 text-sm text-white";

export default async function NewJourneyRequestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login?next=%2Fc%2Frequests%2Fnew");
  const params = await searchParams;
  const routeResult = await prisma.route.findMany({ where: { stops: { some: {} } }, orderBy: [{ origin: "asc" }, { destination: "asc" }], include: { stops: { orderBy: { sequence: "asc" } } } })
    .then((value) => ({ ok: true as const, value }))
    .catch((error: unknown) => {
      console.error("Q-not could not load route choices for a passenger request:", error instanceof Error ? error.message : "Database unavailable");
      return { ok: false as const, value: null };
    });
  const routesUnavailable = !routeResult.ok;
  const routes = routeResult.ok ? routeResult.value : [];
  return <main className="qnot-workspace-page min-h-screen bg-[#071311] px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-3xl">
    <header className="mb-8 flex items-center justify-between border-b border-neutral-800 pb-4"><Link href="/" className="text-xl font-black">Q-not</Link><Link href="/c/requests" className="text-sm text-neutral-300 underline">My journey requests</Link></header>
    <p className="text-xs font-bold tracking-[.18em] text-lime-300">PLAN YOUR JOURNEY / REQUEST A SERVICE</p><h1 className="mt-2 text-3xl font-black">Tell us where and when you need to travel.</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">Q-not groups compatible passenger requests and matches them with approved services that have suitable capacity. A request is not a confirmed seat or a paid booking.</p>
    <p className="mt-3 text-xs text-neutral-400">Testing the UNN experience? Try the <Link href="/campus-demo" className="font-semibold text-lime-200 underline">guided UNN campus demo</Link> first. It uses fictional vehicles, seats and test credits.</p>
    {params.error && <p className="mt-5 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-200">{params.error === "time" ? "Choose a departure time at least five minutes from now." : params.error === "stops" ? "Choose two stops on the selected route in the correct order." : "Check the journey details and try again."}</p>}
    {routesUnavailable && <div role="status" className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="font-semibold text-amber-100">Route information is reconnecting.</p><p className="mt-1 text-sm text-neutral-300">Your account is available, but Q-not cannot retrieve route choices right now. Please try again shortly.</p><Link href="/c/requests/new" className="mt-3 inline-flex text-sm font-semibold text-lime-200 underline">Reload route choices ↻</Link></div>}
    <form action={createJourneyRequestAction} className="mt-7 space-y-5 rounded-xl border border-neutral-800 bg-[#0d1916] p-5 sm:p-7">
      <label className="block text-sm">Route corridor<select name="routeId" required className={field}><option value="">Choose a route</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.origin} → {route.destination}</option>)}</select></label>
      <label className="block text-sm">Boarding stop<select name="boardingStopId" required className={field}><option value="">Choose where to board</option>{routes.flatMap((route) => route.stops.map((stop) => <option key={stop.id} value={stop.id}>{route.origin} → {route.destination} · {stop.sequence}. {stop.name}</option>))}</select></label>
      <label className="block text-sm">Alighting stop<select name="alightingStopId" required className={field}><option value="">Choose where to alight</option>{routes.flatMap((route) => route.stops.map((stop) => <option key={stop.id} value={stop.id}>{route.origin} → {route.destination} · {stop.sequence}. {stop.name}</option>))}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm">Preferred departure<input name="desiredDepartureAt" required type="datetime-local" className={field}/></label><label className="block text-sm">Number of passengers<input name="passengerCount" type="number" min="1" max="8" defaultValue="1" required className={field}/></label></div>
      <button type="submit" disabled={routes.length === 0 || routesUnavailable} className="rounded-lg bg-lime-300 px-5 py-3 text-sm font-bold text-neutral-950 disabled:opacity-50">Submit journey request</button>
      {routes.length === 0 && <p className="text-xs text-neutral-400">No routes with registered stops are available yet.</p>}
    </form>
  </div>
    <QNotWorkspaceDock role="passenger" />
  </main>;
}
