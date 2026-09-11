"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  verifyOtpAction,
  type CommuterAuthState,
} from "@/lib/actions/commuter-auth";

const initialState: CommuterAuthState = {};

function VerifyInner() {
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const [state, formAction, pending] = useActionState(
    verifyOtpAction,
    initialState,
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-semibold">
            Q-Not
          </a>
          <p className="mt-1 text-sm text-neutral-400">
            Enter the 6-digit code for {phone}
          </p>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="phone" value={phone} />

            <div>
              <label htmlFor="code" className="block text-sm font-medium">
                Verification code
              </label>
              <input
                id="code"
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                placeholder="000000"
                className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-center text-lg font-mono tracking-widest"
              />
            </div>

            {state.error && (
              <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-300">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
            >
              {pending ? "Verifying..." : "Verify"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
