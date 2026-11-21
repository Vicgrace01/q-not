import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { QNotRoadHero, QNotJourneyFilm } from "@/components/qnot-home-visuals";
import { QNotHomeNetworkMap } from "@/components/home/qnot-home-network-map";

export const dynamic = "force-dynamic";

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const lagosTime = (value: Date) => value.toLocaleTimeString("en-NG", {
  timeZone: "Africa/Lagos",
  hour: "2-digit",
  minute: "2-digit",
});

function QNotWordmark() {
  return (
    <Link href="/" className="q-logo q-home-wordmark" aria-label="Q-not home">
      <span className="q-logo-mark"><span>Q</span><i /></span>
      <span className="q-logo-word">q-not<span className="q-logo-period">.</span></span>
    </Link>
  );
}

export default async function HomePage() {
  const now = new Date();
  const commuterId = await getCommuterId().catch(() => null);
  // Keep the public showroom available when Neon is waking up or temporarily unreachable.
  // Each data panel can degrade independently rather than turning the entire homepage into a 500.
  // The public showroom should not open five database connections just to paint
  // its headline figures. Load the two datasets it actually displays and derive
  // the visible totals from those same records.
  const homeResults = await Promise.allSettled([
    prisma.trip.findMany({
      where: {
        status: { in: ["SCHEDULED", "BOARDING", "IN_TRANSIT"] },
        departureTime: { gte: new Date(now.getTime() - 2 * 60 * 60_000) },
        bus: { is: {
          verificationStatus: "APPROVED",
          registrationExpiry: { gt: now },
          insuranceExpiry: { gt: now },
          inspectionExpiry: { gt: now },
        } },
        driver: { is: {
          verificationStatus: "APPROVED",
          phoneVerifiedAt: { not: null },
          licenceExpiry: { gt: now },
        } },
      },
      orderBy: { departureTime: "asc" },
      take: 20,
      include: {
        route: { select: { id: true, origin: true, destination: true } },
        bus: { select: { id: true, plateNumber: true, capacity: true, vehicleType: true, verificationStatus: true } },
        driver: { select: {
          id: true,
          name: true,
          verificationStatus: true,
          phoneVerifiedAt: true,
          licenceExpiry: true,
          routeApprovals: { where: { status: "APPROVED" }, select: { routeId: true } },
          vehicleAssignments: { where: { revokedAt: null }, select: { busId: true } },
        } },
        queueEntries: { where: { status: "WAITING" }, select: { id: true } },
      },
    }),
    prisma.route.findMany({
      orderBy: [{ origin: "asc" }, { destination: "asc" }],
      take: 20,
      select: {
        id: true,
        origin: true,
        destination: true,
        stops: {
          orderBy: { sequence: "asc" },
          select: { id: true, name: true, latitude: true, longitude: true, sequence: true },
        },
      },
    }),
  ]);

  const [tripsResult, routesResult] = homeResults;
  const homeDataAvailable = homeResults.every((result) => result.status === "fulfilled");
  if (!homeDataAvailable) {
    console.warn("Q-not homepage is showing its discovery view while network data reconnects.");
  }
  const rawTrips = tripsResult.status === "fulfilled" ? tripsResult.value : [];
  const routes = routesResult.status === "fulfilled" ? routesResult.value : [];

  const trips = rawTrips.filter((trip) =>
    !!trip.driver
    && trip.driver.verificationStatus === "APPROVED"
    && !!trip.driver.phoneVerifiedAt
    && !!trip.driver.licenceExpiry
    && trip.driver.licenceExpiry > now
    && trip.driver.routeApprovals.some((approval) => approval.routeId === trip.routeId)
    && trip.driver.vehicleAssignments.some((assignment) => assignment.busId === trip.busId),
  );

  const routeCount = routes.length;
  const verifiedVehicles = new Set(trips.map((trip) => trip.bus.id)).size;
  const verifiedDrivers = new Set(trips.flatMap((trip) => trip.driver ? [trip.driver.id] : [])).size;
  const featuredTrip = trips[0] ?? null;
  const featuredSeats = featuredTrip
    ? Math.max(0, featuredTrip.bus.capacity - featuredTrip.seatsTaken - featuredTrip.seatsReserved)
    : null;
  const routeSummaries = routes.map((route) => ({
    id: route.id,
    origin: route.origin,
    destination: route.destination,
    stops: route.stops,
  }));

  return (
    <main className="q-app q-not-home">
      <header className="q-home-header">
        <div className="q-home-header-inner">
          <QNotWordmark />
          <nav className="q-home-nav" aria-label="Main navigation">
            <Link href="/trips">Departures</Link>
            <Link href="#journey-experience">The journey</Link>
            <Link href="#network-map">Network map</Link>
            <Link href="/drive">Drive with Q-not</Link>
            <Link href="/operators">For operators</Link>
          </nav>
          <div className="q-home-header-actions">
            <Link className="q-home-signin" href={commuterId ? "/c/dashboard" : "/c/login"}>{commuterId ? "My Q-not" : "Sign in"}</Link>
            <Link className="q-home-header-cta" href="/trips"><span>Find a bus</span><i>↗</i></Link>
          </div>
        </div>
      </header>

      <QNotRoadHero
        route={featuredTrip ? `${featuredTrip.route.origin} → ${featuredTrip.route.destination}` : "Routes across your city"}
        departure={featuredTrip ? `Departs ${lagosTime(featuredTrip.departureTime)} · ${featuredTrip.bus.plateNumber}` : homeDataAvailable ? "Published services appear as routes and vehicles are approved" : "Reconnecting to live route information"}
        seats={featuredSeats === null ? "—" : String(featuredSeats)}
        waiting={featuredTrip?.queueEntries.length ?? 0}
        hasService={Boolean(featuredTrip)}
      />

      <section className="q-home-signal-strip" aria-label="Q-not network information">
        <div className="page-width q-home-signal-inner">
          <div className="q-home-signal-intro"><span className="q-home-signal-mark">Q</span><span>ONE NETWORK.<br /><strong>MORE CERTAINTY ON EVERY ROUTE.</strong></span></div>
          <div className="q-home-stat"><strong>{homeDataAvailable ? trips.length : "—"}</strong><span>approved departures<br />available now</span></div>
          <div className="q-home-stat"><strong>{homeDataAvailable ? routeCount : "—"}</strong><span>corridors<br />in discovery</span></div>
          <div className="q-home-stat"><strong>{homeDataAvailable ? verifiedVehicles : "—"}</strong><span>vehicles on<br />listed services</span></div>
          <div className="q-home-stat"><strong>{homeDataAvailable ? verifiedDrivers : "—"}</strong><span>drivers on<br />listed services</span></div>
        </div>
      </section>

      <div id="journey-experience"><QNotJourneyFilm /></div>

      <QNotHomeNetworkMap routes={routeSummaries} />

      <section className="q-home-departures" id="departures" aria-labelledby="q-home-departures-title">
        <div className="page-width">
          <div className="q-home-section-head">
            <div><span className="q-home-kicker">THE DEPARTURE BOARD</span><h2 id="q-home-departures-title">See what&apos;s<br /><em>moving next.</em></h2></div>
            <div className="q-home-section-aside"><p>Only published services with approved driver, vehicle and route records appear here. Fares and available seats come from the service record.</p><Link className="q-home-text-link" href="/trips">All departures <span>↗</span></Link></div>
          </div>

          {trips.length > 0 ? (
            <div className="q-home-departure-list">
              {trips.slice(0, 4).map((trip, index) => {
                const seats = Math.max(0, trip.bus.capacity - trip.seatsTaken - trip.seatsReserved);
                return (
                  <Link className="q-home-departure-row" href={`/trips/${trip.id}`} key={trip.id}>
                    <span className="q-home-departure-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="q-home-departure-route"><strong>{trip.route.origin}</strong><i /><strong>{trip.route.destination}</strong><small>{trip.bus.vehicleType.replaceAll("_", " ")} · {trip.bus.plateNumber}</small></span>
                    <span className="q-home-departure-time"><strong>{lagosTime(trip.departureTime)}</strong><small>{trip.status.replaceAll("_", " ")}</small></span>
                    <span className="q-home-departure-capacity"><strong>{seats}</strong><small>seats available</small></span>
                    <span className="q-home-departure-fare"><strong>{trip.fareKobo > 0 ? naira.format(trip.fareKobo / 100) : "Fare pending"}</strong><small>per passenger</small></span>
                    <span className="q-home-departure-open" aria-hidden="true">↗</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="q-home-empty-departures">
              <span className="q-home-empty-route">Q</span>
              <div><strong>Your next bus should be easier to find.</strong><p>{homeDataAvailable ? "There are no approved departures published at this moment. Browse the network, request a corridor or bring a vehicle and route onto Q-not." : "Live departures are reconnecting. You can still explore the Q-not journey, learn how the network works or access your account."}</p></div>
              <div className="q-home-empty-actions"><Link href="/drive">Register a vehicle <span>↗</span></Link><Link href="/operators">Set up an operator network <span>↗</span></Link></div>
            </div>
          )}
        </div>
      </section>

      <section className="q-home-portals" id="q-not-network" aria-labelledby="q-home-portals-title">
        <div className="page-width">
          <div className="q-home-section-head q-home-section-head--portals">
            <div><span className="q-home-kicker">ONE TRANSPORT NETWORK / FOUR WAYS IN</span><h2 id="q-home-portals-title">Your part of the city.<br /><em>Your Q-not space.</em></h2></div>
            <p>Passengers, independent drivers, fleet operators and network coordinators work from connected records—not disconnected apps and spreadsheets.</p>
          </div>
          <div className="q-home-portal-grid">
            <article className="q-home-portal q-home-portal--passenger"><span className="q-home-portal-no">01 / PASSENGER</span><div className="q-home-portal-glyph q-home-portal-glyph--passenger"><i /><i /><i /></div><h3>Ride with<br />more certainty.</h3><p>Compare departures, see fares and available seats, choose where to board, keep your ticket and follow your bus when location sharing is active.</p><Link href="/trips">Explore passenger journeys <span>↗</span></Link></article>
            <article className="q-home-portal q-home-portal--driver"><span className="q-home-portal-no">02 / DRIVER & OWNER</span><div className="q-home-portal-glyph q-home-portal-glyph--driver"><i /><i /><i /></div><h3>Bring your bus<br />into the network.</h3><p>Register your Danfo, Korope, van or bus. Complete driver and vehicle checks, request route access and receive demand for services you are approved to run.</p><Link href="/drive">Enter Q-not Drive <span>↗</span></Link></article>
            <article className="q-home-portal q-home-portal--operator"><span className="q-home-portal-no">03 / OPERATOR</span><div className="q-home-portal-glyph q-home-portal-glyph--operator"><i /><i /><i /></div><h3>Run the fleet.<br />See the whole shift.</h3><p>Manage routes, stops, vehicles, driver assignments, service schedules, fares, approvals and passenger boarding in one operations workspace.</p><Link href="/operators">Enter operator workspace <span>↗</span></Link></article>
            <article className="q-home-portal q-home-portal--network"><span className="q-home-portal-no">04 / NETWORK</span><div className="q-home-portal-glyph q-home-portal-glyph--network"><i /><i /><i /></div><h3>Match demand<br />to available seats.</h3><p>See route demand and vehicle supply, identify compatible passenger requests and coordinate where approved buses should go next.</p><Link href="/network">Explore network control <span>↗</span></Link></article>
          </div>
        </div>
      </section>

      <section className="q-home-trust">
        <div className="page-width q-home-trust-inner">
          <div><span className="q-home-kicker">TRUST IS PART OF THE JOURNEY</span><h2>Know the person.<br /><em>Know the vehicle.</em><br />Know the route.</h2></div>
          <div className="q-home-trust-points">
            <article><span>01</span><div><strong>Driver approval</strong><p>Identity, contact, driving credential and current authorisation are reviewed separately.</p></div></article>
            <article><span>02</span><div><strong>Vehicle records</strong><p>Registration, insurance, inspection and assigned driver must be current before a service is published.</p></div></article>
            <article><span>03</span><div><strong>Route permission</strong><p>A driver can only publish a journey on a corridor they and their vehicle are approved to serve.</p></div></article>
            <article><span>04</span><div><strong>Passenger control</strong><p>Boarding details, tickets and eligible trip location stay connected to the passenger account.</p></div></article>
          </div>
        </div>
      </section>

      <footer className="q-home-footer">
        <div className="page-width q-home-footer-top"><QNotWordmark /><p>Move with the network.<br /><strong>Not against the queue.</strong></p><div className="q-home-footer-links"><Link href="/trips">Departures</Link><Link href="/drive">Q-not Drive</Link><Link href="/operators">Operators</Link><Link href="/network">Network</Link><Link href="/c/q-funds">Q-Funds</Link><Link href="/c/profile">Passenger safety</Link><Link href="/c/tickets">Tickets</Link></div></div>
        <div className="page-width q-home-footer-bottom"><span>© 2026 Q-not</span><span>SHARED TRANSPORT, COORDINATED.</span><Link href="/c/login">Passenger access ↗</Link></div>
      </footer>
    </main>
  );
}
