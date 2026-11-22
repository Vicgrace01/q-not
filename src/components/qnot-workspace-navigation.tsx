"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type QNotWorkspaceRole = "passenger" | "driver" | "operator" | "network";

type DockItem = {
  href: string;
  label: string;
  icon: string;
  matches?: (pathname: string) => boolean;
};

const DOCK_ITEMS: Record<QNotWorkspaceRole, DockItem[]> = {
  passenger: [
    { href: "/c/dashboard", label: "Home", icon: "⌂", matches: (path) => path === "/c/dashboard" },
    { href: "/trips", label: "Find", icon: "⌖" },
    { href: "/c/requests", label: "Plans", icon: "⇄" },
    { href: "/c/tickets", label: "Passes", icon: "▣" },
    { href: "/c/q-funds", label: "Funds", icon: "₦" },
    { href: "/c/profile", label: "Profile", icon: "◉" },
  ],
  driver: [
    { href: "/driver/dashboard", label: "Overview", icon: "⌂", matches: (path) => path === "/driver/dashboard" },
    { href: "/driver/onboarding", label: "Vehicles", icon: "▦" },
    { href: "/driver/profile", label: "Profile", icon: "◉" },
    { href: "/drive", label: "Drive portal", icon: "↗" },
  ],
  operator: [
    { href: "/dashboard", label: "Routes", icon: "⌁", matches: (path) => path === "/dashboard" || (path.startsWith("/dashboard/routes/") && path !== "/dashboard/routes/new") },
    { href: "/dashboard/fleet", label: "Fleet", icon: "▦" },
    { href: "/network/dispatch", label: "Dispatch", icon: "⌖" },
    { href: "/network/verification", label: "Reviews", icon: "✓" },
    { href: "/trips", label: "Departures", icon: "⇢" },
    { href: "/dashboard/profile", label: "Profile", icon: "◉" },
  ],
  network: [
    { href: "/network/dispatch", label: "Dispatch", icon: "⌖" },
    { href: "/network/verification", label: "Reviews", icon: "✓" },
    { href: "/dashboard", label: "Operator", icon: "▦" },
    { href: "/trips", label: "Departures", icon: "⇢" },
  ],
};

function itemIsActive(item: DockItem, pathname: string): boolean {
  if (item.matches) return item.matches(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function QNotWorkspaceDock({ role }: { role: QNotWorkspaceRole }) {
  const pathname = usePathname();
  const items = DOCK_ITEMS[role];

  return (
    <nav className={`qnot-workspace-dock qnot-workspace-dock--${role}`} aria-label={`${role} workspace`}>
      {items.map((item) => {
        const active = itemIsActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : undefined}
          >
            <span className="qnot-workspace-dock-icon" aria-hidden="true">{item.icon}</span>
            <span className="qnot-workspace-dock-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function QNotWorkspaceNavigation({ role }: { role: "passenger" | "operator" }) {
  const pathname = usePathname();

  if (role === "passenger") {
    const items: DockItem[] = [
      { href: "/trips", label: "Find a bus", icon: "⌖" },
      { href: "/c/requests", label: "Journey requests", icon: "⇄" },
      { href: "/c/tickets", label: "My journeys", icon: "▣" },
      { href: "/c/q-funds", label: "Q-Funds", icon: "₦" },
      { href: "/c/profile", label: "Safety & profile", icon: "◉" },
    ];

    return (
      <nav className="qnot-passenger-nav" aria-label="Passenger navigation">
        {items.map((item) => {
          const active = itemIsActive(item, pathname);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>{item.label}</Link>;
        })}
      </nav>
    );
  }

  const items: DockItem[] = [
    { href: "/dashboard", label: "Routes overview", icon: "⌁", matches: (path) => path === "/dashboard" || (path.startsWith("/dashboard/routes/") && path !== "/dashboard/routes/new") },
    { href: "/dashboard/routes/new", label: "Create a route", icon: "＋", matches: (path) => path === "/dashboard/routes/new" || path.startsWith("/dashboard/routes/new/") },
    { href: "/dashboard/fleet", label: "Fleet & drivers", icon: "▦" },
    { href: "/network/dispatch", label: "Network dispatch", icon: "⌖" },
    { href: "/network/verification", label: "Verification review", icon: "✓" },
    { href: "/trips", label: "Public departures", icon: "⇢" },
    { href: "/dashboard/profile", label: "Operator profile", icon: "◉" },
  ];

  return (
    <nav className="qnot-ops-nav" aria-label="Operator navigation">
      <span className="qnot-ops-nav-label">WORKSPACE</span>
      {items.slice(0, 3).map((item) => {
        const active = itemIsActive(item, pathname);
        return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}><span className="qnot-nav-glyph">{item.icon}</span>{item.label}</Link>;
      })}
      <span className="qnot-ops-nav-label qnot-ops-nav-label--spaced">Q-NOT NETWORK</span>
      {items.slice(3, 6).map((item) => {
        const active = itemIsActive(item, pathname);
        return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}><span className="qnot-nav-glyph">{item.icon}</span>{item.label}</Link>;
      })}
      <span className="qnot-ops-nav-label qnot-ops-nav-label--spaced">ACCOUNT</span>
      {items.slice(6).map((item) => {
        const active = itemIsActive(item, pathname);
        return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}><span className="qnot-nav-glyph">{item.icon}</span>{item.label}</Link>;
      })}
    </nav>
  );
}
