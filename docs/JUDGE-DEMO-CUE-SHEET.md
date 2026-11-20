# Q-not — judge demo cue sheet

## The 15-second opening

“Before you leave home, Q-not tells you whether the bus is actually worth travelling to. You can compare price, seats, queue pressure and the next departure instead of discovering a long queue at the park.”

## 90-second product demonstration

1. **Discover (15s):** Search Enugu → Nsukka. Compare the affordable departure with the next one. Point to seats open, queue pressure and estimated wait.
2. **Commit (15s):** Choose a place. Show the simulated payment hold. Explain that a waitlist is free and does not consume a seat.
3. **Change plans (10s):** Cancel the reservation. Show the hold release and the place moving to the next waitlisted passenger.
4. **Board (15s):** Show the QR boarding event, then add a walk-in via simulated tap-to-pay.
5. **Reconcile (15s):** Trigger an anonymous door-count event and show occupancy reconciliation. Explain that the current camera event is simulated, not a live camera feed.
6. **Travel (15s):** Move the bus on the route and show approved pickup/drop-off selection and journey progress.
7. **Close (5s):** “Know before you go. Catch your bus. Stay in control.”

## Three points to land with judges

- This is not a ticket catalogue. It solves the decision passengers make before they leave home.
- Reservations are backed by a payment commitment; a free waitlist is separate from capacity.
- Booked riders, walk-ins and anonymous occupancy counts are reconciled so the operator sees more than app bookings.

## Honest technical boundaries

- Hisa is a potential partner concept only. No Hisa API, wallet permission, integration, endorsement or partnership is claimed.
- Payment authorisation, holds, release/refund, tap events and camera counts are simulated in the demo. No real money moves.
- GPS, route movement, ETA and pickup stops are sample data unless a live source is explicitly connected.
- A real deployment needs payment-provider contracts, operator data access, vehicle hardware, privacy impact assessment and an integrated reservation/ledger model.

## If a judge asks about Hisa

“We see Hisa as a potential financial-infrastructure conversation, not an integration we are claiming today. We would like to explore whether its wallet and partner capabilities could support payment-backed fare holds, release/refund and operator settlement. We need to validate the appropriate API and regulated operating model with Hisa.”
