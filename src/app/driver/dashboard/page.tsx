import Link from "next/link";
import { redirect } from "next/navigation";
import { getDriverId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { driverLogoutAction } from "@/lib/actions/driver-auth";
import { publishDriverTripFormAction, openTripBoardingAction, callNextPassengerAction, acceptCashFareAction, startDriverTripAction, markPassengerBoardedAction, completeDriverTripAction } from "@/lib/actions/driver-operations";
import { DriverLocationReporter } from "@/components/driver-location-reporter";
import { DriverLiveRouteMap } from "@/components/maps/driver-live-route-map";

export const dynamic = "force-dynamic";
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const inputClass = "mt-1 w-full rounded-lg border border-neutral-700 bg-[#09110f] px-3 py-2.5 text-sm text-white";

function stateLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export default async function DriverDashboardPage({ searchParams }: { searchParams: Promise<{ published?: string; trip?: string; error?: string; detail?: string }> }) {
  const driverId = await getDriverId();
  if (!driverId) redirect("/driver/login");
  const params = await searchParams;
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      vehicleAssignments: { where: { revokedAt: null }, include: { bus: true } },
      routeApprovals: { include: { route: true }, orderBy: { createdAt: "desc" } },
      verifications: { orderBy: { createdAt: "desc" } },
      trips: { where: { status: { in: ["SCHEDULED", "BOARDING", "IN_TRANSIT"] } }, orderBy: { departureTime: "asc" }, include: {
        route: { include: { stops: { orderBy: { sequence: "asc" }, select: { id: true, name: true, latitude: true, longitude: true, sequence: true } } } },
        bus: true,
        sessions: { where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1 },
        matchedJourneyRequests: { where: { status: "MATCHED" }, orderBy: { desiredDepartureAt: "asc" }, include: { boardingStop: true, alightingStop: true, commuter: { select: { displayName: true } } } },
        queueEntries: { where: { status: { in: ["WAITING", "CALLED", "CONFIRMED"] } }, orderBy: { position: "asc" }, include: { commuter: { select: { displayName: true, phone: true, email: true } } } },
      }, take: 12 },
    },
  });
  if (!driver) redirect("/driver/login");
  if (driver.name === "Driver profile pending" || !driver.licenceExpiry || driver.vehicleAssignments.length === 0) redirect("/driver/onboarding");

  const issuedTickets = await prisma.ticket.findMany({
    where: { tripId: { in: driver.trips.map((trip) => trip.id) }, status: "ISSUED" },
    select: { tripId: true, commuterId: true, code: true },
  });
  const ticketByQueueEntry = new Map(issuedTickets.map((ticket) => [`${ticket.tripId}:${ticket.commuterId}`, ticket]));
  const tripsWithTickets = driver.trips.map((trip) => ({
    ...trip,
    queueEntries: trip.queueEntries.map((entry) => ({
      ...entry,
      ticket: ticketByQueueEntry.get(`${trip.id}:${entry.commuterId}`) ?? null,
    })),
  }));

  const now = new Date();
  const approvedVehicles = driver.vehicleAssignments.filter((assignment) => assignment.bus.verificationStatus === "APPROVED" && !!assignment.bus.registrationExpiry && assignment.bus.registrationExpiry > now && !!assignment.bus.insuranceExpiry && assignment.bus.insuranceExpiry > now && !!assignment.bus.inspectionExpiry && assignment.bus.inspectionExpiry > now);
  const approvedRoutes = driver.routeApprovals.filter((approval) => approval.status === "APPROVED");
  const activeTrip = tripsWithTickets.find((trip) => trip.status === "BOARDING" || trip.status === "IN_TRANSIT");
  const hasPublishAccess = !!driver.phoneVerifiedAt && driver.verificationStatus === "APPROVED" && approvedVehicles.length > 0 && approvedRoutes.length > 0 && !!driver.licenceExpiry && driver.licenceExpiry > now;
  const driverErrorMessages: Record<string, string> = {
    "publish-failed": "The departure could not be published.",
    "driver-not-approved": "Driver approval and licence validity are required before departure.",
    "fare-not-set": "Publish the fare for this service before collecting cash.",
    "cash-fare-failed": "The cash fare could not be recorded. Check the passenger and try again.",
    "call-failed": "The next passenger could not be called. Refresh and try again.",
    "trip-not-ready": "This departure is not ready to start.",
    "vehicle-assignment-missing": "This vehicle is no longer assigned to your driver profile.",
    "boarding-could-not-open": "Boarding could not be opened for this departure.",
    "capacity-state-invalid": "The seat allocation is inconsistent. Contact the operator before continuing.",
    "trip-completion-failed": "This trip could not be completed.",
    "boarding-not-open": "Open boarding before calling passengers.",
    "vehicle-full": "All vehicle seats are already allocated.",
    "queue-empty": "There are no waiting passengers for this departure.",
    "passenger-not-called": "Call this passenger before recording a cash fare.",
    "fare-already-paid": "This passenger already has a confirmed fare payment.",
    "ticket-invalid": "The ticket code is invalid, expired or belongs to another departure.",
    "payment-not-confirmed": "This ticket has no confirmed fare payment.",
    "booking-not-confirmed": "This passenger does not have a confirmed booking.",
    "pending-bookings": "Resolve outstanding confirmed bookings before completing the trip.",
    "trip-not-active": "This service is not currently in transit.",
    "invalid-boarding-code": "Enter a valid Q-not boarding code.",
  };
  const errorMessage = params.error === "publish-failed" && params.detail
    ? params.detail
    : params.error ? driverErrorMessages[params.error] ?? "The requested trip action could not be completed." : null;

  return <main className="min-h-screen bg-[#071311] px-4 py-7 text-white sm:px-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5"><div><Link href="/" className="text-xl font-black">Q-not</Link><p className="mt-1 text-xs tracking-wider text-lime-300">DRIVER OPERATIONS</p></div><div className="flex items-center gap-4"><Link href="/driver/profile" className="text-xs font-semibold text-lime-200 underline underline-offset-4">Profile &amp; verification</Link><span className="text-right text-sm"><strong>{driver.name}</strong><small className="block text-xs text-neutral-400">{driver.phone ?? driver.email ?? "Contact not supplied"}</small></span>{!driver.emailVerifiedAt && <Link href="/driver/onboarding/email" className="text-xs text-lime-300 underline">Verify email</Link>}<form action={driverLogoutAction}><button className="text-sm text-neutral-400 underline" type="submit">Sign out</button></form></div></header>

      <section className="mb-7 grid gap-4 md:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-neutral-800 bg-[#0d1916] p-6"><p className="text-xs font-bold tracking-[.16em] text-lime-300">YOUR DRIVER PROFILE</p><h1 className="mt-3 text-3xl font-black">Welcome, {driver.name.split(" ")[0]}.</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">Manage your registered vehicle, approved routes and service departures from one workspace.</p><div className="mt-6 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${driver.verificationStatus === "APPROVED" ? "bg-emerald-950 text-emerald-200" : "bg-amber-950 text-amber-200"}`}>Driver · {stateLabel(driver.verificationStatus)}</span><span className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300">{approvedVehicles.length} approved vehicles</span><span className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300">{approvedRoutes.length} approved routes</span></div></div>
        <div className="rounded-2xl border border-neutral-800 bg-[#0d1916] p-6"><p className="text-xs font-bold tracking-[.16em] text-neutral-400">ACCOUNT READINESS</p><p className="mt-3 text-2xl font-bold">{hasPublishAccess ? "Ready for service" : "Review in progress"}</p><ul className="mt-4 space-y-2 text-sm text-neutral-300"><li className="flex justify-between gap-3"><span>Driver review</span><strong>{stateLabel(driver.verificationStatus)}</strong></li><li className="flex justify-between gap-3"><span>Mobile verification</span><strong>{driver.phoneVerifiedAt ? "Verified" : "Required before service"}</strong></li><li className="flex justify-between gap-3"><span>Vehicle review</span><strong>{approvedVehicles.length > 0 ? "Approved" : "Pending"}</strong></li><li className="flex justify-between gap-3"><span>Route access</span><strong>{approvedRoutes.length > 0 ? "Approved" : "Pending"}</strong></li></ul></div>
      </section>

      {!driver.phoneVerifiedAt && <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><div><p className="text-sm font-semibold text-amber-100">Mobile verification is still pending.</p><p className="mt-1 text-xs leading-relaxed text-neutral-300">You can review your workspace and profile now. Verify your mobile number before publishing a service, opening boarding or accepting passengers.</p></div><Link href="/driver/profile" className="text-sm font-semibold text-lime-200 underline">Open profile &amp; verification</Link></div>}
      {errorMessage && <p role="alert" className="mb-5 rounded-lg bg-red-950/70 px-4 py-3 text-sm text-red-200">{errorMessage}</p>}
      {params.published === "1" && <p className="mb-5 rounded-lg bg-emerald-950/70 px-4 py-3 text-sm text-emerald-200">Your service departure has been published.</p>}
      {params.trip && <p className="mb-5 rounded-lg bg-emerald-950/70 px-4 py-3 text-sm text-emerald-200">Trip status updated: {stateLabel(params.trip)}.</p>}

      <section className="mb-7 rounded-2xl border border-neutral-800 bg-[#0d1916] p-5 sm:p-6">
        <div className="mb-4"><p className="text-xs font-bold tracking-[.16em] text-lime-300">REGISTERED VEHICLES</p><h2 className="mt-1 text-xl font-bold">Your vehicle garage</h2></div>
        <div className="grid gap-3 md:grid-cols-2">{driver.vehicleAssignments.map(({ bus }) => <article key={bus.id} className="rounded-xl border border-neutral-800 bg-[#09110f] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{bus.plateNumber}</strong><span className={`rounded-full px-2.5 py-1 text-[11px] ${bus.verificationStatus === "APPROVED" ? "bg-emerald-950 text-emerald-200" : "bg-amber-950 text-amber-200"}`}>{stateLabel(bus.verificationStatus)}</span></div><p className="mt-2 text-sm text-neutral-300">{stateLabel(bus.vehicleType)} · {bus.make ?? "Make not entered"} {bus.model ?? ""}</p><p className="mt-1 text-xs text-neutral-500">Passenger capacity: {bus.capacity}</p></article>)}</div>
      </section>

      <section className="mb-7 rounded-2xl border border-neutral-800 bg-[#0d1916] p-5 sm:p-6">
        <p className="text-xs font-bold tracking-[.16em] text-lime-300">ROUTE ACCESS</p><h2 className="mt-1 text-xl font-bold">Approved corridors</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2">{driver.routeApprovals.map((approval) => <div key={approval.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 p-3"><span className="text-sm">{approval.route.origin} <span className="text-lime-300">→</span> {approval.route.destination}</span><span className="text-xs text-neutral-400">{stateLabel(approval.status)}</span></div>)}</div>
      </section>

      {activeTrip ? <section className="mb-7 space-y-5 rounded-2xl border border-lime-300/30 bg-lime-300/5 p-5 sm:p-6">
        <div><p className="text-xs font-bold tracking-[.16em] text-lime-300">{activeTrip.status === "BOARDING" ? "BOARDING IN PROGRESS" : "ACTIVE SERVICE"}</p><h2 className="mt-1 text-xl font-bold">{activeTrip.route.origin} → {activeTrip.route.destination}</h2><p className="mt-1 text-xs text-neutral-400">Vehicle {activeTrip.bus.plateNumber} · {activeTrip.departureTime.toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })} · {activeTrip.bus.capacity - activeTrip.seatsTaken - activeTrip.seatsReserved} unallocated seats</p></div>
        <DriverLiveRouteMap
          tripId={activeTrip.id}
          routeId={activeTrip.route.id}
          routeName={`${activeTrip.route.origin} → ${activeTrip.route.destination}`}
          initialStops={activeTrip.route.stops}
          pickupPoints={activeTrip.matchedJourneyRequests.map((request) => ({ id: request.id, name: request.boardingStop.name, latitude: request.boardingStop.latitude, longitude: request.boardingStop.longitude, passengerCount: request.passengerCount, alightingName: request.alightingStop.name, alightingLatitude: request.alightingStop.latitude, alightingLongitude: request.alightingStop.longitude }))}
        />
        {activeTrip.status === "BOARDING" ? <><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-neutral-300">Call passengers in queue, record fares and confirm each boarding pass before departure.</p><form action={callNextPassengerAction}><input type="hidden" name="tripId" value={activeTrip.id}/><button type="submit" className="rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-bold text-neutral-950">Call next passenger</button></form></div>
          <div className="space-y-2">{activeTrip.queueEntries.length === 0 ? <p className="rounded-lg border border-dashed border-neutral-700 p-4 text-sm text-neutral-400">No passengers are waiting for this departure yet.</p> : activeTrip.queueEntries.map((entry) => <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-[#09110f] p-3"><div><strong className="text-sm">{entry.commuter.displayName || entry.commuter.phone || entry.commuter.email || "Passenger"}</strong><p className="mt-1 text-xs text-neutral-400">Queue #{entry.position} · {entry.status}</p>{entry.ticket && <p className="mt-1 font-mono text-xs text-lime-200">{entry.ticket.code}</p>}</div>{entry.status === "CALLED" ? <form action={acceptCashFareAction}><input type="hidden" name="tripId" value={activeTrip.id}/><input type="hidden" name="queueEntryId" value={entry.id}/><button type="submit" className="rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold">Record cash fare + issue pass</button></form> : entry.status === "CONFIRMED" && entry.ticket ? <form action={markPassengerBoardedAction} className="flex flex-wrap items-center gap-2"><input type="hidden" name="tripId" value={activeTrip.id}/><input type="hidden" name="ticketCode" value={entry.ticket.code}/><button type="submit" className="rounded-lg bg-lime-300 px-3 py-2 text-xs font-bold text-neutral-950">Confirm boarding</button></form> : <span className="text-xs text-neutral-400">{entry.status === "CONFIRMED" ? "Payment confirmed" : "Waiting"}</span>}</article>)}</div>
          <form action={startDriverTripAction}><input type="hidden" name="tripId" value={activeTrip.id}/><button type="submit" className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-neutral-950">Depart and start GPS sharing</button></form></> : <><DriverLocationReporter tripId={activeTrip.id}/>
          <div className="rounded-lg border border-neutral-800 bg-[#09110f] p-4"><h3 className="font-semibold">Confirm a boarding pass</h3><p className="mt-1 text-xs text-neutral-400">Enter the passenger&apos;s ticket code to record boarding.</p><form action={markPassengerBoardedAction} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="tripId" value={activeTrip.id}/><input name="ticketCode" required placeholder="QN-XXXXXXXXXX" autoCapitalize="characters" className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-[#071311] px-3 py-2 text-sm font-mono"/><button type="submit" className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-bold text-neutral-950">Confirm boarding</button></form></div>
          <form action={completeDriverTripAction}><input type="hidden" name="tripId" value={activeTrip.id}/><button type="submit" className="rounded-lg border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-white">Complete trip</button></form></>}</section> : null}

      {hasPublishAccess && <section className="mb-7 rounded-2xl border border-neutral-800 bg-[#0d1916] p-5 sm:p-6"><p className="text-xs font-bold tracking-[.16em] text-lime-300">PUBLISH A SERVICE</p><h2 className="mt-1 text-xl font-bold">Schedule your next departure</h2><form action={publishDriverTripFormAction} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm">Approved route<select name="routeId" required className={inputClass}>{approvedRoutes.map((item) => <option key={item.routeId} value={item.routeId}>{item.route.origin} → {item.route.destination}</option>)}</select></label><label className="text-sm">Approved vehicle<select name="busId" required className={inputClass}>{approvedVehicles.map((item) => <option key={item.busId} value={item.busId}>{item.bus.plateNumber} · {item.bus.capacity} seats</option>)}</select></label><label className="text-sm">Departure time<input name="departureTime" type="datetime-local" required className={inputClass}/></label><label className="text-sm">Fare per passenger (₦)<input name="fareNaira" type="number" min="1" step="50" defaultValue="1500" required className={inputClass}/></label><div className="sm:col-span-2 lg:col-span-4"><button type="submit" className="rounded-lg bg-lime-300 px-5 py-3 text-sm font-bold text-neutral-950">Publish departure</button></div></form></section>}

      <section className="rounded-2xl border border-neutral-800 bg-[#0d1916] p-5 sm:p-6"><p className="text-xs font-bold tracking-[.16em] text-lime-300">UPCOMING SERVICE</p><h2 className="mt-1 text-xl font-bold">Your departures</h2><div className="mt-4 space-y-3">{driver.trips.length === 0 ? <p className="rounded-lg border border-dashed border-neutral-700 p-5 text-sm text-neutral-400">No service departures are assigned to you yet.</p> : driver.trips.map((trip) => <article key={trip.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-800 p-4"><div><strong>{trip.route.origin} → {trip.route.destination}</strong><p className="mt-1 text-xs text-neutral-400">{trip.bus.plateNumber} · {trip.departureTime.toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })} · {naira.format(trip.fareKobo / 100)}</p></div>{trip.status === "IN_TRANSIT" ? <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs text-emerald-200">In transit</span> : trip.status === "BOARDING" ? <span className="rounded-full bg-amber-950 px-3 py-1 text-xs text-amber-100">Boarding</span> : <form action={openTripBoardingAction}><input type="hidden" name="tripId" value={trip.id}/><button className="rounded-lg border border-neutral-700 px-3 py-2 text-xs font-semibold" type="submit">Open boarding</button></form>}</article>)}</div></section>
      <p className="mt-6 text-xs text-neutral-500">Q-not activates driver services only after the driver, vehicle and route requirements have been reviewed and approved.</p>
    </div>
  </main>;
}
