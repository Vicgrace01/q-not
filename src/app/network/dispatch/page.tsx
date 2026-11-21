import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSessionOperatorId } from "@/lib/session";
import { matchJourneyRequestAction } from "@/lib/actions/journey-requests";
import { NetworkLiveMap } from "@/components/maps/network-live-map";

export const dynamic = "force-dynamic";

export default async function NetworkDispatchPage({ searchParams }: { searchParams: Promise<{ matched?: string; error?: string }> }) {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");
  const [operator, params] = await Promise.all([
    prisma.operator.findUnique({ where: { id: operatorId }, select: { email: true } }), searchParams,
  ]);
  if (!operator) redirect("/login");
  const admins = (env.QNOT_NETWORK_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const isNetworkAdmin = admins.includes(operator.email.toLowerCase());
  const routeWhere = isNetworkAdmin ? {} : { operatorId };
  const routes = await prisma.route.findMany({ where: routeWhere, select: { id: true } });
  const routeIds = routes.map((route) => route.id);
  // Use one database clock sample for a consistent request window and GPS freshness cutoff.
  const clockRows = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS now`;
  const now = clockRows[0]?.now ?? new Date(0);
  const requestWindowStart = new Date(now.getTime() - 30 * 60_000);
  const requestWindowEnd = new Date(now.getTime() + 24 * 60 * 60_000);
  const freshLocationCutoff = new Date(now.getTime() - 45_000);
  const [requests, trips, activeSessions] = await Promise.all([
    prisma.journeyRequest.findMany({
      where: { routeId: { in: routeIds }, status: "OPEN", desiredDepartureAt: { gte: requestWindowStart, lte: requestWindowEnd } },
      orderBy: { desiredDepartureAt: "asc" }, take: 100,
      include: { route: true, boardingStop: true, alightingStop: true, commuter: { select: { displayName: true } } },
    }),
    prisma.trip.findMany({
      where: { routeId: { in: routeIds }, status: { in: ["SCHEDULED", "BOARDING", "IN_TRANSIT"] }, departureTime: { gte: requestWindowStart, lte: requestWindowEnd } },
      orderBy: { departureTime: "asc" }, take: 100,
      include: {
        bus: true,
        driver: { select: {
          name: true, verificationStatus: true, licenceExpiry: true, phoneVerifiedAt: true,
          routeApprovals: { where: { status: "APPROVED" }, select: { routeId: true } },
          vehicleAssignments: { where: { revokedAt: null }, select: { busId: true } },
        } },
        route: { include: { stops: { orderBy: { sequence: "asc" } } } },
      },
    }),
    prisma.driverSession.findMany({ where: { status: "ACTIVE", endedAt: null, locationSharingEnabled: true, locationCapturedAt: { gte: freshLocationCutoff }, lastUpdateAt: { gte: freshLocationCutoff }, lastLat: { not: null }, lastLng: { not: null }, trip: { routeId: { in: routeIds }, status: "IN_TRANSIT" } }, orderBy: { lastUpdateAt: "desc" }, take: 100, include: { trip: { select: { id: true, bus: { select: { plateNumber: true } }, route: { select: { origin: true, destination: true } } } } } }),
  ]);
  const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

  return <main className="min-h-screen bg-[#071311] px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5"><div><Link href="/dashboard" className="text-xl font-black">Q-not / Network</Link><p className="mt-1 text-xs text-neutral-400">Demand and departure coordination</p></div><nav className="flex flex-wrap gap-4 text-sm"><Link href="/dashboard">Operator workspace</Link><Link href="/network/verification">Verification review</Link><Link href="/trips">Passenger departures</Link></nav></header>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.18em] text-lime-300">Q-NOT NETWORK / DISPATCH</p><h1 className="mt-2 text-3xl font-black">Coordinate demand with available vehicles.</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">View passenger requests, route-compatible departures and active vehicle locations. Matches are recommended only when the driver, vehicle and route are approved. A match is a dispatch decision; seat reservations and fare payments remain separate.</p></div><span className="rounded-full border border-neutral-700 px-3 py-1 text-xs">{isNetworkAdmin ? "Network administrator" : "Operator view"}</span></div>
    {params.matched && <p className="mt-5 rounded-lg bg-emerald-950 px-4 py-3 text-sm text-emerald-200">Journey request matched to the selected departure.</p>}
    {params.error && <p className="mt-5 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-200">{({"request-unavailable":"This request has already changed or is no longer open.","not-authorised":"You cannot coordinate a route outside your network.","trip-unavailable":"The selected service is unavailable or its vehicle is not approved.","departure-window":"The service departure is outside the requested time window.","route-stops-invalid":"The selected stops are not valid for this route.","insufficient-capacity":"This vehicle does not have enough unallocated seats for the request."} as Record<string,string>)[params.error] ?? "We could not match that request."}</p>}
    <section className="mt-7 grid gap-3 sm:grid-cols-3"><article className="rounded-xl border border-neutral-800 bg-[#0d1916] p-5"><span className="text-xs text-neutral-400">OPEN JOURNEY REQUESTS</span><strong className="mt-2 block text-3xl">{requests.length}</strong></article><article className="rounded-xl border border-neutral-800 bg-[#0d1916] p-5"><span className="text-xs text-neutral-400">AVAILABLE DEPARTURES</span><strong className="mt-2 block text-3xl">{trips.filter((trip) => trip.status !== "IN_TRANSIT").length}</strong></article><article className="rounded-xl border border-neutral-800 bg-[#0d1916] p-5"><span className="text-xs text-neutral-400">ACTIVE VEHICLE LOCATIONS</span><strong className="mt-2 block text-3xl">{activeSessions.length}</strong></article></section>
    <section className="mt-7"><NetworkLiveMap /></section>
    <section className="mt-8"><div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Passenger journey requests</h2><p className="mt-1 text-sm text-neutral-400">Choose a service on the same corridor and within 30 minutes of the requested departure.</p></div><span className="text-xs text-neutral-500">{requests.reduce((sum, item) => sum + item.passengerCount, 0)} passengers requested</span></div>
      <div className="space-y-3">{requests.length === 0 ? <p className="rounded-xl border border-dashed border-neutral-700 p-8 text-center text-sm text-neutral-400">No open journey requests are waiting for coordination.</p> : requests.map((request) => {
        const candidates = trips.filter((trip) => trip.routeId === request.routeId && trip.status !== "IN_TRANSIT" && Math.abs(trip.departureTime.getTime() - request.desiredDepartureAt.getTime()) <= 30 * 60_000 && trip.bus.verificationStatus === "APPROVED" && !!trip.bus.registrationExpiry && trip.bus.registrationExpiry > now && !!trip.bus.insuranceExpiry && trip.bus.insuranceExpiry > now && !!trip.bus.inspectionExpiry && trip.bus.inspectionExpiry > now && !!trip.driver && trip.driver.verificationStatus === "APPROVED" && !!trip.driver.phoneVerifiedAt && !!trip.driver.licenceExpiry && trip.driver.licenceExpiry > now && trip.driver.routeApprovals.some((approval) => approval.routeId === trip.routeId) && trip.driver.vehicleAssignments.some((assignment) => assignment.busId === trip.busId) && trip.bus.capacity - trip.seatsTaken - trip.seatsReserved >= request.passengerCount && trip.route.stops.some((stop) => stop.id === request.boardingStopId && stop.sequence < (trip.route.stops.find((destination) => destination.id === request.alightingStopId)?.sequence ?? -1)));
        return <article key={request.id} className="rounded-xl border border-neutral-800 bg-[#0d1916] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{request.route.origin} → {request.route.destination}</h3><p className="mt-1 text-sm text-neutral-300">{request.boardingStop.name} → {request.alightingStop.name}</p><p className="mt-1 text-xs text-neutral-400">{request.desiredDepartureAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })} · {request.passengerCount} passenger(s) · {request.commuter.displayName ?? "Passenger"}</p></div><span className="rounded-full border border-neutral-700 px-3 py-1 text-xs">OPEN</span></div>
          {candidates.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-neutral-700 p-3 text-xs text-neutral-400">No approved service with matching time and available capacity is currently listed.</p> : <div className="mt-4 grid gap-2 md:grid-cols-2">{candidates.slice(0, 4).map((trip) => <div key={trip.id} className="rounded-lg border border-neutral-800 p-3"><div className="flex justify-between gap-2"><strong className="text-sm">{trip.bus.plateNumber}</strong><span className="text-xs text-neutral-400">{trip.departureTime.toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}</span></div><p className="mt-1 text-xs text-neutral-400">{trip.bus.capacity - trip.seatsTaken - trip.seatsReserved} currently unallocated seats · {trip.driver?.name ?? "Operator service"}</p><form action={matchJourneyRequestAction} className="mt-3"><input type="hidden" name="requestId" value={request.id}/><input type="hidden" name="tripId" value={trip.id}/><button type="submit" className="rounded-lg bg-lime-300 px-3 py-2 text-xs font-bold text-neutral-950">Match to this departure</button></form></div>)}</div>}
        </article>;
      })}</div>
    </section>
    <section className="mt-8"><h2 className="text-xl font-bold">Scheduled and active services</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{trips.slice(0, 20).map((trip) => <article key={trip.id} className="rounded-xl border border-neutral-800 bg-[#0d1916] p-4"><div className="flex items-center justify-between gap-3"><strong>{trip.route.origin} → {trip.route.destination}</strong><span className="text-xs text-neutral-400">{trip.status}</span></div><p className="mt-2 text-xs text-neutral-400">{trip.bus.plateNumber} · {trip.bus.capacity - trip.seatsTaken - trip.seatsReserved} unallocated seats · {naira.format(trip.fareKobo / 100)}</p></article>)}</div></section>
  </div></main>;
}
