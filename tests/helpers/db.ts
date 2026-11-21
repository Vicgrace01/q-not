import { prisma } from "@/lib/db";
import { assertSafeTestDatabase } from "./test-database-guard";

export async function resetDb(): Promise<void> {
  // Fail closed before the first DELETE. .env.test must explicitly allowlist
  // the dedicated test branch and database; a comment is not a safety guard.
  assertSafeTestDatabase();
  // Order matters: children before parents.
  await prisma.ticket.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.journeyRequest.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.authIdentity.deleteMany();
  await prisma.driverVerification.deleteMany();
  await prisma.driverRouteApproval.deleteMany();
  await prisma.driverVehicleAssignment.deleteMany();
  await prisma.tapEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.driverSession.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.route.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.commuter.deleteMany();
  await prisma.operator.deleteMany();
}

let phoneCounter = 0;
function nextPhone(): string {
  phoneCounter += 1;
  return `+2349000${String(phoneCounter).padStart(6, "0")}`;
}

export async function createCommuter() {
  return prisma.commuter.create({
    data: { phone: nextPhone() },
  });
}

export async function createOperator() {
  return prisma.operator.create({
    data: {
      name: "Test Operator",
      email: `op-${Date.now()}-${Math.random()}@test.dev`,
      phone: nextPhone(),
      passwordHash: "not-a-real-hash",
    },
  });
}

export async function createTripWithCapacity(capacity: number) {
  const now = new Date();
  const future = new Date(now.getTime() + 365 * 24 * 60 * 60_000);
  const operator = await createOperator();
  const route = await prisma.route.create({
    data: { operatorId: operator.id, origin: "Nsukka", destination: "Enugu" },
  });
  const driver = await prisma.driver.create({
    data: {
      operatorId: operator.id,
      name: "Approved Test Driver",
      phone: nextPhone(),
      phoneVerifiedAt: now,
      verificationStatus: "APPROVED",
      licenceExpiry: future,
    },
  });
  const bus = await prisma.bus.create({
    data: {
      operatorId: operator.id,
      plateNumber: `T-${Date.now()}-${phoneCounter}`,
      capacity,
      verificationStatus: "APPROVED",
      registrationExpiry: future,
      insuranceExpiry: future,
      inspectionExpiry: future,
    },
  });
  await prisma.driverVehicleAssignment.create({ data: { driverId: driver.id, busId: bus.id } });
  await prisma.driverRouteApproval.create({ data: { driverId: driver.id, routeId: route.id, status: "APPROVED", reviewedAt: now } });
  const trip = await prisma.trip.create({
    data: {
      routeId: route.id,
      busId: bus.id,
      operatorId: operator.id,
      driverId: driver.id,
      departureTime: new Date(Date.now() + 3600_000),
      status: "BOARDING",
      seatsTaken: 0,
      seatsReserved: 0,
    },
  });
  return trip;
}
