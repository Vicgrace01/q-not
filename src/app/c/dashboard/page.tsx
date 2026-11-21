import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { commuterLogoutAction } from "@/lib/actions/commuter-auth";
import { QNotBrand } from "@/components/qnot-brand";
import { LiveTripMap } from "@/components/maps/live-trip-map";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

const timeOnly = new Intl.DateTimeFormat("en-NG", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

function queueStatusLabel(status: string) {
  if (status === "WAITING") return "Waiting in queue";
  if (status === "CALLED") return "Called to board";
  if (status === "CONFIRMED") return "Seat confirmed";
  if (status === "SEATED") return "Boarded";
  if (status === "CANCELLED") return "Cancelled";
  return "Expired";
}

function ticketStatusLabel(status: string) {
  if (status === "ISSUED") return "Ready to board";
  if (status === "USED") return "Journey completed";
  return "Cancelled";
}

export default async function PassengerDashboardPage() {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login?next=%2Fc%2Fdashboard");

  const commuter = await prisma.commuter.findUnique({
    where: { id: commuterId },
    include: {
      queueEntries: {
        orderBy: { joinedAt: "desc" },
        take: 5,
        include: {
          trip: {
            include: {
              route: { select: { origin: true, destination: true } },
              bus: { select: { plateNumber: true, capacity: true, vehicleType: true } },
            },
          },
        },
      },
      tickets: {
        orderBy: { issuedAt: "desc" },
        take: 4,
        include: {
          trip: {
            include: {
              route: { select: { id: true, origin: true, destination: true, stops: { orderBy: { sequence: "asc" }, select: { id: true, name: true, latitude: true, longitude: true, sequence: true } } } },
              bus: { select: { plateNumber: true, vehicleType: true } },
            },
          },
        },
      },
    },
  });

  if (!commuter) redirect("/c/login");

  const [activeQueueCount, boardedCount, issuedTicketCount, completedJourneyCount, openRequestCount] = await Promise.all([
    prisma.queueEntry.count({ where: { commuterId, status: { in: ["WAITING", "CALLED", "CONFIRMED"] } } }),
    prisma.queueEntry.count({ where: { commuterId, status: "SEATED" } }),
    prisma.ticket.count({ where: { commuterId, status: "ISSUED" } }),
    prisma.ticket.count({ where: { commuterId, status: "USED", trip: { status: "COMPLETED" } } }),
    prisma.journeyRequest.count({ where: { commuterId, status: "OPEN" } }),
  ]);

  const displayName = commuter.displayName?.trim() || "traveller";
  const firstName = displayName.split(/\s+/)[0];
  const activeQueueEntry = commuter.queueEntries.find((entry) => entry.status === "WAITING" || entry.status === "CALLED" || entry.status === "CONFIRMED");
  const activeTicket = commuter.tickets.find((ticket) => ticket.status === "ISSUED" && (ticket.trip.status === "BOARDING" || ticket.trip.status === "IN_TRANSIT"));
  const latestTicket = commuter.tickets[0];

  return (
    <div className="qnot-passenger-workspace">
      <header className="qnot-passenger-topbar">
        <div className="qnot-passenger-topbar-inner">
          <QNotBrand />
          <nav className="qnot-passenger-nav" aria-label="Passenger navigation">
            <Link href="/trips">Find a bus</Link>
            <Link href="/c/tickets">My journeys</Link>
            <Link href="/c/q-funds">Q-Funds</Link>
            <Link href="/c/profile">Safety & profile</Link>
          </nav>
          <div className="qnot-passenger-account">
            <span className="qnot-passenger-avatar" aria-hidden="true">{firstName.slice(0, 1).toUpperCase()}</span>
            <span className="qnot-passenger-account-name"><small>YOUR Q-NOT ACCOUNT</small><strong>{displayName}</strong></span>
            <form action={commuterLogoutAction}><button type="submit" className="qnot-passenger-signout">Sign out <i>↗</i></button></form>
          </div>
        </div>
      </header>

      <main className="qnot-passenger-main">
        <section className="qnot-passenger-welcome">
          <div className="qnot-passenger-welcome-copy">
            <span className="qnot-passenger-eyebrow"><i /> PASSENGER / YOUR TRAVEL SPACE</span>
            <h1>Good to have you back,<br /><em>{firstName}.</em></h1>
            <p>Your tickets, route requests and trip details stay together here. Choose where you&apos;re going next and let Q-not line up the journey.</p>
            <div className="qnot-passenger-welcome-actions">
              <Link className="qnot-passenger-primary" href="/trips">Find your next bus <span>↗</span></Link>
              <Link className="qnot-passenger-secondary" href="/c/requests/new">Request a route <span>＋</span></Link>
            </div>
            <div className="qnot-passenger-signed-in"><span className="qnot-passenger-check">✓</span> Signed in as {commuter.email ?? commuter.phone ?? "your Q-not account"}</div>
          </div>

          <aside className="qnot-passenger-next-card">
            <div className="qnot-passenger-next-card-top"><span>YOUR NEXT MOVE</span><b><i /> ACCOUNT READY</b></div>
            {activeQueueEntry ? (
              <>
                <span className="qnot-passenger-next-kicker">ACTIVE QUEUE / POSITION {activeQueueEntry.position}</span>
                <h2>{activeQueueEntry.trip.route.origin}<i />{activeQueueEntry.trip.route.destination}</h2>
                <p>{activeQueueEntry.trip.bus.vehicleType.replaceAll("_", " ")} · {activeQueueEntry.trip.bus.plateNumber}</p>
                <div className="qnot-passenger-next-status"><span>{queueStatusLabel(activeQueueEntry.status)}</span><small>Joined {dateTime.format(activeQueueEntry.joinedAt)}</small></div>
                <Link className="qnot-passenger-next-link" href={`/trips/${activeQueueEntry.tripId}`}>Open your journey <span>↗</span></Link>
              </>
            ) : latestTicket ? (
              <>
                <span className="qnot-passenger-next-kicker">LATEST BOARDING PASS</span>
                <h2>{latestTicket.trip.route.origin}<i />{latestTicket.trip.route.destination}</h2>
                <p>{latestTicket.trip.bus.vehicleType.replaceAll("_", " ")} · {latestTicket.trip.bus.plateNumber}</p>
                <div className="qnot-passenger-next-status"><span>{ticketStatusLabel(latestTicket.status)}</span><small>{timeOnly.format(latestTicket.trip.departureTime)}</small></div>
                <Link className="qnot-passenger-next-link" href={`/trips/${latestTicket.tripId}`}>View trip details <span>↗</span></Link>
              </>
            ) : (
              <>
                <span className="qnot-passenger-next-kicker">YOUR CITY IS OPEN</span>
                <h2>Where to<br /><em>next?</em></h2>
                <p>Browse available departures or tell Q-not where you need to go.</p>
                <div className="qnot-passenger-route-art" aria-hidden="true">
                  <svg viewBox="0 0 420 116" fill="none">
                    <path d="M18 83C82 83 69 35 143 35S215 91 270 67 337 17 402 30" stroke="#254333" strokeWidth="19" strokeLinecap="round"/>
                    <path d="M18 83C82 83 69 35 143 35S215 91 270 67 337 17 402 30" stroke="#d6ff3f" strokeOpacity=".8" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round"/>
                    <circle cx="18" cy="83" r="7" fill="#d6ff3f"/><circle cx="402" cy="30" r="7" fill="#d6ff3f"/>
                    <g transform="translate(215 63)"><rect x="-13" y="-9" width="26" height="17" rx="5" fill="#d6ff3f"/><rect x="-8" y="-6" width="8" height="6" rx="1.5" fill="#13251a"/><rect x="2" y="-6" width="7" height="6" rx="1.5" fill="#13251a"/><circle cx="-7" cy="9" r="3" fill="#08140e"/><circle cx="7" cy="9" r="3" fill="#08140e"/></g>
                  </svg>
                </div>
                <Link className="qnot-passenger-next-link" href="/trips">Explore departures <span>↗</span></Link>
              </>
            )}
            <div className="qnot-passenger-next-card-foot"><span>Q-NOT / MOVE WITH THE CITY</span><span>01 — 04</span></div>
          </aside>
        </section>

        {activeTicket && (
          <section className="qnot-passenger-live-journey" aria-label="Your live journey">
            <div className="qnot-passenger-live-copy">
              <span className="qnot-passenger-live-kicker"><i /> YOUR CURRENT JOURNEY</span>
              <h2>{activeTicket.trip.route.origin}<i>→</i>{activeTicket.trip.route.destination}</h2>
              <p>{activeTicket.trip.bus.plateNumber} · {activeTicket.trip.status === "BOARDING" ? "Boarding is open" : "Your vehicle is on the road"}</p>
              <Link href={`/trips/${activeTicket.tripId}`}>Open journey details <span>↗</span></Link>
            </div>
            <LiveTripMap tripId={activeTicket.tripId} routeId={activeTicket.trip.route.id} initialStops={activeTicket.trip.route.stops} canTrackLocation />
          </section>
        )}

        <section className="qnot-passenger-metrics" aria-label="Your travel activity">
          <article className="qnot-passenger-metric qnot-passenger-metric--highlight"><span>ACTIVE QUEUE</span><strong>{String(activeQueueCount).padStart(2, "0")}</strong><small>Journeys you&apos;re waiting to board</small><i>Q</i></article>
          <article className="qnot-passenger-metric"><span>BOARDINGS RECORDED</span><strong>{String(boardedCount).padStart(2, "0")}</strong><small>Journeys you&apos;ve boarded</small><i>↗</i></article>
          <article className="qnot-passenger-metric"><span>PASSES READY</span><strong>{String(issuedTicketCount).padStart(2, "0")}</strong><small>Tickets ready for your next trip</small><i>▤</i></article>
          <article className="qnot-passenger-metric"><span>JOURNEYS COMPLETED</span><strong>{String(completedJourneyCount).padStart(2, "0")}</strong><small>Receipts saved to your account</small><i>✓</i></article>
        </section>

        <section className="qnot-passenger-content-grid">
          <div className="qnot-passenger-panel qnot-passenger-activity-panel">
            <div className="qnot-passenger-panel-heading">
              <div><span>YOUR TRAVEL / 01</span><h2>Recent journey activity</h2><p>Queue positions and boarding progress from your trips.</p></div>
              <Link href="/c/requests">Journey requests <i>↗</i></Link>
            </div>
            {commuter.queueEntries.length === 0 ? (
              <div className="qnot-passenger-empty-state">
                <div className="qnot-passenger-empty-mark"><span>Q</span><i /></div>
                <div><strong>Your next journey starts here.</strong><p>Choose a departure, compare the fare and route, then join the queue or confirm a seat when booking is available.</p><Link href="/trips">Browse departures <span>↗</span></Link></div>
              </div>
            ) : (
              <div className="qnot-passenger-activity-list">
                {commuter.queueEntries.map((entry) => (
                  <article className="qnot-passenger-activity-row" key={entry.id}>
                    <span className="qnot-passenger-activity-index">{String(entry.position).padStart(2, "0")}</span>
                    <div className="qnot-passenger-activity-route"><strong>{entry.trip.route.origin}<i>→</i>{entry.trip.route.destination}</strong><small>{entry.trip.bus.vehicleType.replaceAll("_", " ")} · {entry.trip.bus.plateNumber} · {dateTime.format(entry.joinedAt)}</small></div>
                    <span className={`qnot-passenger-status qnot-passenger-status--${entry.status.toLowerCase()}`}>{queueStatusLabel(entry.status)}</span>
                    <Link href={`/trips/${entry.tripId}`} aria-label={`Open ${entry.trip.route.origin} to ${entry.trip.route.destination}`}>↗</Link>
                  </article>
                ))}
              </div>
            )}
            <div className="qnot-passenger-panel-foot"><span>{openRequestCount} open journey request{openRequestCount === 1 ? "" : "s"}</span><Link href="/c/requests/new">Plan another journey <i>↗</i></Link></div>
          </div>

          <div className="qnot-passenger-panel qnot-passenger-ticket-panel">
            <div className="qnot-passenger-panel-heading">
              <div><span>YOUR WALLET / 02</span><h2>Boarding passes</h2><p>Your issued tickets and completed receipts.</p></div>
              <Link href="/c/tickets">All passes <i>↗</i></Link>
            </div>
            {commuter.tickets.length === 0 ? (
              <div className="qnot-passenger-ticket-empty"><span className="qnot-passenger-ticket-icon">Q</span><strong>No passes just yet.</strong><p>Your ticket appears here when a fare is confirmed and the boarding pass is issued.</p><Link href="/trips">Find a bus <span>↗</span></Link></div>
            ) : (
              <div className="qnot-passenger-ticket-list">
                {commuter.tickets.map((ticket) => (
                  <article className="qnot-passenger-ticket" key={ticket.id}>
                    <div className="qnot-passenger-ticket-head"><span>Q-NOT / BOARDING PASS</span><b className={`qnot-passenger-ticket-state qnot-passenger-ticket-state--${ticket.status.toLowerCase()}`}>{ticketStatusLabel(ticket.status)}</b></div>
                    <strong className="qnot-passenger-ticket-route">{ticket.trip.route.origin}<i>→</i>{ticket.trip.route.destination}</strong>
                    <span className="qnot-passenger-ticket-meta">{ticket.trip.bus.plateNumber} · Issued {dateTime.format(ticket.issuedAt)}</span>
                    <div className="qnot-passenger-ticket-code"><span>BOARDING CODE</span><b>{ticket.code}</b></div>
                    <Link href={ticket.status === "USED" && ticket.trip.status === "COMPLETED" ? `/c/journeys/${ticket.tripId}/complete` : `/trips/${ticket.tripId}`}>{ticket.status === "USED" && ticket.trip.status === "COMPLETED" ? "View arrival receipt" : "Open journey details"} <i>↗</i></Link>
                  </article>
                ))}
              </div>
            )}
            <Link className="qnot-passenger-funds-link" href="/c/q-funds"><span><b>Q-FUNDS</b><small>Fare activity and payment records</small></span><i>↗</i></Link>
          </div>
        </section>

        <section className="qnot-passenger-safety-strip">
          <span className="qnot-passenger-safety-icon">⌑</span>
          <div><strong>Every trip should feel considered.</strong><p>Keep your emergency contact current, check the assigned vehicle and share trip details with someone you trust.</p></div>
          <Link href="/c/profile">Review safety details <i>↗</i></Link>
        </section>
      </main>

      <footer className="qnot-passenger-footer"><QNotBrand compact /><span>YOUR CITY. YOUR ROUTE. YOUR Q-NOT.</span><Link href="/">Back to Q-not ↗</Link></footer>
    </div>
  );
}
