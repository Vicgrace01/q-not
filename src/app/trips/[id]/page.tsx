import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { env } from "@/lib/env";
import { JoinButton } from "./join-button";
import { PayTripButton } from "@/components/pay-trip-button";
import { LiveTripMap } from "@/components/maps/live-trip-map";
import { cancelQueueEntryFormAction } from "@/lib/actions/queue";
import { countUnreservedCalledEntries } from "@/lib/queue/capacity";
import { TripCabinPreview } from "@/components/trips/trip-cabin-preview";

export const dynamic = "force-dynamic";
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function TripDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; queue?: string }> }) {
  const { id } = await params;
  const { error, queue } = await searchParams;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      route: { include: { stops: { orderBy: { sequence: "asc" }, select: { id: true, name: true, latitude: true, longitude: true, sequence: true } } } },
      bus: { select: { capacity: true, plateNumber: true, vehicleType: true, make: true, model: true, colour: true, verificationStatus: true, registrationExpiry: true, insuranceExpiry: true, inspectionExpiry: true } },
      driver: { select: { name: true, verificationStatus: true, phoneVerifiedAt: true, licenceExpiry: true, routeApprovals: { where: { status: "APPROVED" }, select: { routeId: true } }, vehicleAssignments: { where: { revokedAt: null }, select: { busId: true } } } },
    },
  });
  const commuterId = await getCommuterId();
  if (trip?.status === "COMPLETED" && commuterId) {
    const completedPass = await prisma.ticket.findFirst({ where: { tripId: trip.id, commuterId, status: "USED" }, select: { id: true } });
    if (completedPass) redirect(`/c/journeys/${trip.id}/complete`);
  }
  const now = new Date();
  if (!trip || !["SCHEDULED", "BOARDING", "IN_TRANSIT"].includes(trip.status)
    || trip.bus.verificationStatus !== "APPROVED"
    || !trip.bus.registrationExpiry || trip.bus.registrationExpiry <= now
    || !trip.bus.insuranceExpiry || trip.bus.insuranceExpiry <= now
    || !trip.bus.inspectionExpiry || trip.bus.inspectionExpiry <= now
    || !trip.driver || trip.driver.verificationStatus !== "APPROVED"
    || !trip.driver.phoneVerifiedAt || !trip.driver.licenceExpiry || trip.driver.licenceExpiry <= now
    || !trip.driver.routeApprovals.some((approval) => approval.routeId === trip.routeId)
    || !trip.driver.vehicleAssignments.some((assignment) => assignment.busId === trip.busId)) notFound();

  const [existingEntry, commuter, trackingTicket] = await Promise.all([
    commuterId ? prisma.queueEntry.findUnique({ where: { tripId_commuterId: { tripId: trip.id, commuterId } } }) : null,
    commuterId ? prisma.commuter.findUnique({ where: { id: commuterId }, select: { email: true, emailVerifiedAt: true } }) : null,
    commuterId ? prisma.ticket.findFirst({ where: { tripId: trip.id, commuterId, status: { in: ["ISSUED", "USED"] } }, select: { id: true } }) : null,
  ]);
  const [calledSeatClaims, viewerOtherCalledClaims] = await Promise.all([
    prisma.$transaction((tx) => countUnreservedCalledEntries(tx, trip.id)),
    prisma.$transaction((tx) => countUnreservedCalledEntries(tx, trip.id, commuterId)),
  ]);
  const seatsLeft = Math.max(0, trip.bus.capacity - trip.seatsTaken - trip.seatsReserved - viewerOtherCalledClaims);
  const departing = trip.departureTime.toLocaleString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", year: "numeric" });
  const stops = trip.route.stops.map((stop) => ({ id: stop.id, name: stop.name, latitude: stop.latitude, longitude: stop.longitude, sequence: stop.sequence }));
  const statusLabel = trip.status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (part) => part.toUpperCase());

  return <div className="qnot-basic-page qnot-trip-detail-page">
    <header className="border-b border-neutral-800"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4"><Link href="/" className="text-lg font-semibold">Q-not</Link><div className="flex items-center gap-4"><Link href="/c/dashboard" className="text-sm text-neutral-400 hover:text-white">My journeys</Link><Link href="/trips" className="text-sm text-neutral-400 hover:text-white">All departures</Link></div></div></header>
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs font-semibold text-lime-200">{statusLabel}</span><span className="text-xs text-neutral-400">Service reference {trip.id.slice(-8).toUpperCase()}</span></div>
      <h1 className="mt-4 text-3xl font-black">{trip.route.origin} <span className="text-lime-300">→</span> {trip.route.destination}</h1>
      <p className="mt-2 text-sm text-neutral-400">Departure {departing}</p>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><span className="text-xs text-neutral-400">FARE PER PASSENGER</span><strong className="mt-2 block text-2xl">{naira.format(trip.fareKobo / 100)}</strong></article>
        <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><span className="text-xs text-neutral-400">AVAILABLE SEATS</span><strong className="mt-2 block text-2xl">{seatsLeft}</strong><span className="text-xs text-neutral-500">{trip.seatsReserved} reserved · {trip.seatsTaken} boarded</span></article>
        <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><span className="text-xs text-neutral-400">VEHICLE</span><strong className="mt-2 block text-lg">{trip.bus.plateNumber}</strong><span className="text-xs text-neutral-500">{trip.bus.make ?? trip.bus.vehicleType} {trip.bus.model ?? ""} · {trip.bus.capacity} seats</span></article>
        <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><span className="text-xs text-neutral-400">DRIVER STATUS</span><strong className="mt-2 block text-lg">{trip.driver?.verificationStatus === "APPROVED" ? "Verified driver" : "Not yet verified"}</strong><span className="text-xs text-neutral-500">Vehicle {trip.bus.verificationStatus === "APPROVED" ? "approved" : "under review"}</span></article>
      </section>

      {error && <p className="mt-6 rounded bg-red-950 px-4 py-3 text-sm text-red-300">{decodeURIComponent(error)}</p>}
      {queue === "cancelled" && <p className="mt-6 rounded bg-emerald-950 px-4 py-3 text-sm text-emerald-200">Your queue request has been cancelled.</p>}
      <section className="mt-7 grid gap-4 lg:grid-cols-[1fr_.85fr]">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-lg font-bold">Choose how to join this departure</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">Join the departure queue to register your demand, or reserve a confirmed seat by paying the published fare. Joining the queue alone does not reserve a seat or issue a boarding pass.</p>
          {existingEntry && ["WAITING", "CALLED", "CONFIRMED", "SEATED"].includes(existingEntry.status) ? <div className="mt-5 rounded-lg border border-lime-300/30 bg-lime-300/5 p-4"><strong className="text-lime-200">Your queue position: {existingEntry.position}</strong><p className="mt-1 text-sm text-neutral-300">Status: {existingEntry.status.replaceAll("_", " ").toLowerCase()}.</p><Link href="/c/dashboard" className="mt-3 inline-block text-sm text-lime-200 underline">View passenger dashboard</Link>{["WAITING", "CALLED"].includes(existingEntry.status) && <form action={cancelQueueEntryFormAction} className="mt-4"><input type="hidden" name="tripId" value={trip.id}/><button type="submit" className="text-xs font-semibold text-red-300 underline">Leave this queue</button></form>}</div> : trip.status === "IN_TRANSIT" ? <p className="mt-5 text-sm text-neutral-400">This vehicle is already on its journey and is not accepting new passengers.</p> : <div className="mt-5"><JoinButton tripId={trip.id}/></div>}
          {trip.fareKobo > 0 && trip.status !== "IN_TRANSIT" && <div className="mt-5 border-t border-neutral-800 pt-5"><p className="text-sm font-semibold">Want a confirmed seat?</p>{!commuterId ? <Link href={`/c/login?next=${encodeURIComponent(`/trips/${trip.id}`)}`} className="mt-3 inline-flex rounded-lg bg-lime-300 px-4 py-3 text-sm font-bold text-neutral-950">Sign in to reserve and pay</Link> : !commuter?.emailVerifiedAt ? <p className="mt-2 text-xs text-neutral-400">Verify an email address from your passenger profile before using online checkout.</p> : <PayTripButton tripId={trip.id} disabled={seatsLeft < 1}/>}</div>}
          {seatsLeft < 1 && <p className="mt-4 text-xs text-amber-200">All seats are currently allocated. You can still register queue demand, but a confirmed seat is not available at this time.</p>}
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"><h2 className="text-lg font-bold">Vehicle details</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-neutral-400">Vehicle class</dt><dd>{trip.bus.vehicleType}</dd></div><div className="flex justify-between gap-4"><dt className="text-neutral-400">Colour</dt><dd>{trip.bus.colour ?? "Not supplied"}</dd></div><div className="flex justify-between gap-4"><dt className="text-neutral-400">Capacity</dt><dd>{trip.bus.capacity} passengers</dd></div><div className="flex justify-between gap-4"><dt className="text-neutral-400">Departure time</dt><dd>{departing}</dd></div></dl><p className="mt-5 text-xs leading-relaxed text-neutral-500">Driver and vehicle approval status is displayed from the transport records. Q-not does not display private identity or licence numbers.</p></div>
      </section>
      <TripCabinPreview capacity={trip.bus.capacity} occupied={trip.seatsTaken} held={trip.seatsReserved + calledSeatClaims} vehicleType={trip.bus.vehicleType} plateNumber={trip.bus.plateNumber}/>
      <LiveTripMap tripId={trip.id} routeId={trip.route.id} initialStops={stops} canTrackLocation={!!trackingTicket}/>
      {!env.PAYSTACK_SECRET_KEY && trip.fareKobo > 0 && <p className="mt-4 text-xs text-neutral-500">Online fare checkout will appear when the payment provider is configured for this environment. Cash fares can be recorded by the driver during boarding.</p>}
    </main>
  </div>;
}
