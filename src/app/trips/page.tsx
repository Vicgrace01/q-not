import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const trips = await prisma.trip.findMany({
    where: {
      status: { in: ["SCHEDULED", "BOARDING"] },
      departureTime: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    orderBy: { departureTime: "asc" },
    include: {
      route: { select: { origin: true, destination: true } },
      bus: { select: { capacity: true, plateNumber: true } },
    },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
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
        <h1 className="text-2xl font-semibold">Live trips</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Browse departures. No app, no account — sign in only when you join a
          queue.
        </p>

        {trips.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-800 p-12 text-center">
            <p className="text-neutral-400">No trips scheduled right now.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {trips.map((trip) => {
              const seatsLeft = trip.bus.capacity - trip.seatsTaken;
              const departing = trip.departureTime.toLocaleString("en-NG", {
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
                          Status: {trip.status}
                        </p>
                      </div>
                      <div className="text-right">
                        {seatsLeft > 0 ? (
                          <p className="text-sm font-medium text-emerald-400">
                            {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-red-400">
                            Full
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
