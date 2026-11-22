"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createRouteAction,
  type RouteFormState,
} from "@/lib/actions/routes";

const initialState: RouteFormState = {};
const CAMPUS_PRESETS = [
  { label: "Odim Gate → Civil Engineering", origin: "UNN · Odim Gate", destination: "UNN · Civil Engineering Building" },
  { label: "Odim Gate → Pharmaceutical Sciences", origin: "UNN · Odim Gate", destination: "UNN · Faculty of Pharmaceutical Sciences" },
  { label: "Hilltop Gate → Education", origin: "UNN · Hilltop Gate", destination: "UNN · Faculty of Education" },
] as const;

export default function NewRoutePage() {
  const [state, formAction, pending] = useActionState(createRouteAction, initialState);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  return (
    <div className="qnot-dashboard-content qnot-route-form">
      <h1 className="text-2xl font-semibold">New route</h1>
      <p className="mt-1 text-sm text-neutral-400">Define the origin and destination for a real operator route. Add the surveyed stops and their coordinates after creating it.</p>

      <section id="unn-pilot-templates" className="mt-5 rounded-2xl border border-lime-300/20 bg-lime-300/[0.04] p-4 sm:p-5" aria-labelledby="unn-route-templates-title">
        <span className="text-[10px] font-bold tracking-[.18em] text-lime-300">UNN / CAMPUS PILOT CORRIDOR TEMPLATES</span>
        <h2 id="unn-route-templates-title" className="mt-1 text-lg font-bold text-white">Start with a proposed campus corridor.</h2>
        <p className="mt-1 text-xs leading-relaxed text-neutral-400">These buttons prefill ordinary route names only. They do not create stops, coordinates, fares, vehicles or operating permission. Confirm the route with UNN and the relevant transport authority, then map every actual boarding point on the next screen.</p>
        <div className="mt-3 flex flex-wrap gap-2">{CAMPUS_PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => { setOrigin(preset.origin); setDestination(preset.destination); }} className="rounded-xl border border-neutral-700 bg-[#0b1714] px-3 py-2.5 text-left text-xs font-semibold text-neutral-100 transition hover:border-lime-300/50 hover:text-lime-100">{preset.label}</button>
        ))}</div>
      </section>

      <form action={formAction} className="mt-6 space-y-4">
        {state.error?._form && <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-300">{state.error._form.join(", ")}</p>}
        <div>
          <label htmlFor="origin" className="block text-sm font-medium">Origin</label>
          <input id="origin" name="origin" required value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="e.g. UNN · Odim Gate" className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
          {state.error?.origin && <p className="mt-1 text-xs text-red-400">{state.error.origin.join(", ")}</p>}
        </div>
        <div>
          <label htmlFor="destination" className="block text-sm font-medium">Destination</label>
          <input id="destination" name="destination" required value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="e.g. UNN · Civil Engineering Building" className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
          {state.error?.destination && <p className="mt-1 text-xs text-red-400">{state.error.destination.join(", ")}</p>}
        </div>
        <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 text-xs leading-relaxed text-amber-100/85">A route record is not a live service. Add at least two verified stops, then clear an actual vehicle and driver, approve the driver&apos;s route access, and publish a trip with a real fare before passengers can book it.</div>
        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={pending} className="rounded bg-lime-300 px-4 py-2 text-sm font-bold text-neutral-950 hover:bg-lime-200 disabled:opacity-50">{pending ? "Creating..." : "Create route"}</button>
          <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-white">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
