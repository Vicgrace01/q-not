# Q-not Network — Full-App Audit and Build Requirements

**Audit basis:** the full-source ZIP supplied on 21 November 2026, including the Prisma schema, migrations, application routes, components, server actions, tests, architecture notes, ADRs, and demo-boundary documents.

**Purpose:** record what the repository actually does today, identify important gaps, and define the operating requirements before converting Q-not from a prototype into a shared-transport coordination platform.

This document does not claim that external verification providers, transport agencies, payment providers, or live vehicle feeds are already connected.

---

## 1. Current implementation: what is real and what is simulated

| Area | What the source currently contains | Actual boundary |
|---|---|---|
| Passenger sign-in | Phone + six-digit OTP action; commuter row upsert; signed httpOnly cookie | OTP is in-memory, logged and returned as `devCode`; no SMS provider, rate limit, email login, Google OAuth, or persistent challenge |
| Operator sign-in | Email/password using scrypt; signed httpOnly cookie | No email/phone verification, password reset, OAuth, MFA, server-side session revocation, or login throttling |
| Driver sign-in | No complete driver authentication workflow | `/driver` is a browser-local demonstration view, not a secured driver account |
| Passenger dashboard | Database-backed commuter queue and ticket history | No live vehicle tracking, payment history, safety profile, or real seat reservation ledger |
| Trip discovery | Database-backed upcoming trips and route/bus details | No verified driver/vehicle trust panel, real ETA, fare source, or live service feed |
| Operator dashboard | A database-backed route workspace exists | `/operator` is a demo view backed by browser-local demo state; it is not the secured operator console |
| Driver operations | A browser-local driver simulator exists | No secured dispatch assignment, trip-start API, authenticated GPS ingestion, or cross-device telemetry |
| Queue | Browser demo state separates waiting from boarding | The database `joinQueueTx` increments `Trip.seatsTaken` at queue join. That contradicts the stated product rule and demo tests |
| Tickets | Database ticket model and passenger ticket display exist | No complete atomic call-next/hold/board/cancel/expiry/QR scan workflow |
| 3D seats | Visual seat layout and local seat selection | It is not connected to a persistent seat inventory, payment, reservation, or boarding record |
| Maps | SVG route illustration and stored stop coordinates | No production map provider, geospatial route geometry, or authenticated live GPS map |
| Notifications | Message/TapEvent models and a WhatsApp adapter boundary | No live WhatsApp, SMS, push notification, or customer notification preferences |
| Payments | Sample fare labels and documentation of future adapters | No payment processor, settlement ledger, refunds, or wallet |
| Safety/identity | Separate commuter/operator accounts and signed cookies | No driver licence, NINAuth, liveness, face-to-ID match, vehicle inspection, insurance, emergency, or incident workflow |

### Existing route coverage

- `/` — commuter-facing experience shell.
- `/explore` — departure discovery experience using demo state.
- `/trips` and `/trips/[id]` — database-backed trip discovery/detail.
- `/c/login` and `/c/login/verify` — development commuter OTP flow.
- `/c/dashboard` and `/c/tickets` — database-backed passenger views.
- `/login` and `/signup` — operator email/password account flow.
- `/dashboard`, `/dashboard/routes/new`, `/dashboard/routes/[id]` — operator-owned route workspace.
- `/operator` and `/driver` — demo views, not secured operational accounts.
- `/api/health` — health endpoint.

There is no real driver onboarding, fleet/vehicle management, route permit approval, live dispatch, driver GPS API, payment API, identity-verification callback, or incident-management route in the supplied source.

---

## 2. Immediate correctness and security work

### P0 — Fix the database queue/seat invariant

The repository contains two contradictory implementations:

- The browser demo lets a person join a waiting queue without consuming a seat.
- `src/lib/queue/join.ts` increments `Trip.seatsTaken` immediately when creating a `WAITING` queue entry.

This means a person who is merely waiting can consume capacity. It also means the current database race tests prove “one queue join per last seat”, rather than proving the intended distinction between waiting and actual boarding.

The corrected state machine should be:

1. `joinQueue`: create a `WAITING` entry; do not increment boarded occupancy and do not issue a ticket.
2. `callNext`: lock the trip/capacity ledger; create a time-limited `SeatHold`; move the queue entry to `CALLED`.
3. `confirmBoarded`: validate an unexpired hold; record one idempotent boarding event; convert the hold into a confirmed booking/occupied seat exactly once.
4. `cancel` / `noShow` / `holdExpired`: release the hold, close the queue entry, notify the passenger, and offer the next eligible person.
5. Every operation must be safe under duplicate requests, retries, app refresh, network failure, and concurrent operators.

