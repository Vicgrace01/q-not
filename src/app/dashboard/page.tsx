import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSessionOperatorId } from "@/lib/session";

export default async function DashboardPage() {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");

  const [operator, routes] = await Promise.all([
    prisma.operator.findUnique({ where: { id: operatorId }, select: { email: true, verificationStatus: true } }),
    prisma.route.findMany({ where: { operatorId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { stops: true, trips: true } } } }),
  ]);
  if (!operator) redirect("/login");
  const admins = (env.QNOT_NETWORK_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  const isNetworkAdmin = admins.includes(operator.email.toLowerCase());
  const canManage = operator.verificationStatus === "APPROVED" || isNetworkAdmin;

  const tripCount = routes.reduce((sum, route) => sum + route._count.trips, 0);
  const stopCount = routes.reduce((sum, route) => sum + route._count.stops, 0);

  return (
    <div className="qnot-dashboard-content">
      <section className="qnot-dashboard-heading">
        <div><span className="qnot-page-eyebrow"><i/> YOUR NETWORK / OVERVIEW</span><h1>Build your <em>route network.</em></h1><p>Set up the corridors your fleet serves. Routes become the foundation for trips, drivers and departures.</p></div>
        {canManage ? <Link href="/dashboard/routes/new" className="qnot-primary-action"><span>＋</span> Create route <i>↗</i></Link> : <span className="rounded-lg border border-amber-400/20 px-4 py-3 text-xs font-bold text-amber-100">Operator review pending</span>}
      </section>

      {!canManage && <section className="mb-6 rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-4 sm:p-5"><span className="text-[10px] font-bold tracking-[.18em] text-amber-200">ACCOUNT / PENDING APPROVAL</span><h2 className="mt-1 text-lg font-bold text-white">Your operator profile needs review.</h2><p className="mt-1 text-sm leading-relaxed text-neutral-300">You can view your profile and existing routes, but route creation, fleet changes and dispatch are locked until a network administrator verifies your organisation and authority to operate. Contact the Q-not network administrator; do not upload sensitive documents through feedback or WhatsApp.</p></section>}

      <section className="qnot-ops-metrics" aria-label="Route network summary">
        <article className="qnot-ops-metric qnot-ops-metric--feature"><span>REGISTERED ROUTES</span><strong>{routes.length.toString().padStart(2, "0")}</strong><small>Corridors in your network</small><i className="qnot-metric-orbit"/></article>
        <article className="qnot-ops-metric"><span>PLANNED TRIPS</span><strong>{tripCount.toString().padStart(2, "0")}</strong><small>Trips attached to your routes</small><i className="qnot-metric-spark">↗</i></article>
        <article className="qnot-ops-metric"><span>REGISTERED STOPS</span><strong>{stopCount.toString().padStart(2, "0")}</strong><small>Stops across your corridors</small><i className="qnot-metric-spark">⌖</i></article>
        <article className="qnot-ops-metric qnot-ops-metric--status"><span>WORKSPACE STATUS</span><strong><i/>{canManage ? " ACTIVE" : " REVIEW PENDING"}</strong><small>{isNetworkAdmin ? "Trusted network administrator" : canManage ? "Operator verification approved" : "Management actions are locked"}</small></article>
      </section>

      {canManage && <section className="qnot-next-step-banner qnot-unn-route-setup"><div><span className="qnot-page-eyebrow">UNN PILOT / EXISTING ROUTE WORKFLOW</span><h3>Configure real campus corridors in the live network.</h3><p>Use the route templates to start, then add surveyed boarding and alighting stops on the route map. Do not publish until UNN and the relevant transport authority have approved the corridor, stop locations, vehicle class and service window.</p><Link href="/dashboard/routes/new#unn-pilot-templates" className="qnot-primary-action">Set up a campus corridor <i>↗</i></Link></div><div className="qnot-next-step-mark"><span>UNN</span><i>01</i></div></section>}

      <section className="qnot-route-board">
        <div className="qnot-section-heading"><div><span className="qnot-page-eyebrow">NETWORK ASSETS / 01</span><h2>Your routes</h2></div><span className="qnot-count-pill">{routes.length} {routes.length === 1 ? "ROUTE" : "ROUTES"}</span></div>
        {routes.length === 0 ? (
          <div className="qnot-route-empty"><div className="qnot-empty-graphic"><span>Q</span><i/><b/></div><span className="qnot-page-eyebrow">YOUR NETWORK STARTS HERE</span><h3>No routes registered yet.</h3><p>{canManage ? "Create your first origin-to-destination corridor. Add real stops and coordinates after saving the route." : "Your first route can be created after operator verification is approved."}</p>{canManage && <Link href="/dashboard/routes/new" className="qnot-primary-action">Create your first route <i>↗</i></Link>}</div>
        ) : (
          <div className="qnot-route-list">{routes.map((route, index) => <Link href={`/dashboard/routes/${route.id}`} className="qnot-route-item" key={route.id}>
            <span className="qnot-route-index">{String(index + 1).padStart(2, "0")}</span><span className="qnot-route-glyph" aria-hidden="true"><i/><b/></span>
            <span className="qnot-route-names"><strong>{route.origin} <i>→</i> {route.destination}</strong><small>Created {route.createdAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", year: "numeric" })}</small></span>
            <span className="qnot-route-count"><strong>{route._count.stops}</strong><small>STOPS</small></span><span className="qnot-route-count"><strong>{route._count.trips}</strong><small>TRIPS</small></span><span className="qnot-route-open">Inspect route <i>↗</i></span>
          </Link>)}</div>
        )}
      </section>

      {canManage && <section className="qnot-next-step-banner"><div><span className="qnot-page-eyebrow">NEXT IN YOUR SETUP</span><h3>Connect the vehicles that move this route.</h3><p>Register actual vehicles, verify documents, attach eligible drivers and publish scheduled departures only when the route is approved for service.</p></div><div className="qnot-next-step-mark"><span>Q</span><i>02</i></div></section>}
    </div>
  );
}
