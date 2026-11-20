"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  activeQueueForTrip,
  formatNaira,
  queuePosition,
  seatsAvailable,
  waitEstimate,
  type DemoQueueEntry,
  type DemoTrip,
} from "@/lib/demo-transit";
import { useDemoTransit } from "@/lib/use-demo-transit";
import { QNotRoadHero, QNotJourneyFilm } from "@/components/qnot-home-visuals";

const SeatCabin3D = dynamic(
  () => import("@/components/seat-cabin-3d").then((module) => module.SeatCabin3D),
  {
    ssr: false,
    loading: () => <div className="seat-canvas-loading">Building the cabin viewâ€¦</div>,
  },
);

type IconName = "arrow" | "arrow-up-right" | "bus" | "calendar" | "check" | "clock" | "compass" | "location" | "map" | "menu" | "minus" | "plus" | "qr" | "route" | "seat" | "shield" | "ticket" | "users" | "x";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M4 12h15"/><path d="m13 5 7 7-7 7"/></>,
    "arrow-up-right": <><path d="M7 17 17 7"/><path d="M8 7h9v9"/></>,
    bus: <><rect x="3" y="4" width="18" height="14" rx="3"/><path d="M7 18v2M17 18v2M5 9h14M7 14h.01M17 14h.01"/><path d="M7 4V2h10v2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z"/></>,
    location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    minus: <path d="M5 12h14"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    qr: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-6v-2"/></>,
    route: <><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3"/></>,
    seat: <><path d="M6 4v8a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9"/><path d="M6 14v5M18 14v5M4 19h16"/><path d="M18 4v4"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    ticket: <><path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z"/><path d="M13 6v2M13 11v2M13 16v2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    x: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`q-logo${compact ? " q-logo--compact" : ""}`} href="/" aria-label="Q-not home">
      <span className="q-logo-mark"><span>Q</span><i /></span>
      <span className="q-logo-word">q-not<span className="q-logo-period">.</span></span>
    </Link>
  );
}

function StatusDot({ label = "DEMO SIGNAL" }: { label?: string }) {
  return <span className="status-label"><i className="status-pulse" />{label}</span>;
}

function RouteSketch({ progress = 58, compact = false }: { progress?: number; compact?: boolean }) {
  return (
    <div className={`route-sketch${compact ? " route-sketch--compact" : ""}`} aria-label="Illustrative route map">
      <div className="map-grid" />
      <svg className="route-svg" viewBox="0 0 560 250" role="img" aria-label="Illustrative bus route with moving vehicle">
        <path className="map-road map-road--major" d="M-20 202 C80 176 105 208 170 158 S255 95 311 119 S397 180 466 119 S530 70 590 62" />
        <path className="map-road" d="M16 37 C94 73 121 68 185 42 S279 4 337 39 S440 90 562 16" />
        <path className="map-road" d="M84 260 C118 204 145 185 154 140 S156 57 203 -20" />
        <path className="map-road" d="M365 264 C348 204 382 163 395 129 S396 50 427 -18" />
        <path className="map-route-shadow" d="M44 187 C101 175 117 197 174 151 S252 87 315 112 S392 169 459 111 S516 75 540 58" />
        <path id="qnotRoutePath" className="map-route" d="M44 187 C101 175 117 197 174 151 S252 87 315 112 S392 169 459 111 S516 75 540 58" />
        <circle cx="44" cy="187" r="5" className="map-stop" />
        <circle cx="540" cy="58" r="5" className="map-stop map-stop--end" />
        {!compact && <><text x="30" y="218" className="map-text">TERMINAL</text><text x="488" y="36" className="map-text">DESTINATION</text></>}
        <circle className="map-bus-halo" r="15"><animateMotion dur={`${Math.max(8, 25 - progress / 6)}s`} repeatCount="indefinite" path="M44 187 C101 175 117 197 174 151 S252 87 315 112 S392 169 459 111 S516 75 540 58" /></circle>
        <g className="map-bus-marker"><circle r="10" /><path d="M-5 2V-3Q-5 -5 -3 -5H3Q5 -5 5 -3V2M-6 2H6M-3 5H-2M3 5H4" /><animateMotion dur={`${Math.max(8, 25 - progress / 6)}s`} repeatCount="indefinite" path="M44 187 C101 175 117 197 174 151 S252 87 315 112 S392 169 459 111 S516 75 540 58" /></g>
      </svg>
      <div className="map-overlay map-overlay--top"><span className="map-mini-label">SIMULATED ROUTE</span><span className="map-live"><i /> DEMO MOVEMENT</span></div>
      {!compact && <div className="map-overlay map-overlay--bottom"><span><b>14 min</b><small>to terminal</small></span><span className="map-divider" /><span><b>{progress}%</b><small>route progress</small></span></div>}
      <div className="map-orbit map-orbit--one" /><div className="map-orbit map-orbit--two" />
    </div>
  );
}

