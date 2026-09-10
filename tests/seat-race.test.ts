import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { joinQueueTx } from "@/lib/queue/join";
import {
  resetDb,
  createCommuter,
  createTripWithCapacity,
} from "./helpers/db";

describe("seat race", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("seats exactly one commuter when two race for the last seat", async () => {
    const trip = await createTripWithCapacity(1); // capacity = 1
    const c1 = await createCommuter();
    const c2 = await createCommuter();

    // Fire both requests at the same time.
    // `Promise.all` starts both before either resolves.
    const [r1, r2] = await Promise.all([
      joinQueueTx(c1.id, trip.id),
      joinQueueTx(c2.id, trip.id),
    ]);

    const winners = [r1, r2].filter((r) => r.ok);
    const losers = [r1, r2].filter((r) => !r.ok);

    // Exactly one winner. This is the whole point of the test.
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);

    // The loser failed because the seat was gone.
    expect(losers[0]).toMatchObject({ ok: false, reason: "no-seats" });

    // The database agrees: exactly one seat taken.
    const finalTrip = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(finalTrip?.seatsTaken).toBe(1);

    // And exactly one QueueEntry exists.
    const entries = await prisma.queueEntry.findMany({ where: { tripId: trip.id } });
    expect(entries).toHaveLength(1);
  });

  it("seats N commuters out of M > N racing requests", async () => {
    const CAPACITY = 5;
    const RACERS = 12;

    const trip = await createTripWithCapacity(CAPACITY);
    const commuters = await Promise.all(
      Array.from({ length: RACERS }, () => createCommuter()),
    );

    const results = await Promise.all(
      commuters.map((c) => joinQueueTx(c.id, trip.id)),
    );

    const winners = results.filter((r) => r.ok);
    const seatLosers = results.filter(
      (r) => !r.ok && r.reason === "no-seats",
    );

    expect(winners).toHaveLength(CAPACITY);
    expect(seatLosers).toHaveLength(RACERS - CAPACITY);

    const finalTrip = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(finalTrip?.seatsTaken).toBe(CAPACITY);
  });

  it("prevents the same commuter from joining twice", async () => {
    const trip = await createTripWithCapacity(5);
    const commuter = await createCommuter();

    const first = await joinQueueTx(commuter.id, trip.id);
    const second = await joinQueueTx(commuter.id, trip.id);

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, reason: "already-queued" });

    const finalTrip = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(finalTrip?.seatsTaken).toBe(1);
  });
});
