"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { UNN_NSUKKA_CENTER } from "@/lib/locations/nigeria-campus";

export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  kind?: "vehicle" | "stop" | "origin" | "destination" | "user" | "demand";
};

type LocationMapProps = {
  points: MapPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  drawRoute?: boolean;
  routeId?: string;
};

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function markerColour(kind: MapPoint["kind"]): string {
  if (kind === "vehicle") return "#84cc16";
  if (kind === "origin") return "#22c55e";
  if (kind === "destination") return "#fb7185";
  if (kind === "user") return "#38bdf8";
  if (kind === "demand") return "#c084fc";
  return "#e5e7eb";
}

export function LocationMap({ points, center, zoom = 12, className, drawRoute = false, routeId }: LocationMapProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const initialViewSet = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [routeGeometryResult, setRouteGeometryResult] = useState<{ routeId: string; coordinates: [number, number][] } | null>(null);
  const roadGeometry = routeGeometryResult && routeGeometryResult.routeId === routeId ? routeGeometryResult.coordinates : null;

  useEffect(() => {
    let cancelled = false;
    let resizeTimer: number | undefined;
    void import("leaflet").then((L) => {
      if (cancelled || !elementRef.current || mapRef.current) return;
      leafletRef.current = L;
      const firstPoint = points.find((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180);
      const initial: [number, number] = center ?? (firstPoint ? [firstPoint.latitude, firstPoint.longitude] : UNN_NSUKKA_CENTER);
      const map = L.map(elementRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(initial, zoom);
      L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap contributors</a>",
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
      resizeTimer = window.setTimeout(() => map.invalidateSize(), 80);
    }).catch((error: unknown) => {
      console.error("Unable to initialise map:", error);
    });
    return () => {
      cancelled = true;
      if (resizeTimer !== undefined) window.clearTimeout(resizeTimer);
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
    };
    // Map construction is intentionally one-time; changing points is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!drawRoute || !routeId) return;
    const controller = new AbortController();
    void fetch(`/api/routes/${encodeURIComponent(routeId)}/geometry`, { cache: "force-cache", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { coordinates?: [number, number][] };
      })
      .then((payload) => {
        if (!controller.signal.aborted && payload?.coordinates) {
          setRouteGeometryResult({ routeId, coordinates: payload.coordinates.map(([longitude, latitude]) => [latitude, longitude]) });
        }
      })
      .catch(() => { /* Keep stop markers visible when road routing is unavailable. */ });
    return () => controller.abort();
  }, [drawRoute, routeId]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();
    const valid = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180);
    const coordinates: [number, number][] = [];

    for (const point of valid) {
      const colour = markerColour(point.kind);
      const icon = L.divIcon({
        className: "qnot-leaflet-marker-shell",
        html: `<span class="qnot-leaflet-marker" style="--marker-colour:${colour}"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const tooltip = document.createElement("span");
      tooltip.textContent = point.label;
      L.marker([point.latitude, point.longitude], { icon })
        .bindTooltip(tooltip, { direction: "top", offset: [0, -10] })
        .addTo(layer);
      coordinates.push([point.latitude, point.longitude]);
    }

    if (drawRoute && roadGeometry && roadGeometry.length > 1) {
      L.polyline(roadGeometry, { color: "#a3e635", weight: 4, opacity: 0.82, lineCap: "round", lineJoin: "round" }).addTo(layer);
    }

    if (!initialViewSet.current) {
      if (coordinates.length > 1) {
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds.pad(0.18), { maxZoom: 14 });
        initialViewSet.current = true;
      } else if (coordinates.length === 1) {
        map.setView(coordinates[0], Math.max(map.getZoom(), zoom));
        initialViewSet.current = true;
      } else if (center) {
        // Keep the default city view without locking it. The first real GPS/stop point
        // arriving later should still be able to move the map to the actual corridor.
        map.setView(center, zoom);
      }
    }
  }, [points, center, zoom, drawRoute, mapReady, roadGeometry]);

  return <div ref={elementRef} className={className ?? "qnot-location-map"} role="region" aria-label="Map showing the vehicle and route stops" />;
}
