"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinQueueAction } from "@/lib/actions/queue";

export function JoinButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await joinQueueAction(tripId);
      if (result.ok) {
        router.push("/c/tickets");
        return;
      }
      if (result.error === "not-signed-in") {
        router.push(`/c/login?next=${encodeURIComponent(`/trips/${tripId}`)}`);
        return;
      }
      setError(result.error);
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded bg-white px-5 py-3 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:opacity-50"
      >
        {pending ? "Joining..." : "Join queue"}
      </button>
      {error && (
        <p className="mt-3 rounded bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
