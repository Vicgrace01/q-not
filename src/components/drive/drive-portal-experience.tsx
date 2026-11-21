"use client";

import { useState } from "react";
import Link from "next/link";
import { VehicleCatalogue3D, type VehicleTypeChoice } from "@/components/vehicle-catalogue-3d";

export function DrivePortalExperience() {
  const [vehicleType, setVehicleType] = useState<VehicleTypeChoice>("DANFO");

  return (
    <main className="q-app q-portal-page q-drive-portal">
      <header className="q-home-header">
        <div className="q-home-header-inner">
          <Link href="/" className="q-logo q-home-wordmark" aria-label="Q-not home"><span className="q-logo-mark"><span>Q</span><i /></span><span className="q-logo-word">q-not<span className="q-logo-period">.</span></span></Link>
          <nav className="q-home-nav" aria-label="Drive portal navigation"><Link href="/">Passenger network</Link><Link href="/operators">Operator portal</Link><Link href="/network">Network control</Link></nav>
          <div className="q-home-header-actions"><Link className="q-home-signin" href="/driver/login">Driver sign in</Link><Link className="q-home-header-cta" href="/driver/login"><span>Join the network</span><i>↗</i></Link></div>
        </div>
      </header>

      <section className="q-drive-hero">
        <div className="page-width q-drive-hero-inner">
          <div className="q-drive-hero-copy">
            <span className="q-home-kicker"><i /> Q-NOT DRIVE / INDEPENDENT & FLEET DRIVERS</span>
            <h1>Your bus.<br /><em>Your route.</em><br />A bigger network.</h1>
            <p>Bring your Danfo, Korope, Hiace, Coaster or shuttle onto a network that helps make passenger demand visible. Register your actual vehicle, complete the required checks and request access to the corridors you operate.</p>
            <div className="q-drive-hero-actions"><Link className="q-home-cta-primary" href="/driver/login">Register as a driver <span>↗</span></Link><Link className="q-home-cta-quiet" href="#vehicle-explorer">Explore vehicle classes <span>↓</span></Link></div>
            <div className="q-drive-hero-proof"><span><b>01</b> Driver profile</span><span><b>02</b> Vehicle records</span><span><b>03</b> Route approval</span></div>
          </div>
          <div className="q-drive-hero-graphic" aria-hidden="true"><div className="q-drive-orbit q-drive-orbit--outer"/><div className="q-drive-orbit q-drive-orbit--inner"/><div className="q-drive-route-line"><i/><i/><i/></div><div className="q-drive-hero-stamp"><strong>DRIVE</strong><span>WITH Q-NOT</span></div><div className="q-drive-hero-caption"><span>INDEPENDENT OPERATORS</span><span>FLEET OWNERS</span><span>SHARED ROUTES</span></div></div>
        </div>
      </section>

      <section className="q-drive-explorer" id="vehicle-explorer">
        <div className="page-width">
          <div className="q-home-section-head">
            <div><span className="q-home-kicker">STEP INSIDE YOUR VEHICLE CLASS</span><h2>See the body.<br /><em>Explore the cabin.</em></h2></div>
            <p>Choose a vehicle class, switch between exterior and cabin views, and rotate the model. During registration, enter the details and approved capacity of your actual vehicle.</p>
          </div>
          <VehicleCatalogue3D value={vehicleType} onChange={setVehicleType} />
        </div>
      </section>

      <section className="q-drive-process">
        <div className="page-width">
          <span className="q-home-kicker">HOW TO COME ON BOARD</span>
          <div className="q-drive-process-grid">
            <article><span>01</span><h3>Create your driver account.</h3><p>Verify your phone, link your email and submit your legal driver profile.</p></article>
            <article><span>02</span><h3>Register the actual vehicle.</h3><p>Provide its plate, make, model, colour, capacity, registration, insurance and inspection records.</p></article>
            <article><span>03</span><h3>Request route access.</h3><p>Choose the corridors you operate. Driver, vehicle and route approval are checked separately.</p></article>
            <article><span>04</span><h3>Publish a departure.</h3><p>When approved, publish your available seats and departure so compatible passenger demand can find you.</p></article>
          </div>
          <div className="q-drive-bottom-cta"><div><strong>One bus is enough to join.</strong><p>You do not need to own a large fleet to participate. You do need the correct documents and route authorisation.</p></div><Link className="q-home-cta-primary" href="/driver/login">Start driver registration <span>↗</span></Link></div>
        </div>
      </section>

      <footer className="q-home-footer"><div className="page-width q-home-footer-top"><Link href="/" className="q-logo q-home-wordmark"><span className="q-logo-mark"><span>Q</span><i /></span><span className="q-logo-word">q-not<span className="q-logo-period">.</span></span></Link><p>Bring your vehicle.<br /><strong>Move with the network.</strong></p><div className="q-home-footer-links"><Link href="/">Passenger experience</Link><Link href="/operators">Operator portal</Link><Link href="/network">Network control</Link><Link href="/driver/login">Driver access</Link></div></div><div className="page-width q-home-footer-bottom"><span>© 2026 Q-not</span><span>DRIVE / OPERATE / CONNECT</span></div></footer>
    </main>
  );
}
