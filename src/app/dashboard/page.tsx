import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionOperatorId } from "@/lib/session";

export default async function DashboardPage() {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");

  const routes = await prisma.route.findMany({
    where: { operatorId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { stops: true, trips: true },
      },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Routes</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Manage your bus routes and trips.
          </p>
        </div>
        <Link
          href="/dashboard/routes/new"
          className="rounded bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200"
        >
          New route
        </Link>
      </div>

      {routes.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-neutral-800 p-12 text-center">
          <p className="text-neutral-400">No routes yet.</p>
          <Link
            href="/dashboard/routes/new"
            className="mt-3 inline-block text-sm text-white underline"
          >
            Create your first route
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {routes.map((route) => (
            <li
              key={route.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {route.origin} → {route.destination}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {route._count.stops} stops · {route._count.trips} trips
                  </p>
                </div>
                <Link
                  href={`/dashboard/routes/${route.id}`}
                  className="text-sm text-neutral-400 hover:text-white"
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
