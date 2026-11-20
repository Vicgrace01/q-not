import { beforeEach, describe, expect, it } from "vitest";
import {
  addPassengerToQueue,
  callNextPassenger,
  cancelQueueEntry,
  cloneDemoState,
  confirmPassengerBoarded,
  seatsAvailable,
} from "@/lib/demo-transit";

function cleanState() {
  const state = cloneDemoState();
  state.queue = [];
  return state;
}

describe("Q-not virtual queue and boarding rules", () => {
  let state = cleanState();

  beforeEach(() => {
    state = cleanState();
  });

  it("lets a passenger join without consuming a physical seat", () => {
    const trip = state.trips[0];
    const before = seatsAvailable(trip, state.queue);
    const output = addPassengerToQueue(state, {
      tripId: trip.id,
      passengerName: "Ada Nwosu",
      phone: "+234 803 111 2233",
    });

    expect(output.result.ok).toBe(true);
    expect(output.state.queue).toHaveLength(1);
    expect(seatsAvailable(output.state.trips[0], output.state.queue)).toBe(before);
  });


  it("rejects an empty name or implausible phone number", () => {
    const tripId = state.trips[0].id;
    const blankName = addPassengerToQueue(state, {
      tripId, passengerName: "   ", phone: "+2348031112233",
    });
    const shortPhone = addPassengerToQueue(state, {
      tripId, passengerName: "Ada Nwosu", phone: "1234",
    });

    expect(blankName.result).toEqual({ ok: false, reason: "invalid-passenger" });
    expect(shortPhone.result).toEqual({ ok: false, reason: "invalid-passenger" });
    expect(state.queue).toHaveLength(0);
  });

  it("prevents the same phone number joining the same trip twice", () => {
    const tripId = state.trips[0].id;
    const first = addPassengerToQueue(state, {
      tripId,
      passengerName: "Ada Nwosu",
      phone: "+234 803 111 2233",
    });
    const second = addPassengerToQueue(first.state, {
      tripId,
      passengerName: "Ada N.",
      phone: "+2348031112233",
    });

    expect(first.result.ok).toBe(true);
    expect(second.result).toEqual({ ok: false, reason: "already-joined" });
    expect(second.state.queue).toHaveLength(1);
  });

  it("holds one seat when called and increments boarded seats only after confirmation", () => {
    const trip = state.trips[0];
    const joined = addPassengerToQueue(state, {
      tripId: trip.id,
      passengerName: "Chidi Okafor",
      phone: "+234 806 111 2233",
    });
    const called = callNextPassenger(joined.state, trip.id);

    expect(called.result.ok).toBe(true);
    expect(called.state.trips[0].seatsTaken).toBe(trip.seatsTaken);
    expect(seatsAvailable(called.state.trips[0], called.state.queue)).toBe(seatsAvailable(trip, []) - 1);

    if (!called.result.ok) throw new Error("Expected a called passenger");
    const boarded = confirmPassengerBoarded(called.state, called.result.entry.id);
    expect(boarded.trips[0].seatsTaken).toBe(trip.seatsTaken + 1);
    expect(boarded.queue[0].status).toBe("BOARDED");
  });

  it("does not call more passengers than there are available seats", () => {
    const trip = state.trips[0];
    const fullTrip = { ...trip, capacity: trip.seatsTaken + 1 };
    state.trips[0] = fullTrip;
    let next = state;
    for (let index = 0; index < 3; index += 1) {
      next = addPassengerToQueue(next, {
        tripId: trip.id,
        passengerName: `Passenger ${index + 1}`,
        phone: `+234800000000${index + 1}`,
      }).state;
    }

    const first = callNextPassenger(next, trip.id);
    expect(first.result.ok).toBe(true);
    const second = callNextPassenger(first.state, trip.id);
    expect(second.result).toEqual({ ok: false, reason: "no-seat" });
  });

  it("releases a held seat when the called passenger cancels", () => {
    const trip = state.trips[0];
    const joined = addPassengerToQueue(state, {
      tripId: trip.id,
      passengerName: "Ifeoma Umeh",
      phone: "+234 809 111 2233",
    });
    const called = callNextPassenger(joined.state, trip.id);
    if (!called.result.ok) throw new Error("Expected a called passenger");
    const heldSeats = seatsAvailable(called.state.trips[0], called.state.queue);
    const cancelled = cancelQueueEntry(called.state, called.result.entry.id);

    expect(seatsAvailable(cancelled.trips[0], cancelled.queue)).toBe(heldSeats + 1);
    expect(cancelled.queue[0].status).toBe("CANCELLED");
  });
});
