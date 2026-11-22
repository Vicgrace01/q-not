"use client";

import { useEffect, useState } from "react";
import { LocationMap, type MapPoint } from "@/components/maps/location-map";
import { UNN_NSUKKA_CENTER, UNN_NSUKKA_ZOOM } from "@/lib/locations/nigeria-campus";

type Snapshot = { points: MapPoint[]; activeVehicles: number; openRequests: number; passengerDemand: number; refreshedAt?: string };

export function NetworkLiveMap() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ points: [], activeVehicles: 0, openRequests: 0, passengerDemand: 0 });
  const [message, setMessage] = useState("Network positions and pickup demand refresh automatically for the routes you are authorised to coordinate.");
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/network/dispatch/locations", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setMessage(response.status === 401 ? "Your network session has expired. Sign in again." : "Network positions are temporarily unavailable.");
          return;
        }
        const data = await response.json() as Snapshot;
        if (!cancelled) {
          setSnapshot(data);
          setMessage(`Updated ${new Date(data.refreshedAt ?? Date.now()).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}. Passenger markers show requested boarding stops; vehicle markers require current driver GPS sharing.`);
        }
      } catch {
        if (!cancelled) setMessage("The network map could not refresh. It will retry automatically.");
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 10_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  return <section className="qnot-live-map-card">
    <div className="qnot-live-map-heading"><div><span className="qnot-map-kicker">Q-NOT NETWORK / LIVE COORDINATION</span><h3>Supply meets demand</h3><p>Vehicle positions and passenger-selected pickup stops on authorised corridors.</p></div><span className={`qnot-live-map-state${snapshot.activeVehicles ? " is-live" : ""}`}><i />{snapshot.activeVehicles} VEHICLES</span></div>
    <div className="qnot-network-live-stats"><span><strong>{snapshot.openRequests}</strong> open requests</span><span><strong>{snapshot.passengerDemand}</strong> passengers waiting for a match</span></div>
    <LocationMap points={snapshot.points} center={UNN_NSUKKA_CENTER} zoom={UNN_NSUKKA_ZOOM} className="qnot-location-map qnot-live-map-canvas" />
    <p className="qnot-live-map-footnote" aria-live="polite">{message}</p>
  </section>;
}
