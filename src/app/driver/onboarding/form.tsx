"use client";

import { useActionState, useState } from "react";
import { completeDriverOnboardingAction } from "@/lib/actions/driver-auth";
import { VehicleCatalogue3D, VEHICLE_OPTIONS, type VehicleTypeChoice } from "@/components/vehicle-catalogue-3d";

const initialState: { error?: string } = {};
type DriverDetails = { name: string; phone: string | null; email: string | null; emailVerifiedAt: Date | null; phoneVerifiedAt: Date | null; operatorId: string | null; vehicleAssignments: { busId: string }[] };
type RouteOption = { id: string; origin: string; destination: string };
type OperatorVehicle = { id: string; plateNumber: string; vehicleType: string; make: string | null; model: string | null; capacity: number; verificationStatus: string; registrationExpiry: Date | null; insuranceExpiry: Date | null; inspectionExpiry: Date | null };

const fieldClass = "mt-1 min-h-12 w-full rounded-xl border border-neutral-700 bg-[#0a1110] px-4 py-3 text-base text-white outline-none transition focus:border-lime-300 focus:ring-2 focus:ring-lime-300/15";

export function DriverOnboardingForm({ driver, routes, operatorVehicles }: { driver: DriverDetails; routes: RouteOption[]; operatorVehicles: OperatorVehicle[] }) {
  const [state, formAction, pending] = useActionState(completeDriverOnboardingAction, initialState);
  const [vehicleType, setVehicleType] = useState<VehicleTypeChoice>("KOROPE");
  const [capacity, setCapacity] = useState("11");
  return <form action={formAction} className="qnot-driver-onboarding-form grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(290px,.75fr)]">
    <div className="space-y-6">
      <section className="qnot-driver-onboarding-card rounded-2xl border border-neutral-800 bg-[#0d1715] p-6 sm:p-7">
        <h2 className="text-xl font-bold sm:text-2xl">Driver profile</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">Add the personal and licence details that the Q-not review team will use to assess your driver profile.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${driver.emailVerifiedAt ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-neutral-700 bg-neutral-900 text-neutral-300"}`}>{driver.emailVerifiedAt ? "Email verified" : "Email not verified"}</span>
          <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${driver.phoneVerifiedAt ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-amber-300/25 bg-amber-300/10 text-amber-100"}`}>{driver.phoneVerifiedAt ? "Mobile verified" : "Mobile verification later"}</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Full legal name<input className={fieldClass} name="name" defaultValue={driver.name === "Driver profile pending" ? "" : driver.name} required autoComplete="name"/></label>
          <div className="text-sm">Verified email{driver.email && driver.emailVerifiedAt ? <input className={`${fieldClass} opacity-70`} value={driver.email} readOnly/> : <div className="mt-1 rounded-lg border border-neutral-700 bg-[#0a1110] px-3 py-2.5 text-xs text-neutral-400">No verified email linked. <a href="/driver/onboarding/email" className="font-semibold text-lime-300 underline">Verify an email address</a></div>}</div>
          <label className="text-sm">Driving experience (years)<input className={fieldClass} name="experienceYears" type="number" min="0" max="60" defaultValue="0" required/></label>
          <label className="text-sm">Driving licence last 4 digits<input className={fieldClass} name="licenceLastFour" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required/></label>
          <label className="text-sm sm:col-span-2">Driving licence expiry date<input className={fieldClass} name="licenceExpiry" type="date" min={new Date().toISOString().slice(0, 10)} required/></label>
        </div>
        <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-100/80">Q-not records only the last four licence digits at this stage. Full licence and identity checks must be completed through authorised verification channels before approval.</p>
      </section>
      <section className="qnot-driver-onboarding-card rounded-2xl border border-neutral-800 bg-[#0d1715] p-6 sm:p-7">
        <h2 className="text-lg font-bold">{driver.operatorId ? "Select your assigned fleet vehicle" : "Register your vehicle"}</h2>
        {driver.operatorId ? <>
          <p className="mt-1 text-xs text-neutral-400">Your operator manages these vehicles. Select the actual vehicle you are authorised to drive.</p>
          <label className="mt-4 block text-sm">Fleet vehicle<select className={fieldClass} name="operatorBusId" required defaultValue={driver.vehicleAssignments[0]?.busId ?? ""}><option value="" disabled>Select a registered vehicle</option>{operatorVehicles.map((bus) => <option key={bus.id} value={bus.id}>{bus.plateNumber} · {bus.vehicleType} · {bus.capacity} seats · {bus.verificationStatus}</option>)}</select></label>
          {operatorVehicles.length === 0 && <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100">Your operator has not registered a vehicle yet. Ask the fleet administrator to add one before completing onboarding.</p>}
        </> : <>
        <p className="mt-1 text-xs text-neutral-400">Select the vehicle class that matches your registered vehicle, then enter its registration details.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Vehicle registration number<input className={fieldClass} name="plateNumber" placeholder="e.g. KJA 123 XY" required autoCapitalize="characters"/></label>
          <label className="text-sm">Seats approved for passengers<input className={fieldClass} name="capacity" type="number" min="2" max="60" value={capacity} onChange={(event) => setCapacity(event.target.value)} required/><span className="mt-1 block text-xs text-neutral-500">Suggested by vehicle class. Enter the actual approved passenger capacity from the vehicle documents.</span></label>
          <label className="text-sm">Make<input className={fieldClass} name="make" placeholder="Toyota, Volkswagen…"/></label>
          <label className="text-sm">Model<input className={fieldClass} name="model" placeholder="Hiace, LiteAce…"/></label>
          <label className="text-sm">Model year<input className={fieldClass} name="modelYear" type="number" min="1980" max={new Date().getFullYear() + 1} defaultValue={new Date().getFullYear()} required/></label>
          <label className="text-sm">Vehicle colour<input className={fieldClass} name="colour" placeholder="Yellow, white…" required/></label>
          <label className="text-sm">Vehicle registration expiry<input className={fieldClass} name="registrationExpiry" type="date" min={new Date().toISOString().slice(0, 10)} required/></label>
          <label className="text-sm">Insurance expiry<input className={fieldClass} name="insuranceExpiry" type="date" min={new Date().toISOString().slice(0, 10)} required/></label>
          <label className="text-sm">Roadworthiness / inspection expiry<input className={fieldClass} name="inspectionExpiry" type="date" min={new Date().toISOString().slice(0, 10)} required/></label>
        </div>
        <input type="hidden" name="vehicleType" value={vehicleType}/>
        <div className="mt-5"><VehicleCatalogue3D value={vehicleType} onChange={(nextType) => { setVehicleType(nextType); const option = VEHICLE_OPTIONS.find((item) => item.value === nextType); if (option) setCapacity(String(option.capacity)); }}/></div>
        </>}
      </section>
      <section className="qnot-driver-onboarding-card rounded-2xl border border-neutral-800 bg-[#0d1715] p-6 sm:p-7">
        <h2 className="text-lg font-bold">Preferred operating corridors</h2>
        <p className="mt-1 text-xs text-neutral-400">Select routes you want to request access to. Approval depends on route eligibility.</p>
        {routes.length === 0 ? <p className="mt-4 text-sm text-neutral-400">No routes have been published yet. You can save your driver and vehicle details and request route access later.</p> : <div className="mt-4 grid gap-2 sm:grid-cols-2">{routes.map((route) => <label key={route.id} className="flex items-start gap-3 rounded-lg border border-neutral-800 p-3 text-sm"><input className="mt-1 accent-lime-300" type="checkbox" name="routeIds" value={route.id}/><span>{route.origin} <span className="text-lime-300">→</span> {route.destination}</span></label>)}</div>}
      </section>
      {state.error && <p className="rounded-lg bg-red-950/70 px-4 py-3 text-sm text-red-200">{state.error}</p>}
      <button type="submit" disabled={pending} className="min-h-13 w-full rounded-xl bg-lime-300 px-5 py-4 text-base font-extrabold text-[#102016] shadow-lg shadow-lime-950/20 transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-50">{pending ? "Saving your profile…" : "Save profile and submit for review"}</button>
      <p className="text-sm leading-relaxed text-neutral-400">Submitting creates a review request. It does not activate the vehicle, approve your licence or authorise a route.</p>
    </div>
    <aside className="qnot-driver-onboarding-checklist h-fit rounded-2xl border border-neutral-800 bg-[#0d1715] p-6 sm:p-7 xl:sticky xl:top-6">
      <p className="text-xs font-bold tracking-[.15em] text-lime-300">ONBOARDING CHECKLIST</p>
      <h2 className="mt-2 text-xl font-bold">What happens next</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">Complete your details first. Verification and approval can happen in stages.</p>
      <ol className="mt-6 space-y-5 text-sm">
        <li className="flex gap-3">
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${driver.phoneVerifiedAt ? "bg-emerald-400/15 text-emerald-200" : "border border-amber-300/40 bg-amber-300/10 text-amber-100"}`}>{driver.phoneVerifiedAt ? "✓" : "1"}</span>
          <span className="min-w-0"><strong className="block text-sm text-white">Mobile verification before your first service</strong><small className="mt-1 block text-sm leading-relaxed text-neutral-400">{driver.phoneVerifiedAt ? `Verified${driver.phone ? `: ${driver.phone}` : ""}.` : "You can finish this profile without a mobile number. Add and verify it from Profile & Verification before operating a passenger service."}</small>{!driver.phoneVerifiedAt && <a href="/driver/profile" className="mt-2 inline-flex text-sm font-semibold text-lime-200 underline underline-offset-4">Open Profile &amp; Verification ↗</a>}</span>
        </li>
        <li className="flex gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-neutral-300">2</span><span><strong className="block text-sm text-white">Profile and driving credential</strong><small className="mt-1 block text-sm leading-relaxed text-neutral-400">The review team confirms identity and licence validity.</small></span></li>
        <li className="flex gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-neutral-300">3</span><span><strong className="block text-sm text-white">Vehicle inspection and documents</strong><small className="mt-1 block text-sm leading-relaxed text-neutral-400">Registration, insurance, roadworthiness and ownership or operating authority.</small></span></li>
        <li className="flex gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-neutral-300">4</span><span><strong className="block text-sm text-white">Route access</strong><small className="mt-1 block text-sm leading-relaxed text-neutral-400">Approval is recorded separately for each route corridor.</small></span></li>
      </ol>
      <p className="mt-6 border-t border-neutral-800 pt-4 text-sm leading-relaxed text-neutral-400">A completed profile is not an operating permit. Q-not checks the driver, vehicle and route separately before a service can carry passengers.</p>
    </aside>
  </form>;
}
