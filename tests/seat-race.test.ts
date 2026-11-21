import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { joinQueueTx } from "@/lib/queue/join";
import { resetDb, createCommuter, createTripWithCapacity } from "./helpers/db";

describe("virtual departure queue", () => {
  beforeAll(async () => { await prisma.$connect(); }, 30_000);
  beforeEach(async () => { await resetDb(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("accepts route demand without consuming physical seats", async () => {
    const trip = await createTripWithCapacity(1);
    const commuters = await Promise.all(Array.from({ length: 3 }, () => createCommuter()));
    const results = await Promise.all(commuters.map((commuter) => joinQueueTx(commuter.id, trip.id)));
    expect(results.every((result) => result.ok)).toBe(true);
    const finalTrip = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(finalTrip?.seatsTaken).toBe(0);
    expect(finalTrip?.seatsReserved).toBe(0);
    const entries = await prisma.queueEntry.findMany({ where: { tripId: trip.id }, orderBy: { position: "asc" } });
    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.position)).toEqual([1, 2, 3]);
  });

  it("prevents the same commuter from joining twice under concurrent requests", async () => {
    const trip = await createTripWithCapacity(5);
    const commuter = await createCommuter();
    const [first, second] = await Promise.all([joinQueueTx(commuter.id, trip.id), joinQueueTx(commuter.id, trip.id)]);
    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second].filter((result) => !result.ok)).toHaveLength(1);
    expect([first, second].some((result) => !result.ok && result.reason === "already-queued")).toBe(true);
    const entries = await prisma.queueEntry.findMany({ where: { tripId: trip.id } });
    expect(entries).toHaveLength(1);
  });

  it("does not accept passengers after departure", async () => {
    const trip = await createTripWithCapacity(5);
    await prisma.trip.update({ where: { id: trip.id }, data: { status: "IN_TRANSIT" } });
    const commuter = await createCommuter();
    expect(await joinQueueTx(commuter.id, trip.id)).toMatchObject({ ok: false, reason: "trip-not-boarding" });
  });
});
