"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LocationMap, type MapPoint } from "@/components/maps/location-map";
import { UNN_NSUKKA_CENTER } from "@/lib/locations/nigeria-campus";

type StopPoint = { id: string; name: string; latitude: number; longitude: number; sequence: number };
type LocationResponse = {
  available: boolean;
  stale?: boolean;
  location?: { latitude: number; longitude: number; accuracyMeters: number | null; updatedAt: string };
  vehicle?: { plateNumber: string };
  stops?: StopPoint[];
  completed?: boolean;
};

export function LiveTripMap({ tripId, routeId, initialStops, canTrackLocation = false }: { tripId: string; routeId: string; initialStops: StopPoint[]; canTrackLocation?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<LocationResponse>({ available: false, stops: initialStops });
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!canTrackLocation) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/location`, { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json() as LocationResponse;
        if (!cancelled && next.completed) {
          router.replace(`/c/journeys/${encodeURIComponent(tripId)}/complete`);
          return;
        }
        if (!cancelled) {
          setData(next);
          if (next.location?.updatedAt) setUpdatedAt(next.location.updatedAt);
        }
      } catch {
        if (!cancelled) setData((current) => ({ ...current, available: false }));
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 5_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [tripId, canTrackLocation, router]);

  const points = useMemo<MapPoint[]>(() => {
    const stopList = data.stops ?? initialStops;
    const finalStopId = stopList[stopList.length - 1]?.id;
    const items: MapPoint[] = stopList.map((stop) => ({
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      label: stop.name,
      kind: stop.sequence === 1 ? "origin" : stop.id === finalStopId ? "destination" : "stop",
    }));
    if (data.available && data.location) {
      items.push({
        id: "active-vehicle",
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        label: data.vehicle?.plateNumber ? `Q-not vehicle · ${data.vehicle.plateNumber}` : "Q-not vehicle",
        kind: "vehicle",
      });
    }
    return items;
  }, [data, initialStops]);

  return (
    <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[.16em] text-lime-300">JOURNEY LOCATION</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Your bus and route</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.available && !data.stale ? "bg-emerald-950 text-emerald-200" : "bg-neutral-800 text-neutral-300"}`}>
          {data.available && !data.stale ? "Location updating" : data.stale ? "Last location is old" : "Waiting for vehicle location"}
        </span>
      </div>
      <LocationMap points={points} center={UNN_NSUKKA_CENTER} drawRoute routeId={routeId} className="qnot-location-map h-[320px] w-full overflow-hidden rounded-lg" />
      <p className="mt-3 text-xs text-neutral-400">
        {!canTrackLocation
          ? "Book this departure to view its live vehicle location."
          : data.available && updatedAt
          ? `Last location received ${new Date(updatedAt).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}${data.location?.accuracyMeters ? ` · GPS accuracy about ${Math.round(data.location.accuracyMeters)} m` : ""}.`
          : "Your assigned vehicle appears when its driver starts the trip and enables location sharing. The map keeps the route and stops visible while GPS connects. Location refreshes every five seconds when the driver is sharing."}
      </p>
    </section>
  );
}
