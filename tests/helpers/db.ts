import { prisma } from "@/lib/db";

export async function resetDb(): Promise<void> {
  // Order matters: children before parents.
  await prisma.ticket.deleteMany();
  await prisma.queueEntry.deleteMany();
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
  const operator = await createOperator();
  const route = await prisma.route.create({
    data: { operatorId: operator.id, origin: "Nsukka", destination: "Enugu" },
  });
  const bus = await prisma.bus.create({
    data: { operatorId: operator.id, plateNumber: `T-${Date.now()}`, capacity },
  });
  const trip = await prisma.trip.create({
    data: {
      routeId: route.id,
      busId: bus.id,
      operatorId: operator.id,
      departureTime: new Date(Date.now() + 3600_000),
      status: "BOARDING",
      seatsTaken: 0,
    },
  });
  return trip;
}
