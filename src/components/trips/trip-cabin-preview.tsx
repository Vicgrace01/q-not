"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const SeatCabin3D = dynamic(() => import("@/components/seat-cabin-3d").then((module) => module.SeatCabin3D), {
  ssr: false,
  loading: () => <div className="flex h-[360px] items-center justify-center rounded-lg border border-neutral-800 bg-[#091711] text-sm text-neutral-400">Preparing cabin view…</div>,
});

export function TripCabinPreview({ capacity, occupied, held, vehicleType, plateNumber }: {
  capacity: number;
  occupied: number;
  held: number;
  vehicleType: "DANFO" | "KOROPE" | "HIACE" | "COASTER" | "SHUTTLE" | "ELECTRIC_TRICYCLE" | "OTHER";
  plateNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const layout = useMemo(() => vehicleType === "SHUTTLE" || vehicleType === "COASTER" ? "2+2" as const : "2+2" as const, [vehicleType]);
  const available = Math.max(0, capacity - occupied - held);
  return <section className="mt-7 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold tracking-[.16em] text-lime-300">VEHICLE CABIN</p><h2 className="mt-1 text-lg font-semibold">Inspect the passenger layout</h2><p className="mt-1 text-xs text-neutral-400">{plateNumber} · {vehicleType.replaceAll("_", " ")} · {capacity} approved seats</p></div>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="rounded-lg border border-lime-300/50 px-4 py-2.5 text-sm font-semibold text-lime-200">{open ? "Close cabin view" : "Explore 3D cabin"}</button>
    </div>
    {open && <div className="mt-4"><div className="relative h-[420px] overflow-hidden rounded-lg border border-neutral-800 bg-[#091711]"><SeatCabin3D capacity={capacity} occupied={occupied} held={held} layout={layout}/></div><div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-400"><span><i className="mr-1.5 inline-block size-2.5 rounded-full bg-[#8fb94e]"/>Available · {available}</span><span><i className="mr-1.5 inline-block size-2.5 rounded-full bg-[#d88d5d]"/>Held · {held}</span><span><i className="mr-1.5 inline-block size-2.5 rounded-full bg-[#617167]"/>Occupied · {occupied}</span></div><p className="mt-3 text-xs leading-relaxed text-neutral-500">This view shows the registered vehicle capacity and current occupancy totals. It does not assign a numbered seat. Your boarding pass confirms the trip; the driver confirms the boarding position.</p></div>}
  </section>;
}
