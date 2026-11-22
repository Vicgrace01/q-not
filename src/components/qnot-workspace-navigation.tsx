"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "search" | "routes" | "ticket" | "wallet" | "user" | "vehicle" | "steering" | "finance" | "shield" | "departures" | "add";
type DockItem = {
  href: string;
  label: string;
  icon: IconName;
  matches?: (pathname: string) => boolean;
};

const ICON_PATHS: Record<IconName, string[]> = {
  home: ["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5", "M9 21v-7h6v7"],
  search: ["M10.8 18a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z", "m16.2 16.2 4.3 4.3"],
  routes: ["M5 5h.01", "M19 19h.01", "M5 5c0 7 14 2 14 14", "M5 5v.01", "M19 19v.01"],
  ticket: ["M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z", "M13 6v12"],
  wallet: ["M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z", "M4 7h16", "M15 12h2"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  vehicle: ["M3 7h18l2 10H1L3 7Z", "M5 17v2", "M19 17v2", "M7 11h10", "M6 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", "M18 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"],
  steering: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M3.5 9h17", "M12 9v12", "M6 5.5c1.4 2 3.4 3.5 6 3.5s4.6-1.5 6-3.5"],
  finance: ["M3 3v18h18", "m7 14 4-4 3 3 6-7"],
  shield: ["M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z", "m9 12 2 2 4-4"],
  departures: ["M4 12h15", "m13 5 7 7-7 7"],
  add: ["M12 5v14", "M5 12h14"],
};

function WorkspaceIcon({ name }: { name: IconName }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICON_PATHS[name].map((path, index) => <path key={`${name}-${index}`} d={path} />)}</svg>;
}

const DOCK_ITEMS: Record<"passenger" | "driver" | "operator" | "network", DockItem[]> = {
  passenger: [
    { href: "/c/dashboard", label: "Home", icon: "home", matches: (path) => path === "/c/dashboard" },
    { href: "/trips", label: "Find", icon: "search" },
    { href: "/c/requests", label: "Plans", icon: "routes" },
    { href: "/c/tickets", label: "Passes", icon: "ticket" },
    { href: "/c/q-funds", label: "Funds", icon: "wallet" },
    { href: "/c/profile", label: "Profile", icon: "user" },
  ],
  driver: [
    { href: "/driver/dashboard", label: "Overview", icon: "home", matches: (path) => path === "/driver/dashboard" },
    { href: "/driver/onboarding", label: "Vehicles", icon: "vehicle" },
    { href: "/driver/profile", label: "Profile", icon: "user" },
    { href: "/drive", label: "Drive portal", icon: "steering" },
  ],
  operator: [
    { href: "/dashboard", label: "Routes", icon: "routes", matches: (path) => path === "/dashboard" || (path.startsWith("/dashboard/routes/") && path !== "/dashboard/routes/new") },
    { href: "/dashboard/routes/new", label: "New route", icon: "add", matches: (path) => path === "/dashboard/routes/new" || path.startsWith("/dashboard/routes/new/") },
    { href: "/dashboard/fleet", label: "Fleet", icon: "vehicle" },
    { href: "/dashboard/finance", label: "Finance", icon: "finance" },
    { href: "/network/dispatch", label: "Dispatch", icon: "search" },
    { href: "/network/verification", label: "Reviews", icon: "shield" },
    { href: "/trips", label: "Departures", icon: "departures" },
    { href: "/dashboard/profile", label: "Profile", icon: "user" },
  ],
  network: [
    { href: "/network/dispatch", label: "Dispatch", icon: "search" },
    { href: "/network/verification", label: "Reviews", icon: "shield" },
    { href: "/dashboard", label: "Operator", icon: "vehicle" },
    { href: "/trips", label: "Departures", icon: "departures" },
  ],
};

function itemIsActive(item: DockItem, pathname: string): boolean {
  if (item.matches) return item.matches(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function QNotWorkspaceDock({ role }: { role: "passenger" | "driver" | "operator" | "network" }) {
  const pathname = usePathname();
  const items = DOCK_ITEMS[role];

  return (
    <nav className={`qnot-workspace-dock qnot-workspace-dock--${role}`} aria-label={`${role} workspace`}>
      {items.map((item) => {
        const active = itemIsActive(item, pathname);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>
            <span className="qnot-workspace-dock-icon"><WorkspaceIcon name={item.icon} /></span>
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
      { href: "/trips", label: "Find a bus", icon: "search" },
      { href: "/c/requests", label: "Journey requests", icon: "routes" },
      { href: "/c/tickets", label: "My journeys", icon: "ticket" },
      { href: "/c/q-funds", label: "Q-Funds", icon: "wallet" },
      { href: "/c/profile", label: "Safety & profile", icon: "user" },
    ];

    return (
      <nav className="qnot-passenger-nav" aria-label="Passenger navigation">
        {items.map((item) => {
          const active = itemIsActive(item, pathname);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}><span className="qnot-nav-glyph"><WorkspaceIcon name={item.icon} /></span><span>{item.label}</span></Link>;
        })}
      </nav>
    );
  }

  const items: DockItem[] = [
    { href: "/dashboard", label: "Routes overview", icon: "routes", matches: (path) => path === "/dashboard" || (path.startsWith("/dashboard/routes/") && path !== "/dashboard/routes/new") },
    { href: "/dashboard/routes/new", label: "Create a route", icon: "add", matches: (path) => path === "/dashboard/routes/new" || path.startsWith("/dashboard/routes/new/") },
    { href: "/dashboard/fleet", label: "Fleet & drivers", icon: "vehicle" },
    { href: "/dashboard/finance", label: "Finance board", icon: "finance" },
    { href: "/network/dispatch", label: "Network dispatch", icon: "search" },
    { href: "/network/verification", label: "Verification review", icon: "shield" },
    { href: "/trips", label: "Public departures", icon: "departures" },
    { href: "/dashboard/profile", label: "Operator profile", icon: "user" },
  ];

  return (
    <nav className="qnot-ops-nav" aria-label="Operator navigation">
      <span className="qnot-ops-nav-label">WORKSPACE</span>
      {items.slice(0, 4).map((item) => {
        const active = itemIsActive(item, pathname);
        return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}><span className="qnot-nav-glyph"><WorkspaceIcon name={item.icon} /></span>{item.label}</Link>;
      })}
      <span className="qnot-ops-nav-label qnot-ops-nav-label--spaced">Q-NOT NETWORK</span>
      {items.slice(4, 7).map((item) => {
        const active = itemIsActive(item, pathname);
        return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}><span className="qnot-nav-glyph"><WorkspaceIcon name={item.icon} /></span>{item.label}</Link>;
      })}
      <span className="qnot-ops-nav-label qnot-ops-nav-label--spaced">ACCOUNT</span>
      {items.slice(7).map((item) => {
        const active = itemIsActive(item, pathname);
        return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}><span className="qnot-nav-glyph"><WorkspaceIcon name={item.icon} /></span>{item.label}</Link>;
      })}
    </nav>
  );
}
