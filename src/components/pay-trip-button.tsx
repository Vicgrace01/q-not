"use client";

import { useState } from "react";

export function PayTripButton({ tripId, disabled }: { tripId: string; disabled?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const beginCheckout = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/payments/trips/${encodeURIComponent(tripId)}/initialize`, { method: "POST" });
      const payload = await response.json() as { authorizationUrl?: string; returnUrl?: string; paymentStatus?: string; error?: string };
      if (payload.authorizationUrl) {
        window.location.assign(payload.authorizationUrl);
        return;
      }
      if ((payload.paymentStatus === "SUCCESS" || payload.paymentStatus === "PENDING") && payload.returnUrl) {
        window.location.assign(payload.returnUrl);
        return;
      }
      throw new Error(payload.error ?? "Checkout could not be opened.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout could not be opened.");
      setPending(false);
    }
  };

  return <div className="mt-3">
    <button type="button" onClick={() => void beginCheckout()} disabled={disabled || pending} className="w-full rounded-lg bg-lime-300 px-5 py-3 text-sm font-bold text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50">
      {pending ? "Opening secure checkout…" : "Reserve seat and pay online"}
    </button>
    {error && <p role="alert" className="mt-2 rounded bg-red-950 px-3 py-2 text-xs text-red-200">{error}</p>}
  </div>;
}
