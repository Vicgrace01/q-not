# Decisions

Architecture Decision Records (ADRs) for Q-Not. Each entry states the decision,
the alternatives, and why.

## ADR-001: Web-first messaging, WhatsApp as a channel adapter

**Context.** Q-Not's promise is a WhatsApp-native commuter experience. Meta
WhatsApp Business API approval takes 1–3 weeks, requires business verification
(CAC documents, address proof), and message templates need review.

**Decision.** Build the messaging layer behind a `MessageAdapter` interface.
v1 ships with a `WebAdapter` (chat UI in the browser). v2 swaps in a
`WhatsAppAdapter`. Business logic does not change.

**Alternatives.**
- Build WhatsApp first → blocked on approval, no product for weeks.
- Build a mobile app → app fatigue, the exact problem Q-Not solves.

**Consequence.** v1 is demoable in 2 weeks. Migration to WhatsApp is a UI swap,
not a rebuild. The partner pitch can show the same flow on WhatsApp on the day
approval lands.

---

## ADR-002: Driver phone as GPS source

**Context.** Real buses have no GPS trackers we can read. Hardware installation
is out of scope and would break the "asset-light" pitch.

**Decision.** The driver's phone is the GPS source. Driver logs in with phone +
OTP, opens a web page, taps "Start trip", and the page pings location every 10
seconds. v1 allows a "Simulate movement" mode for demos.

**Alternatives.**
- Read from operator's existing telematics → not available in Nigeria at scale.
- Buy hardware → impossible in 14 days.
- Ask operator to manually update location → doesn't scale and doesn't demo well.

**Consequence.** The failure mode (phone dies, driver forgets) is designed for
and visible in the UI as "last seen Xm ago". This is realistic production
behavior, not a hack.

---

## ADR-003: Polling every 5 seconds instead of WebSockets

**Context.** Buses move slowly. A commuter checking their phone needs a
location every few seconds, not real-time.

**Decision.** Poll `/api/trips/:id/location` every 5 seconds from the client.

**Alternatives.**
- WebSockets → more code, harder to debug, needs a different hosting setup.
- SSE → better than WebSockets but still more moving parts.

**Consequence.** Simple, testable, works on Vercel's serverless model without
extra infra. Documented as v2 scope if real-time becomes necessary.

---

## ADR-004: Leaflet + OpenStreetMap for the map

**Context.** A map is required to show bus location and next stop.

**Decision.** Use Leaflet with OpenStreetMap tiles.

**Alternatives.**
- Mapbox → free tier requires signup and API key, more configuration.
- Google Maps → requires billing setup, costs money after free tier.

**Consequence.** Zero cost, no API key, no signup. Tiles are cached by the
browser. Fewer dependency risks on flaky networks.

---

## ADR-005: Database transaction for the last-seat race

**Context.** Two commuters can request the last seat at the same instant. If
handled in application code, both will see `seats_taken < capacity` and both
will be issued a ticket.

**Decision.** Resolve seat assignment inside a Postgres transaction using
`SELECT ... FOR UPDATE` on the Trip row. If a seat is available, create the
Ticket and increment `seats_taken`. Otherwise return `409 Conflict`.

**Alternatives.**
- Application-level check + insert → race condition, known bug pattern.
- Unique constraint on `(trip_id, seat_number)` → works but requires seat
  numbering, which buses don't have. Riders sit anywhere.

**Consequence.** This is the single most important correctness property of
Q-Not. A test must prove it: two concurrent requests, one 201, one 409.

---

## ADR-006: Phone + OTP auth for commuters

**Context.** Commuters use WhatsApp. They do not want accounts and passwords.

**Decision.** Commuter identity is a phone number. Login is phone + 6-digit OTP.
v1 OTP is generated server-side and logged to the server console (no SMS cost).
v2 swaps in a real SMS provider behind an `OtpAdapter`.

**Alternatives.**
- Email + password → friction, wrong UX for the market.
- Anonymous session → no continuity between visits, cannot recover a ticket.

**Consequence.** Matches the WhatsApp model. Real auth for operator and driver.
The OTP adapter swap is one file.

---

## ADR-007: Postgres, not SQLite or a document DB

**Context.** Data is relational: Operator → Route → Stop → Trip → QueueEntry →
Ticket. Multiple users race on the same rows.

**Decision.** Postgres.

**Alternatives.**
- SQLite → fine for single-writer, breaks under concurrent writes on Vercel.
- MongoDB → poor fit for relational data and row-level locks.

**Consequence.** Row-level locks available. Transactions available. Free hosted
option (Neon). Familiar ecosystem.