Use separate measures for:
- waiting passengers,
- active seat holds,
- confirmed reservations,
- physically boarded passengers,
- walk-in passengers,
- alighted passengers.

A simple `seatsTaken` integer cannot represent all of these safely.

### P0 — Protect the test database

`tests/seat-race.test.ts` calls `resetDb()` in `beforeEach`, and `tests/helpers/db.ts` deletes rows from several tables. The full test suite is destructive to whichever database `DATABASE_URL` points at.

- Never run `pnpm test` with production credentials or a shared development database.
- Create a separate, disposable test database and load its URL only in the test environment.
- `pnpm test:demo` runs the browser-demo state tests and does not invoke the database reset helper.

### P0 — Tenant and role authorization

Every database read and write must validate the current actor and scope the target object to the operator/provider they belong to. A hidden button is not authorization.

Required roles include:
- platform support/admin,
- transport provider owner,
- operator/dispatcher,
- terminal/boarding staff,
- driver,
- passenger,
- verification reviewer,
- safety/support reviewer.

Use explicit permission checks in server actions/API handlers. Do not accept `operatorId`, `driverId`, verification status, fare, trip status, or seat capacity as trusted values from the browser.

### P0 — Stop exposing development OTPs

The current passenger auth action:
- creates OTPs in a process-local `Map`,
- logs the plaintext code,
- returns `devCode` in the action response,
- has no rate limit by phone, IP/device, or challenge,
- loses challenges on restart and is not safe across multiple app instances.

Keep a development-only code path behind an explicit environment flag. Production must persist a hashed challenge, expire it, cap attempts, throttle sending and verification, and deliver it through a configured provider. Never return a production OTP to the browser or include phone numbers/OTP codes in logs.

### P0 — Account security and recovery

Before real accounts:
- verify phone and email ownership,
- support secure password reset/recovery for operators,
- rate-limit login and account creation,
- provide account/session revocation,
- rotate/expire sessions and record security events,
- link Google identity to an existing account only after proving control of both identities,
- prevent a person creating duplicate accounts by using different login methods,
- require MFA/step-up authentication for high-risk operator/admin changes.

---

## 3. Q-not's network operating model

Q-not should support independent drivers as well as formal fleets. A driver must not be forced to own a bus or operate a large company.

### Actor and ownership model

Separate the person, organization and vehicle:

- **Person account:** a human identity and login methods.
- **Transport provider:** an individual owner-driver, fleet company, cooperative, terminal or other approved operating entity.
- **Driver profile:** a person who is eligible to drive one or more vehicles.
- **Vehicle:** a physical bus/minibus with its own identity, documents, capacity and inspection status.
- **Provider membership:** a time-bounded relationship between a person and a transport provider, with roles.
- **Driver-vehicle assignment:** the authorised driver(s) for a vehicle over a time interval.
- **Route/corridor authority:** the specific route, direction, stops and dates a provider/vehicle/driver is allowed to serve.
- **Service run:** a concrete journey with a planned route, vehicle, driver, departure window and live status.

This supports:
- an owner who drives their own vehicle,
- a driver employed by a fleet,
- a vehicle shared by multiple drivers on different shifts,
- a driver temporarily assigned a replacement vehicle,
- a cooperative/union or terminal that coordinates multiple independent owners,
- suspension of one driver or vehicle without deleting their history.

Do not make `Driver.operatorId` the only ownership/relationship model. It prevents an independent driver from joining and cannot express multiple organisations, shift assignments or vehicle-owner permission.

### Route and supply model

A route is more than two text fields. It needs:
- canonical corridor and direction,
- ordered stops and pickup/drop-off rules,
- route geometry or routable stop sequence,
- approved operating authority and evidence,
- service windows and planned headways,
- fare rules and fare source,
- permitted vehicle classes,
- temporary diversions, closures and route version history.

A service must be matched using compatible route segments and boarding/alighting stops—not only text equality between origin and destination.

### Demand aggregation and dispatch

For a candidate service run, Q-not should consider:
- origin and destination stop compatibility,
- route direction and permitted corridor,
- pickup window and expected arrival time,
- passenger count and group size,
- actual capacity remaining on each overlapping route segment,
- driver/vehicle verification and route approval,
- driver availability and acceptance,
- location freshness and GPS accuracy,
- service status, traffic/disruption and operator constraints.