function Topbar({ active = "commuter" }: { active?: "commuter" | "operator" | "driver" }) {
  return (
    <header className="q-topbar">
      <div className="q-topbar-inner">
        <Logo />
        <nav className="q-nav" aria-label="Main navigation">
          {active === "commuter" ? (
            <>
              <Link className="is-active" href="#departures">Departures</Link>
              <Link href="#my-queue">Q-less queue</Link>
              <Link href="#the-journey">Try the demo</Link>
              <Link href="/operator">Operator desk</Link>
              <Link href="/driver">Driver mode</Link>
            </>
          ) : (
            <>
              <Link href="/">Find a ride</Link>
              <Link className={active === "operator" ? "is-active" : ""} href="/operator">Operator desk</Link>
              <Link className={active === "driver" ? "is-active" : ""} href="/driver">Driver mode</Link>
            </>
          )}
        </nav>
        <div className="q-topbar-right">
          <span className="demo-chip">DEMO NETWORK</span>
          {active === "commuter" && <Link className="topbar-auth-link" href="/c/login">Passenger sign in</Link>}
          {active === "commuter" && <Link className="topbar-auth-link" href="/login">Operator sign in</Link>}
          {active === "commuter" && <Link className="topbar-auth-link" href="/signup">Create account</Link>}
          {active === "operator" && <Link className="topbar-auth-link" href="/login">Operator sign in</Link>}
          <Link className="topbar-cta" href={active === "commuter" ? "#departures" : "/#departures"}>{active === "commuter" ? "Find a bus" : "Find a ride"} <Icon name="arrow-up-right" size={15}/></Link>
        </div>
        <Link className="mobile-menu" href="/operator" aria-label="Open operator desk"><Icon name="menu"/></Link>
      </div>
    </header>
  );
}

function SeatViewerDialog({
  trip,
  queue,
  onClose,
}: {
  trip: DemoTrip;
  queue: DemoQueueEntry[];
  onClose: () => void;
}) {
  const held = queue.filter((entry) => entry.tripId === trip.id && entry.status === "CALLED").length;
  const occupied = Math.min(trip.capacity, trip.seatsTaken);
  const heldCount = Math.min(Math.max(0, trip.capacity - occupied), held);
  const available = Math.max(0, trip.capacity - occupied - heldCount);
  const layout = /shuttle|executive/i.test(trip.bus) ? "2+1" : "2+2";

  return (
    <div
      className="q-modal-backdrop seat-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="seat-viewer-modal" role="dialog" aria-modal="true" aria-labelledby="seat-viewer-title">
        <div className="seat-viewer-header">
          <div>
            <span className="eyebrow">COACH CAPACITY / 3D VIEW</span>
            <h2 id="seat-viewer-title">Inside the <em>{trip.bus}.</em></h2>
            <p>{trip.origin} â†’ {trip.destination} <span>Â·</span> {trip.plate}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close seat view">
            <Icon name="x" />
          </button>
        </div>

        <div className="seat-viewer-stats">
          <div><strong>{available}</strong><span>AVAILABLE</span></div>
          <div><strong>{heldCount}</strong><span>HELD FOR BOARDING</span></div>
          <div><strong>{occupied}</strong><span>BOARDED</span></div>
          <div><strong>{trip.capacity}</strong><span>TOTAL CAPACITY</span></div>
        </div>

        <div className="seat-viewer-stage">
          <SeatCabin3D capacity={trip.capacity} occupied={occupied} held={heldCount} layout={layout} />
          <span className="seat-stage-hint">DRAG TO ROTATE <i /> SCROLL TO ZOOM</span>
        </div>

        <div className="seat-viewer-footer">
          <div className="seat-viewer-legend">
            <span><i className="seat-dot seat-dot--available" /> Available</span>
            <span><i className="seat-dot seat-dot--held" /> Called to board</span>
            <span><i className="seat-dot seat-dot--occupied" /> Boarded</span>
          </div>
          <p>Illustrative seat positions based on the recorded seat count. This demo does not store individual seat assignments. Joining Q-not&apos;s queue does not reserve a specific seat.</p>
        </div>
      </section>
    </div>
  );
}

function TripRow({
  trip,
  queue,
  onJoin,
  onViewSeats,
  index,
}: {
  trip: DemoTrip;
  queue: DemoQueueEntry[];
  onJoin: (trip: DemoTrip) => void;
  onViewSeats: (trip: DemoTrip) => void;
  index: number;
}) {
  const seats = seatsAvailable(trip, queue);
  const vehicleImage = index % 2 === 0 ? "/qnot-coach-hero.webp" : "/qnot-coach-fleet.webp";
  return (
    <article className="trip-row" style={{ "--row-index": index } as CSSProperties}>
      <div className="trip-route-block">
        <div className="trip-thumb">
          <Image src={vehicleImage} alt="Illustrative intercity coach at a bus terminal" width={148} height={104} sizes="(max-width: 560px) 64px, 92px" />
          <span>Q-NOT FLEET</span>
        </div>
        <div className="trip-route-info">
          <div className="trip-time-block"><strong>{trip.departure}</strong><span>{trip.terminal}</span></div>
          <div className="trip-journey">
            <div className="trip-endpoint"><i className="endpoint-dot endpoint-dot--start"/><span>{trip.origin}</span></div>
            <div className="trip-track"><i/><small>{trip.routeLabel}</small><i/></div>
            <div className="trip-endpoint"><i className="endpoint-dot endpoint-dot--end"/><span>{trip.destination}</span></div>
          </div>
        </div>
      </div>
      <div className="trip-vehicle"><span>{trip.plate}<small>{trip.bus}</small></span></div>
      <div className="trip-seat">
        <strong>{seats}</strong><span>seats open</span>
        <div className="seat-meter"><i style={{ width: `${Math.max(6, seats / trip.capacity * 100)}%` }}/></div>
        <button className="seat-map-button" onClick={() => onViewSeats(trip)} type="button"><Icon name="seat" size={13}/> 3D seat view</button>
      </div>
      <div className="trip-fare"><strong>{formatNaira(trip.fare)}</strong><span>sample fare</span></div>
      <button className="trip-join" onClick={() => onJoin(trip)} type="button"><span>Join waitlist</span><Icon name="arrow-up-right" size={16}/></button>
    </article>
  );
}

