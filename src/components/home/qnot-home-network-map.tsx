"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LocationMap, type MapPoint } from "@/components/maps/location-map";
import {
  NIGERIAN_STATE_LOCATIONS,
  UNN_NSUKKA_CENTER,
  UNN_NSUKKA_ZOOM,
} from "@/lib/locations/nigeria-campus";

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

const CAMPUS_ROUTE_PATTERN = /\b(odim gate|green house|nru|franco|eni[- ]?njoku|unn|university of nigeria)\b/i;

function isUNNCampusRoute(route: HomeRoute) {
  const searchable = `${route.origin} ${route.destination} ${route.stops.map((stop) => stop.name).join(" ")}`;
  return CAMPUS_ROUTE_PATTERN.test(searchable);
}

const CAMPUS_CENTRE_POINT: MapPoint = {
  id: "unn-nsukka-campus-centre",
  latitude: UNN_NSUKKA_CENTER[0],
  longitude: UNN_NSUKKA_CENTER[1],
  label: "University of Nigeria, Nsukka Â· campus map centre (not a boarding stop)",
  kind: "origin",
};

export function QNotHomeNetworkMap({ routes }: { routes: HomeRoute[] }) {
  const [selectedState, setSelectedState] = useState("Enugu");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const selectedStateLocation = NIGERIAN_STATE_LOCATIONS.find((state) => state.value === selectedState) ?? NIGERIAN_STATE_LOCATIONS.find((state) => state.value === "Enugu")!;
  const isCampusPilot = selectedState === "Enugu";
  const campusRoutes = useMemo(() => routes.filter(isUNNCampusRoute), [routes]);
  const selectedRoute = campusRoutes.find((route) => route.id === selectedRouteId) ?? null;
  const mapCenter: [number, number] = isCampusPilot
    ? UNN_NSUKKA_CENTER
    : [selectedStateLocation.latitude, selectedStateLocation.longitude];
  const mapZoom = isCampusPilot ? UNN_NSUKKA_ZOOM : 8;

  const points = useMemo<MapPoint[]>(() => {
    if (!selectedRoute) return isCampusPilot ? [CAMPUS_CENTRE_POINT] : [];
    return selectedRoute.stops.map((stop, index) => ({
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      label: stop.name,
      kind: index === 0 ? "origin" : index === selectedRoute.stops.length - 1 ? "destination" : "stop",
    }));
  }, [selectedRoute, isCampusPilot]);

  return (
    <section className="q-home-map-section" id="network-map" aria-labelledby="q-home-map-title">
      <div className="page-width">
        <div className="q-home-section-head q-home-section-head--map">
          <div>
            <span className="q-home-kicker">Q-NOT CAMPUS / FIRST NETWORK</span>
            <h2 id="q-home-map-title">Start at Nsukka.<br /><em>Connect the campus.</em></h2>
          </div>
          <p>Q-not is starting with the University of Nigeria, Nsukka. The state selector keeps the wider Nigerian rollout visible, while the live pilot remains limited to approved campus vehicles, surveyed stops and routes.</p>
        </div>

        <div className="q-home-map-frame">
          <div className="q-home-map-side">
            <div className="q-home-map-side-top">
              <span className="q-home-map-mark">Q</span>
              <div><strong>Q-NOT LOCATION NETWORK</strong><small>Nigeria Â· campus-first rollout</small></div>
            </div>
            <label className="q-home-map-prompt" htmlFor="q-not-state-location">SELECT A STATE / LOCATION</label>
            <select
              id="q-not-state-location"
              value={selectedState}
              onChange={(event) => {
                setSelectedState(event.target.value);
                setSelectedRouteId("");
              }}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-[#09110f] px-3 py-3 text-sm font-semibold text-white outline-none focus:border-lime-300"
            >
              {NIGERIAN_STATE_LOCATIONS.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}
            </select>

            {isCampusPilot ? (
              <>
                <div className="mt-4 rounded-lg border border-lime-300/20 bg-lime-300/5 p-3">
                  <span className="text-[10px] font-bold tracking-[.14em] text-lime-200">ACTIVE PILOT FOCUS</span>
                  <strong className="mt-1 block text-sm text-white">University of Nigeria, Nsukka</strong>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-300">The map opens at the main campus centre. This marker is a campus-area reference, not an approved pickup point.</p>
                </div>
                {campusRoutes.length > 0 ? (
                  <>
                    <p className="q-home-map-prompt mt-4">Choose a named campus corridor to inspect its mapped stops.</p>
                    <div className="q-home-route-list" role="group" aria-label="Choose a UNN campus route">
                      {campusRoutes.map((route, index) => (
                        <button
                          key={route.id}
                          className={`q-home-route-choice${selectedRouteId === route.id ? " is-active" : ""}`}
                          type="button"
                          onClick={() => setSelectedRouteId(route.id)}
                          aria-pressed={selectedRouteId === route.id}
                        >
                          <span className="q-home-route-index">{String(index + 1).padStart(2, "0")}</span>
                          <span className="q-home-route-name"><strong>{route.origin}</strong><i /> <strong>{route.destination}</strong><small>{route.stops.length} mapped boarding {route.stops.length === 1 ? "point" : "points"}</small></span>
                          <span className="q-home-route-arrow">â†—</span>
                        </button>
                      ))}
                    </div>
                    <button type="button" className="mt-3 text-xs font-semibold text-lime-200 underline underline-offset-4" onClick={() => setSelectedRouteId("")}>Back to campus overview</button>
                  </>
                ) : (
                  <div className="q-home-map-empty mt-4">
                    <strong>Campus routes are waiting to be surveyed.</strong>
                    <p>Odim Gate, Green House/Nru and Franco are candidate reference areas from UNN&apos;s existing e-mobility information. They must be verified on the ground before Q-not treats them as pickup stops.</p>
                    <Link href="/operators">Open the operator workspace <span>â†—</span></Link>
                  </div>
                )}
                <div className="q-home-map-legend">
                  <span><i className="q-home-map-dot q-home-map-dot--start" /> Campus map centre</span>
                  <span><i className="q-home-map-dot q-home-map-dot--stop" /> Verified boarding stop (when added)</span>
                </div>
              </>
            ) : (
              <div className="q-home-map-empty mt-4">
                <strong>{selectedState} map preview</strong>
                <p>This is an administrative-area overview only. Q-not&apos;s first operational pilot remains UNN Nsukka; no live service, driver availability or route coverage is implied here.</p>
                <button type="button" className="mt-3 text-sm font-semibold text-lime-200 underline underline-offset-4" onClick={() => setSelectedState("Enugu")}>Return to UNN Nsukka â†—</button>
              </div>
            )}
            <div className="q-home-map-side-foot"><span className="q-home-map-live-dot" /> LOCATION DIRECTORY / MAP PREVIEW</div>
          </div>
          <div className="q-home-map-viewport">
            <div className="q-home-map-viewport-label"><span>{isCampusPilot ? "CAMPUS MAP" : "STATE OVERVIEW"}</span><strong>{isCampusPilot ? (selectedRoute ? `${selectedRoute.origin} â†’ ${selectedRoute.destination}` : "UNN Nsukka Â· Enugu State") : `${selectedState} Â· Nigeria`}</strong></div>
            <LocationMap
              key={`${selectedState}-${selectedRoute?.id ?? "overview"}`}
              points={points}
              center={mapCenter}
              zoom={mapZoom}
              drawRoute={Boolean(selectedRoute?.id)}
              routeId={selectedRoute?.id}
              className="qnot-location-map q-home-leaflet-map"
            />
            <div className="q-home-map-attribution-note">Map overview coordinates: Open Admin Data (CC BY 4.0) Â· Road tiles: Â© OpenStreetMap contributors. Campus map centre: Mapcarta/OSM reference; confirm exact stops by field survey.</div>
          </div>
        </div>
        <p className="q-home-map-caption"><span>LIVE LOCATION PRIVACY</span> The map does not expose every driver&apos;s exact position publicly. Passenger tracking remains tied to authorised journey access and driver location-sharing controls. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report a map issue â†—</a></p>
      </div>
    </section>
  );
}