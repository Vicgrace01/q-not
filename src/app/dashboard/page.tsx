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
    include: { _count: { select: { stops: true, trips: true } } },
  });

  const tripCount = routes.reduce((sum, route) => sum + route._count.trips, 0);
  const stopCount = routes.reduce((sum, route) => sum + route._count.stops, 0);

  return (
    <div className="qnot-dashboard-content">
      <section className="qnot-dashboard-heading">
        <div>
          <span className="qnot-page-eyebrow"><i/> YOUR NETWORK / OVERVIEW</span>
          <h1>Build your <em>route network.</em></h1>
          <p>Set up the corridors your fleet serves. Your routes become the foundation for trips, drivers and departures.</p>
        </div>
        <Link href="/dashboard/routes/new" className="qnot-primary-action"><span>＋</span> Create route <i>↗</i></Link>
      </section>

      <section className="qnot-ops-metrics" aria-label="Route network summary">
        <article className="qnot-ops-metric qnot-ops-metric--feature"><span>REGISTERED ROUTES</span><strong>{routes.length.toString().padStart(2, "0")}</strong><small>Corridors in your network</small><i className="qnot-metric-orbit"/></article>
        <article className="qnot-ops-metric"><span>PLANNED TRIPS</span><strong>{tripCount.toString().padStart(2, "0")}</strong><small>Trips attached to your routes</small><i className="qnot-metric-spark">↗</i></article>
        <article className="qnot-ops-metric"><span>REGISTERED STOPS</span><strong>{stopCount.toString().padStart(2, "0")}</strong><small>Stops across your corridors</small><i className="qnot-metric-spark">⌖</i></article>
        <article className="qnot-ops-metric qnot-ops-metric--status"><span>WORKSPACE STATUS</span><strong><i/> ACTIVE</strong><small>Your operator session is secure</small></article>
      </section>

      <section className="qnot-route-board">
        <div className="qnot-section-heading">
          <div><span className="qnot-page-eyebrow">NETWORK ASSETS / 01</span><h2>Your routes</h2></div>
          <span className="qnot-count-pill">{routes.length} {routes.length === 1 ? "ROUTE" : "ROUTES"}</span>
        </div>

        {routes.length === 0 ? (
          <div className="qnot-route-empty">
            <div className="qnot-empty-graphic"><span>Q</span><i/><b/></div>
            <span className="qnot-page-eyebrow">YOUR NETWORK STARTS HERE</span>
            <h3>No routes registered yet.</h3>
            <p>Create your first origin-to-destination corridor. You can add stops and attach trips after the route is saved.</p>
            <Link href="/dashboard/routes/new" className="qnot-primary-action">Create your first route <i>↗</i></Link>
          </div>
        ) : (
          <div className="qnot-route-list">
            {routes.map((route, index) => (
              <Link href={`/dashboard/routes/${route.id}`} className="qnot-route-item" key={route.id}>
                <span className="qnot-route-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="qnot-route-glyph" aria-hidden="true"><i/><b/></span>
                <span className="qnot-route-names"><strong>{route.origin} <i>→</i> {route.destination}</strong><small>Created {route.createdAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", year: "numeric" })}</small></span>
                <span className="qnot-route-count"><strong>{route._count.stops}</strong><small>STOPS</small></span>
                <span className="qnot-route-count"><strong>{route._count.trips}</strong><small>TRIPS</small></span>
                <span className="qnot-route-open">Inspect route <i>↗</i></span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="qnot-next-step-banner">
        <div><span className="qnot-page-eyebrow">NEXT IN YOUR SETUP</span><h3>Connect the vehicles that move this route.</h3><p>After defining your corridors, register vehicles and create scheduled trips to make them available to passengers.</p></div>
        <div className="qnot-next-step-mark"><span>Q</span><i>02</i></div>
      </section>
    </div>
  );
}
