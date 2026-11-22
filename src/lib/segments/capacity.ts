export type SegmentAllocationStatus =
  | "MATCHED"
  | "HELD"
  | "CONFIRMED"
  | "BOARDED"
  | "ALIGHTED"
  | "RELEASED"
  | "CANCELLED";

export type SegmentAllocation = {
  boardingSequence: number;
  alightingSequence: number;
  passengerCount: number;
  status: SegmentAllocationStatus;
  holdExpiresAt?: Date | null;
};

export type SegmentLoad = {
  fromSequence: number;
  toSequence: number;
  occupied: number;
  available: number;
};

export type SegmentCapacityInput = {
  stopSequences: number[];
  capacity: number;
  legacyWholeRouteOccupancy: number;
  allocations: SegmentAllocation[];
};

const ACTIVE_STATUSES = new Set<SegmentAllocationStatus>([
  "MATCHED",
  "HELD",
  "CONFIRMED",
  "BOARDED",
]);

function isValidPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isAllocationActive(
  allocation: SegmentAllocation,
  now: Date,
): boolean {
  if (!ACTIVE_STATUSES.has(allocation.status)) return false;

  // A MATCHED allocation is a temporary offer, not an indefinite seat hold.
  // HELD allocations remain counted until payment reconciliation explicitly
  // confirms or releases them.
  if (
    allocation.status === "MATCHED" &&
    allocation.holdExpiresAt &&
    allocation.holdExpiresAt.getTime() <= now.getTime()
  ) {
    return false;
  }

  return true;
}

function validateInput(input: SegmentCapacityInput): number[] {
  if (!isValidPositiveInteger(input.capacity)) {
    throw new Error("Vehicle capacity must be a positive integer.");
  }

  if (
    !Number.isSafeInteger(input.legacyWholeRouteOccupancy) ||
    input.legacyWholeRouteOccupancy < 0
  ) {
    throw new Error("Legacy occupancy must be a non-negative integer.");
  }

  const sequences = [...new Set(input.stopSequences)].sort(
    (a, b) => a - b,
  );

  if (
    sequences.length < 2 ||
    sequences.some((sequence) => !Number.isSafeInteger(sequence))
  ) {
    throw new Error("At least two valid route stop sequences are required.");
  }

  for (const allocation of input.allocations) {
    if (
      !Number.isSafeInteger(allocation.boardingSequence) ||
      !Number.isSafeInteger(allocation.alightingSequence) ||
      allocation.boardingSequence >= allocation.alightingSequence ||
      !isValidPositiveInteger(allocation.passengerCount)
    ) {
      throw new Error("Invalid segment allocation.");
    }
  }

  return sequences;
}

/**
 * Route intervals are half-open:
 * boarding at sequence 1 and alighting at sequence 3 occupies
 * segments 1-2 and 2-3, but not 3-4.
 */
export function calculateSegmentLoads(
  input: SegmentCapacityInput,
  now: Date = new Date(),
): SegmentLoad[] {
  const sequences = validateInput(input);

  const activeAllocations = input.allocations.filter((allocation) =>
    isAllocationActive(allocation, now),
  );

  const result: SegmentLoad[] = [];

  for (let index = 0; index < sequences.length - 1; index += 1) {
    const fromSequence = sequences[index];
    const toSequence = sequences[index + 1];

    const allocatedPassengers = activeAllocations.reduce(
      (total, allocation) => {
        const coversSegment =
          allocation.boardingSequence <= fromSequence &&
          allocation.alightingSequence >= toSequence;

        return total + (coversSegment ? allocation.passengerCount : 0);
      },
      0,
    );

    const occupied =
      input.legacyWholeRouteOccupancy + allocatedPassengers;

    result.push({
      fromSequence,
      toSequence,
      occupied,
      available: Math.max(0, input.capacity - occupied),
    });
  }

  return result;
}

export function getSegmentAvailability(
  input: SegmentCapacityInput,
  boardingSequence: number,
  alightingSequence: number,
  now: Date = new Date(),
): number {
  if (
    !Number.isSafeInteger(boardingSequence) ||
    !Number.isSafeInteger(alightingSequence) ||
    boardingSequence >= alightingSequence
  ) {
    throw new Error("Boarding and alighting stops are invalid.");
  }

  const sequences = [...new Set(input.stopSequences)].sort(
    (a, b) => a - b,
  );

  if (
    !sequences.includes(boardingSequence) ||
    !sequences.includes(alightingSequence)
  ) {
    throw new Error("Boarding and alighting stops must exist on the route.");
  }

  const boardingIndex = sequences.indexOf(boardingSequence);
  const alightingIndex = sequences.indexOf(alightingSequence);

  if (boardingIndex >= alightingIndex) {
    throw new Error("Alighting stop must follow the boarding stop.");
  }

  const loads = calculateSegmentLoads(input, now);

  const covered = loads.filter(
    (segment) =>
      segment.fromSequence >= boardingSequence &&
      segment.toSequence <= alightingSequence,
  );

  if (covered.length !== alightingIndex - boardingIndex) {
    throw new Error("Journey does not cover a complete valid route interval.");
  }

  return Math.min(...covered.map((segment) => segment.available));
}

export function canAllocateSegmentCapacity(
  input: SegmentCapacityInput,
  boardingSequence: number,
  alightingSequence: number,
  passengerCount: number,
  now: Date = new Date(),
): boolean {
  if (!isValidPositiveInteger(passengerCount)) return false;

  return (
    getSegmentAvailability(
      input,
      boardingSequence,
      alightingSequence,
      now,
    ) >= passengerCount
  );
}