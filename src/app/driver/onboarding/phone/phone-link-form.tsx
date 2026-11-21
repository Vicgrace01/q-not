"use client";

import { useActionState } from "react";
import { requestDriverPhoneLinkAction, verifyDriverPhoneLinkAction, type DriverAuthState } from "@/lib/actions/driver-auth";

const initial: DriverAuthState = {};
const field = "mt-1 w-full rounded-lg border border-neutral-700 bg-[#09110f] px-3 py-3 text-sm text-white";

export function DriverPhoneLinkForm({ email }: { email: string | null }) {
  const [requestState, requestAction, requestPending] = useActionState(requestDriverPhoneLinkAction, initial);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyDriverPhoneLinkAction, initial);
  const phone = requestState.phone ?? verifyState.phone;
  return <div className="space-y-5">
    <div className="rounded-lg border border-neutral-800 bg-[#09110f] p-4"><p className="text-xs text-neutral-400">Google account</p><strong>{email ?? "Email not available"}</strong><p className="mt-1 text-xs text-emerald-200">Email identity verified</p></div>
    {!phone ? <form action={requestAction} className="space-y-4"><label className="block text-sm">Nigerian mobile number<input name="phone" required autoComplete="tel" type="tel" placeholder="080… or +234…" className={field}/></label>{requestState.error && <p role="alert" className="text-sm text-red-300">{requestState.error}</p>}<button type="submit" disabled={requestPending} className="w-full rounded-lg bg-lime-300 px-4 py-3 text-sm font-bold text-neutral-950">{requestPending ? "Sending code…" : "Send phone verification code"}</button></form> : <form action={verifyAction} className="space-y-4"><input type="hidden" name="phone" value={phone}/><p className="text-sm text-neutral-300">Enter the six-digit code sent to <strong>{phone}</strong>.{requestState.delivery === "LOCAL" && " In local development, the code is printed in the server terminal."}</p><label className="block text-sm">Verification code<input name="code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" className={field}/></label>{verifyState.error && <p role="alert" className="text-sm text-red-300">{verifyState.error}</p>}<button type="submit" disabled={verifyPending} className="w-full rounded-lg bg-lime-300 px-4 py-3 text-sm font-bold text-neutral-950">{verifyPending ? "Verifying…" : "Verify phone number"}</button><button type="button" onClick={() => window.location.reload()} className="w-full text-xs text-neutral-400 underline">Use a different phone number</button></form>}
  </div>;
}
