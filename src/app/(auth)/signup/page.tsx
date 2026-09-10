"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthFormState } from "@/lib/actions/auth";

const initialState: AuthFormState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <h1 className="text-xl font-semibold">Create operator account</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Register your bus company to manage routes and trips.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {state.error?._form && (
          <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-300">
            {state.error._form.join(", ")}
          </p>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Company name
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
          />
          {state.error?.name && (
            <p className="mt-1 text-xs text-red-400">{state.error.name.join(", ")}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
          />
          {state.error?.email && (
            <p className="mt-1 text-xs text-red-400">{state.error.email.join(", ")}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Phone
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
          {state.error?.phone && (
            <p className="mt-1 text-xs text-red-400">{state.error.phone.join(", ")}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
          />
          {state.error?.password && (
            <p className="mt-1 text-xs text-red-400">{state.error.password.join(", ")}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="text-white underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
