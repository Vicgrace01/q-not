# Q-not build gap: what exists, what is simulated, what comes next

## Already present in the repository before this UI pass

- Next.js 16 App Router, React 19, TypeScript and Tailwind CSS 4.
- Prisma 7 PostgreSQL foundation and an initial migration.
- Data models for operators, drivers, commuters, routes, stops, buses, trips, driver sessions, queue entries, tickets, messages and tap events.
- Operator signup/login and signed-cookie session helpers.
- Commuter phone OTP helpers (development-only; no SMS provider).
- Initial route creation, trip browsing, queue join and race-condition tests.
- Architecture notes and ADRs for driver-phone GPS, channel adapters, PostgreSQL locking and future WhatsApp/fare integrations.

## Added in this Q-not UI pass

- High-design commuter landing/departure experience.
- Q-less passenger join flow, queue position, wait estimate and leave-queue action.
- Operator terminal console with call-next, temporary seat hold, boarded confirmation, quick passenger entry and demo reset.
- Driver console with start/advance/arrived controls and optional device GPS capture.
- Cross-tab, same-browser demo state using localStorage and browser storage events.
- Animated illustrative SVG route, animated bus marker, route progress transitions, modal/toast/row motion, responsive layouts and reduced-motion accommodation.
- Health endpoint, Render blueprint, demo boundaries, runbook and tests.

## Current prototype truth

| Feature | Current status |
|---|---|
| Departure discovery and filters | Functional against sample departure data |
| Q-less queue join and position | Functional in browser-local demo state |
| Duplicate passenger guard | Functional in browser-local demo state |
| Call next and temporary seat hold | Functional in browser-local demo state |
| Confirm boarding and seat accounting | Functional in browser-local demo state |
| Driver route movement | Simulated; updates browser-local demo state |
| Device GPS capture | Reads the current browser device location locally; does not upload it |
| Route line and moving bus visual | Illustrative SVG animation, not a geographic map |
| ETAs, schedules, fares, fleet and terminal identity | Sample data / illustrative estimates |
| Cross-device queue and operator sync | Not implemented |
| Live GPS feed / secure driver API | Not implemented |
| WhatsApp, SMS, payments, Cowry Card | Not integrated |
| Production operator/driver authorisation on new demo screens | Not implemented |

## Critical existing database issue

The original `src/lib/queue/join.ts` increments `Trip.seatsTaken` during queue join. This contradicts the intended Q-not distinction between joining a line and physically boarding. The new browser demo does not call that helper. Before connecting the new UI to PostgreSQL, refactor the service into explicit operations:

1. `joinQueue`: create a WAITING entry; do not alter seats taken.
2. `callNext`: lock the Trip row, confirm capacity after existing holds, create a temporary hold/ticket, and mark the entry CALLED.
3. `confirmBoarded`: lock the Trip row, convert one valid hold into a used ticket, mark the entry SEATED/BOARDED and increment `seatsTaken` exactly once.
4. `cancelQueueEntry`: cancel a WAITING entry or release a CALLED hold and its ticket.
5. Add concurrency tests for simultaneous call-next and double boarding.

The Prisma `QueueStatus` enum currently has `WAITING`, `SEATED`, `CANCELLED` and `EXPIRED`; a database-backed implementation needs a `CALLED` state or a separate seat-hold model. Add a migration and tests when building that integration.

## Next implementation order

### P0 — before a judge demo
- Run the app locally and fix any environment-specific issues.
- Use fictional passenger details only.
- Demonstrate commuter, operator and driver views in the same browser profile.
- Keep all sample/simulated states clearly labelled.
- Rehearse the exact flow in `DEMO_RUNBOOK.md`.

### P1 — before a multi-device pilot
- Move queue, trip, ticket and driver-location state to PostgreSQL-backed API routes.
- Implement the corrected queue/hold/board transactions described above.
- Add operator authentication and role-scoped authorisation to every write.
- Add driver sessions and authenticated, rate-limited GPS ingestion.
- Add event timestamps, stale-location states and an ETA confidence model.

### P2 — after a terminal partner is secured
- Import verified terminal routes, fares, scheduled trips and vehicle capacity.
- Add a real geographic map and route geometry.
- Add SMS/WhatsApp notification adapters with provider approval and consent.
- Add QR ticket verification and operator scanning.
- Integrate payments/fare collection only after a provider agreement.

## Why the demo is still useful

This prototype proves the core workflow and the seat-accounting state machine without pretending the team already has a terminal network, installed GPS devices, carrier data feed or messaging/payment contracts. Those dependencies are shown as future integration boundaries, not faked as live services.