function JoinDialog({ trip, onClose, onJoin, error }: { trip: DemoTrip; onClose: () => void; onJoin: (name: string, phone: string) => void; error: string | null }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <div className="q-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="q-join-modal" role="dialog" aria-modal="true" aria-labelledby="join-title">
        <div className="modal-topline"><span>Q-LESS Â· VIRTUAL QUEUE</span><button className="icon-button" onClick={onClose} type="button" aria-label="Close"><Icon name="x"/></button></div>
        <div className="modal-route"><div><small>YOUR ROUTE</small><h2>{trip.origin}<span>â†’</span>{trip.destination}</h2><p>{trip.terminal} Â· {trip.departure} departure</p></div><div className="modal-fare">{formatNaira(trip.fare)}<small>sample fare</small></div></div>
        <form onSubmit={(event) => { event.preventDefault(); onJoin(name, phone); }}>
          <label htmlFor="passenger-name">Your name</label><input id="passenger-name" autoFocus required maxLength={70} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Victor Nwaruwe"/>
          <label htmlFor="passenger-phone">Phone number</label><input id="passenger-phone" required minLength={7} maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+234 803 000 0000" inputMode="tel"/>
          {error && <p className="form-error">{error}</p>}
          <div className="queue-promise"><Icon name="shield" size={17}/><span>Joining Q-not&apos;s demo queue is free. A seat is only confirmed when the operator boards you.</span></div><p className="demo-privacy-note">Prototype only: use fictional passenger details. This demo stores entries in this browser, not in a live terminal system.</p>
          <button className="button-primary button-primary--wide" type="submit">Take my place <Icon name="arrow" size={17}/></button>
        </form>
      </section>
    </div>
  );
}

