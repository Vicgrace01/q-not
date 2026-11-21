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
          <h1 id="q-road-title">Don&apos;t wait<br />for the bus.<br /><em>Move with it.</em></h1>
          <p>Know which service is moving, what it costs and where to board before you leave. Q-not connects passengers with independent drivers, vehicles and transport operators across the routes people already use.</p>
          <div className="q-road-actions">
            <Link href="/trips" className="q-road-primary">Find your departure <span>↗</span></Link>
            <Link href="#journey-experience" className="q-road-secondary"><span className="q-road-play">▶</span> Experience the journey</Link>
          </div>
          <div className="q-road-proof">
            <span><b>01</b> See the service</span>
            <span><b>02</b> Know your boarding point</span>
            <span><b>03</b> Follow your bus</span>
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
