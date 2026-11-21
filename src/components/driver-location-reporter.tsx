"use client";

import { useEffect, useRef, useState } from "react";

export function DriverLocationReporter({ tripId }: { tripId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stopPending, setStopPending] = useState(false);
  const [status, setStatus] = useState("Location sharing is off");
  const latest = useRef<GeolocationPosition | null>(null);
  const lastSent = useRef(0);
  const lastSentFix = useRef(0);
  const sending = useRef(false);
  const sharingRequested = useRef(false);

  useEffect(() => {
    if (!enabled || !sharingRequested.current) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!sharingRequested.current) return;
        latest.current = position;
        setStatus("GPS fix acquired. Preparing a fresh location update.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          sharingRequested.current = false;
          setEnabled(false);
          setStatus("Location permission was denied. Sharing has been stopped; enable permission in your browser settings to try again.");
          void fetch("/api/driver/location", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tripId }),
          }).then((response) => {
            if (!response.ok) {
              setStopPending(true);
              setStatus("Location permission was denied, but the server could not confirm Stop. Retry stop sharing.");
            }
          }).catch(() => {
            setStopPending(true);
            setStatus("Location permission was denied. Network unavailable; retry Stop to confirm sharing is off.");
          });
          return;
        }
        setStatus("Unable to read GPS location. Keep location services enabled.");
      },
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 15_000 },
    );

    const send = async () => {
      if (!sharingRequested.current) return;
      const position = latest.current;
      if (!position || sending.current || Date.now() - lastSent.current < 9_000) return;
      if (position.timestamp <= lastSentFix.current) return;
      const capturedAt = new Date(position.timestamp);
      if (Date.now() - capturedAt.getTime() > 60_000 || capturedAt.getTime() > Date.now() + 10_000) {
        setStatus("Waiting for a fresh GPS fix. Keep location services enabled.");
        return;
      }
      sending.current = true;
      try {
        const response = await fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            capturedAt: capturedAt.toISOString(),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            headingDegrees: position.coords.heading,
            speedMetersPerSecond: position.coords.speed,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { error?: string };
          if (sharingRequested.current) setStatus(payload.error ?? "Location update could not be saved.");
          if (response.status === 409) lastSentFix.current = Math.max(lastSentFix.current, position.timestamp);
          if (response.status === 401 || response.status === 403) {
            sharingRequested.current = false;
            setEnabled(false);
            void fetch("/api/driver/location", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tripId }),
            }).then((stopResponse) => {
              if (!stopResponse.ok) setStopPending(true);
            }).catch(() => setStopPending(true));
          }
        } else {
          lastSent.current = Date.now();
          lastSentFix.current = position.timestamp;
          if (sharingRequested.current) setStatus("Vehicle location shared securely.");
        }
      } catch {
        if (sharingRequested.current) setStatus("Network unavailable. Location will resume when connection returns.");
      } finally {
        sending.current = false;
      }
    };

    const timer = window.setInterval(() => { void send(); }, 10_000);
    void send();
    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(timer);
    };
  }, [enabled, tripId]);

  const startSharing = async () => {
    if (starting || stopping || stopPending) return;
    if (!navigator.geolocation) {
      setStatus("This device does not provide GPS location.");
      return;
    }
    setStarting(true);
    setStatus("Enabling secure location sharing…");
    try {
      const response = await fetch("/api/driver/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setStatus(payload.error ?? "Location sharing could not be enabled.");
        return;
      }
      sharingRequested.current = true;
      latest.current = null;
      lastSent.current = 0;
      lastSentFix.current = 0;
      setEnabled(true);
      setStopPending(false);
      setStatus("Location sharing is on. Waiting for a fresh GPS fix.");
    } catch {
      setStatus("Network unavailable. Location sharing could not be enabled.");
    } finally {
      setStarting(false);
    }
  };

  const stopSharing = async () => {
    if (stopping) return;
    // Stop local sampling immediately. Any already-running POST is serialized
    // with DELETE by the DriverSession row lock on the server.
    sharingRequested.current = false;
    setEnabled(false);
    latest.current = null;
    setStopping(true);
    setStopPending(false);
    setStatus("Stopping location sharing…");
    try {
      const response = await fetch("/api/driver/location", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setStopPending(true);
        setStatus(payload.error ?? "Could not confirm that location sharing stopped. Retry to confirm.");
        return;
      }
      setStopPending(false);
      setStatus("Location sharing is off.");
    } catch {
      setStopPending(true);
      setStatus("Network unavailable. Location sharing may still be active. Retry to confirm it has stopped.");
    } finally {
      setStopping(false);
    }
  };

  const buttonLabel = starting ? "Enabling…"
    : stopping ? "Stopping…"
    : enabled ? "Stop sharing"
    : stopPending ? "Retry stop sharing"
    : "Share live location";

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">Trip location sharing</p>
          <p className="mt-1 text-xs text-neutral-400" aria-live="polite">{status}</p>
        </div>
        <button
          type="button"
          disabled={starting || stopping}
          onClick={() => {
            if (enabled || stopPending) void stopSharing();
            else void startSharing();
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-60 ${enabled || stopPending ? "border border-red-400/40 text-red-200" : "bg-lime-300 text-neutral-950"}`}
        >
          {buttonLabel}
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">Share location only while this trip is active. Q-not records the latest GPS point and accuracy for passenger tracking. You can stop sharing at any time.</p>
    </div>
  );
}
