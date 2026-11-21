"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyDriverEmailOtpAction, verifyDriverOtpAction, type DriverAuthState } from "@/lib/actions/driver-auth";

function VerifyDriverCode() {
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const email = params.get("email") ?? "";
  const delivery = params.get("delivery") ?? "LOCAL";
  const [phoneState, phoneAction, phonePending] = useActionState(verifyDriverOtpAction, {} as DriverAuthState);
  const [emailState, emailAction, emailPending] = useActionState(verifyDriverEmailOtpAction, {} as DriverAuthState);
  const state = email ? emailState : phoneState;
  const formAction = email ? emailAction : phoneAction;
  const pending = email ? emailPending : phonePending;
  const identifier = email || phone;
  return (
    <div className="qnot-auth-shell"><div className="w-full max-w-md">
      <div className="mb-8 text-center"><Link href="/" className="text-2xl font-semibold">Q-not</Link><p className="mt-2 text-sm text-neutral-400">Enter the six-digit code for {identifier}</p><p className="mt-2 text-xs text-neutral-500">{delivery === "SMS" ? "A code was sent by SMS." : delivery === "EMAIL" ? "A code was sent to your email." : "Local development: find the code in the terminal running Q-not."}</p></div>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <form action={formAction} className="space-y-4">
          {email ? <input type="hidden" name="email" value={email}/> : <input type="hidden" name="phone" value={phone}/>}
          <div><label htmlFor="code" className="block text-sm font-medium">Verification code</label><input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-center font-mono text-xl tracking-[.4em]"/></div>
          {state.error && <p className="rounded-lg bg-red-950/70 px-3 py-2 text-sm text-red-200">{state.error}</p>}
          <button type="submit" disabled={pending} className="w-full rounded-lg bg-lime-300 px-4 py-3 text-sm font-bold text-neutral-950 disabled:opacity-50">{pending ? "Verifying…" : "Verify and continue"}</button>
        </form>
      </div>
    </div></div>
  );
}

export default function DriverVerifyPage() {
  return <Suspense fallback={null}><VerifyDriverCode/></Suspense>;
}
