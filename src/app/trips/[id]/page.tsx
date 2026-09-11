import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCommuterId } from "@/lib/session";
import { JoinButton } from "./join-button";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      route: { select: { origin: true, destination: true } },
      bus: { select: { capacity: true, plateNumber: true } },
    },
  });

  if (!trip) notFound();

  const commuterId = await getCommuterId();
  const seatsLeft = trip.bus.capacity - trip.seatsTaken;

  // Is this commuter already in the queue?
  const existingEntry = commuterId
    ? await prisma.queueEntry.findUnique({
        where: { tripId_commuterId: { tripId: trip.id, commuterId } },
      })
    : null;

  const departing = trip.departureTime.toLocaleString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
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
            ← All trips
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold">
          {trip.route.origin} → {trip.route.destination}
        </h1>

        <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-neutral-400">Departs</dt>
              <dd className="mt-1 font-medium">{departing}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Bus</dt>
              <dd className="mt-1 font-medium">{trip.bus.plateNumber}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Capacity</dt>
              <dd className="mt-1 font-medium">{trip.bus.capacity}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">Seats left</dt>
              <dd
                className={`mt-1 font-medium ${
                  seatsLeft > 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {seatsLeft}
              </dd>
            </div>
          </dl>
        </div>

        {error && (
          <p className="mt-6 rounded bg-red-950 px-4 py-3 text-sm text-red-300">
            {decodeURIComponent(error)}
          </p>
        )}

        <div className="mt-8">
          {existingEntry ? (
            <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-6">
              <p className="text-emerald-200">
                You&apos;re in this queue — position {existingEntry.position}.
              </p>
              <Link
                href="/c/tickets"
                className="mt-3 inline-block text-sm text-white underline"
              >
                View my tickets
              </Link>
            </div>
          ) : seatsLeft === 0 ? (
            <p className="text-neutral-400">
              This trip is full. Try another departure.
            </p>
          ) : !commuterId ? (
            <Link
              href={`/c/login?next=${encodeURIComponent(`/trips/${trip.id}`)}`}
              className="inline-block rounded bg-white px-5 py-3 text-sm font-medium text-neutral-950 hover:bg-neutral-200"
            >
              Sign in to join queue
            </Link>
          ) : (
            <JoinButton tripId={trip.id} />
          )}
        </div>
      </main>
    </div>
  );
}
