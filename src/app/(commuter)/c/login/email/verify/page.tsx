"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmailOtpAction, type CommuterAuthState } from "@/lib/actions/commuter-auth";

const initialState: CommuterAuthState = {};

function VerifyEmailInner() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [state, formAction, pending] = useActionState(verifyEmailOtpAction, initialState);
  return (
    <div className="qnot-auth-shell qnot-commuter-auth">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold">Q-not</Link>
          <p className="mt-1 text-sm text-neutral-400">Enter the six-digit code sent to {email}</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            <div>
              <label htmlFor="code" className="block text-sm font-medium">Verification code</label>
              <input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" placeholder="000000" className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-center text-lg font-mono tracking-widest" />
            </div>
            {state.error && <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-300">{state.error}</p>}
            <button type="submit" disabled={pending} className="w-full rounded bg-lime-300 px-4 py-2.5 text-sm font-bold text-neutral-950 disabled:opacity-50">{pending ? "Verifying…" : "Verify and continue"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={null}><VerifyEmailInner /></Suspense>;
}
