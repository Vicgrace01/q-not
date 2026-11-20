export type TripStatus = "SCHEDULED" | "BOARDING" | "IN_TRANSIT" | "COMPLETED";
export type QueueStatus = "WAITING" | "CALLED" | "BOARDED" | "CANCELLED";

export type DemoTrip = {
  id: string;
  origin: string;
  destination: string;
  terminal: string;
  operator: string;
  bus: string;
  plate: string;
  capacity: number;
  seatsTaken: number;
  fare: number;
  departure: string;
  departureInMinutes: number;
  etaMinutes: number;
  progress: number;
  status: TripStatus;
  routeLabel: string;
  lastSeen: string;
  gps?: { latitude: number; longitude: number; accuracy: number; capturedAt: number };
};

export type DemoQueueEntry = {
  id: string;
  tripId: string;
  passengerName: string;
  phone: string;
  joinedAt: number;
  status: QueueStatus;
  ticketCode?: string;
  calledAt?: number;
  boardedAt?: number;
  isSample?: boolean;
};

export type DemoState = {
  trips: DemoTrip[];
  queue: DemoQueueEntry[];
};

export type QueueResult =
  | { ok: true; entry: DemoQueueEntry }
  | { ok: false; reason: "trip-not-found" | "already-joined" | "invalid-passenger" };

export type CallResult =
  | { ok: true; entry: DemoQueueEntry }
  | { ok: false; reason: "trip-not-found" | "no-seat" | "queue-empty" };

const now = Date.now();

export const DEMO_SEED: DemoState = {
  trips: [
    {
      id: "trip-ogbete-nsukka",
      origin: "Enugu",
      destination: "Nsukka",
      terminal: "Ogbete Motor Park",
      operator: "Q-not demo fleet",
      bus: "High-roof coaster",
      plate: "ENU 482 QN",
      capacity: 18,
      seatsTaken: 11,
      fare: 4500,
      departure: "09:45",
      departureInMinutes: 22,
      etaMinutes: 14,
      progress: 62,
      status: "BOARDING",
      routeLabel: "Northbound · 58 km",
      lastSeen: "just now",
    },
    {
      id: "trip-ogbete-awka",
      origin: "Enugu",
      destination: "Awka",
      terminal: "Ogbete Motor Park",
      operator: "Q-not demo fleet",
      bus: "14-seater shuttle",
      plate: "ENU 209 QN",
      capacity: 14,
      seatsTaken: 8,
      fare: 6000,
      departure: "10:05",
      departureInMinutes: 42,
      etaMinutes: 27,
      progress: 34,
      status: "BOARDING",
      routeLabel: "Southwest · 68 km",
      lastSeen: "1 min ago",
    },
    {
      id: "trip-upper-iweka-enugu",
      origin: "Onitsha",
      destination: "Enugu",
      terminal: "Upper Iweka Terminal",
      operator: "Q-not demo fleet",
      bus: "Executive shuttle",
      plate: "AN 731 QN",
      capacity: 15,
      seatsTaken: 5,
      fare: 5500,
      departure: "10:20",
      departureInMinutes: 57,
      etaMinutes: 19,
      progress: 48,
      status: "SCHEDULED",
      routeLabel: "Eastbound · 92 km",
      lastSeen: "2 min ago",
    },
    {
      id: "trip-ogbete-abakaliki",
      origin: "Enugu",
      destination: "Abakaliki",
      terminal: "Ogbete Motor Park",
      operator: "Q-not demo fleet",
      bus: "Mini coach",
      plate: "ENU 614 QN",
      capacity: 18,
      seatsTaken: 15,
      fare: 5000,
      departure: "10:35",
      departureInMinutes: 72,
      etaMinutes: 11,
      progress: 76,
      status: "BOARDING",
      routeLabel: "Northeast · 64 km",
      lastSeen: "just now",
    },
  ],
  queue: [
    { id: "q-sample-01", tripId: "trip-ogbete-nsukka", passengerName: "Ada N.", phone: "+234 803 000 0101", joinedAt: now - 420000, status: "WAITING", isSample: true },
    { id: "q-sample-02", tripId: "trip-ogbete-nsukka", passengerName: "Chidi O.", phone: "+234 806 000 0102", joinedAt: now - 300000, status: "WAITING", isSample: true },
    { id: "q-sample-03", tripId: "trip-ogbete-awka", passengerName: "Ifeoma U.", phone: "+234 809 000 0103", joinedAt: now - 180000, status: "WAITING", isSample: true },
  ],
};

export function cloneDemoState(state: DemoState = DEMO_SEED): DemoState {
  return JSON.parse(JSON.stringify(state)) as DemoState;
}

export function activeQueueForTrip(state: DemoState, tripId: string): DemoQueueEntry[] {
  return state.queue
    .filter((entry) => entry.tripId === tripId && (entry.status === "WAITING" || entry.status === "CALLED"))
    .sort((a, b) => a.joinedAt - b.joinedAt);
}

