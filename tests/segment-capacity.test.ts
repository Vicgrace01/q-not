import { describe, expect, it } from "vitest";
import {
  calculateSegmentLoads,
  canAllocateSegmentCapacity,
  getSegmentAvailability,
  type SegmentCapacityInput,
} from "../src/lib/segments/capacity";

const now = new Date("2026-11-22T10:00:00.000Z");

function fixture(
  capacity = 14,
  allocations: SegmentCapacityInput["allocations"] = [],
  legacyWholeRouteOccupancy = 0,
): SegmentCapacityInput {
  return {
    stopSequences: [1, 2, 3, 4],
    capacity,
    legacyWholeRouteOccupancy,
    allocations,
  };
}

describe("segment capacity engine", () => {
  it("allows non-overlapping journeys to reuse vehicle capacity", () => {
    const input = fixture(1, [
      {
        boardingSequence: 1,
        alightingSequence: 3,
        passengerCount: 1,
        status: "CONFIRMED",
      },
    ]);

    expect(
      canAllocateSegmentCapacity(input, 3, 4, 1, now),
    ).toBe(true);

    expect(
      getSegmentAvailability(input, 3, 4, now),
    ).toBe(1);
  });

  it("rejects overlapping journeys when a shared segment is full", () => {
    const input = fixture(1, [
      {
        boardingSequence: 1,
        alightingSequence: 3,
        passengerCount: 1,
        status: "CONFIRMED",
      },
    ]);

    expect(
      canAllocateSegmentCapacity(input, 2, 4, 1, now),
    ).toBe(false);
  });

  it("counts group passenger quantities instead of allocation records", () => {
    const input = fixture(5, [
      {
        boardingSequence: 1,
        alightingSequence: 3,
        passengerCount: 4,
        status: "CONFIRMED",
      },
    ]);

    expect(
      getSegmentAvailability(input, 2, 4, now),
    ).toBe(1);

    expect(
      canAllocateSegmentCapacity(input, 2, 4, 2, now),
    ).toBe(false);
  });

  it("counts legacy whole-route bookings on every segment", () => {
    const input = fixture(5, [], 4);

    expect(calculateSegmentLoads(input, now)).toEqual([
      { fromSequence: 1, toSequence: 2, occupied: 4, available: 1 },
      { fromSequence: 2, toSequence: 3, occupied: 4, available: 1 },
      { fromSequence: 3, toSequence: 4, occupied: 4, available: 1 },
    ]);
  });

  it("combines legacy occupancy with overlapping allocations", () => {
    const input = fixture(
      10,
      [
        {
          boardingSequence: 2,
          alightingSequence: 4,
          passengerCount: 3,
          status: "BOARDED",
        },
      ],
      4,
    );

    const loads = calculateSegmentLoads(input, now);

    expect(loads.map((segment) => segment.occupied)).toEqual([
      4,
      7,
      7,
    ]);
  });

  it("ignores expired unmatched offers but retains payment holds", () => {
    const input = fixture(2, [
      {
        boardingSequence: 1,
        alightingSequence: 4,
        passengerCount: 1,
        status: "MATCHED",
        holdExpiresAt: new Date("2026-11-22T09:00:00.000Z"),
      },
      {
        boardingSequence: 1,
        alightingSequence: 4,
        passengerCount: 1,
        status: "HELD",
        holdExpiresAt: new Date("2026-11-22T09:00:00.000Z"),
      },
    ]);

    expect(
      getSegmentAvailability(input, 1, 4, now),
    ).toBe(1);
  });

  it("does not count released or cancelled allocations", () => {
    const input = fixture(2, [
      {
        boardingSequence: 1,
        alightingSequence: 4,
        passengerCount: 2,
        status: "RELEASED",
      },
      {
        boardingSequence: 1,
        alightingSequence: 4,
        passengerCount: 2,
        status: "CANCELLED",
      },
      {
        boardingSequence: 1,
        alightingSequence: 4,
        passengerCount: 1,
        status: "ALIGHTED",
      },
    ]);

    expect(
      getSegmentAvailability(input, 1, 4, now),
    ).toBe(2);
  });

  it("uses the busiest segment when calculating available capacity", () => {
    const input = fixture(8, [
      {
        boardingSequence: 1,
        alightingSequence: 2,
        passengerCount: 6,
        status: "CONFIRMED",
      },
      {
        boardingSequence: 2,
        alightingSequence: 4,
        passengerCount: 3,
        status: "CONFIRMED",
      },
    ]);

    expect(
      getSegmentAvailability(input, 1, 4, now),
    ).toBe(2);
  });

  it("rejects invalid stop intervals and passenger quantities", () => {
    const input = fixture();

    expect(() => getSegmentAvailability(input, 3, 2, now)).toThrow();
    expect(() => getSegmentAvailability(input, 1, 8, now)).toThrow();

    expect(
      canAllocateSegmentCapacity(input, 1, 3, 0, now),
    ).toBe(false);
  });
});