function PassengerQueue({ entry, trip, position, onCancel }: { entry: DemoQueueEntry; trip: DemoTrip; position: number | null; onCancel: () => void }) {
  const called = entry.status === "CALLED";
  const boarded = entry.status === "BOARDED";
  return (
    <div className="my-queue-panel">
      <div className="queue-panel-head"><div><span className="eyebrow">YOUR PLACE IN LINE</span><h3>{trip.origin}<span>â†’</span>{trip.destination}</h3></div><span className={`queue-state ${called ? "queue-state--called" : boarded ? "queue-state--done" : ""}`}><i/>{boarded ? "BOARDED" : called ? "CALLED TO BOARD" : "IN QUEUE"}</span></div>
      <div className="queue-number-line"><div className="queue-number">{boarded ? "âœ“" : called ? "NOW" : `#${position ?? "â€”"}`}</div><div className="queue-number-copy"><strong>{boarded ? "You're on board." : called ? "You're up next." : `${waitEstimate(position ?? 1)} min estimated wait`}</strong><span>{boarded ? `Boarding pass ${entry.ticketCode ?? "issued"}` : called ? `Show code ${entry.ticketCode} to the operator.` : "Keep your place. We'll call you when the bus is ready."}</span></div></div>
      {!boarded && <div className="queue-progress"><i style={{ width: called ? "100%" : `${Math.max(12, 100 / Math.max(position ?? 1, 1))}%` }}/></div>}
      <div className="queue-panel-foot"><span><Icon name="clock" size={14}/> Joined {new Date(entry.joinedAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</span>{entry.status === "WAITING" && <button className="text-action" onClick={onCancel} type="button">Leave queue</button>}</div>
    </div>
  );
}

const PASSENGER_PHONE_KEY = "qnot-passenger-phone";

function subscribePassengerPhone(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PASSENGER_PHONE_KEY || event.key === null) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("qnot:passenger-phone-updated", onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("qnot:passenger-phone-updated", onStoreChange);
  };
}

function getPassengerPhoneSnapshot() {
  try {
    return window.localStorage.getItem(PASSENGER_PHONE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerPassengerPhoneSnapshot() {
  return "";
}
export function QNotCommuter() {
  const { state, joinQueue, cancelEntry, hydrated } = useDemoTransit();
  const [destination, setDestination] = useState("All destinations");
  const [terminal, setTerminal] = useState("All terminals");
  const [selectedTrip, setSelectedTrip] = useState<DemoTrip | null>(null);
  const [seatTrip, setSeatTrip] = useState<DemoTrip | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const myPhone = useSyncExternalStore(subscribePassengerPhone, getPassengerPhoneSnapshot, getServerPassengerPhoneSnapshot);
  const [notice, setNotice] = useState("");


  const trips = useMemo(() => state.trips.filter((trip) => trip.status !== "COMPLETED" && (destination === "All destinations" || trip.destination === destination) && (terminal === "All terminals" || trip.terminal === terminal)), [state.trips, destination, terminal]);
  const myEntry = state.queue.filter((entry) => myPhone && entry.phone.replace(/[\s()-]/g, "") === myPhone.replace(/[\s()-]/g, "") && entry.status !== "CANCELLED").sort((a, b) => b.joinedAt - a.joinedAt)[0];
  const myTrip = myEntry ? state.trips.find((trip) => trip.id === myEntry.tripId) : undefined;
  const myPosition = myEntry ? queuePosition(state, myEntry.id) : null;
  const featuredTrip = state.trips.find((trip) => trip.status !== "COMPLETED");
  const featuredRoute = featuredTrip
    ? `${featuredTrip.origin} → ${featuredTrip.destination}`
    : "Ogbete → Nsukka";
  const featuredSeats = featuredTrip
    ? `${Math.max(0, featuredTrip.capacity - featuredTrip.seatsTaken)} / ${featuredTrip.capacity}`
    : "—";

  function handleJoin(name: string, phone: string) {
    const result = joinQueue({ tripId: selectedTrip!.id, passengerName: name, phone });
    if (result.ok === true) {
      const normalizedPhone = phone.replace(/[^0-9+]/g, "");
      window.localStorage.setItem(PASSENGER_PHONE_KEY, normalizedPhone);
      window.dispatchEvent(new Event("qnot:passenger-phone-updated"));

      setSelectedTrip(null);
      setJoinError(null);
      setNotice(`You're in. Queue position ${state.queue.filter((entry) => entry.tripId === result.entry.tripId && entry.status === "WAITING").length + 1}.`);
    } else {
      setJoinError(result.reason === "already-joined" ? "This number already has a place in this trip's queue." : result.reason === "invalid-passenger" ? "Enter a name and a valid phone number." : "That departure is no longer available.");
      return;
    }
    window.setTimeout(() => setNotice(""), 4500);
    window.setTimeout(() => document.getElementById("my-queue")?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  }

  return (
    <div className="q-app q-commuter-app">
      <Topbar active="commuter"/>
      <main>
        <QNotRoadHero
          route={featuredRoute}
          departure={featuredTrip?.departure ?? "Next departure"}
          seats={featuredSeats}
        />

        <section className="network-strip q-network-strip"><div className="network-strip-inner page-width"><span><i/> Q-NOT TERMINAL NETWORK / DEMO</span><span>OGBETE MOTOR PARK</span><span>UPPER IWEKA</span><span>{state.trips.length} SAMPLE DEPARTURES</span><span>Q-LESS QUEUE CONTROL</span></div></section>

        <QNotJourneyFilm />

        <section className="departures-section page-width" id="departures">
          <div className="section-heading"><div><span className="eyebrow">01 / THE NEXT MOVES</span><h2>Find your <em>next move.</em></h2></div><div className="section-heading-note">Departures, seats and queues<br/>in one place.</div></div>
          <div className="finder-bar">
            <label className="finder-field"><span>DESTINATION</span><select value={destination} onChange={(event) => setDestination(event.target.value)}><option>All destinations</option>{Array.from(new Set(state.trips.map((trip) => trip.destination))).map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="finder-field"><span>BOARDING TERMINAL</span><select value={terminal} onChange={(event) => setTerminal(event.target.value)}><option>All terminals</option>{Array.from(new Set(state.trips.map((trip) => trip.terminal))).map((value) => <option key={value}>{value}</option>)}</select></label>
            <div className="finder-date"><span>TRAVEL MODE</span><strong><Icon name="compass" size={16}/> Intercity</strong></div>
            <a className="finder-reset" href="#departures" onClick={() => { setDestination("All destinations"); setTerminal("All terminals"); }}>Reset <Icon name="x" size={14}/></a>
          </div>
          <div className="trip-list-head"><span>DEPARTURE / ROUTE</span><span>VEHICLE</span><span>SEATS</span><span>FARE</span><span>ACTION</span></div>
          <div className="trip-list">
            {trips.map((trip, index) => <TripRow key={trip.id} trip={trip} queue={state.queue} index={index} onJoin={(item) => { setSelectedTrip(item); setJoinError(null); }} onViewSeats={setSeatTrip}/>) }
            {trips.length === 0 && <div className="empty-routes">No departures match those filters. <button onClick={() => { setDestination("All destinations"); setTerminal("All terminals"); }} type="button">Clear filters</button></div>}
          </div>
          <p className="sample-disclaimer">* All departures, fares, seat counts and movement in this build are illustrative demo records. Live operator feeds are not connected.</p>
        </section>

        <section className="your-time-section" id="my-queue">
          <div className="your-time-inner page-width">
            <div className="your-time-copy"><span className="eyebrow">02 / Q-LESS BY Q-NOT</span><h2>Your place.<br/><em>Not your presence.</em></h2><p>Join from wherever you are. Watch your position move. Get called when it&apos;s your turn. No crowding around the loading bay.</p><div className="queue-steps"><span><b>01</b> Join the line</span><span><b>02</b> Track your place</span><span><b>03</b> Board when called</span></div></div>
            <div className="your-queue-area">
              {myEntry && myTrip ? <PassengerQueue entry={myEntry} trip={myTrip} position={myPosition} onCancel={() => cancelEntry(myEntry.id)}/> : <div className="queue-empty-state"><div className="empty-ticket"><Icon name="ticket" size={24}/><span>Q</span></div><div><span className="eyebrow">YOUR QUEUE IS QUIET</span><h3>Nothing to wait for. <em>Yet.</em></h3><p>Choose a departure above and take your place. Your queue pass will appear here.</p><a href="#departures" className="text-action">Browse departures <Icon name="arrow" size={14}/></a></div></div>}
              <div className="queue-note"><span className="note-symbol">Q</span><p><strong>Know the difference</strong><br/>A Q-less waitlist keeps your place in line. A payment-backed hold secures a seat. Try the interactive reservation demo above to see how a hold, cancellation and release could work.</p></div>
            </div>
          </div>
        </section>

        <section className="how-section page-width" id="how-it-works">
          <div className="section-heading"><div><span className="eyebrow">03 / LESS WAITING, MORE MOVING</span><h2>Three moves.<br/><em>That&apos;s all.</em></h2></div><div className="section-heading-note">A better terminal starts<br/>with better information.</div></div>
          <div className="how-grid"><article><span className="how-number">01</span><div className="how-icon"><Icon name="route" size={23}/></div><h3>Pick your route.</h3><p>See departures, available seats and estimated arrival information before you leave for the terminal.</p><span className="how-underline"/></article><article><span className="how-number">02</span><div className="how-icon"><Icon name="users" size={23}/></div><h3>Join Q-less.</h3><p>Take a digital place in the boarding line. Follow your position without standing in the physical queue.</p><span className="how-underline"/></article><article><span className="how-number">03</span><div className="how-icon"><Icon name="ticket" size={23}/></div><h3>Board when called.</h3><p>The operator calls the next passenger, confirms boarding and keeps the available-seat count accurate.</p><span className="how-underline"/></article></div>
        </section>

        <section className="operator-banner page-width"><div className="operator-banner-text"><span className="eyebrow">FOR THE PEOPLE RUNNING THE PARK</span><h2>Run the terminal.<br/><em>Not the chaos.</em></h2><p>One view of the fleet, the queue and every seat that leaves the park.</p><div className="q-operator-entry-actions"><Link href="/operator" className="button-dark">Open operator desk <Icon name="arrow-up-right"/></Link><Link href="/signup" className="q-operator-signup-link">New operator? Create an account ↗</Link></div></div><div className="operator-visual"><div className="operator-visual-top"><span>TERMINAL CONTROL / 01</span><span className="mini-live"><i/>SYSTEM READY</span></div><div className="operator-bars"><i style={{ height: "48%" }}/><i style={{ height: "72%" }}/><i style={{ height: "61%" }}/><i style={{ height: "88%" }}/><i style={{ height: "67%" }}/><i style={{ height: "100%" }}/><i style={{ height: "78%" }}/><i style={{ height: "91%" }}/><i style={{ height: "58%" }}/><i style={{ height: "84%" }}/><i style={{ height: "69%" }}/><i style={{ height: "96%" }}/></div><div className="operator-visual-bottom"><span>BOARDING FLOW</span><strong>DEMO</strong><small>illustrative activity</small></div></div></section>
      </main>
      <footer className="q-footer page-width"><Logo compact/><p>Make the wait make sense.</p><Link href="/driver" className="q-footer-driver-link">Driver mode ↗</Link><span>Q-NOT Â· TRANSIT INTELLIGENCE Â· DEMO BUILD</span></footer>
      {selectedTrip && <JoinDialog trip={selectedTrip} onClose={() => setSelectedTrip(null)} onJoin={handleJoin} error={joinError}/>}
      {seatTrip && <SeatViewerDialog trip={seatTrip} queue={state.queue} onClose={() => setSeatTrip(null)}/>}
      {notice && <div className="q-toast"><Icon name="check" size={17}/>{notice}</div>}
      {!hydrated && <div className="hydration-note">Loading terminal signalâ€¦</div>}
    </div>
  );
}

function OpsStat({ label, value, detail, accent = false }: { label: string; value: string | number; detail: string; accent?: boolean }) {
  return <div className={`ops-stat${accent ? " ops-stat--accent" : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

export function QNotOperator() {
  const { state, callNext, boardPassenger, cancelEntry, joinQueue, resetDemo } = useDemoTransit();
  const [selectedTripId, setSelectedTripId] = useState("trip-ogbete-nsukka");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [quickName, setQuickName] = useState("New passenger");
  const [quickPhone, setQuickPhone] = useState("");
  const activeTrips = state.trips.filter((trip) => trip.status !== "COMPLETED");
  const selectedTrip = state.trips.find((trip) => trip.id === selectedTripId) ?? activeTrips[0];
  const queue = selectedTrip ? activeQueueForTrip(state, selectedTrip.id) : [];
  const waiting = state.queue.filter((entry) => entry.status === "WAITING").length;
  const called = state.queue.filter((entry) => entry.status === "CALLED").length;
  const boarded = state.queue.filter((entry) => entry.status === "BOARDED").length;
  const available = selectedTrip ? seatsAvailable(selectedTrip, state.queue) : 0;

  function showMessage(text: string) { setMessage(text); window.setTimeout(() => setMessage(""), 3500); }
  function handleCallNext() {
    if (!selectedTrip) return;
    const result = callNext(selectedTrip.id);
    if (result.ok === true) {
      showMessage(`${result.entry.passengerName} called to board Â· ${result.entry.ticketCode}`);
    } else {
      showMessage(result.reason === "no-seat" ? "No unassigned seats remain on this trip." : "The queue is empty.");
    }
  }
  function addQuickPassenger(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTrip) return;
    const result = joinQueue({ tripId: selectedTrip.id, passengerName: quickName, phone: quickPhone });
    if (!result.ok) { showMessage(result.reason === "already-joined" ? "That number is already in this queue." : result.reason === "invalid-passenger" ? "Enter a valid name and phone number." : "Trip not found."); return; }
    setQuickPhone(""); setAdding(false); showMessage(`${quickName} added to the virtual queue.`);
  }

  return (
    <div className="q-app q-ops-app">
      <Topbar active="operator"/>
      <main className="page-width ops-main">
        <div className="ops-title-row"><div><div className="hero-kicker"><StatusDot label="OPERATOR SESSION Â· DEMO"/><span className="kicker-divider"/> OGBETE MOTOR PARK</div><h1>Terminal <em>control.</em></h1><p>Manage departures, keep the queue moving and account for every seat.</p></div><div className="ops-title-actions"><button className="button-outline" onClick={() => { const phone = `+234${String(Math.floor(8000000000 + Math.random() * 999999999)).slice(0,10)}`; setQuickPhone(phone); setAdding(true); }} type="button"><Icon name="plus" size={16}/> Add passenger</button><button className="button-primary" onClick={handleCallNext} type="button"><Icon name="users" size={16}/> Call next</button></div></div>
        <div className="ops-metrics"><OpsStat label="WAITING TO BOARD" value={waiting} detail="Across all sample routes" accent/><OpsStat label="CALLED TO BOARD" value={called} detail="Seat held, awaiting confirmation"/><OpsStat label="SEATS AVAILABLE" value={state.trips.reduce((sum, trip) => sum + seatsAvailable(trip, state.queue), 0)} detail="All active demo departures"/><OpsStat label="BOARDED TODAY" value={boarded} detail="Confirmed in this demo session"/></div>
        <div className="ops-workspace">
          <section className="ops-left">
            <div className="ops-section-head"><div><span className="eyebrow">01 / DEPARTURE BOARD</span><h2>Live <em>operations.</em></h2></div><span className="demo-chip">SAMPLE FLEET</span></div>
            <div className="ops-trip-list">{activeTrips.map((trip) => <button className={`ops-trip-row${selectedTrip?.id === trip.id ? " is-selected" : ""}`} key={trip.id} onClick={() => setSelectedTripId(trip.id)} type="button"><span className="ops-trip-marker"><Icon name="bus" size={17}/></span><span className="ops-trip-route"><strong>{trip.origin} <i>â†’</i> {trip.destination}</strong><small>{trip.plate} Â· {trip.departure} Â· {trip.terminal}</small></span><span className="ops-trip-seat"><b>{seatsAvailable(trip, state.queue)}</b><small>open</small></span><span className={`trip-status trip-status--${trip.status.toLowerCase()}`}>{trip.status.replace("_", " ")}</span><Icon name="arrow-up-right" size={16}/></button>)}</div>
            <div className="ops-section-head ops-queue-head"><div><span className="eyebrow">02 / BOARDING CONTROL</span><h2>{selectedTrip ? `${selectedTrip.origin} â†’ ${selectedTrip.destination}` : "Select a trip"}</h2></div>{selectedTrip && <span className="queue-count"><b>{queue.length}</b> IN QUEUE</span>}</div>
            {selectedTrip ? <>
              <div className="boarding-summary"><div><span>VEHICLE</span><strong>{selectedTrip.plate}</strong></div><div><span>CAPACITY</span><strong>{selectedTrip.capacity}</strong></div><div><span>BOARDED</span><strong>{selectedTrip.seatsTaken}</strong></div><div><span>AVAILABLE</span><strong className="available-number">{available}</strong></div></div>
              <div className="boarding-list">{queue.length === 0 ? <div className="ops-empty"><span className="empty-ticket"><Icon name="users" size={22}/></span><strong>Queue is clear.</strong><p>New passenger entries will appear here.</p></div> : queue.map((entry, index) => <div className={`boarding-person boarding-person--${entry.status.toLowerCase()}`} key={entry.id}><span className="boarding-position">{String(index + 1).padStart(2, "0")}</span><span className="boarding-avatar">{entry.passengerName.split(" ").map((part) => part[0]).slice(0,2).join("").toUpperCase()}</span><span className="boarding-name"><strong>{entry.passengerName}{entry.isSample && <small className="sample-tag">SAMPLE</small>}</strong><small>{entry.phone} Â· {entry.isSample ? "sample entry" : `joined ${new Date(entry.joinedAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}`}</small></span>{entry.status === "CALLED" ? <><span className="boarding-ticket">{entry.ticketCode}</span><button className="board-confirm" onClick={() => { boardPassenger(entry.id); showMessage(`${entry.passengerName} confirmed on board.`); }} type="button"><Icon name="check" size={15}/> Boarded</button></> : <><span className={`boarding-status boarding-status--${entry.status.toLowerCase()}`}>{entry.status}</span><button className="row-more" type="button" onClick={() => cancelEntry(entry.id)} aria-label={`Remove ${entry.passengerName}`}><Icon name="x" size={15}/></button></>}</div>)}</div>
              <div className="ops-actions-row"><button className="button-primary" onClick={handleCallNext} disabled={waiting === 0 || available === 0} type="button">Call next passenger <Icon name="arrow" size={16}/></button><span>{available} unassigned seat{available === 1 ? "" : "s"} Â· Called passengers hold a seat until confirmed.</span></div>
            </> : <div className="ops-empty"><p>Select a departure to manage its queue.</p></div>}
          </section>
          <aside className="ops-right"><div className="ops-side-map"><div className="ops-side-map-head"><span className="eyebrow">TERMINAL PULSE</span><StatusDot label="SIMULATED"/></div><RouteSketch progress={selectedTrip?.progress ?? 0} compact/><div className="ops-side-map-copy"><span>{selectedTrip?.routeLabel ?? "Select a route"}</span><strong>{selectedTrip?.etaMinutes ?? "â€”"} <small>min ETA</small></strong><p>Vehicle position is simulated for this demonstration.</p></div></div><div className="ops-side-stat"><span className="eyebrow">BOARDING PERFORMANCE</span><div className="ops-side-stat-number">{boarded}<small> / {state.queue.length}</small></div><div className="ops-side-progress"><i style={{ width: `${state.queue.length ? boarded / state.queue.length * 100 : 0}%` }}/></div><p>Confirmed boardings across the sample terminal session.</p></div><div className="ops-side-note"><Icon name="shield" size={18}/><p><strong>Seat integrity</strong><br/>A queue place is not a seat. Only operator-confirmed boarding changes the seat count.</p></div><button className="reset-demo" type="button" onClick={() => { if (window.confirm("Reset the Q-not demo to its original sample data?")) { resetDemo(); showMessage("Demo network reset."); } }}>Reset demo network â†º</button></aside>
        </div>
      </main>
      <footer className="q-footer page-width"><Logo compact/><p>Make the wait make sense.</p><span>Q-NOT Â· OPERATOR CONSOLE Â· DEMO BUILD</span></footer>
      {adding && <div className="q-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAdding(false); }}><section className="q-join-modal" role="dialog" aria-modal="true" aria-labelledby="add-passenger-title"><div className="modal-topline"><span>OPERATOR TOOL / ADD TO Q</span><button className="icon-button" type="button" onClick={() => setAdding(false)}><Icon name="x"/></button></div><h2 id="add-passenger-title">Add a passenger.</h2><p className="modal-subtitle">Create a demo queue entry for the selected departure.</p><form onSubmit={addQuickPassenger}><label htmlFor="quick-name">Passenger name</label><input id="quick-name" required value={quickName} onChange={(event) => setQuickName(event.target.value)}/><label htmlFor="quick-phone">Phone number</label><input id="quick-phone" required value={quickPhone} onChange={(event) => setQuickPhone(event.target.value)} placeholder="+234..."/><button className="button-primary button-primary--wide" type="submit">Add to virtual queue <Icon name="arrow" size={17}/></button></form></section></div>}
      {message && <div className="q-toast"><Icon name="check" size={17}/>{message}</div>}
    </div>
  );
}

export function QNotDriver() {
  const { state, startBus, moveBus, setDriverLocation } = useDemoTransit();
  const [selectedTripId, setSelectedTripId] = useState("trip-ogbete-nsukka");
  const [gpsMessage, setGpsMessage] = useState("GPS is not connected.");
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const trips = state.trips.filter((trip) => trip.status !== "COMPLETED");
  const trip = state.trips.find((item) => item.id === selectedTripId) ?? trips[0];

  useEffect(() => () => { if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

  function toggleGps() {
    if (!trip) { setGpsMessage("Choose an assignment first."); return; }
    if (watching) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null; setWatching(false); setGpsMessage("Phone GPS paused."); return;
    }
    if (!navigator.geolocation) { setGpsMessage("This browser does not support geolocation. Use the route simulator."); return; }
    setGpsMessage("Waiting for a device GPS readingâ€¦");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation(trip.id, { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
        setGpsMessage(`Device location captured Â· Â±${Math.round(position.coords.accuracy)}m accuracy. This demo stores it in this browser only.`);
        setWatching(true);
      },
      (error) => {
        setWatching(false);
        watchIdRef.current = null;
        setGpsMessage(error.code === 1 ? "Location permission was denied. Use simulated movement." : "GPS could not obtain a fix. Use simulated movement.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 },
    );
    setWatching(true);
  }

  return (
    <div className="q-app q-driver-app"><Topbar active="driver"/><main className="page-width driver-main"><div className="driver-title-row"><div><div className="hero-kicker"><StatusDot label="DRIVER MODE Â· DEMO"/><span className="kicker-divider"/> DRIVER PHONE IS THE SENSOR</div><h1>Keep the city<br/><em>in the loop.</em></h1><p>Start a trip, share your location and keep passengers informed. No dedicated tracker required for the pilot.</p></div><div className="driver-number">03<span>/ DRIVER CONSOLE</span></div></div>
      <div className="driver-workspace"><section className="driver-main-panel"><div className="driver-panel-head"><div><span className="eyebrow">ACTIVE ASSIGNMENT</span><h2>{trip ? `${trip.origin} â†’ ${trip.destination}` : "No active assignment"}</h2></div><span className={`trip-status trip-status--${trip?.status.toLowerCase() ?? "scheduled"}`}>{trip?.status.replace("_", " ") ?? "UNASSIGNED"}</span></div>
        {trip && <><div className="driver-road"><div className="driver-road-labels"><span>{trip.origin}</span><span>{trip.destination}</span></div><div className="driver-road-line"><div className="driver-road-fill" style={{ width: `${trip.progress}%` }}/><div className="driver-road-bus" style={{ left: `${trip.progress}%` }}><Icon name="bus" size={19}/></div><span className="driver-road-start"/><span className="driver-road-end"/></div><div className="driver-road-meta"><span>{trip.progress}% route progress</span><span>{trip.etaMinutes} min estimated</span></div></div>
        <div className="driver-trip-meta"><div><span>VEHICLE ID</span><strong>{trip.plate}</strong></div><div><span>DEPARTURE</span><strong>{trip.departure}</strong></div><div><span>SEATS BOARDED</span><strong>{trip.seatsTaken}/{trip.capacity}</strong></div><div><span>TERMINAL</span><strong>{trip.terminal}</strong></div></div>
        <div className="driver-controls"><button className="button-primary" onClick={() => startBus(trip.id)} type="button"><Icon name="route" size={17}/> Start / resume trip</button><button className="button-outline" onClick={() => moveBus(trip.id, 12)} disabled={trip.status === "COMPLETED"} type="button"><Icon name="arrow" size={17}/> Advance route +12%</button><button className="button-quiet" onClick={() => moveBus(trip.id, 100)} disabled={trip.status === "COMPLETED"} type="button">Mark arrived</button></div></>}
      </section><aside className="driver-side-panel"><div className="driver-device-icon"><Icon name="location" size={27}/><span/></div><span className="eyebrow">DEVICE LOCATION</span><h3>{watching ? "GPS signal active." : "Use this phone."}</h3><p>Allow location access to capture a real device reading, or use the simulator for a controlled demonstration.</p><button className={`gps-toggle${watching ? " is-on" : ""}`} onClick={toggleGps} type="button"><Icon name="location" size={16}/>{watching ? "Pause phone GPS" : "Enable phone GPS"}</button><div className="gps-message">{gpsMessage}</div>{trip?.gps && <div className="gps-coordinates"><span>LAST DEVICE FIX</span><strong>{trip.gps.latitude.toFixed(5)}, {trip.gps.longitude.toFixed(5)}</strong><small>Accuracy Â±{Math.round(trip.gps.accuracy)}m Â· {new Date(trip.gps.capturedAt).toLocaleTimeString()}</small></div>}</aside></div>
      <div className="driver-disclaimer"><Icon name="shield" size={18}/><p><strong>Demo boundary:</strong> simulated progress updates the shared demo state. Phone GPS captures your device&apos;s location in this browser; it is not being transmitted to a passenger or operator server in this build. Production tracking requires an authenticated driver session and a secured location API.</p></div>
      <div className="driver-trip-picker"><span>SWITCH ASSIGNMENT</span>{trips.map((item) => <button key={item.id} className={trip?.id === item.id ? "is-selected" : ""} onClick={() => setSelectedTripId(item.id)} type="button">{item.origin} â†’ {item.destination}<small>{item.plate}</small></button>)}</div>
      </main><footer className="q-footer page-width"><Logo compact/><p>Make the wait make sense.</p><span>Q-NOT Â· DRIVER CONSOLE Â· DEMO BUILD</span></footer></div>
  );
}
