"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type AuthFormState } from "@/lib/actions/auth";

const initialState: AuthFormState = {};

function operatorGoogleError(code: string | null) {
  if (code === "google-not-configured") return "Google sign-in is not configured in this environment yet.";
  if (code === "account-service-unavailable") return "Q-not could not reach the account service. Your operator account is safe; please try again shortly.";
  if (code === "google-service-unavailable") return "Google sign-in is temporarily unreachable from this connection. Try again or use your email and password.";
  if (code === "google-sign-in-failed" || code === "google-verification-failed") return "Google could not complete sign-in. Please try again or use your email and password.";
  return null;
}

function OperatorLoginContent() {
  const params = useSearchParams();
  const googleError = operatorGoogleError(params.get("error"));
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-400">Access your operator dashboard.</p>

      {googleError && <p role="alert" className="mt-4 rounded border border-amber-800 bg-amber-950/50 px-3 py-2 text-sm text-amber-200">{googleError}</p>}

      <form action={formAction} className="mt-6 space-y-4">
        {state.error?._form && (
          <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-300">{state.error._form.join(", ")}</p>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={pending} className="w-full rounded bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-50">
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <a href="/api/auth/google?role=operator" className="mt-4 flex items-center justify-center gap-2 rounded border border-neutral-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
        <span aria-hidden="true" className="font-bold">G</span> Continue with Google
      </a>
      <p className="mt-3 text-center text-xs text-neutral-500">Passenger? <Link href="/c/login" className="underline">Sign in to Q-not</Link></p>
      <p className="mt-4 text-center text-sm text-neutral-400">No account? <Link href="/signup" className="text-white underline">Create one</Link></p>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">Preparing operator access…</div>}>
      <OperatorLoginContent />
    </Suspense>
  );
}
