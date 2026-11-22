import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { cancelJourneyRequestAction } from "@/lib/actions/journey-requests";
import { QNotWorkspaceDock } from "@/components/qnot-workspace-navigation";

export const dynamic = "force-dynamic";
export default async function PassengerJourneyRequestsPage({ searchParams }: { searchParams: Promise<{ created?: string; cancelled?: string }> }) {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login?next=%2Fc%2Frequests");
  const params = await searchParams;
  const requestResult = await prisma.journeyRequest.findMany({
    where: { commuterId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { route: true, boardingStop: true, alightingStop: true, matchedTrip: { include: { bus: true, route: true } } },
  }).then((value) => ({ ok: true as const, value })).catch((error: unknown) => {
    console.error("Q-not could not load passenger journey requests:", error instanceof Error ? error.message : "Database unavailable");
    return { ok: false as const, value: null };
  });
  const requestsUnavailable = !requestResult.ok;
  const requests = requestResult.ok ? requestResult.value : [];
  return <main className="qnot-workspace-page min-h-screen bg-[#071311] px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-4xl">
    <header className="mb-8 flex items-center justify-between border-b border-neutral-800 pb-4"><Link href="/" className="text-xl font-black">Q-not</Link><nav className="flex gap-4 text-sm"><Link href="/c/dashboard">Dashboard</Link><Link href="/c/q-funds">Q-Funds</Link></nav></header>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-lime-300">YOUR JOURNEY PLANS</p><h1 className="mt-2 text-3xl font-black">Journey requests</h1><p className="mt-2 text-sm text-neutral-400">Track the routes and departure times you have requested.</p></div><Link href="/c/requests/new" className="rounded-lg bg-lime-300 px-4 py-3 text-sm font-bold text-neutral-950">Request a journey</Link></div>
    {params.created && <p className="mt-5 rounded-lg bg-emerald-950 px-4 py-3 text-sm text-emerald-200">{params.created === "existing" ? "You already have an active request for this route and time window." : "Your journey request has been shared with the route network."}</p>}{params.cancelled && <p className="mt-5 rounded-lg bg-emerald-950 px-4 py-3 text-sm text-emerald-200">Journey request cancelled.</p>}
    <div className="mt-7 space-y-3">{requestsUnavailable ? <div role="status" className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-8 sm:p-10"><p className="text-xs font-bold tracking-[.16em] text-amber-200">RECONNECTING TO YOUR JOURNEYS</p><h2 className="mt-2 text-xl font-bold">Your requests are safe.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-300">Q-not could not reach the journey service just now. This is a connection issue, not a cancellation. Try loading your requests again.</p><Link href="/c/requests" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-300 px-5 py-2.5 text-sm font-bold text-[#102016]">Try again <span aria-hidden="true" className="ml-2">↻</span></Link></div> : requests.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center"><h2 className="text-lg font-bold">No journey requests yet.</h2><p className="mt-2 text-sm text-neutral-400">Tell Q-not when and where you want to travel so compatible services can be identified.</p></div> : requests.map((request) => <article key={request.id} className="rounded-xl border border-neutral-800 bg-[#0d1916] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{request.route.origin} → {request.route.destination}</h2><p className="mt-1 text-sm text-neutral-300">{request.boardingStop.name} → {request.alightingStop.name}</p><p className="mt-1 text-xs text-neutral-400">{request.desiredDepartureAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })} · {request.passengerCount} passenger(s)</p></div><span className="rounded-full border border-neutral-700 px-3 py-1 text-xs">{request.status}</span></div>{request.matchedTrip && <div className="mt-4 rounded-lg border border-lime-300/20 bg-lime-300/5 p-3"><p className="text-sm font-semibold text-lime-200">Compatible departure identified</p><p className="mt-1 text-sm">{request.matchedTrip.route.origin} → {request.matchedTrip.route.destination} · {request.matchedTrip.bus.plateNumber}</p><Link href={`/trips/${request.matchedTrip.id}`} className="mt-2 inline-block text-sm text-lime-200 underline">View departure and confirm a seat</Link></div>}{["OPEN","MATCHED"].includes(request.status) && <form action={cancelJourneyRequestAction} className="mt-4"><input type="hidden" name="requestId" value={request.id}/><button type="submit" className="text-xs text-neutral-400 underline">Cancel request</button></form>}</article>)}</div>
  </div>
    <QNotWorkspaceDock role="passenger" />
  </main>;
}