The first version should make **explainable dispatch recommendations**, not silently dispatch a driver or guarantee an ETA. Show why a vehicle is recommended, what demand it can serve, its available capacity and how fresh its location is.

Protect against:
- allocating more passengers than vehicle/segment capacity,
- giving the same demand to multiple drivers as confirmed bookings,
- drivers accepting incompatible requests,
- drivers gaming demand visibility or abandoning passengers,
- one high-demand corridor starving nearby lower-volume areas,
- a vehicle being marked available while already on another service,
- cancelled or delayed trips continuing to receive matches.

---

## 4. Identity, trust and safety requirements

### Passenger account

Keep first-use friction low:
- phone OTP,
- email verification,
- Google sign-in as an optional identity provider,
- account linking only after proving ownership of both login methods,
- display name and optional profile photo,
- emergency contact and trusted trip-sharing recipient,
- clear notification and location-sharing preferences.

Do not require NIN or face scans from every passenger merely to browse a route. Apply additional checks only where the service, legal basis and risk justify them.

### Driver onboarding

Treat driver, vehicle and route approval as separate gates. A driver is not “fully verified” merely because a phone number or NIN check succeeded.

Recommended review stages:
1. contact verified,
2. legal identity verified,
3. selfie liveness completed,
4. one-to-one face-to-identity match completed by an authorised provider,
5. driving licence validated,
6. operator/provider relationship confirmed,
7. vehicle assignment authorised,
8. vehicle registration/ownership authorisation checked,
9. insurance, roadworthiness/inspection and other applicable documents validated,
10. route/corridor permission approved,
11. human review completed where required,
12. active, expired, suspended or revoked state maintained over time.

Use a provider/aggregator authorised to perform the relevant identity check. Do not build a fake NIN lookup or claim that comparing two uploaded images is NIN verification.

Store the minimum necessary:
- provider transaction/reference ID,
- check type and outcome,
- timestamp and expiry,
- consent record and notice version,
- reviewer/audit details,
- minimal claims required to establish the result.

Avoid retaining raw NIN values, identity-document images, face videos or biometric templates unless a legal and security assessment establishes a strict need and retention rule. Face checks should be consent-based, liveness-aware and one-to-one, with retry limits, manual review and an appeal path. Do not perform open-ended face identification across a database.

### Vehicle trust

Track each item separately:
- plate and registration,
- make/model/year/colour/body type,
- passenger capacity and seat layout,
- vehicle photographs,
- owner/authorised operator,
- inspection/roadworthiness evidence,
- insurance provider, policy reference and expiry,
- route/operating permissions,
- document review outcome and next expiry date,
- maintenance, breakdown and suspension history.

A verified driver in an unverified or expired vehicle must not be allowed to start a public service run.

### Passenger-facing safety

Before boarding, passengers should be able to compare the real vehicle to:
- registration plate,
- vehicle make/colour/photo,
- driver name/photo and verification state,
- trip/route and destination,
- pickup location and time window.

Provide:
- trip sharing with trusted contacts,
- boarding PIN/QR or another anti-imposter check,
- emergency contact/assistance flow,
- incident report and evidence upload,
- complaint/appeal handling,
- lost-property reporting,
- driver/passenger blocking where appropriate,
- support escalation and audit trail.

An SOS button must create an operational response path; it must not be a decorative UI button that only shows a toast.

---

## 5. Operational edge cases that must be designed before pilot

### Vehicle and driver changes
- driver no-show, shift handover, substitute driver,
- vehicle breakdown, tyre issue, accident or replacement vehicle,
- expired/suspended licence, insurance or vehicle inspection while a run is active,
- two active drivers trying to claim the same vehicle,
- one driver assigned to simultaneous service runs.

### Passenger and capacity
- family/group bookings,
- child/minor and guardian policies,
- passengers without smartphones or data,
- cash and terminal walk-ins,
- accessibility needs and mobility aids,
- luggage or other capacity constraints,
- passenger boards at one stop and alights at another,
- passenger alights early and capacity becomes available for a later segment,
- no-show, late arrival, cancellation, missed pickup and partial journey,
- duplicate booking/payment callbacks and QR replay.

