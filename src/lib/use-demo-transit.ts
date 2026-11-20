"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  addPassengerToQueue,
  advanceTrip,
  callNextPassenger,
  cancelQueueEntry,
  cloneDemoState,
  confirmPassengerBoarded,
  recordDriverLocation,
  startTrip,
  type DemoState,
  type QueueResult,
  type CallResult,
} from "@/lib/demo-transit";

const STORAGE_KEY = "qnot-demo-state-v1";
type StoreListener = () => void;

const listeners = new Set<StoreListener>();
const serverSnapshot = cloneDemoState();
let clientSnapshot: DemoState | null = null;
let browserListenersAttached = false;

function readStoredState(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDemoState();

    const parsed = JSON.parse(raw) as DemoState;
    if (!Array.isArray(parsed.trips) || !Array.isArray(parsed.queue)) {
      return cloneDemoState();
    }

    return parsed;
  } catch {
    return cloneDemoState();
  }
}

function getClientSnapshot(): DemoState {
  if (typeof window === "undefined") return serverSnapshot;
  if (clientSnapshot === null) clientSnapshot = readStoredState();
  return clientSnapshot;
}

function getServerSnapshot(): DemoState {
  return serverSnapshot;
}

function notifyListeners() {
  for (const listener of listeners) listener();
}

function handleStorageChange(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  clientSnapshot = readStoredState();
  notifyListeners();
}

function handleSameTabUpdate(event: Event) {
  const next = (event as CustomEvent<DemoState>).detail;
  if (!next) return;
  clientSnapshot = next;
  notifyListeners();
}

function subscribe(listener: StoreListener) {
  listeners.add(listener);

  if (!browserListenersAttached) {
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("qnot:updated", handleSameTabUpdate);
    browserListenersAttached = true;
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && browserListenersAttached) {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("qnot:updated", handleSameTabUpdate);
      browserListenersAttached = false;
    }
  };
}

// useSyncExternalStore supplies false during SSR and true after client hydration.
// No effect-driven setState is needed just to detect that the browser mounted.
const subscribeHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

export function useDemoTransit() {
  const state = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  const commit = useCallback(
    (transform: (current: DemoState) => DemoState) => {
      const next = transform(getClientSnapshot());
      clientSnapshot = next;

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The current tab remains usable if browser storage is unavailable.
      }

      window.dispatchEvent(
        new CustomEvent("qnot:updated", { detail: next }),
      );
      return next;
    },
    [],
  );

  const joinQueue = useCallback(
    (input: {
      tripId: string;
      passengerName: string;
      phone: string;
    }): QueueResult => {
      let result: QueueResult | null = null;
      commit((current) => {
        const output = addPassengerToQueue(current, input);
        result = output.result;
        return output.state;
      });
      return result ?? { ok: false, reason: "trip-not-found" };
    },
    [commit],
  );

  const callNext = useCallback(
    (tripId: string): CallResult => {
      let result: CallResult | null = null;
      commit((current) => {
        const output = callNextPassenger(current, tripId);
        result = output.result;
        return output.state;
      });
      return result ?? { ok: false, reason: "trip-not-found" };
    },
    [commit],
  );

  return {
    state,
    hydrated,
    joinQueue,
    callNext,
    boardPassenger: (entryId: string) =>
      commit((current) => confirmPassengerBoarded(current, entryId)),
    cancelEntry: (entryId: string) =>
      commit((current) => cancelQueueEntry(current, entryId)),
    moveBus: (tripId: string, amount?: number) =>
      commit((current) => advanceTrip(current, tripId, amount)),
    startBus: (tripId: string) =>
      commit((current) => startTrip(current, tripId)),
    setDriverLocation: (
      tripId: string,
      location: { latitude: number; longitude: number; accuracy: number },
    ) => commit((current) => recordDriverLocation(current, tripId, location)),
    resetDemo: () => commit(() => cloneDemoState()),
  };
}
