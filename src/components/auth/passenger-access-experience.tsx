"use client";

import Link from "next/link";
import { useEffect, useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestEmailOtpAction, requestOtpAction, type CommuterAuthState } from "@/lib/actions/commuter-auth";
import { QNotBrand } from "@/components/qnot-brand";

const initialState: CommuterAuthState = {};

function authErrorMessage(code: string | null) {
  if (code === "google-not-configured") return "Google sign-in is not configured in this environment yet.";
  if (code === "account-service-unavailable") return "Q-not could not reach the account service. Your details are safe. Please try again shortly.";
  if (code === "google-service-unavailable") return "Google sign-in is temporarily unreachable from this connection. Try again or continue with email.";
  if (code === "google-sign-in-failed") return "Google could not complete sign-in. Please try again or continue with email.";
  if (code === "google-verification-failed") return "The Google sign-in could not be verified. Please start again.";
  return null;
}

export function PassengerAccessExperience() {
  const router = useRouter();
  const params = useSearchParams();
  const [phoneState, phoneAction, phonePending] = useActionState(requestOtpAction, initialState);
  const [emailState, emailAction, emailPending] = useActionState(requestEmailOtpAction, initialState);
  const authError = authErrorMessage(params.get("error"));

  useEffect(() => {
    if (phoneState.phone) {
      router.push(`/c/login/verify?phone=${encodeURIComponent(phoneState.phone)}&delivery=${phoneState.delivery ?? "LOCAL"}`);
    }
  }, [phoneState.phone, phoneState.delivery, router]);

  useEffect(() => {
    if (emailState.email) router.push(`/c/login/email/verify?email=${encodeURIComponent(emailState.email)}`);
  }, [emailState.email, router]);

  return (
    <main className="qnot-passenger-access-page">
      <header className="qnot-passenger-access-topbar">
        <QNotBrand />
        <nav aria-label="Passenger sign-in navigation">
          <Link href="/trips">Explore departures <i>↗</i></Link>
          <Link href="/#journey-experience">How Q-not works</Link>
          <Link href="/drive">Drive with Q-not</Link>
        </nav>
        <span className="qnot-passenger-access-meta">PASSENGER ACCESS / LAGOS</span>
      </header>

      <div className="qnot-passenger-access-layout">
        <section className="qnot-passenger-access-story">
          <span className="qnot-passenger-access-eyebrow"><i /> YOUR CITY, WITH MORE CERTAINTY</span>
          <h1>Know your ride<br /><em>before you go.</em></h1>
          <p className="qnot-passenger-access-intro">See the route, understand the fare, choose a service and follow your journey. Q-not connects the people travelling with the vehicles moving through the city.</p>

          <div className="qnot-passenger-access-scene" aria-label="Q-not journey preview">
            <div className="qnot-passenger-access-scene-top"><span>THE Q-NOT JOURNEY</span><b><i /> ROUTE EXPERIENCE</b></div>
            <div className="qnot-passenger-access-image" />
            <svg className="qnot-passenger-access-route" viewBox="0 0 760 220" fill="none" role="img" aria-label="A bus moving along a route between pickup stops">
              <defs>
                <linearGradient id="qnotPassengerRouteGlow" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#d6ff3f" stopOpacity=".15"/><stop offset=".53" stopColor="#d6ff3f" stopOpacity=".95"/><stop offset="1" stopColor="#d6ff3f" stopOpacity=".25"/></linearGradient>
              </defs>
              <path d="M25 163 C142 163 118 66 260 66 S398 187 505 137 634 42 735 57" stroke="#243f2d" strokeWidth="29" strokeLinecap="round"/>
              <path d="M25 163 C142 163 118 66 260 66 S398 187 505 137 634 42 735 57" stroke="url(#qnotPassengerRouteGlow)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="7 11" className="qnot-passenger-access-road-dash"/>
              <g className="qnot-passenger-access-stop"><circle cx="25" cy="163" r="8" fill="#d6ff3f"/><circle cx="25" cy="163" r="17" stroke="#d6ff3f" strokeOpacity=".27"/></g>
              <g className="qnot-passenger-access-stop"><circle cx="260" cy="66" r="8" fill="#d6ff3f"/><circle cx="260" cy="66" r="17" stroke="#d6ff3f" strokeOpacity=".27"/></g>
              <g className="qnot-passenger-access-stop"><circle cx="505" cy="137" r="8" fill="#d6ff3f"/><circle cx="505" cy="137" r="17" stroke="#d6ff3f" strokeOpacity=".27"/></g>
              <g className="qnot-passenger-access-bus">
                <rect x="-26" y="-13" width="52" height="26" rx="7" fill="#d6ff3f"/>
                <rect x="-18" y="-8" width="14" height="9" rx="2" fill="#102016"/><rect x="2" y="-8" width="14" height="9" rx="2" fill="#102016"/>
                <circle cx="-15" cy="14" r="4" fill="#07130f"/><circle cx="15" cy="14" r="4" fill="#07130f"/>
                <animateMotion dur="10s" repeatCount="indefinite" rotate="auto" path="M25 163 C142 163 118 66 260 66 S398 187 505 137 634 42 735 57"/>
              </g>
              <g fill="#d6ff3f" fontSize="10" fontWeight="800" letterSpacing="1.3"><text x="25" y="198">PICKUP</text><text x="260" y="34" textAnchor="middle">YOUR ROUTE</text><text x="735" y="91" textAnchor="end">ARRIVAL</text></g>
            </svg>
            <div className="qnot-passenger-access-scene-foot"><span>01 / FIND YOUR SERVICE</span><span>02 / KNOW YOUR BUS</span><span>03 / FOLLOW YOUR TRIP</span></div>
          </div>

          <div className="qnot-passenger-access-benefits">
            <div><b>01</b><span><strong>Know before you go</strong><small>Compare routes, fares and departures.</small></span></div>
            <div><b>02</b><span><strong>Board with confidence</strong><small>See your assigned bus and boarding pass.</small></span></div>
            <div><b>03</b><span><strong>Stay with your journey</strong><small>Follow eligible trips and keep receipts together.</small></span></div>
          </div>
        </section>

        <section className="qnot-passenger-access-form-column" aria-labelledby="qnot-passenger-access-title">
          <div className="qnot-passenger-access-form-card">
            <div className="qnot-passenger-access-form-mark" aria-hidden="true">Q<i /></div>
            <span className="qnot-passenger-access-form-kicker">YOUR Q-NOT ACCOUNT</span>
            <h2 id="qnot-passenger-access-title">Welcome aboard.</h2>
            <p className="qnot-passenger-access-form-intro">Sign in or create your passenger account to save journeys, manage tickets and keep trip records together.</p>
            <p className="qnot-passenger-access-optional-phone">You can explore routes and departures without verifying a phone number. Continue with Google or email now; add a mobile number later in Profile &amp; Safety when you need it.</p>

            {authError && <p className="qnot-passenger-access-error" role="alert">{authError}</p>}

            <a href="/api/auth/google?role=passenger" className="qnot-passenger-access-google"><span aria-hidden="true">G</span> Continue with Google</a>

            <div className="qnot-passenger-access-divider"><span /> OR CONTINUE WITH EMAIL <span /></div>

            <form action={emailAction} className="qnot-passenger-access-form qnot-passenger-access-email" id="email-access">
              <label htmlFor="passenger-email">Email address</label>
              <input id="passenger-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
              {emailState.error && <p className="qnot-passenger-access-error" role="alert">{emailState.error}</p>}
              <button type="submit" className="is-secondary" disabled={emailPending}>{emailPending ? "Sending email code…" : "Continue with email"}<i>↗</i></button>
            </form>

            <details className="qnot-passenger-access-phone-details" open={Boolean(phoneState.error || phoneState.delivery)}>
              <summary>Prefer to sign in with a phone number? <span>Optional</span></summary>
              <div className="qnot-passenger-access-phone-details-body">
                <p>Use SMS sign-in instead. Phone verification is optional for exploring Q-not.</p>
                <form action={phoneAction} className="qnot-passenger-access-form">
                  <label htmlFor="passenger-phone">Mobile number</label>
                  <div className="qnot-passenger-access-phone"><span>+234</span><input id="passenger-phone" name="phone" type="tel" autoComplete="tel" required placeholder="801 234 5678" /></div>
                  {phoneState.error && <p className="qnot-passenger-access-error" role="alert">{phoneState.error}</p>}
                  <button type="submit" disabled={phonePending}>{phonePending ? "Sending your code…" : "Continue with phone"}<i>↗</i></button>
                  {phoneState.delivery && <small className="qnot-passenger-access-delivery">{phoneState.delivery === "SMS" ? "Your verification code has been sent by SMS." : "Your local development code is in the Q-not server terminal."}</small>}
                </form>
              </div>
            </details>

            <div className="qnot-passenger-access-foot"><span>Secure access / Your account, tickets and trip records.</span><Link href="/login">Operating a service? <b>Operator access ↗</b></Link></div>
          </div>
          <p className="qnot-passenger-access-security"><i>⌑</i> Your journey information is only shown to the people involved in that service.</p>
        </section>
      </div>

      <footer className="qnot-passenger-access-footer"><span>Q-NOT / SHARED TRANSPORT, COORDINATED.</span><Link href="/">Back to the city ↗</Link></footer>
    </main>
  );
}
