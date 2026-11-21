"use client";

import Link from "next/link";
import { Suspense, useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestDriverEmailOtpAction, requestDriverOtpAction, type DriverAuthState } from "@/lib/actions/driver-auth";
import { QNotBrand } from "@/components/qnot-brand";
import { DriverShiftStory } from "@/components/drive/driver-shift-story";

function DriverLoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const authError = params.get("error");
  const [state, formAction, pending] = useActionState(requestDriverOtpAction, {} as DriverAuthState);
  const [emailState, emailFormAction, emailPending] = useActionState(requestDriverEmailOtpAction, {} as DriverAuthState);

  useEffect(() => {
    if (state.phone) router.push(`/driver/login/verify?phone=${encodeURIComponent(state.phone)}&delivery=${state.delivery ?? "LOCAL"}`);
  }, [state.phone, state.delivery, router]);

  useEffect(() => {
    if (emailState.email) router.push(`/driver/login/verify?email=${encodeURIComponent(emailState.email)}&delivery=${emailState.delivery ?? "LOCAL"}`);
  }, [emailState.email, emailState.delivery, router]);

  return (
    <main className="qnot-driver-login-page">
      <header className="qnot-driver-login-topbar">
        <QNotBrand />
        <div className="qnot-driver-login-topbar-right">
          <span>DRIVER NETWORK / LAGOS</span>
          <Link href="/drive">Explore Q-not Drive <i>↗</i></Link>
        </div>
      </header>

      <div className="qnot-driver-login-layout">
        <section className="qnot-driver-login-story">
          <span className="qnot-driver-login-eyebrow"><i /> INDEPENDENT DRIVERS / VEHICLE OWNERS / FLEETS</span>
          <h1>Your wheels.<br /><em>Your route.</em><br />A city in motion.</h1>
          <p className="qnot-driver-login-intro">Start with the vehicle you already operate. Q-not helps make compatible passenger demand visible, coordinates approved route services and keeps each departure connected to the people waiting for it.</p>
          <DriverShiftStory />
          <div className="qnot-driver-login-proof"><span><b>01</b> Verify your profile</span><span><b>02</b> Register your vehicle</span><span><b>03</b> Request route access</span></div>
        </section>

        <section className="qnot-driver-login-form-column" aria-labelledby="qnot-driver-login-title">
          <div className="qnot-driver-login-form-card">
            <div className="qnot-driver-login-form-mark" aria-hidden="true"><span>Q</span><i /></div>
            <span className="qnot-driver-login-form-kicker">DRIVER ACCESS / 01</span>
            <h2 id="qnot-driver-login-title">Get behind the wheel.</h2>
            <p className="qnot-driver-login-form-intro">Use Google or email to create or open your driver profile. Complete your profile and vehicle details now; add and verify a mobile number later in Profile &amp; Verification before publishing a service, opening boarding or accepting passengers.</p>

            {authError && (
              <p role="alert" className="qnot-driver-login-error">
                {authError === "google-not-configured"
                  ? "Google sign-in is not configured in this environment yet."
                  : authError === "account-service-unavailable"
                    ? "Q-not could not reach the account service. Your driver profile is safe; please try again shortly."
                    : authError === "google-service-unavailable"
                      ? "Google sign-in is temporarily unreachable from this connection. Try again or continue with email."
                      : "Sign-in could not be completed. Try another method."}
              </p>
            )}

            <a href="/api/auth/google?role=driver" className="qnot-driver-google-submit"><span className="qnot-google-g" aria-hidden="true">G</span> Continue with Google</a>

            <div className="qnot-driver-form-divider"><span /> <small>OR CONTINUE WITH EMAIL</small> <span /></div>

            <form action={emailFormAction} className="qnot-driver-login-form qnot-driver-email-form">
              <label htmlFor="driver-email">Email address</label>
              <input id="driver-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
              {emailState.error && <p role="alert" className="qnot-driver-form-error">{emailState.error}</p>}
              <button type="submit" disabled={emailPending} className="qnot-driver-secondary-submit">{emailPending ? "Sending your code…" : "Continue with email"}</button>
            </form>

            <details className="qnot-driver-phone-details" open={Boolean(state.error)}>
              <summary>Prefer SMS sign-in? <span>Optional</span></summary>
              <form action={formAction} className="qnot-driver-login-form qnot-driver-phone-details-body">
                <label htmlFor="driver-phone">Mobile number</label>
                <div className="qnot-driver-input-wrap"><span>+234</span><input id="driver-phone" name="phone" type="tel" autoComplete="tel" required placeholder="801 234 5678" /></div>
                {state.error && <p role="alert" className="qnot-driver-form-error">{state.error}</p>}
                <button type="submit" disabled={pending} className="qnot-driver-submit"><span>{pending ? "Sending your code…" : "Continue with phone"}</span><i>↗</i></button>
              </form>
            </details>

            <div className="qnot-driver-login-form-foot">
              <span><i /> Your driver account stays separate from your passenger profile.</span>
              <Link href="/c/login">Travelling as a passenger? <b>Sign in here ↗</b></Link>
            </div>
          </div>
          <p className="qnot-driver-login-security"><span>⌑</span> Driver, vehicle and route approvals are reviewed separately before a service can be published.</p>
        </section>
      </div>

      <footer className="qnot-driver-login-footer"><span>Q-NOT DRIVE / SHARED TRANSPORT OPERATIONS</span><span>BRING YOUR VEHICLE. MOVE WITH THE NETWORK.</span></footer>
    </main>
  );
}

export default function DriverLoginPage() {
  return (
    <Suspense fallback={<main className="qnot-driver-login-page"><div className="qnot-driver-login-loading"><QNotBrand /><span>Preparing driver access…</span></div></main>}>
      <DriverLoginContent />
    </Suspense>
  );
}
