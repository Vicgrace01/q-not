"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCommuterId } from "@/lib/session";
import { joinQueueTx, type JoinResult } from "@/lib/queue/join";
import { cancelQueueEntryTx } from "@/lib/queue/cancel";

export type JoinQueueActionResult =
  | { ok: true; entryId: string; position: number }
  | { ok: false; error: string };

const REASON_MESSAGES: Record<string, string> = {
  "trip-not-found": "That trip no longer exists.",
  "already-queued": "You're already in the queue for this trip.",
  "trip-not-boarding": "This trip is not accepting passengers right now.",
};

/**
 * Server Action wrapper for joinQueueTx.
 *
 * The transaction logic lives in src/lib/queue/join.ts so it can be
 * tested directly. This action handles auth and error mapping — the
 * commuter must be signed in.
 */
export async function joinQueueAction(
  tripId: string,
): Promise<JoinQueueActionResult> {
  const commuterId = await getCommuterId();

  if (!commuterId) {
    // Return a special error the client turns into a redirect to /c/login.
    return { ok: false, error: "not-signed-in" };
  }

  const result: JoinResult = await joinQueueTx(commuterId, tripId);

  if (!result.ok) {
    return { ok: false, error: REASON_MESSAGES[result.reason] ?? "Something went wrong." };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/c/tickets");

  return { ok: true, entryId: result.entryId, position: result.position };
}

export async function joinQueueAndRedirect(tripId: string): Promise<void> {
  const result = await joinQueueAction(tripId);
  if (!result.ok) {
    if (result.error === "not-signed-in") {
      redirect(`/c/login?next=${encodeURIComponent(`/trips/${tripId}`)}`);
    }
    // For other errors, redirect back to the trip page with an error code.
    redirect(`/trips/${tripId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/c/tickets");
}


export async function cancelQueueAction(tripId: string): Promise<{ ok: boolean; error?: string }> {
  const commuterId = await getCommuterId();
  if (!commuterId) return { ok: false, error: "not-signed-in" };
  const result = await cancelQueueEntryTx(tripId, commuterId);
  if (!result) return { ok: false, error: "This queue entry can no longer be cancelled." };
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/c/dashboard");
  revalidatePath("/c/tickets");
  return { ok: true };
}


export async function cancelQueueEntryFormAction(formData: FormData): Promise<void> {
  const tripId = String(formData.get("tripId") ?? "");
  const result = await cancelQueueAction(tripId);
  if (!result.ok) redirect(`/trips/${encodeURIComponent(tripId)}?error=${encodeURIComponent(result.error ?? "queue-cancel-failed")}`);
  redirect(`/trips/${encodeURIComponent(tripId)}?queue=cancelled`);
}
