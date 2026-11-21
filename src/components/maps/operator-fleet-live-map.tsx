"use client";

import { useEffect, useState } from "react";
import { LocationMap, type MapPoint } from "@/components/maps/location-map";

type Snapshot = { points: MapPoint[]; activeVehicles: number; refreshedAt?: string };

export function OperatorFleetLiveMap() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ points: [], activeVehicles: 0 });
  const [message, setMessage] = useState("Vehicles appear when an assigned driver starts a trip and shares a current GPS location.");
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/operator/fleet/location", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setMessage(response.status === 401 ? "Sign in again to view your fleet." : "Fleet locations are temporarily unavailable.");
          return;
        }
        const data = await response.json() as Snapshot;
        if (!cancelled) {
          setSnapshot(data);
          setMessage(data.activeVehicles > 0 ? `Showing ${data.activeVehicles} vehicle location(s) refreshed ${new Date(data.refreshedAt ?? Date.now()).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}.` : "No active vehicle is currently sharing a fresh GPS position. Scheduled and offline vehicles are not placed on the live map.");
        }
      } catch {
        if (!cancelled) setMessage("The fleet map could not refresh. It will retry automatically.");
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 10_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  return <section className="qnot-live-map-card">
    <div className="qnot-live-map-heading"><div><span className="qnot-map-kicker">OPERATOR / FLEET VIEW</span><h3>Vehicles on the road</h3><p>Only vehicles assigned to your routes with active, recent driver location sharing appear here.</p></div><span className={`qnot-live-map-state${snapshot.activeVehicles ? " is-live" : ""}`}><i />{snapshot.activeVehicles} LIVE</span></div>
    <LocationMap points={snapshot.points} center={[6.5244, 3.3792]} zoom={11} className="qnot-location-map qnot-live-map-canvas" />
    <p className="qnot-live-map-footnote" aria-live="polite">{message}</p>
  </section>;
}