export function queuePosition(state: DemoState, entryId: string): number | null {
  const entry = state.queue.find((item) => item.id === entryId);
  if (!entry || entry.status !== "WAITING") return null;
  const queue = activeQueueForTrip(state, entry.tripId).filter((item) => item.status === "WAITING");
  const index = queue.findIndex((item) => item.id === entryId);
  return index < 0 ? null : index + 1;
}

export function seatsAvailable(trip: DemoTrip, queue: DemoQueueEntry[]): number {
  const temporarilyHeld = queue.filter((entry) => entry.tripId === trip.id && entry.status === "CALLED").length;
  return Math.max(0, trip.capacity - trip.seatsTaken - temporarilyHeld);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeTicketCode(): string {
  return `QN-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
}

export function addPassengerToQueue(
  state: DemoState,
  input: { tripId: string; passengerName: string; phone: string },
): { state: DemoState; result: QueueResult } {
  const trip = state.trips.find((item) => item.id === input.tripId);
  if (!trip) return { state, result: { ok: false, reason: "trip-not-found" } };

  const passengerName = input.passengerName.trim();
  const phone = input.phone.replace(/[^0-9+]/g, "");
  const phoneDigits = phone.replace(/\D/g, "");
  if (!passengerName || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return { state, result: { ok: false, reason: "invalid-passenger" } };
  }
  const existing = state.queue.find((entry) => entry.tripId === input.tripId && entry.phone.replace(/[\s()-]/g, "") === phone && entry.status !== "CANCELLED");
  if (existing) return { state, result: { ok: false, reason: "already-joined" } };

  const entry: DemoQueueEntry = {
    id: makeId("q"),
    tripId: input.tripId,
    passengerName,
    phone,
    joinedAt: Date.now(),
    status: "WAITING",
  };

  // Joining the virtual line does not consume a seat. A seat is held only
  // when an operator calls the passenger and confirmed when they board.
  const next = { ...state, queue: [...state.queue, entry] };
  return { state: next, result: { ok: true, entry } };
}

export function callNextPassenger(state: DemoState, tripId: string): { state: DemoState; result: CallResult } {
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip) return { state, result: { ok: false, reason: "trip-not-found" } };
  if (seatsAvailable(trip, state.queue) < 1) return { state, result: { ok: false, reason: "no-seat" } };

  const nextEntry = activeQueueForTrip(state, tripId).find((entry) => entry.status === "WAITING");
  if (!nextEntry) return { state, result: { ok: false, reason: "queue-empty" } };

  const updated: DemoQueueEntry = { ...nextEntry, status: "CALLED", calledAt: Date.now(), ticketCode: makeTicketCode() };
  return {
    state: { ...state, queue: state.queue.map((entry) => entry.id === updated.id ? updated : entry) },
    result: { ok: true, entry: updated },
  };
}

export function confirmPassengerBoarded(state: DemoState, entryId: string): DemoState {
  const entry = state.queue.find((item) => item.id === entryId);
  if (!entry || entry.status !== "CALLED") return state;
  const trip = state.trips.find((item) => item.id === entry.tripId);
  if (!trip || trip.seatsTaken >= trip.capacity) return state;

  return {
    trips: state.trips.map((item) => item.id === trip.id ? { ...item, seatsTaken: Math.min(item.capacity, item.seatsTaken + 1) } : item),
    queue: state.queue.map((item) => item.id === entryId ? { ...item, status: "BOARDED", boardedAt: Date.now() } : item),
  };
}

export function cancelQueueEntry(state: DemoState, entryId: string): DemoState {
  return {
    ...state,
    queue: state.queue.map((entry) => entry.id === entryId && (entry.status === "WAITING" || entry.status === "CALLED")
      ? { ...entry, status: "CANCELLED" }
      : entry),
  };
}

export function advanceTrip(state: DemoState, tripId: string, amount = 9): DemoState {
  return {
    ...state,
    trips: state.trips.map((trip) => {
      if (trip.id !== tripId || trip.status === "COMPLETED") return trip;
      const progress = Math.min(100, trip.progress + amount);
      return {
        ...trip,
        progress,
        etaMinutes: Math.max(0, Math.ceil(trip.etaMinutes * (1 - amount / 100))),
        status: progress >= 100 ? "COMPLETED" : "IN_TRANSIT",
        lastSeen: "just now",
      };
    }),
  };
}

export function startTrip(state: DemoState, tripId: string): DemoState {
  return {
    ...state,
    trips: state.trips.map((trip) => trip.id === tripId && trip.status !== "COMPLETED"
      ? { ...trip, status: "IN_TRANSIT", lastSeen: "just now" }
      : trip),
  };
}

export function recordDriverLocation(
  state: DemoState,
  tripId: string,
  location: { latitude: number; longitude: number; accuracy: number },
): DemoState {
  return {
    ...state,
    trips: state.trips.map((trip) => trip.id === tripId
      ? { ...trip, gps: { ...location, capturedAt: Date.now() }, lastSeen: "just now" }
      : trip),
  };
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function waitEstimate(position: number): number {
  return Math.max(2, position * 2);
}
