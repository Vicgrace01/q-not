"use client";

import { useEffect, useMemo, useState } from "react";
import { LocationMap, type MapPoint } from "@/components/maps/location-map";

type StopPoint = { id: string; name: string; latitude: number; longitude: number; sequence: number };
type PickupPoint = { id: string; name: string; latitude: number; longitude: number; passengerCount: number; alightingName: string; alightingLatitude: number; alightingLongitude: number };
type DriverLocationResponse = {
  available: boolean;
  stale?: boolean;
  location?: { latitude: number; longitude: number; accuracyMeters: number | null; updatedAt: string };
  stops?: StopPoint[];
  vehicle?: { plateNumber: string };
};

export function DriverLiveRouteMap({ tripId, routeId, routeName, initialStops, pickupPoints }: {
  tripId: string;
  routeId: string;
  routeName: string;
  initialStops: StopPoint[];
  pickupPoints: PickupPoint[];
}) {
  const [snapshot, setSnapshot] = useState<DriverLocationResponse>({ available: false, stops: initialStops });
  const [message, setMessage] = useState("Route stops are ready. Start location sharing during the active trip to place your vehicle on the map.");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/driver/location?tripId=${encodeURIComponent(tripId)}`, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setMessage(response.status === 401 ? "Sign in again to view this service map." : "This trip is no longer assigned to your driver account.");
          return;
        }
        const next = await response.json() as DriverLocationResponse;
        if (!cancelled) {
          setSnapshot(next);
          setMessage(next.available && next.location
            ? `Your vehicle location updated at ${new Date(next.location.updatedAt).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}${next.stale ? " · GPS fix is ageing" : " · GPS live"}.`
            : "Your route and passenger pickup points are shown. Your vehicle marker appears when GPS sharing is active.");
        }
      } catch {
        if (!cancelled) setMessage("Connection interrupted. The route remains visible; location will refresh when the network returns.");
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 5_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [tripId]);

  const points = useMemo<MapPoint[]>(() => {
    const stops = snapshot.stops ?? initialStops;
    const lastId = stops[stops.length - 1]?.id;
    const result: MapPoint[] = stops.map((stop) => ({
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      label: `${stop.sequence}. ${stop.name}`,
      kind: stop.sequence === 1 ? "origin" : stop.id === lastId ? "destination" : "stop",
    }));
    for (const pickup of pickupPoints) {
      result.push({ id: `pickup-${pickup.id}`, latitude: pickup.latitude, longitude: pickup.longitude, label: `${pickup.passengerCount} passenger(s) · pickup ${pickup.name}`, kind: "demand" });
      result.push({ id: `dropoff-${pickup.id}`, latitude: pickup.alightingLatitude, longitude: pickup.alightingLongitude, label: `Drop-off · ${pickup.alightingName}`, kind: "destination" });
    }
    if (snapshot.available && snapshot.location) result.push({ id: "driver-vehicle", latitude: snapshot.location.latitude, longitude: snapshot.location.longitude, label: snapshot.vehicle?.plateNumber ? `Your vehicle · ${snapshot.vehicle.plateNumber}` : "Your vehicle", kind: "vehicle" });
    return result;
  }, [snapshot, initialStops, pickupPoints]);

  return (
    <section className="qnot-live-map-card qnot-driver-route-map">
      <div className="qnot-live-map-heading">
        <div><span className="qnot-map-kicker">Q-NOT DRIVE / ACTIVE ROUTE</span><h3>{routeName}</h3><p>Assigned route, passenger-selected stops and your vehicle position.</p></div>
        <span className={`qnot-live-map-state${snapshot.available && !snapshot.stale ? " is-live" : ""}`}><i />{snapshot.available && !snapshot.stale ? "GPS LIVE" : snapshot.stale ? "GPS AGING" : "ROUTE READY"}</span>
      </div>
      <LocationMap points={points} center={[6.5244, 3.3792]} zoom={12} drawRoute routeId={routeId} className="qnot-location-map qnot-live-map-canvas" />
      <p className="qnot-live-map-footnote" aria-live="polite">{message} Passenger markers represent the boarding and alighting stops they selected, not a passenger&apos;s live phone location. Keep this driver screen open while sharing GPS; browser location sharing cannot continue reliably after the app is closed.</p>
      {pickupPoints.length > 0 && <div className="qnot-pickup-manifest"><strong>ON THIS SERVICE</strong>{pickupPoints.map((point) => <span key={point.id}>{point.passengerCount} × {point.name} <i>→</i> {point.alightingName}</span>)}</div>}
    </section>
  );
}
