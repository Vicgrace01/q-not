"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  requestOtpAction,
  type CommuterAuthState,
} from "@/lib/actions/commuter-auth";

const initialState: CommuterAuthState = {};

export default function CommuterLoginPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    requestOtpAction,
    initialState,
  );

  // When we have a phone + devCode, move to the verify step.
  useEffect(() => {
    if (state.phone && state.devCode) {
      router.push(`/c/login/verify?phone=${encodeURIComponent(state.phone)}`);
    }
  }, [state.phone, state.devCode, router]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-semibold">
            Q-Not
          </a>
          <p className="mt-1 text-sm text-neutral-400">
            Sign in with your phone number
          </p>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium">
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+234..."
                className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
              />
            </div>

            {state.error && (
              <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-300">
                {state.error}
              </p>
            )}

            {state.devCode && (
              <p className="rounded bg-blue-950 px-3 py-2 text-xs text-blue-300">
                Dev mode — your code is <span className="font-mono">{state.devCode}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
            >
              {pending ? "Sending code..." : "Send code"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-neutral-500">
            Operators sign in at{" "}
            <a href="/login" className="underline">
              /login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
