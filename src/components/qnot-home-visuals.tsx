"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { QNotJourneyDemo } from "@/components/qnot-journey-demo";

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
}: {
  route: string;
  departure: string;
  seats: string;
}) {
  return (
    <section className="q-road-hero q-road-hero--3d" aria-labelledby="q-road-title">
      <QNot3DBusScene />
      <div className="q-road-vignette" />
      <div className="q-road-content page-width">
        <div className="q-road-copy">
          <div className="q-road-eyebrow"><span className="q-road-pulse" /> KNOW BEFORE YOU GO <i /> THE CITY, IN MOTION</div>
          <h1 id="q-road-title">Don&apos;t wait<br />for the bus.<br /><em>Move with it.</em></h1>
          <p>See what&apos;s leaving, how many people are waiting and what it costs — before you leave home. Hold your place, follow your bus and get on along your route.</p>
          <div className="q-road-actions">
            <Link href="#departures" className="q-road-primary">Find your departure <span>↗</span></Link>
            <Link href="#the-journey" className="q-road-secondary"><span className="q-road-play">▶</span> Try the journey</Link>
          </div>
          <div className="q-road-proof">
            <span><b>01</b> Check the bus</span>
            <span><b>02</b> Hold your place</span>
            <span><b>03</b> Board anywhere approved</span>
          </div>
        </div>
      </div>
      <div className="q-road-hud q-road-hud--route">
        <span className="q-hud-label">ROUTE IN MOTION <i /></span>
        <strong>{route}</strong>
        <small>{departure} <b>·</b> Sample departure</small>
      </div>
      <div className="q-road-hud q-road-hud--seats">
        <span className="q-hud-label">SEATS AVAILABLE</span>
        <div><strong>{seats}</strong><span>open / total</span></div>
        <small>Illustrative departure</small>
      </div>
      <div className="q-road-hud q-road-hud--queue">
        <span className="q-hud-label">PEOPLE AHEAD</span>
        <div><strong>04</strong><span>in the virtual queue</span></div>
        <small>Know the wait before leaving</small>
      </div>
      <div className="q-road-bottomline page-width">
        <span><i /> SIMULATED VEHICLE MOVEMENT</span>
        <span>CHECK <b>—</b> HOLD <b>—</b> BOARD <b>—</b> GO</span>
      </div>
    </section>
  );
}

export function QNotJourneyFilm() {
  return <QNotJourneyDemo />;
}
