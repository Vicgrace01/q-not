"use client";

import { useMemo, useState, type ReactNode } from "react";

type DemoTab = "plan" | "reserve" | "journey";
type PaymentState = "idle" | "held" | "released" | "settled";

const FARE = 2500;
const CAPACITY = 18;
const PICKUP_STOPS = ["Peter Mbah Terminal", "Opi Junction", "UNN Gate"];
const DROPOFF_STOPS = ["Opi Junction", "UNN Gate", "Nsukka Main Park"];

function Naira({ value }: { value: number }) {
  return <>{`₦${value.toLocaleString("en-NG")}`}</>;
}

function DemoIcon({ name }: { name: "route" | "wallet" | "ticket" | "camera" | "bus" | "check" | "arrow" | "lock" | "pin" | "refresh" }) {
  const paths: Record<typeof name, ReactNode> = {
    route: <><path d="M5 19c5-1 2-13 8-14 3 0 4 2 6 2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="7" r="2"/></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 9V6a2 2 0 0 1 2-2h13M15 13h6"/><circle cx="16" cy="13" r=".7" fill="currentColor"/></>,
    ticket: <><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7Z"/><path d="M13 7v10" strokeDasharray="2 2"/></>,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3"/></>,
    bus: <><rect x="4" y="3" width="16" height="17" rx="3"/><path d="M4 9h16M8 20v2M16 20v2M8 14h.01M16 14h.01"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrow: <><path d="M4 12h15M13 5l7 7-7 7"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 2M4 12l2 2a7 7 0 0 0 12-2"/></>,
  };
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function QNotJourneyDemo() {
  const [tab, setTab] = useState<DemoTab>("plan");
  const [pickup, setPickup] = useState(PICKUP_STOPS[0]);
  const [dropoff, setDropoff] = useState(DROPOFF_STOPS[2]);
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [walletBalance, setWalletBalance] = useState(18000);
  const [availableSeats, setAvailableSeats] = useState(8);
  const [waitlistCount, setWaitlistCount] = useState(4);
  const [waitlistOffer, setWaitlistOffer] = useState(false);
  const [onboardCount, setOnboardCount] = useState(10);
  const [cameraCount, setCameraCount] = useState(10);
  const [walkInTaps, setWalkInTaps] = useState(3);
  const [progress, setProgress] = useState(28);
  const [notice, setNotice] = useState("Choose a departure to see how Q-not works.");

  const heldAmount = paymentState === "held" ? FARE : 0;
  const settledAmount = paymentState === "settled" ? FARE : 0;
  const progressLabel = useMemo(() => {
    if (progress >= 100) return "Arrived at Nsukka Main Park";
    if (progress >= 70) return "Approaching your stop";
    if (progress >= 45) return "Passing Opi Junction";
    return "Departed Peter Mbah Terminal";
  }, [progress]);

  function holdSeat() {
    if (paymentState === "held" || paymentState === "settled") return;
    if (availableSeats < 1) {
      setNotice("This departure is full. Join the waitlist or compare the next bus.");
      return;
    }
    if (walletBalance < FARE) {
      setNotice("Your demo wallet balance is too low for this fare.");
      return;
    }
    setWalletBalance((balance) => balance - FARE);
    setAvailableSeats((seats) => seats - 1);
    setPaymentState("held");
    setWaitlistOffer(false);
    setNotice("Your place is held. The demo wallet has reserved ₦2,500; no real money moved.");
  }

  function releaseSeat() {
    if (paymentState !== "held") return;
    setWalletBalance((balance) => balance + FARE);
    setAvailableSeats((seats) => Math.min(CAPACITY, seats + 1));
    setPaymentState("released");
    setNotice("₦2,500 released to the demo balance. You have not paid for a trip you will not take.");
  }

  function acceptWaitlistOffer() {
    if (!waitlistOffer || waitlistCount < 1) return;
    setWaitlistCount((count) => count - 1);
    setWaitlistOffer(false);
    setAvailableSeats((seats) => Math.max(0, seats - 1));
    setNotice("The next passenger accepted the released place. The seat is held for them in this simulation.");
  }

  function offerToWaitlist() {
    if (paymentState !== "released" || waitlistCount < 1 || availableSeats < 1) return;
    setWaitlistOffer(true);
    setNotice("A seat offer has been sent to the next person on the waitlist.");
  }

  function boardPassenger() {
    if (paymentState !== "held") return;
    setPaymentState("settled");
    setOnboardCount((count) => Math.min(CAPACITY, count + 1));
    setCameraCount((count) => Math.min(CAPACITY, count + 1));
    setNotice("Boarding confirmed. The held fare is now marked as settled in the demo.");
    setTab("journey");
  }

  function recordWalkInTap() {
    if (onboardCount >= CAPACITY) {
      setNotice("The bus is at capacity in this demo.");
      return;
    }
    setWalkInTaps((count) => count + 1);
    setOnboardCount((count) => count + 1);
    setCameraCount((count) => count + 1);
    setAvailableSeats((count) => Math.max(0, count - 1));
    setNotice("Walk-in fare tap accepted. The onboard count increased even though this passenger did not book in the app.");
  }

  function recordCameraExit() {
    if (onboardCount <= 0) return;
    setOnboardCount((count) => Math.max(0, count - 1));
    setCameraCount((count) => Math.max(0, count - 1));
    setAvailableSeats((count) => Math.min(CAPACITY, count + 1));
    setNotice("The door camera detected an exit. One seat is available for the next route segment.");
  }

  function advanceBus() {
    setProgress((value) => (value >= 100 ? 18 : Math.min(100, value + 22)));
  }

  function resetWalkthrough() {
    setTab("plan");
    setPaymentState("idle");
    setWalletBalance(18000);
    setAvailableSeats(8);
    setWaitlistCount(4);
    setWaitlistOffer(false);
    setOnboardCount(10);
    setCameraCount(10);
    setWalkInTaps(3);
    setProgress(28);
    setNotice("The sample trip has been reset. Try another journey.");
  }

  return (
    <section className="q-sim-section" id="the-journey" aria-labelledby="q-sim-title">
      <div className="page-width">
        <div className="q-sim-heading">
          <div>
            <span className="q-section-kicker">A TRIP THAT STARTS BEFORE YOU LEAVE</span>
            <h2 id="q-sim-title">See it. Secure it.<br/><em>Move when ready.</em></h2>
          </div>
          <p>No blind trip to the park. Check the bus, know the queue, hold a place with a payment commitment and follow the journey to your stop.</p>
        </div>

        <div className="q-sim-shell">
          <aside className="q-sim-rail">
            <div className="q-sim-rail-brand"><span className="q-sim-mark">Q</span><div><strong>YOUR TRIP</strong><small>Enugu → Nsukka</small></div></div>
            <div className="q-sim-step-list" aria-label="Walkthrough steps">
              <button type="button" className={tab === "plan" ? "is-active" : ""} onClick={() => setTab("plan")}><span>01</span><b>Check before leaving</b><small>Departures & queue</small></button>
              <button type="button" className={tab === "reserve" ? "is-active" : ""} onClick={() => setTab("reserve")}><span>02</span><b>Hold your place</b><small>Payment & release</small></button>
              <button type="button" className={tab === "journey" ? "is-active" : ""} onClick={() => setTab("journey")}><span>03</span><b>Board & travel</b><small>Tap, camera & stops</small></button>
            </div>
            <div className="q-sim-hisa-card">
              <div className="q-sim-hisa-top"><span className="q-sim-hisa-word">hisa</span><span className="q-sim-concept-tag">CONCEPT</span></div>
              <strong>A possible payment partner.</strong>
              <p>Explore how a familiar wallet experience could support conditional fare holds and operator settlement.</p>
              <small>Unofficial concept only. No Hisa API, account or real funds are connected.</small>
            </div>
          </aside>

          <div className="q-sim-main">
            <div className="q-sim-main-top">
              <div><span className="q-sim-kicker">Q-NOT INTERACTIVE WALKTHROUGH</span><h3>{tab === "plan" ? "Would you leave home now?" : tab === "reserve" ? "Keep the seat. Keep control." : "Your bus is on the move."}</h3></div>
              <span className="q-sim-live"><i/> SIMULATED</span>
            </div>

            {tab === "plan" && (
              <div className="q-sim-plan">
                <div className="q-sim-route-inputs">
                  <label><span>BOARD AT</span><select value={pickup} onChange={(event) => setPickup(event.target.value)}>{PICKUP_STOPS.map((stop) => <option key={stop}>{stop}</option>)}</select></label>
                  <span className="q-sim-route-arrow">→</span>
                  <label><span>GET OFF AT</span><select value={dropoff} onChange={(event) => setDropoff(event.target.value)}>{DROPOFF_STOPS.map((stop) => <option key={stop}>{stop}</option>)}</select></label>
                </div>
                <div className="q-sim-departure-grid">
                  <article className="q-sim-departure-card q-sim-departure-card--featured">
                    <div className="q-sim-card-top"><span>LOWEST FARE</span><span className="q-sim-open-dot">AVAILABLE</span></div>
                    <div className="q-sim-departure-time">09:45 <small>AM</small></div>
                    <div className="q-sim-departure-route">Peter Mbah Terminal → Nsukka</div>
                    <div className="q-sim-price"><Naira value={FARE}/><span>per passenger</span></div>
                    <div className="q-sim-capacity-line"><span><b>{availableSeats}</b> seats open</span><span><b>{waitlistCount}</b> waiting</span></div>
                    <div className="q-sim-capacity-bar"><i style={{ width: `${((CAPACITY - availableSeats) / CAPACITY) * 100}%` }}/></div>
                    <button className="q-sim-action" type="button" onClick={() => setTab("reserve")}>See reservation <DemoIcon name="arrow"/></button>
                  </article>
                  <article className="q-sim-departure-card">
                    <div className="q-sim-card-top"><span>NEXT DEPARTURE</span><span className="q-sim-next-tag">LESS WAIT</span></div>
                    <div className="q-sim-departure-time">10:30 <small>AM</small></div>
                    <div className="q-sim-departure-route">Peter Mbah Terminal → Nsukka</div>
                    <div className="q-sim-price"><Naira value={2800}/><span>per passenger</span></div>
                    <div className="q-sim-capacity-line"><span><b>12</b> seats open</span><span><b>1</b> waiting</span></div>
                    <div className="q-sim-capacity-bar"><i style={{ width: "34%" }}/></div>
                    <button className="q-sim-action q-sim-action--quiet" type="button" onClick={() => setNotice("The next departure is selected for comparison in this simulated walkthrough.")}>Compare this bus <DemoIcon name="arrow"/></button>
                  </article>
                </div>
                <div className="q-sim-insight"><DemoIcon name="route"/><p><strong>Your pickup:</strong> {pickup} <span>·</span> <strong>Drop-off:</strong> {dropoff}. A seat is only held after the payment step succeeds.</p></div>
              </div>
            )}

            {tab === "reserve" && (
              <div className="q-sim-reserve">
                <div className="q-sim-payment-summary">
                  <div className="q-sim-payment-journey"><span className="q-sim-route-pill">ENUGU</span><i/><span className="q-sim-route-pill">NSUKKA</span></div>
                  <div className="q-sim-payment-fare"><span>FARE TO AUTHORISE</span><strong><Naira value={FARE}/></strong></div>
                  <div className="q-sim-payment-row"><span>Board at</span><b>{pickup}</b></div>
                  <div className="q-sim-payment-row"><span>Get off at</span><b>{dropoff}</b></div>
                  <div className="q-sim-payment-row"><span>Demo wallet available</span><b><Naira value={walletBalance}/></b></div>
                </div>
                <div className="q-sim-hold-panel">
                  <div className="q-sim-hold-heading"><span className="q-sim-hisa-word">hisa</span><span className="q-sim-concept-tag">POSSIBLE WALLET RAIL</span></div>
                  <h4>{paymentState === "held" ? "Your fare is on hold." : paymentState === "settled" ? "Boarding confirmed." : paymentState === "released" ? "Your money is back." : "Hold a seat without paying too early."}</h4>
                  <p>{paymentState === "held" ? "The demo has reserved ₦2,500. You can board and settle, or cancel and release the hold." : paymentState === "settled" ? "Your ticket is marked boarded and the held fare is marked settled in this demo." : paymentState === "released" ? "The fare has been returned to the demo balance. The seat can now be offered to the next passenger." : "A future payment partner could authorise the fare, reserve the seat, and release the funds if you cancel within the permitted window."}</p>
                  <div className="q-sim-wallet-ledger">
                    <div><span>AVAILABLE</span><strong><Naira value={walletBalance}/></strong></div>
                    <div><span>HELD</span><strong><Naira value={heldAmount}/></strong></div>
                    <div><span>SETTLED</span><strong><Naira value={settledAmount}/></strong></div>
                  </div>
                  {paymentState === "idle" && <button className="q-sim-action" type="button" onClick={holdSeat}><DemoIcon name="lock"/> Hold my seat · <Naira value={FARE}/></button>}
                  {paymentState === "held" && <div className="q-sim-button-row"><button className="q-sim-action" type="button" onClick={boardPassenger}>Confirm boarding <DemoIcon name="check"/></button><button className="q-sim-action q-sim-action--quiet" type="button" onClick={releaseSeat}>Cancel & release</button></div>}
                  {paymentState === "released" && !waitlistOffer && <div className="q-sim-button-row"><button className="q-sim-action" type="button" onClick={holdSeat}>Reserve again</button><button className="q-sim-action q-sim-action--quiet" type="button" onClick={offerToWaitlist}>Offer seat to waitlist</button></div>}
                  {waitlistOffer && <button className="q-sim-action" type="button" onClick={acceptWaitlistOffer}>Simulate next passenger accepting <DemoIcon name="check"/></button>}
                  {paymentState === "settled" && <button className="q-sim-action q-sim-action--quiet" type="button" onClick={resetWalkthrough}>Replay the journey <DemoIcon name="refresh"/></button>}
                  <small className="q-sim-disclaimer">Prototype only: this screen simulates a conditional payment. It is not connected to Hisa, a bank, a card processor or a real wallet. No money moves.</small>
                </div>
              </div>
            )}

            {tab === "journey" && (
              <div className="q-sim-travel">
                <div className="q-sim-tracker">
                  <div className="q-sim-tracker-top"><span>QN-021 · ENUGU → NSUKKA</span><span className="q-sim-live"><i/> ON THE ROAD</span></div>
                  <div className="q-sim-map">
                    <div className="q-sim-map-road"/>
                    <div className="q-sim-map-start"><i/>Peter Mbah</div>
                    <div className="q-sim-map-stop q-sim-map-stop--one"><i/>Opi</div>
                    <div className="q-sim-map-stop q-sim-map-stop--two"><i/>UNN Gate</div>
                    <div className="q-sim-map-end"><i/>Nsukka</div>
                    <div className="q-sim-map-bus" style={{ left: `${Math.min(90, Math.max(5, progress * 0.84))}%` }}><DemoIcon name="bus"/></div>
                  </div>
                  <div className="q-sim-progress-meta"><strong>{progressLabel}</strong><span>{Math.max(0, Math.ceil((100 - progress) * 0.42))} min estimated</span></div>
                  <div className="q-sim-capacity-bar q-sim-capacity-bar--route"><i style={{ width: `${progress}%` }}/></div>
                  <button className="q-sim-action" type="button" onClick={advanceBus}>Move bus along route <DemoIcon name="arrow"/></button>
                </div>
                <div className="q-sim-onboard">
                  <div className="q-sim-onboard-head"><div><span>ONBOARD RIGHT NOW</span><strong>{onboardCount} / {CAPACITY}</strong></div><div className="q-sim-camera-icon"><DemoIcon name="camera"/></div></div>
                  <div className="q-sim-occupancy-bar"><i style={{ width: `${(onboardCount / CAPACITY) * 100}%` }}/></div>
                  <div className="q-sim-reconcile"><span>Door camera count <b>{cameraCount}</b></span><span>Tap-to-pay riders <b>{walkInTaps}</b></span></div>
                  <p>People who board without the app still count. QR tickets, tap events, driver checks and privacy-preserving camera counts help reconcile occupancy.</p>
                  <div className="q-sim-button-row"><button className="q-sim-action" type="button" onClick={recordWalkInTap}>Simulate walk-in tap</button><button className="q-sim-action q-sim-action--quiet" type="button" onClick={recordCameraExit}>Passenger exits</button></div>
                </div>
              </div>
            )}

            <div className="q-sim-feedback" aria-live="polite"><span><i/></span>{notice}</div>
            <div className="q-sim-footer-nav">
              <span>ILLUSTRATIVE DATA · NO LIVE VEHICLE OR PAYMENT CONNECTION</span>
              <div>
                {tab !== "plan" && <button type="button" onClick={() => setTab(tab === "journey" ? "reserve" : "plan")}>Back</button>}
                {tab !== "journey" && <button type="button" onClick={() => setTab(tab === "plan" ? "reserve" : "journey")}>Next <DemoIcon name="arrow"/></button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
