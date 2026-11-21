import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { QNotBrand } from "@/components/qnot-brand";
import { PrintReceiptButton } from "@/components/trips/print-receipt-button";

export const dynamic = "force-dynamic";
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "long", timeStyle: "short" });

export default async function CompletedJourneyPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const commuterId = await getCommuterId();
  if (!commuterId) redirect(`/c/login?next=${encodeURIComponent(`/c/journeys/${tripId}/complete`)}`);

  const ticket = await prisma.ticket.findFirst({
    where: { tripId, commuterId, status: "USED" },
    include: {
      commuter: { select: { displayName: true, email: true, phone: true } },
      trip: { include: {
        route: { select: { origin: true, destination: true } },
        bus: { select: { plateNumber: true, vehicleType: true, make: true, model: true } },
        driver: { select: { name: true } },
        sessions: { where: { status: "ENDED" }, orderBy: { endedAt: "desc" }, take: 1, select: { endedAt: true } },
        payments: { where: { commuterId, status: "SUCCEEDED", purpose: "TRIP_FARE" }, orderBy: { paidAt: "desc" }, take: 1, select: { reference: true, provider: true, amountKobo: true, currency: true, paidAt: true } },
      } },
    },
  });
  if (!ticket || ticket.trip.status !== "COMPLETED") notFound();

  const { trip } = ticket;
  const payment = trip.payments[0] ?? null;
  const completedAt = trip.sessions[0]?.endedAt ?? ticket.usedAt ?? trip.updatedAt;
  const receiptReference = `QN-${ticket.id.slice(-10).toUpperCase()}`;
  const paymentLabel = payment ? (payment.provider === "CASH" ? "Cash fare recorded" : `${payment.provider} payment confirmed`) : "Payment record unavailable";
  const fareValue = payment ? naira.format(payment.amountKobo / 100) : "Not recorded";
  const passengerName = ticket.commuter.displayName?.trim() || "Q-not passenger";

  return <main className="qnot-basic-page qnot-complete-page">
    <header><div className="qnot-complete-header"><QNotBrand /><nav><Link href="/c/dashboard">My Q-not</Link><Link href="/c/tickets">My tickets</Link><Link href="/trips">Find your next bus</Link></nav></div></header>
    <div className="qnot-complete-wrap">
      <section className="qnot-arrival-celebration">
        <div className="qnot-arrival-orbit" aria-hidden="true"><span>Q</span><i/><b/></div>
        <span className="qnot-page-eyebrow">Q-NOT / JOURNEY COMPLETE</span>
        <h1>You made it.<br/><em>Thanks for moving with Q-not.</em></h1>
        <p>Your arrival is recorded. Your journey details and fare record are ready below.</p>
      </section>
      <section className="qnot-receipt-card" aria-labelledby="qnot-receipt-title">
        <div className="qnot-receipt-head"><div><span>Q-NOT / TRAVEL RECEIPT</span><h2 id="qnot-receipt-title">Journey summary</h2></div><span className="qnot-receipt-status"><i/> COMPLETED</span></div>
        <div className="qnot-receipt-route"><div><span>FROM</span><strong>{trip.route.origin}</strong></div><span className="qnot-receipt-route-line" aria-hidden="true"><i>Q</i></span><div><span>TO</span><strong>{trip.route.destination}</strong></div></div>
        <div className="qnot-receipt-grid">
          <div><span>PASSENGER</span><strong>{passengerName}</strong></div>
          <div><span>VEHICLE</span><strong>{trip.bus.plateNumber}</strong><small>{trip.bus.make ?? trip.bus.vehicleType} {trip.bus.model ?? ""}</small></div>
          <div><span>DRIVER</span><strong>{trip.driver?.name ?? "Driver record"}</strong></div>
          <div><span>DEPARTED</span><strong>{dateTime.format(trip.departureTime)}</strong></div>
          <div><span>ARRIVAL RECORDED</span><strong>{dateTime.format(completedAt)}</strong></div>
          <div><span>BOARDING CODE</span><strong className="qnot-receipt-code">{ticket.code}</strong></div>
        </div>
        <div className="qnot-receipt-payment"><div><span>FARE</span><strong>{fareValue}</strong></div><div><span>PAYMENT STATUS</span><strong>{paymentLabel}</strong></div>{payment?.reference && <div><span>PAYMENT REFERENCE</span><strong className="qnot-receipt-reference">{payment.reference}</strong></div>}</div>
        <div className="qnot-receipt-foot"><span>RECEIPT REFERENCE <strong>{receiptReference}</strong></span><span>Issued {dateTime.format(ticket.issuedAt)}</span></div>
        <div className="qnot-receipt-actions"><PrintReceiptButton /><Link href="/trips" className="qnot-receipt-next">Plan another journey <span>↗</span></Link></div>
      </section>
      <p className="qnot-complete-thanks">From the first stop to the final drop-off, thanks for choosing a more connected way to move around the city.</p>
      <div className="qnot-complete-footer"><QNotBrand compact/><span>Q-NOT / MOVE WITH THE CITY.</span><Link href="/c/dashboard">Return to your travel space ↑</Link></div>
    </div>
  </main>;
}
