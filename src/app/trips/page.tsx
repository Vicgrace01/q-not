import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

async function getUpcomingTrips() {
  // Keep time-dependent work in the data-access helper, not render logic.
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  return prisma.trip.findMany({
    where: {
      status: { in: ["SCHEDULED", "BOARDING"] },
      departureTime: { gte: cutoff },
    },
    orderBy: { departureTime: "asc" },
    include: {
      route: { select: { origin: true, destination: true } },
      bus: { select: { capacity: true, plateNumber: true, vehicleType: true, verificationStatus: true, registrationExpiry: true, insuranceExpiry: true, inspectionExpiry: true } },
      driver: { select: { verificationStatus: true, phoneVerifiedAt: true, licenceExpiry: true, routeApprovals: { where: { status: "APPROVED" }, select: { routeId: true } }, vehicleAssignments: { where: { revokedAt: null }, select: { busId: true } } } },
    },
    take: 100,
  }).then((items) => items.filter((trip) => {
    const now = new Date();
    return trip.bus.verificationStatus === "APPROVED"
      && !!trip.bus.registrationExpiry && trip.bus.registrationExpiry > now
      && !!trip.bus.insuranceExpiry && trip.bus.insuranceExpiry > now
      && !!trip.bus.inspectionExpiry && trip.bus.inspectionExpiry > now
      && !!trip.driver && trip.driver.verificationStatus === "APPROVED"
      && !!trip.driver.phoneVerifiedAt && !!trip.driver.licenceExpiry && trip.driver.licenceExpiry > now
      && trip.driver.routeApprovals.some((approval) => approval.routeId === trip.routeId)
      && trip.driver.vehicleAssignments.some((assignment) => assignment.busId === trip.busId);
  }).slice(0, 50));
}

export default async function TripsPage() {
  const trips = await getUpcomingTrips();

  return (
    <div className="qnot-basic-page qnot-trips-page">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            Q-Not
          </Link>
          <Link
            href="/c/tickets"
            className="text-sm text-neutral-400 hover:text-white"
          >
            My tickets
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold">Available departures</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Browse published departures, compare fares and available seats, then sign in when you are ready to join a queue or reserve a seat.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-neutral-400">Departures are listed from approved vehicles and route records.</p><Link href="/c/requests/new" className="text-sm font-semibold text-lime-300 underline">Request a journey</Link></div>
        {trips.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-800 p-12 text-center">
            <p className="text-neutral-400">No trips scheduled right now.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {trips.map((trip) => {
              const seatsLeft = Math.max(0, trip.bus.capacity - trip.seatsTaken - trip.seatsReserved);
              const departing = trip.departureTime.toLocaleString("en-NG", { timeZone: "Africa/Lagos",
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "short",
              });

              return (
                <li key={trip.id}>
                  <Link
                    href={`/trips/${trip.id}`}
                    className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {trip.route.origin} → {trip.route.destination}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          Departs {departing} · Bus {trip.bus.plateNumber} ·
                          Status: {trip.status.replaceAll("_", " ")}
                        </p>
                      </div>
                      <div className="text-right">
                        {seatsLeft > 0 ? (
                          <p className="text-sm font-medium text-emerald-400">
                            {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left · {trip.fareKobo > 0 ? naira.format(trip.fareKobo / 100) : "Fare pending"}
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-red-400">
                            Full · {trip.fareKobo > 0 ? naira.format(trip.fareKobo / 100) : "Fare pending"}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
