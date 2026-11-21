export function DriverShiftStory() {
  return (
    <section className="qnot-driver-shift-story" aria-label="A day on Q-not Drive">
      <div className="qnot-driver-shift-heading">
        <span><i /> A SHIFT, FROM ALERT TO ARRIVAL</span>
        <small>THE Q-NOT DRIVE FLOW</small>
      </div>

      <div className="qnot-driver-shift-stage">
        <div className="qnot-driver-shift-grid" aria-hidden="true" />
        <div className="qnot-driver-notification">
          <span className="qnot-driver-notification-icon" aria-hidden="true">
            <svg viewBox="0 0 28 28" fill="none"><path d="M5 19.5 19.5 5M8 5h11.5V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="21" r="2" fill="currentColor" /></svg>
          </span>
          <span className="qnot-driver-notification-copy">
            <small>NEW SERVICE OPPORTUNITY</small>
            <strong>Passengers need a ride</strong>
            <span>Ikeja <i /> Ojota <b>·</b> 6 seats requested</span>
          </span>
          <b className="qnot-driver-notification-tag">NEW</b>
        </div>

        <div className="qnot-driver-keys-card">
          <span className="qnot-driver-keys-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none"><circle cx="15" cy="17" r="8" stroke="currentColor" strokeWidth="3"/><path d="m21 23 17 17m-6-6 5-5m-11 0 5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="15" cy="17" r="2.4" fill="currentColor"/></svg>
          </span>
          <span><small>READY WHEN YOU ARE</small><strong>Keys in hand</strong></span>
        </div>

        <svg className="qnot-driver-shift-road" viewBox="0 0 820 330" role="img" aria-label="A Q-not minibus travelling along a route and stopping to collect passengers">
          <defs>
            <linearGradient id="qnot-road-glow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d6ff3f" stopOpacity="0.08"/><stop offset=".5" stopColor="#d6ff3f" stopOpacity="0.42"/><stop offset="1" stopColor="#d6ff3f" stopOpacity="0.08"/></linearGradient>
            <linearGradient id="qnot-vehicle-paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e5ff91"/><stop offset="1" stopColor="#a9d92e"/></linearGradient>
            <filter id="qnot-vehicle-shadow" x="-30%" y="-50%" width="160%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
          </defs>
          <path d="M27 247 C145 247 148 172 270 172 S409 267 518 213 661 116 794 132" stroke="#1d3428" strokeWidth="64" fill="none" strokeLinecap="round"/>
          <path d="M27 247 C145 247 148 172 270 172 S409 267 518 213 661 116 794 132" stroke="#55705a" strokeOpacity=".42" strokeWidth="2" fill="none" strokeDasharray="2 10" strokeLinecap="round"/>
          <path d="M27 247 C145 247 148 172 270 172 S409 267 518 213 661 116 794 132" stroke="url(#qnot-road-glow)" strokeWidth="2.5" fill="none" strokeDasharray="7 12" strokeLinecap="round" className="qnot-driver-road-dash"/>

          <g className="qnot-driver-stop qnot-driver-stop--one">
            <circle cx="270" cy="172" r="18" fill="#d6ff3f" fillOpacity=".08" stroke="#d6ff3f" strokeOpacity=".5"/>
            <circle cx="270" cy="172" r="6" fill="#d6ff3f"/>
            <path d="M270 150v-18" stroke="#d6ff3f" strokeOpacity=".65" strokeWidth="1.5"/>
            <rect x="232" y="103" width="76" height="24" rx="12" fill="#14271c" stroke="#6d8b3a" strokeOpacity=".6"/>
            <text x="270" y="118" fill="#cfe99b" fontSize="8" fontWeight="800" textAnchor="middle" letterSpacing="1">PICKUP 01</text>
          </g>
          <g className="qnot-driver-passengers qnot-driver-passengers--one">
            <circle cx="245" cy="150" r="5" fill="#f4d1a7"/><path d="M245 156v13m-6-6h12m-10 6-4 9m8-9 4 9" stroke="#f4d1a7" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="260" cy="145" r="5" fill="#a9c6f0"/><path d="M260 151v13m-6-6h12m-10 6-4 9m8-9 4 9" stroke="#a9c6f0" strokeWidth="2" strokeLinecap="round"/>
          </g>

          <g className="qnot-driver-stop qnot-driver-stop--two">
            <circle cx="518" cy="213" r="18" fill="#d6ff3f" fillOpacity=".08" stroke="#d6ff3f" strokeOpacity=".5"/>
            <circle cx="518" cy="213" r="6" fill="#d6ff3f"/>
            <path d="M518 191v-18" stroke="#d6ff3f" strokeOpacity=".65" strokeWidth="1.5"/>
            <rect x="480" y="148" width="76" height="24" rx="12" fill="#14271c" stroke="#6d8b3a" strokeOpacity=".6"/>
            <text x="518" y="163" fill="#cfe99b" fontSize="8" fontWeight="800" textAnchor="middle" letterSpacing="1">PICKUP 02</text>
          </g>
          <g className="qnot-driver-passengers qnot-driver-passengers--two">
            <circle cx="493" cy="191" r="5" fill="#f1b8ae"/><path d="M493 197v13m-6-6h12m-10 6-4 9m8-9 4 9" stroke="#f1b8ae" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="508" cy="186" r="5" fill="#c5d9a4"/><path d="M508 192v13m-6-6h12m-10 6-4 9m8-9 4 9" stroke="#c5d9a4" strokeWidth="2" strokeLinecap="round"/>
          </g>

          <g className="qnot-driver-moving-bus">
            <animateMotion dur="12s" repeatCount="indefinite" rotate="auto" path="M34 247 C145 247 148 172 270 172 S409 267 518 213 661 116 786 132" />
            <ellipse cx="0" cy="35" rx="54" ry="9" fill="#000" fillOpacity=".45" filter="url(#qnot-vehicle-shadow)"/>
            <rect x="-49" y="-12" width="98" height="42" rx="10" fill="url(#qnot-vehicle-paint)" stroke="#f2ffd8" strokeWidth="1.4"/>
            <path d="M-40-7h28v18h-28zM-7-7h22v18H-7zM20-7h20v18H20z" fill="#19342a" stroke="#74964a" strokeWidth="1"/>
            <path d="M-48 14h96" stroke="#557c2e" strokeWidth="2"/>
            <path d="M-36 20h72" stroke="#f5ffd9" strokeOpacity=".75" strokeWidth="1"/>
            <rect x="-42" y="25" width="15" height="4" rx="2" fill="#f3f5e8"/>
            <rect x="29" y="25" width="13" height="4" rx="2" fill="#ff9a61"/>
            <circle cx="-29" cy="30" r="7" fill="#07130f" stroke="#8caa53" strokeWidth="2"/>
            <circle cx="31" cy="30" r="7" fill="#07130f" stroke="#8caa53" strokeWidth="2"/>
            <circle cx="-29" cy="30" r="2" fill="#d9e8ba"/>
            <circle cx="31" cy="30" r="2" fill="#d9e8ba"/>
          </g>

          <g className="qnot-driver-arrival-chip">
            <rect x="631" y="56" width="146" height="33" rx="16.5" fill="#14271c" stroke="#d6ff3f" strokeOpacity=".34"/>
            <circle cx="649" cy="72.5" r="4" fill="#d6ff3f"/>
            <text x="662" y="76" fill="#e4f2cf" fontSize="8" fontWeight="800" letterSpacing=".8">BOARDING CONFIRMED</text>
          </g>
        </svg>

        <div className="qnot-driver-shift-stage-footer"><span><i /> ROUTE IN MOTION</span><span>DEMAND → PICKUP → ARRIVAL</span></div>
      </div>

      <div className="qnot-driver-shift-steps" aria-label="Driver journey sequence">
        <div><b>01</b><span><strong>Get the alert</strong><small>See compatible demand</small></span></div>
        <div><b>02</b><span><strong>Get ready</strong><small>Choose your vehicle</small></span></div>
        <div><b>03</b><span><strong>Take the route</strong><small>Follow the pickup plan</small></span></div>
        <div><b>04</b><span><strong>Move together</strong><small>Confirm each boarding</small></span></div>
      </div>
      <p className="qnot-driver-shift-note">An overview of the driver journey. Actual service opportunities appear after your driver, vehicle and route approvals are complete.</p>
    </section>
  );
}
