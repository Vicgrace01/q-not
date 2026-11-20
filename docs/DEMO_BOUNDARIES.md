# Q-not prototype: functional vs simulated

This page is the source of truth for what the current demo proves.

| Capability | Current implementation | What is not claimed |
|---|---|---|
| Departure discovery | Functional filters over seed departures | No live terminal schedule feed |
| Q-less queue | Functional browser-side state machine and queue positions | No cross-device persistence or production identity |
| Seat availability | Derived from sample capacity, confirmed boardings and temporary call holds | No live vehicle inventory feed |
| Call-next | Operator action holds one sample seat and creates a sample ticket code | Not a carrier-issued ticket |
| Confirm boarded | Updates the sample state and increments boarded-seat count | Not proof of physical boarding |
| ETA | Seed estimate and deterministic change during simulation | Not a calibrated ETA model |
| Map motion | Animated SVG route trace | Not GPS or road-network routing |
| Driver simulator | Buttons advance trip progress in shared browser storage | Not telemetry from an actual bus |
| Device GPS | Browser can capture a location on HTTPS/localhost and show it in the driver view | It is not uploaded to a server or shared to another user's device |
| Operator dashboard | Functional sample queue controls and route selection | No secured operator account on these demo routes |
| WhatsApp/SMS | Not connected | No Meta approval or OTP delivery is implied |
| Payments/fare collection | Sample fare labels only | No payment is taken and no Cowry integration exists |

## Correct queue and seat semantics

1. A commuter joins a queue and receives a position. No seat is consumed.
2. The operator calls the next eligible passenger. One seat becomes temporarily held.
3. The operator confirms boarding. The hold converts to a boarded seat and the trip's boarded-seat count increments.
4. Cancelling a called passenger releases the held seat.

The existing database helper `src/lib/queue/join.ts` in the base repository currently increments `Trip.seatsTaken` during queue join. That old helper is not used by the new browser-demo state machine. It must be refactored before the prototype UI is described as database-backed or connected to real users.

## Hardware statement

Q-not does not require dedicated bus hardware for this proof of concept. A driver's smartphone can provide location in a future secured integration. The current device GPS control only captures the browser device location locally; the simulated route control is the repeatable demonstration mechanism.
