"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";

type Stop = { id: string; name: string; latitude: number; longitude: number; sequence: number };
type PickedPoint = { latitude: number; longitude: number };
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function StopCoordinatePicker({ existingStops, center = [6.5244, 3.3792] }: { existingStops: Stop[]; center?: [number, number] }) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const pickedMarkerRef = useRef<Leaflet.CircleMarker | null>(null);
  const [picked, setPicked] = useState<PickedPoint | null>(null);

  useEffect(() => {
    let cancelled = false;
    let clickHandler: ((event: Leaflet.LeafletMouseEvent) => void) | undefined;
    void import("leaflet").then((L) => {
      if (cancelled || !elementRef.current || mapRef.current) return;
      const map = L.map(elementRef.current, { scrollWheelZoom: false }).setView(center, existingStops.length ? 12 : 11);
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap contributors</a>" }).addTo(map);
      existingStops.forEach((stop) => {
        L.circleMarker([stop.latitude, stop.longitude], { radius: 6, color: "#d1d5db", fillColor: "#64748b", fillOpacity: 0.9, weight: 2 })
          .bindTooltip(`${stop.sequence}. ${stop.name}`).addTo(map);
      });
      clickHandler = (event) => {
        const point = { latitude: Number(event.latlng.lat.toFixed(6)), longitude: Number(event.latlng.lng.toFixed(6)) };
        setPicked(point);
        if (pickedMarkerRef.current) pickedMarkerRef.current.setLatLng(event.latlng);
        else pickedMarkerRef.current = L.circleMarker(event.latlng, { radius: 9, color: "#ffffff", fillColor: "#84cc16", fillOpacity: 1, weight: 3 }).addTo(map);
      };
      map.on("click", clickHandler);
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 80);
    }).catch((error: unknown) => console.error("Unable to initialise stop picker:", error));
    return () => {
      cancelled = true;
      if (mapRef.current && clickHandler) mapRef.current.off("click", clickHandler);
      mapRef.current?.remove();
      mapRef.current = null;
      pickedMarkerRef.current = null;
    };
  }, [center, existingStops]);

  return <div className="space-y-2 sm:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-neutral-300">Select the exact boarding point on the map</p><span className="text-[11px] text-neutral-500">Tap or click to place marker</span></div>
    <div ref={elementRef} className="qnot-location-map h-[280px] w-full overflow-hidden rounded-lg border border-neutral-700" role="region" aria-label="Choose a route stop location" />
    <input type="hidden" name="latitude" value={picked?.latitude ?? ""} disabled={!picked} />
    <input type="hidden" name="longitude" value={picked?.longitude ?? ""} disabled={!picked} />
    {picked ? <p className="text-xs text-lime-200" aria-live="polite">Selected: {picked.latitude.toFixed(6)}, {picked.longitude.toFixed(6)}</p> : <p className="text-xs text-amber-200">Choose a point before adding the stop. Existing stops are shown in grey.</p>}
  </div>;
}
