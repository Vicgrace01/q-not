import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionOperatorId } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth";
import { QNotBrand } from "@/components/qnot-brand";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operatorId = await getSessionOperatorId();
  if (!operatorId) redirect("/login");

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { id: true, name: true, email: true },
  });

  if (!operator) redirect("/login");

  return (
    <div className="qnot-operator-workspace">
      <aside className="qnot-ops-sidebar">
        <div className="qnot-ops-brand"><QNotBrand /></div>
        <div className="qnot-ops-org">
          <span className="qnot-ops-org-mark">{operator.name.slice(0, 1).toUpperCase()}</span>
          <span><strong>{operator.name}</strong><small>OPERATOR ACCOUNT</small></span>
        </div>
        <nav className="qnot-ops-nav" aria-label="Operator navigation">
          <span className="qnot-ops-nav-label">WORKSPACE</span>
          <Link href="/dashboard" className="is-active"><span className="qnot-nav-glyph">⌁</span> Routes overview <i>01</i></Link>
          <Link href="/dashboard/routes/new"><span className="qnot-nav-glyph">＋</span> Create a route</Link>
          <span className="qnot-ops-nav-label qnot-ops-nav-label--spaced">Q-NOT NETWORK</span>
          <Link href="/dashboard/fleet"><span className="qnot-nav-glyph">▦</span> Fleet & drivers</Link>
          <Link href="/network/dispatch"><span className="qnot-nav-glyph">⌖</span> Network dispatch</Link>
          <Link href="/network/verification"><span className="qnot-nav-glyph">✓</span> Verification review</Link>
          <Link href="/trips"><span className="qnot-nav-glyph">⌖</span> Public departures</Link>
        </nav>
        <div className="qnot-ops-sidebar-bottom">
          <div className="qnot-connection-card"><span className="qnot-connection-dot"/><div><strong>Workspace connected</strong><small>Account session active</small></div></div>
          <form action={logoutAction}>
            <button className="qnot-signout" type="submit"><span>↗</span> Sign out</button>
          </form>
          <small className="qnot-ops-version">Q-NOT OPERATIONS · PRIVATE WORKSPACE</small>
        </div>
      </aside>

      <div className="qnot-ops-main">
        <header className="qnot-ops-topbar">
          <div><span>OPERATIONS / WORKSPACE</span><strong>Terminal intelligence</strong></div>
          <div className="qnot-ops-topbar-right">
            <span className="qnot-topbar-status"><i/> ACCOUNT ACTIVE</span>
            <div className="qnot-operator-avatar">{operator.name.slice(0, 1).toUpperCase()}</div>
            <span className="qnot-operator-identity"><strong>{operator.name}</strong><small>{operator.email}</small></span>
          </div>
        </header>
        <main className="qnot-ops-content">{children}</main>
        <footer className="qnot-ops-footer"><span>Q-NOT / OPERATIONS INTELLIGENCE</span><span>Make every departure count.</span></footer>
      </div>
    </div>
  );
}