### Route and location
- route change, stop closure, diversion or roadblock,
- driver goes off-route,
- inaccurate, stale or spoofed GPS,
- permission revoked, phone battery dies, phone is offline,
- data connection drops and location events arrive late or out of order,
- GPS timestamp/accuracy mismatch,
- passenger pickup pin is unsafe or inaccessible,
- no map tiles or map provider outage.

Never display a stale location as “live”. Show last-update time, accuracy and confidence. Provide a safe degraded mode when GPS/map services fail.

### Commercial and service recovery
- fare changes and price transparency,
- partial/full refund and settlement,
- driver cancellation after passenger payment,
- passenger cancellation cutoff and no-show rules,
- vehicle arrives late or leaves early,
- overbooking and operator errors,
- dispute, chargeback and cash reconciliation,
- failed notification/payment provider callback,
- operator or driver account suspended while tickets remain active.

### Privacy and abuse
- location collection only during an active service/clear consent,
- emergency contact consent,
- identity and biometric retention/deletion schedule,
- insider access and operator staff misuse,
- forged documents and stolen/reassigned plates,
- account takeover and SIM swap,
- harassment, discrimination, false reports and retaliation,
- fraud by passengers, drivers or terminal staff,
- data export, correction, deletion and incident response.

---

## 6. Recommended delivery order

### Stage 0 — Stabilise and create one source of truth
- fix current type/lint issues,
- keep demo state visibly separate from production data,
- align README, architecture, ADRs and implementation,
- add CI checks for lint, typecheck, unit tests and migration validation.

### Stage 1 — Correct transport accounting
- introduce explicit queue, seat-hold, reservation, boarding and alighting records,
- correct the database queue bug,
- add idempotency keys and race-condition tests,
- add expiry jobs and no-show handling,
- test group bookings and route-segment capacity.

### Stage 2 — Account and permission foundation
- introduce one human account with linked phone/email/Google identities,
- define passenger, driver, provider owner, dispatcher, terminal staff, reviewer and support roles,
- add revocable sessions, rate limits, recovery and audit events,
- scope every operator/provider-owned query and write.

### Stage 3 — Provider, driver, vehicle and route onboarding
- individual owner-driver and organisation/provider onboarding,
- driver-vehicle assignment history,
- route/corridor approvals,
- verification provider adapter and human review queue,
- document expiry and suspension rules.

### Stage 4 — Q-not Network dispatch
- canonical stops and route segments,
- driver availability and service-run lifecycle,
- passenger demand clustering,
- capacity-aware route matching,
- explainable dispatch recommendation board,
- test simulated Lagos corridor scenarios before using live operators.

### Stage 5 — GPS and field operations
- authenticated GPS ingestion,
- location heartbeat, accuracy and stale-state handling,
- offline/late event processing,
- map-provider adapter and licensing,
- driver battery/data-aware update frequency.

### Stage 6 — Passenger trust and journey control
- verified vehicle/driver cards,
- actual pickup windows and tracking,
- booking/boarding PIN or QR,
- trip sharing, emergency and incident workflow,
- accessible low-bandwidth passenger experience.

### Stage 7 — Commercial integrations
- payment provider adapter, idempotent webhooks and settlement ledger,
- cancellation/refund/no-show rules,
- SMS/WhatsApp/push provider adapters,
- cash/walk-in and terminal reconciliation.

### Stage 8 — Pilot evidence and optimisation
- route-level wait time, departure reliability and ETA accuracy,
- occupancy by segment, not just total seats taken,
- driver/vehicle compliance and incident metrics,
- demand/supply imbalance and fairness,
- only then introduce demand forecasting and optimisation models.

---

## 7. Acceptance gates before calling Q-not production-ready

Do not call a feature live until all applicable checks pass:

- database-backed state is shared across two devices and two sessions,
- unauthorised roles cannot read or mutate it,
- duplicate submissions and webhook retries are idempotent,
- concurrent seat holds cannot overbook a segment,
- waitlist entries do not consume physical capacity,
- stale GPS is visibly stale and cannot be presented as live,
- a driver cannot start a trip using an unapproved/expired vehicle or route,
- an operator cannot access another provider's records,
- all identity checks have consent, provider reference, audit, retention and appeal,
- emergency and incident buttons reach an actual staffed workflow,
- payment, cancellation and refund states reconcile end-to-end,
- tests cover failure, retry, offline and recovery cases.

**Guiding product principle:** Q-not should turn fragmented shared-transport supply into visible, trusted, capacity-aware service. A polished dashboard is useful only when the underlying vehicle, driver, route, demand, booking and safety states are true.
