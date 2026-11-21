"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const QNot3DBusScene = dynamic(
  () => import("@/components/qnot-3d-bus-scene").then((module) => module.QNot3DBusScene),
  {
    ssr: false,
    loading: () => <div className="q-splash-scene-fallback" aria-hidden="true" />,
  },
);

type IntroPhase = "checking" | "intro" | "exiting" | "done";
const INTRO_KEY = "qnot:intro:seen:v1";

function rememberIntro() {
  try {
    window.sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Storage can be unavailable in private contexts.
  }
}

function routeMessage(pathname: string) {
  if (pathname.startsWith("/drive")) return "Opening Q-not Drive";
  if (pathname.startsWith("/operators")) return "Opening fleet operations";
  if (pathname.startsWith("/network/dispatch")) return "Coordinating route demand";
  if (pathname.startsWith("/network/verification")) return "Reviewing driver and vehicle access";
  if (pathname.startsWith("/explore")) return "Opening departure discovery";
  if (/^\/c\/journeys\/[^/]+\/complete$/.test(pathname)) return "Preparing your arrival receipt";
  if (pathname.startsWith("/trips/")) return "Preparing your journey";
  if (pathname.startsWith("/trips")) return "Finding available departures";
  if (pathname.startsWith("/c/login")) return "Preparing passenger access";
  if (pathname.startsWith("/c/")) return "Opening your travel space";
  if (pathname.startsWith("/operator")) return "Opening terminal control";
  if (pathname.startsWith("/driver")) return "Preparing driver operations";
  if (pathname.startsWith("/dashboard")) return "Opening your operations desk";
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return "Preparing secure access";
  return "Preparing your next move";
}

