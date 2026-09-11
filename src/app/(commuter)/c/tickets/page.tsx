import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MyTicketsPage() {
  const commuterId = await getCommuterId();
  if (!commuterId) redirect("/c/login?next=%2Fc%2Ftickets");

  const entries = await prisma.queueEntry.findMany({
    where: { commuterId },
    orderBy: { joinedAt: "desc" },
    include: {
      trip: {
        include: {
          route: { select: { origin: true, destination: true } },
          bus: { select: { plateNumber: true } },
        },
      },
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
            href="/trips"
            className="text-sm text-neutral-400 hover:text-white"
          >
            Browse trips
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold">My queue entries</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Everything you&apos;ve joined. Tickets are issued when a bus seats you.
        </p>

        {entries.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-neutral-800 p-12 text-center">
            <p className="text-neutral-400">You haven&apos;t joined any queues yet.</p>
            <Link
              href="/trips"
              className="mt-3 inline-block text-sm text-white underline"
            >
              Browse trips
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {entry.trip.route.origin} → {entry.trip.route.destination}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Bus {entry.trip.bus.plateNumber} · position{" "}
                      {entry.position} · status {entry.status}
                    </p>
                  </div>
                  <Link
                    href={`/trips/${entry.trip.id}`}
                    className="text-sm text-neutral-400 hover:text-white"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
