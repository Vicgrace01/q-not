import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { cancelQueueEntryTx } from "@/lib/queue/cancel";
import { createPaystackReference, isDefinitivePaystackInitializationRejection, releasePendingTripPayment } from "@/lib/payments/paystack";
import { saveDriverLocationTx, setDriverLocationSharingTx } from "@/lib/driver/location-sharing";
import { createCommuter, createTripWithCapacity, resetDb } from "./helpers/db";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function pause(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createCalledEntry(tripId: string, commuterId: string) {
  return prisma.queueEntry.create({
    data: { tripId, commuterId, position: 1, status: "CALLED" },
  });
}

describe("operational race protections", () => {
  beforeAll(async () => { await prisma.$connect(); }, 30_000);
  beforeEach(async () => { await resetDb(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("generates transaction references accepted by Paystack", () => {
    const reference = createPaystackReference();
    expect(reference).toMatch(/^qnot-[0-9]+-[a-f0-9]{10}$/i);
    expect(reference).toMatch(/^[a-z0-9.=-]+$/i);
  });

  it("distinguishes definitive Paystack rejections from ambiguous outcomes", () => {
    expect(isDefinitivePaystackInitializationRejection(400, false)).toBe(true);
    expect(isDefinitivePaystackInitializationRejection(401)).toBe(true);
    expect(isDefinitivePaystackInitializationRejection(200, false)).toBe(true);
    expect(isDefinitivePaystackInitializationRejection(408)).toBe(false);
    expect(isDefinitivePaystackInitializationRejection(409)).toBe(false);
    expect(isDefinitivePaystackInitializationRejection(500, false)).toBe(false);
  });

  it("releases a rejected pending Paystack seat hold exactly once", async () => {
    const trip = await createTripWithCapacity(1);
    const commuter = await createCommuter();
    const reference = createPaystackReference();
    await prisma.trip.update({ where: { id: trip.id }, data: { seatsReserved: 1 } });
    await prisma.payment.create({
      data: {
        commuterId: commuter.id,
        tripId: trip.id,
        provider: "PAYSTACK",
        reference,
        amountKobo: 250_000,
        currency: "NGN",
        status: "PENDING",
        purpose: "TRIP_FARE",
        expiresAt: new Date(Date.now() + 8 * 60_000),
      },
    });

    await Promise.all([
      releasePendingTripPayment(reference),
      releasePendingTripPayment(reference),
    ]);

    const [payment, finalTrip] = await Promise.all([
      prisma.payment.findUnique({ where: { reference }, select: { status: true } }),
      prisma.trip.findUnique({ where: { id: trip.id }, select: { seatsReserved: true } }),
    ]);
    expect(payment?.status).toBe("FAILED");
    expect(finalTrip?.seatsReserved).toBe(0);
  });

  it("does not let cancellation overwrite a cash-confirmed queue entry", async () => {
    const trip = await createTripWithCapacity(1);
    const commuter = await createCommuter();
    const entry = await createCalledEntry(trip.id, commuter.id);
    await prisma.trip.update({ where: { id: trip.id }, data: { fareKobo: 250_000 } });

    const cashLockHeld = deferred();
    const releaseCash = deferred();
    const cashAcceptance = prisma.$transaction(async (tx) => {
      // This is the same parent-trip lock used by acceptCashFareAction.
      await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${trip.id} FOR UPDATE`;
      cashLockHeld.resolve();
      await releaseCash.promise;

      const called = await tx.queueEntry.findFirst({
        where: { id: entry.id, tripId: trip.id, status: "CALLED" },
      });
      if (!called) return false;

      await tx.payment.create({
        data: {
          commuterId: commuter.id,
          tripId: trip.id,
          provider: "CASH",
          reference: `qnot_cash_test_${Date.now()}`,
          amountKobo: 250_000,
          currency: "NGN",
          status: "SUCCEEDED",
          purpose: "TRIP_FARE",
          paidAt: new Date(),
        },
      });
      await tx.queueEntry.update({ where: { id: entry.id }, data: { status: "CONFIRMED", resolvedAt: null } });
      await tx.ticket.create({
        data: { tripId: trip.id, commuterId: commuter.id, code: `QN-${Date.now().toString(16).padStart(10, "0").slice(-10).toUpperCase()}` },
      });
      await tx.trip.update({ where: { id: trip.id }, data: { seatsReserved: { increment: 1 } } });
      return true;
    });

    await cashLockHeld.promise;
    const cancellation = cancelQueueEntryTx(trip.id, commuter.id);
    // Give the cancellation transaction time to queue on the trip row lock.
    await pause(100);
    releaseCash.resolve();

    expect(await cashAcceptance).toBe(true);
    expect(await cancellation).toBe(false);

    const [finalEntry, paymentCount, ticketCount, finalTrip] = await Promise.all([
      prisma.queueEntry.findUnique({ where: { id: entry.id } }),
      prisma.payment.count({ where: { tripId: trip.id, commuterId: commuter.id, status: "SUCCEEDED" } }),
      prisma.ticket.count({ where: { tripId: trip.id, commuterId: commuter.id, status: "ISSUED" } }),
      prisma.trip.findUnique({ where: { id: trip.id } }),
    ]);
    expect(finalEntry?.status).toBe("CONFIRMED");
    expect(paymentCount).toBe(1);
    expect(ticketCount).toBe(1);
    expect(finalTrip?.seatsReserved).toBe(1);
  }, 30_000);

  it("does not create a payment or ticket when cancellation wins before cash acceptance", async () => {
    const trip = await createTripWithCapacity(1);
    const commuter = await createCommuter();
    const entry = await createCalledEntry(trip.id, commuter.id);

    expect(await cancelQueueEntryTx(trip.id, commuter.id)).toBe(true);
    const accepted = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${trip.id} FOR UPDATE`;
      const called = await tx.queueEntry.findFirst({ where: { id: entry.id, status: "CALLED" } });
      return Boolean(called);
    });

    expect(accepted).toBe(false);
    expect(await prisma.payment.count({ where: { tripId: trip.id } })).toBe(0);
    expect(await prisma.ticket.count({ where: { tripId: trip.id } })).toBe(0);
    expect((await prisma.trip.findUnique({ where: { id: trip.id } }))?.seatsReserved).toBe(0);
  });


  it("does not cancel a queue entry while an online fare payment is still pending", async () => {
    const trip = await createTripWithCapacity(1);
    const commuter = await createCommuter();
    const entry = await createCalledEntry(trip.id, commuter.id);
    await prisma.trip.update({ where: { id: trip.id }, data: { seatsReserved: 1 } });
    await prisma.payment.create({
      data: {
        commuterId: commuter.id,
        tripId: trip.id,
        provider: "PAYSTACK",
        reference: `qnot_pending_test_${Date.now()}`,
        amountKobo: 250_000,
        currency: "NGN",
        status: "PENDING",
        purpose: "TRIP_FARE",
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });

    expect(await cancelQueueEntryTx(trip.id, commuter.id)).toBe(false);
    expect((await prisma.queueEntry.findUnique({ where: { id: entry.id } }))?.status).toBe("CALLED");
    expect((await prisma.trip.findUnique({ where: { id: trip.id } }))?.seatsReserved).toBe(1);
  });

  it("keeps GPS sharing off when an in-flight location POST finishes before Stop commits", async () => {
    const trip = await createTripWithCapacity(4);
    if (!trip.driverId) throw new Error("Test trip has no driver.");
    await prisma.trip.update({ where: { id: trip.id }, data: { status: "IN_TRANSIT" } });
    await prisma.driverSession.create({ data: { tripId: trip.id, driverId: trip.driverId, status: "ACTIVE" } });
    expect(await prisma.$transaction((tx) => setDriverLocationSharingTx(tx, trip.id, trip.driverId!, true))).toBe(true);

    const postHasSaved = deferred();
    const allowPostCommit = deferred();
    const capturedAt = new Date(Date.now() - 1_000);
    const inFlightPost = prisma.$transaction(async (tx) => {
      const result = await saveDriverLocationTx(tx, {
        tripId: trip.id,
        driverId: trip.driverId!,
        capturedAt,
        latitude: 6.8571,
        longitude: 7.3958,
        accuracyMeters: 12,
      });
      expect(result).toEqual({ ok: true });
      postHasSaved.resolve();
      await allowPostCommit.promise;
    });

    await postHasSaved.promise;
    const stopRequest = prisma.$transaction((tx) => setDriverLocationSharingTx(tx, trip.id, trip.driverId!, false));
    await pause(100);
    allowPostCommit.resolve();
    await inFlightPost;
    expect(await stopRequest).toBe(true);

    const session = await prisma.driverSession.findFirst({ where: { tripId: trip.id, driverId: trip.driverId } });
    expect(session?.locationSharingEnabled).toBe(false);
    expect(session?.lastLat).toBeNull();
    expect(session?.lastLng).toBeNull();

    const latePost = await prisma.$transaction((tx) => saveDriverLocationTx(tx, {
      tripId: trip.id,
      driverId: trip.driverId!,
      capturedAt: new Date(Date.now() + 1_000),
      latitude: 6.9,
      longitude: 7.4,
    }));
    expect(latePost).toEqual({ ok: false, reason: "sharing-stopped" });
  }, 30_000);

  it("rejects a location POST after the driver has stopped sharing", async () => {
    const trip = await createTripWithCapacity(4);
    if (!trip.driverId) throw new Error("Test trip has no driver.");
    await prisma.trip.update({ where: { id: trip.id }, data: { status: "IN_TRANSIT" } });
    await prisma.driverSession.create({ data: { tripId: trip.id, driverId: trip.driverId, status: "ACTIVE" } });
    await prisma.$transaction((tx) => setDriverLocationSharingTx(tx, trip.id, trip.driverId!, true));
    await prisma.$transaction((tx) => setDriverLocationSharingTx(tx, trip.id, trip.driverId!, false));

    const result = await prisma.$transaction((tx) => saveDriverLocationTx(tx, {
      tripId: trip.id,
      driverId: trip.driverId!,
      capturedAt: new Date(),
      latitude: 6.8571,
      longitude: 7.3958,
    }));
    expect(result).toEqual({ ok: false, reason: "sharing-stopped" });
  });
});
