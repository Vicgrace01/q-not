# Q-not product and demo boundaries

## The product proposition

Q-not is not just a digital ticket counter. It is a pre-trip decision and journey-control layer for bus travel:

- See departures, fare, seats open, people ahead and estimated wait before leaving home.
- Hold a seat through payment commitment; keep the free waitlist separate from paid reservations.
- Release/refund an eligible reservation and reassign its place according to a clear cutoff policy.
- Track vehicles and approved pickup/drop-off stops along a route.
- Reconcile booked passengers with QR boarding, paid walk-ins and anonymous door counts.
- Give operators a shared view of demand, departures, reservations, boarding and occupancy.

## Critical data model distinction

The current database queue transaction has a row lock and is covered by concurrency tests, but its present behaviour increments `Trip.seatsTaken` when a commuter joins the queue. The new payment walkthrough is a browser-only simulation. It does not yet share a single production reservation ledger with the Prisma queue tables.

Before any real payment integration, separate:

1. Waitlist entries (no capacity consumption).
2. Payment-authorised seat reservations with expiry and idempotent payment references.
3. Boarding confirmations and settlement/capture events.
4. Cancellation, release, void/refund and replacement events.
5. QR and tap-to-pay walk-in events.
6. Occupancy counts, with camera confidence and driver corrections.
7. Segment-level capacity, so seats can be reused after an intermediate stop.

## Payments

- A card hold is possible only where the payment provider/acquirer supports authorisation and later capture/void.
- A wallet hold requires a licensed partner's safeguarded ledger and release/refund capability.
- Q-not should not collect or custody customer funds in an ordinary business account.
- The fare is settled only according to explicit boarding, grace-period and cancellation rules.
- Walk-in passengers can tap a compatible card/phone validator and be reconciled without app registration.

## Hisa

Hisa is shown as a possible partner concept based on public product positioning. No Hisa merchant API, wallet debit permission, pre-authorisation, escrow, refund or partnership has been confirmed. Use no official logo and do not imply endorsement.

## Onboard counting and privacy

The camera concept is an anonymous door-count signal, not identity recognition. A realistic design would process virtual-line crossings on an onboard edge device, then send minimal timestamped count events and confidence values. It should not continuously stream raw footage to passenger phones. Complete a privacy impact assessment and define signage, access control, retention and data minimisation before a real pilot.

## Mapping

Leaflet is a map renderer, not a source of satellite imagery. A production map needs a tile/data provider and valid licensing. Start with street-map tiles and accurate terminal/pickup pins; only add satellite imagery if it provides real navigation value and the chosen provider's terms permit it.
