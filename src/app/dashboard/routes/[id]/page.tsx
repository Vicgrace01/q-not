import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionOperatorId } from "@/lib/session";
import { addRouteStopAction, createOperatorTripAction } from "@/lib/actions/routes";
import { LocationMap, type MapPoint } from "@/components/maps/location-map";
import { StopCoordinatePicker } from "@/components/maps/stop-coordinate-picker";

export const dynamic = "force-dynamic";

export default async function RouteDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ stop?: string; error?: string; trip?: string }> }) {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const route = await prisma.route.findFirst({
    where: { id, operatorId },
    include: {
      stops: { orderBy: { sequence: "asc" } },
      trips: {
        orderBy: { departureTime: "desc" },
        take: 20,
        include: { bus: { select: { plateNumber: true, capacity: true } } },
      },
    },
  });

  if (!route) notFound();
  const now = new Date();
  const approvedAssignments = await prisma.driverVehicleAssignment.findMany({
    where: {
      revokedAt: null,
      driver: { operatorId, verificationStatus: "APPROVED", phoneVerifiedAt: { not: null }, licenceExpiry: { gt: now }, routeApprovals: { some: { routeId: route.id, status: "APPROVED" } } },
      bus: { operatorId, verificationStatus: "APPROVED", registrationExpiry: { gt: now }, insuranceExpiry: { gt: now }, inspectionExpiry: { gt: now } },
    },
    include: { driver: { select: { id: true, name: true } }, bus: { select: { id: true, plateNumber: true, capacity: true, vehicleType: true } } },
    orderBy: { assignedAt: "desc" },
  });
  const stopPoints: MapPoint[] = route.stops.map((stop) => ({ id: stop.id, latitude: stop.latitude, longitude: stop.longitude, label: `${stop.sequence}. ${stop.name}`, kind: stop.sequence === 1 ? "origin" : "stop" }));

  return (
    <div className="qnot-dashboard-content qnot-route-detail-page">
      <Link href="/dashboard" className="qnot-back-link">← Back to routes</Link>
      <section className="qnot-dashboard-heading qnot-route-detail-heading">
        <div><span className="qnot-page-eyebrow"><i/> ROUTE ASSET / {route.id.slice(-6).toUpperCase()}</span><h1>{route.origin} <em>→ {route.destination}</em></h1><p>This corridor belongs to your operator workspace. Stops and attached trips are listed below.</p></div>
        <span className="qnot-count-pill">REGISTERED ROUTE</span>
      </section>
      <section className="qnot-ops-metrics qnot-route-detail-metrics">
        <article className="qnot-ops-metric qnot-ops-metric--feature"><span>REGISTERED STOPS</span><strong>{String(route.stops.length).padStart(2, "0")}</strong><small>Ordered boarding points</small></article>
        <article className="qnot-ops-metric"><span>ATTACHED TRIPS</span><strong>{String(route.trips.length).padStart(2, "0")}</strong><small>Scheduled route activity</small></article>
        <article className="qnot-ops-metric"><span>CREATED</span><strong>{route.createdAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short" })}</strong><small>{route.createdAt.getFullYear()}</small></article>
      </section>
      {query.stop === "added" && <p className="mb-5 rounded-lg bg-emerald-950 px-4 py-3 text-sm text-emerald-200">Route stop added.</p>}
      {query.trip === "published" && <p className="mb-5 rounded-lg bg-emerald-950 px-4 py-3 text-sm text-emerald-200">Departure published. It is now listed for passengers.</p>}
      {query.error && <p className="mb-5 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-200">{({"trip-details":"Check the departure details.","trip-time":"Choose a departure at least five minutes from now.","route-not-owned":"This route is not part of your operator workspace.","route-needs-stops":"Add at least two mapped stops before publishing a departure.","driver-vehicle-not-cleared":"Choose an approved driver and vehicle with approved access to this route.","driver-schedule-conflict":"This driver already has a service close to that departure time.","vehicle-schedule-conflict":"This vehicle already has a service close to that departure time."} as Record<string,string>)[query.error] ?? "The departure could not be published."}</p>}
      {query.error === "stop-details" && <p className="mb-5 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-200">Enter a valid stop name and coordinates.</p>}
      <section className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4"><span className="qnot-page-eyebrow">CORRIDOR MAP</span><h2 className="mt-1 text-xl font-bold">Stops on this route</h2><p className="mt-1 text-xs text-neutral-400">Coordinates place each boarding point on the passenger and dispatch maps.</p></div>
        <LocationMap points={stopPoints} drawRoute routeId={route.id} className="qnot-location-map h-[320px] w-full overflow-hidden rounded-lg"/>
      </section>
      <div className="qnot-route-detail-grid">
        <section className="qnot-route-board">
          <div className="qnot-section-heading"><div><span className="qnot-page-eyebrow">CORRIDOR / 01</span><h2>Route stops</h2></div><span className="qnot-count-pill">{route.stops.length} STOPS</span></div>
          {route.stops.length === 0 ? <div className="qnot-inline-empty"><strong>No stops added yet.</strong><p>Add the route&apos;s actual boarding and alighting points below. Each stop needs latitude and longitude so passengers and dispatch operators can see it on the map.</p></div> : <ol className="qnot-stop-list">{route.stops.map((stop) => <li key={stop.id}><span>{String(stop.sequence).padStart(2, "0")}</span><strong>{stop.name}</strong><small>{stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</small></li>)}</ol>}
          <form action={addRouteStopAction} className="mt-5 grid gap-3 border-t border-neutral-800 pt-5 sm:grid-cols-2">
            <input type="hidden" name="routeId" value={route.id}/>
            <label className="text-xs text-neutral-300 sm:col-span-2">Stop name<input name="name" required maxLength={100} placeholder="e.g. Ojuelegba" className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white"/></label>
            <StopCoordinatePicker existingStops={route.stops.map((stop) => ({ id: stop.id, name: stop.name, latitude: stop.latitude, longitude: stop.longitude, sequence: stop.sequence }))} center={route.stops.length ? [route.stops[route.stops.length - 1].latitude, route.stops[route.stops.length - 1].longitude] : [6.5244, 3.3792]}/>
            <button type="submit" className="rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-bold text-neutral-950 sm:col-span-2">Add route stop</button>
          </form>
        </section>
        <section className="qnot-route-board">
          <div className="qnot-section-heading"><div><span className="qnot-page-eyebrow">OPERATIONS / 02</span><h2>Publish a departure</h2></div><span className="qnot-count-pill">APPROVED ASSETS ONLY</span></div>
          {approvedAssignments.length === 0 ? <div className="qnot-inline-empty"><strong>No approved driver-and-vehicle pair for this route yet.</strong><p>Register a driver and vehicle in Fleet, then complete their verification and approve the route permission before publishing a departure.</p><Link href="/dashboard/fleet" className="mt-3 inline-block text-sm font-semibold text-lime-300 underline">Open fleet management</Link></div> : <form action={createOperatorTripAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="routeId" value={route.id}/>
            <label className="text-xs text-neutral-300 sm:col-span-2">Driver and assigned vehicle<select name="assignmentId" required className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white">{approvedAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.driver.name} · {assignment.bus.plateNumber} · {assignment.bus.capacity} seats · {assignment.bus.vehicleType}</option>)}</select></label>
            <label className="text-xs text-neutral-300">Departure time<input name="departureTime" type="datetime-local" required className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white"/></label>
            <label className="text-xs text-neutral-300">Fare per passenger (₦)<input name="fareNaira" type="number" min="1" step="1" required placeholder="1500" className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-white"/></label>
            <button type="submit" className="rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-bold text-neutral-950 sm:col-span-2">Publish departure</button>
          </form>}
        </section>
        <section className="qnot-route-board">
          <div className="qnot-section-heading"><div><span className="qnot-page-eyebrow">OPERATIONS / 03</span><h2>Attached trips</h2></div><span className="qnot-count-pill">LATEST 20</span></div>
          {route.trips.length === 0 ? <div className="qnot-inline-empty"><strong>No trips attached yet.</strong><p>Register vehicles and create trips to make this corridor available for passenger discovery.</p></div> : <div className="qnot-trip-assets">{route.trips.map((trip) => <div className="qnot-trip-asset" key={trip.id}><span className="qnot-trip-asset-icon">▤</span><div><strong>{trip.bus.plateNumber}</strong><small>{trip.departureTime.toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })} · {trip.bus.capacity} seats</small></div><span className={`qnot-status-pill status-${trip.status.toLowerCase()}`}>{trip.status.replace("_", " ")}</span></div>)}</div>}
        </section>
      </div>
    </div>
  );
}
