"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { QNotJourneyWalkthrough } from "@/components/qnot-journey-walkthrough";

const QNot3DBusScene = dynamic(
  () => import("@/components/qnot-3d-bus-scene").then((module) => module.QNot3DBusScene),
  {
    ssr: false,
    loading: () => <div className="q-road-3d-loading"><span className="q-road-loader-bus">Q</span><span>Preparing the route…</span></div>,
  },
);

export function QNotRoadHero({
  route,
  departure,
  seats,
  waiting,
  hasService,
}: {
  route: string;
  departure: string;
  seats: string;
  waiting: number;
  hasService: boolean;
}) {
  return (
    <section className="q-road-hero q-road-hero--3d" aria-labelledby="q-road-title">
      <QNot3DBusScene />
      <div className="q-road-vignette" />
      <div className="q-road-content page-width">
        <div className="q-road-copy">
          <div className="q-road-eyebrow"><span className="q-road-pulse" /> THE CITY, IN MOTION <i /> SHARED TRANSPORT, CONNECTED</div>
          <h1 id="q-road-title">Every route.<br />Every vehicle.<br /><em>One network.</em></h1>
          <p>Q-not connects passengers with the drivers, vehicles and operators that keep shared transport moving. Discover departures, compare fares and boarding options, reserve eligible journeys and stay informed while you travel.</p>
          <div className="q-road-actions">
            <Link href="/trips" className="q-road-primary">Find a journey <span>↗</span></Link>
            <Link href="#journey-experience" className="q-road-secondary"><span className="q-road-play">▶</span> See how Q-not works</Link>
          </div>
          <div className="q-road-proof">
            <span><b>01</b> Discover services</span>
            <span><b>02</b> Choose where to board</span>
            <span><b>03</b> Stay connected en route</span>
          </div>
        </div>
      </div>
      <div className="q-road-hud q-road-hud--route">
        <span className="q-hud-label">{hasService ? "NEXT AVAILABLE SERVICE" : "Q-NOT NETWORK"} <i /></span>
        <strong>{route}</strong>
        <small>{departure}</small>
      </div>
      <div className="q-road-hud q-road-hud--seats">
        <span className="q-hud-label">SEATS AVAILABLE</span>
        <div><strong>{seats}</strong><span>{hasService ? "on the next service" : "on published services"}</span></div>
        <small>{hasService ? "From approved driver and vehicle records" : "Departures appear as services are approved"}</small>
      </div>
      {hasService && (
        <div className="q-road-hud q-road-hud--queue">
          <span className="q-hud-label">PASSENGERS WAITING</span>
          <div><strong>{String(waiting).padStart(2, "0")}</strong><span>for this departure</span></div>
          <small>Queue positions update with boarding activity</small>
        </div>
      )}
      <div className="q-road-bottomline page-width">
        <span><i /> ROUTES <b>—</b> CAPACITY <b>—</b> BOARDING <b>—</b> MOVEMENT</span>
        <span>ONE NETWORK. EVERY JOURNEY.</span>
      </div>
    </section>
  );
}

export function QNotJourneyFilm() {
  return <QNotJourneyWalkthrough />;
}
