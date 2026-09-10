"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createRouteAction,
  type RouteFormState,
} from "@/lib/actions/routes";

const initialState: RouteFormState = {};

export default function NewRoutePage() {
  const [state, formAction, pending] = useActionState(
    createRouteAction,
    initialState,
  );

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold">New route</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Define the origin and destination for a route. Add stops after
        creating it.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {state.error?._form && (
          <p className="rounded bg-red-950 px-3 py-2 text-sm text-red-300">
            {state.error._form.join(", ")}
          </p>
        )}

        <div>
          <label htmlFor="origin" className="block text-sm font-medium">
            Origin
          </label>
          <input
            id="origin"
            name="origin"
            required
            placeholder="e.g. Nsukka"
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
          />
          {state.error?.origin && (
            <p className="mt-1 text-xs text-red-400">
              {state.error.origin.join(", ")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="destination" className="block text-sm font-medium">
            Destination
          </label>
          <input
            id="destination"
            name="destination"
            required
            placeholder="e.g. Enugu"
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
          />
          {state.error?.destination && (
            <p className="mt-1 text-xs text-red-400">
              {state.error.destination.join(", ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-white px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create route"}
          </button>
          <Link
            href="/dashboard"
            className="text-sm text-neutral-400 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
