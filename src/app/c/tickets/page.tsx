import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { QNotBrand } from "@/components/qnot-brand";
import { QNotWorkspaceDock } from "@/components/qnot-workspace-navigation";

export const dynamic = "force-dynamic";
const dateTime = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

function statusLabel(status: string) { return status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }

export default async function MyTicketsPage() {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login?next=%2Fc%2Ftickets");
  const [tickets, entries] = await Promise.all([
    prisma.ticket.findMany({
      where: { commuterId }, orderBy: { issuedAt: "desc" }, take: 50,
      include: { trip: { include: {
        route: { select: { origin: true, destination: true } },
        bus: { select: { plateNumber: true, vehicleType: true } },
        driver: { select: { name: true } },
        payments: { where: { commuterId, status: "SUCCEEDED", purpose: "TRIP_FARE" }, orderBy: { paidAt: "desc" }, take: 1, select: { amountKobo: true, provider: true } },
      } } },
    }),
    prisma.queueEntry.findMany({
      where: { commuterId, status: { in: ["WAITING", "CALLED", "CONFIRMED"] } },
      orderBy: { joinedAt: "desc" }, take: 30,
      include: { trip: { include: { route: { select: { origin: true, destination: true } }, bus: { select: { plateNumber: true } } } } },
    }),
  ]);

  return (
    <main className="qnot-basic-page qnot-tickets-page">
      <header><div><QNotBrand /><nav><Link href="/c/dashboard">My Q-not</Link><Link href="/c/q-funds">Q-Funds</Link><Link href="/trips">Find a bus</Link></nav></div></header>
      <main className="qnot-ticket-wallet-wrap qnot-workspace-page">
        <span className="qnot-page-eyebrow">PASSENGER / TRAVEL WALLET</span>
        <h1>Your tickets.<br /><em>Your journeys.</em></h1>
        <p className="qnot-ticket-wallet-lead">Every confirmed boarding pass and active queue position, together in one place.</p>
        <section className="qnot-ticket-list-section">
          <div className="qnot-subsection-heading"><div><span>CONFIRMED TRAVEL</span><h2>Boarding passes</h2></div><strong>{tickets.length.toString().padStart(2, "0")}</strong></div>
          {tickets.length === 0 ? <div className="qnot-ticket-empty"><span className="qnot-empty-ticket-mark">Q</span><h3>Your first boarding pass starts with a departure.</h3><p>Choose an approved service, confirm your fare and your boarding pass will appear here.</p><Link href="/trips">Explore departures <i>↗</i></Link></div> : <div className="qnot-ticket-grid">{tickets.map((ticket) => {
            const payment = ticket.trip.payments[0] ?? null;
            const completed = ticket.trip.status === "COMPLETED" && ticket.status === "USED";
            const target = completed ? `/c/journeys/${ticket.tripId}/complete` : `/trips/${ticket.tripId}`;
            return <article className="qnot-ticket-card" key={ticket.id}>
              <div className="qnot-ticket-topline"><span>Q-NOT / BOARDING PASS</span><b className={ticket.status === "ISSUED" ? "is-issued" : ticket.status === "USED" ? "is-used" : ""}>{statusLabel(ticket.status)}</b></div>
              <h3>{ticket.trip.route.origin} <i>→</i> {ticket.trip.route.destination}</h3>
              <p className="qnot-ticket-vehicle">{ticket.trip.bus.plateNumber} · {statusLabel(ticket.trip.bus.vehicleType)} · {ticket.trip.driver?.name ?? "Driver assigned"}</p>
              <div className="qnot-ticket-code"><span>BOARDING CODE</span><strong>{ticket.code}</strong></div>
              <div className="qnot-ticket-meta"><span>Issued<strong>{dateTime.format(ticket.issuedAt)}</strong></span><span>Fare<strong>{payment ? naira.format(payment.amountKobo / 100) : "On record"}</strong></span></div>
              <Link href={target} className="qnot-ticket-open">{completed ? "Open journey receipt" : "Open journey"} <i>↗</i></Link>
            </article>;
          })}</div>}
        </section>
        <section className="qnot-ticket-list-section">
          <div className="qnot-subsection-heading"><div><span>QUEUE POSITION / DEMAND</span><h2>Waiting for a seat</h2></div><strong>{entries.length.toString().padStart(2, "0")}</strong></div>
          {entries.length === 0 ? <p className="qnot-ticket-queue-empty">You have no active queue positions. A queue entry records demand; it does not reserve a seat until the fare and boarding process are confirmed.</p> : <div className="qnot-ticket-queue-list">{entries.map((entry) => <article key={entry.id}><div><strong>{entry.trip.route.origin} <i>→</i> {entry.trip.route.destination}</strong><span>{entry.trip.bus.plateNumber} · Position {entry.position} · Joined {dateTime.format(entry.joinedAt)}</span></div><b>{statusLabel(entry.status)}</b><Link href={`/trips/${entry.tripId}`}>View departure ↗</Link></article>)}</div>}
        </section>
      </main>
      <QNotWorkspaceDock role="passenger" />
    </main>
  );
}