export function QNotRouteLoader({ label = "Preparing your next move" }: { label?: string }) {
  const qRoad = "M124 126 C155 114 181 94 181 73 C181 37 145 14 101 14 C53 14 18 51 18 99 C18 146 55 182 101 182 C125 182 144 172 158 155 L184 181";

  return (
    <div className="q-route-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="q-route-loader-atmosphere" aria-hidden="true" />
      <div className="q-route-loader-core">
        <div className="q-loader-q-logo" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none">
            <path className="q-loader-q-road" d={qRoad} />
            <path className="q-loader-q-edge" d={qRoad} />
            <path className="q-loader-q-lane" d={qRoad} />
            <g className="q-loader-mini-vehicle">
              <rect className="vehicle-body" x="-6.5" y="-11" width="13" height="22" rx="4.5" />
              <rect className="vehicle-glass" x="-4.3" y="-6.5" width="8.6" height="6.2" rx="1.8" />
              <rect className="vehicle-glass" x="-4.3" y="2.5" width="8.6" height="4.8" rx="1.5" />
              <circle className="vehicle-wheel" cx="-6" cy="-5" r="1.5" />
              <circle className="vehicle-wheel" cx="6" cy="-5" r="1.5" />
              <circle className="vehicle-wheel" cx="-6" cy="6" r="1.5" />
              <circle className="vehicle-wheel" cx="6" cy="6" r="1.5" />
              <animateMotion dur="2.45s" repeatCount="indefinite" rotate="auto" path={qRoad} />
            </g>
          </svg>
        </div>
        <div className="q-route-loader-copy">
          <span className="q-loader-overline">Q-NOT / MOVING YOU</span>
          <strong>{label}</strong>
          <span className="q-loader-subline">The next part of your journey is coming into view</span>
          <div className="q-loader-route-line" aria-hidden="true">
            <span className="q-loader-route-track" />
            <span className="q-loader-route-progress" />
            <i className="q-loader-route-bus">Q</i>
            <i className="q-loader-route-endpoint" />
          </div>
        </div>
      </div>
    </div>
  );
}
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [introPhase, setIntroPhase] = useState<IntroPhase>(pathname === "/" ? "checking" : "done");
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState("Preparing your next move");
  const routeStartedAtRef = useRef(0);
  const introDurationMsRef = useRef(3100);

  // Session state is read after hydration; the animation itself is never forced on repeat visits.
  useEffect(() => {
    if (pathname !== "/") return;

    const frame = window.requestAnimationFrame(() => {
      const search = new URLSearchParams(window.location.search);
      const forceReplay = process.env.NODE_ENV === "development" && search.get("intro") === "1";
      const requestedDuration = Number(search.get("introMs"));
      introDurationMsRef.current = forceReplay && Number.isFinite(requestedDuration) && requestedDuration > 0
        ? Math.min(20000, Math.max(2000, requestedDuration))
        : 3100;

      if (forceReplay) {
        setIntroPhase("intro");
        return;
      }

      let alreadySeen = false;
      try {
        alreadySeen = window.sessionStorage.getItem(INTRO_KEY) === "1";
      } catch {
        alreadySeen = false;
      }
      setIntroPhase(alreadySeen ? "done" : "intro");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (introPhase === "intro") {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const exitTimer = window.setTimeout(() => setIntroPhase("exiting"), reducedMotion ? 80 : introDurationMsRef.current);
      return () => window.clearTimeout(exitTimer);
    }

    if (introPhase === "exiting") {
      const finishTimer = window.setTimeout(() => {
        rememberIntro();
        setIntroPhase("done");
      }, 900);
      return () => window.clearTimeout(finishTimer);
    }
  }, [introPhase]);

  useEffect(() => {
    if (!pendingDestination) return;

    if (pendingDestination === pathname) {
      const elapsed = Date.now() - routeStartedAtRef.current;
      const remaining = Math.max(0, 2000 - elapsed);
      const timeout = window.setTimeout(() => setPendingDestination(null), remaining);
      return () => window.clearTimeout(timeout);
    }

    const failSafe = window.setTimeout(() => setPendingDestination(null), 7000);
    return () => window.clearTimeout(failSafe);
  }, [pendingDestination, pathname]);

  useEffect(() => {
    const handleNavigationIntent = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || anchor.target === "_blank") return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname) return;
      routeStartedAtRef.current = Date.now();
      setPendingLabel(routeMessage(destination.pathname));
      setPendingDestination(destination.pathname);
    };

    document.addEventListener("click", handleNavigationIntent, true);
    return () => document.removeEventListener("click", handleNavigationIntent, true);
  }, []);

  function skipIntro() {
    rememberIntro();
    setIntroPhase("exiting");
  }

  const hideApp = pathname === "/" && (introPhase === "checking" || introPhase === "intro");
  const showIntro = pathname === "/" && introPhase !== "done";
  const routePending = pendingDestination !== null;

  return (
    <div className="q-app-shell">
      <div className={`q-app-shell-content${hideApp ? " is-obscured" : ""}`}>
        <div key={pathname} className="q-route-transition">{children}</div>
      </div>
      {showIntro && (
        <div
          className={`q-splash-screen${introPhase === "exiting" ? " is-exiting" : ""}${introPhase === "checking" ? " is-checking" : ""}`}
          aria-label="Q-not introduction"
        >
          {introPhase !== "checking" && <QNot3DBusScene motionSpeed={10} once />}
          <div className="q-splash-vignette" />
          <div className="q-splash-route-labels" aria-hidden="true">
            <span className="q-splash-step q-splash-step--one"><b>01</b> DISCOVER</span>
            <span className="q-splash-step q-splash-step--two"><b>02</b> QUEUE</span>
            <span className="q-splash-step q-splash-step--three"><b>03</b> BOARD</span>
            <span className="q-splash-step q-splash-step--four"><b>04</b> MOVE</span>
          </div>
          <div className="q-splash-brand">
            <div className="q-splash-wordmark"><span className="q-splash-mark">Q<i /></span><span className="q-splash-word">q-not<span>.</span></span></div>
            <p className="q-splash-tagline">Move with the city.</p>
            <small>KNOW BEFORE YOU GO.</small>
          </div>
          <div className="q-splash-footer"><span>Q-NOT / SHARED MOBILITY NETWORK</span><span>DISCOVER <i /> QUEUE <i /> BOARD <i /> MOVE</span></div>
          <button className="q-splash-skip" type="button" onClick={skipIntro}>Skip intro <span>↗</span></button>
        </div>
      )}
      {routePending && introPhase === "done" && <QNotRouteLoader label={pendingLabel} />}
    </div>
  );
}
