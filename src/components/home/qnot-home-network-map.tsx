"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LocationMap, type MapPoint } from "@/components/maps/location-map";

type HomeStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
};

type HomeRoute = {
  id: string;
  origin: string;
  destination: string;
  stops: HomeStop[];
};

export function QNotHomeNetworkMap({ routes }: { routes: HomeRoute[] }) {
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id ?? "");
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;
  const points = useMemo<MapPoint[]>(() => {
    if (!selectedRoute) return [];
    return selectedRoute.stops.map((stop, index) => ({
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      label: stop.name,
      kind: index === 0 ? "origin" : index === selectedRoute.stops.length - 1 ? "destination" : "stop",
    }));
  }, [selectedRoute]);

  return (
    <section className="q-home-map-section" id="network-map" aria-labelledby="q-home-map-title">
      <div className="page-width">
        <div className="q-home-section-head q-home-section-head--map">
          <div>
            <span className="q-home-kicker">THE CITY, CONNECTED</span>
            <h2 id="q-home-map-title">See the network<br /><em>take shape.</em></h2>
          </div>
          <p>Q-not maps the stops and corridors that connect passengers with shared transport. When an approved service is moving and its driver shares GPS, its location becomes available to passengers with a confirmed trip.</p>
        </div>

        <div className="q-home-map-frame">
          <div className="q-home-map-side">
            <div className="q-home-map-side-top">
              <span className="q-home-map-mark">Q</span>
              <div><strong>Q-NOT NETWORK MAP</strong><small>OpenStreetMap · Road and stop layer</small></div>
            </div>
            {routes.length > 0 ? (
              <>
                <p className="q-home-map-prompt">Choose a published corridor to inspect its boarding stops.</p>
                <div className="q-home-route-list" role="group" aria-label="Choose a route corridor">
                  {routes.map((route, index) => (
                    <button
                      key={route.id}
                      className={`q-home-route-choice${selectedRouteId === route.id ? " is-active" : ""}`}
                      type="button"
                      onClick={() => setSelectedRouteId(route.id)}
                      aria-pressed={selectedRouteId === route.id}
                    >
                      <span className="q-home-route-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="q-home-route-name"><strong>{route.origin}</strong><i /> <strong>{route.destination}</strong><small>{route.stops.length} mapped boarding {route.stops.length === 1 ? "point" : "points"}</small></span>
                      <span className="q-home-route-arrow">↗</span>
                    </button>
                  ))}
                </div>
                <div className="q-home-map-legend">
                  <span><i className="q-home-map-dot q-home-map-dot--start" /> Corridor origin</span>
                  <span><i className="q-home-map-dot q-home-map-dot--stop" /> Boarding stop</span>
                  <span><i className="q-home-map-dot q-home-map-dot--end" /> Final stop</span>
                </div>
              </>
            ) : (
              <div className="q-home-map-empty">
                <span className="q-home-map-empty-mark">◎</span>
                <strong>The first corridor is waiting to be mapped.</strong>
                <p>The street map is available. Route lines and stop markers appear when a transport operator or approved driver publishes a corridor with stop coordinates.</p>
                <Link href="/drive">Bring a vehicle onto Q-not <span>↗</span></Link>
                <Link href="/operators">Register an operator network <span>↗</span></Link>
              </div>
            )}
            <div className="q-home-map-side-foot"><span className="q-home-map-live-dot" /> STREET MAP / OPEN DATA</div>
          </div>
          <div className="q-home-map-viewport">
            <div className="q-home-map-viewport-label"><span>LOCATION LAYER</span><strong>{selectedRoute ? `${selectedRoute.origin} → ${selectedRoute.destination}` : "Lagos · Nigeria"}</strong></div>
            <LocationMap
              key={selectedRoute?.id ?? "lagos-network"}
              points={points}
              center={[6.5244, 3.3792]}
              zoom={11}
              drawRoute={Boolean(selectedRoute?.id)}
              routeId={selectedRoute?.id}
              className="qnot-location-map q-home-leaflet-map"
            />
            <div className="q-home-map-attribution-note">© OpenStreetMap contributors · Map tiles and road geometry load from their configured public services.</div>
          </div>
        </div>
        <p className="q-home-map-caption"><span>LOCATION PRIVACY</span> Live vehicle positions are shown inside an eligible passenger&apos;s trip view, not as a public driver tracker. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report a map issue ↗</a></p>
      </div>
    </section>
  );
}
