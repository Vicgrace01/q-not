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

---

## ADR-008: Hand-rolled auth with scrypt and signed cookies

**Context.** We need operator authentication. Options: Auth.js, Clerk, Supabase
Auth, or build the primitives ourselves.

**Decision.** Build authentication with Node's built-in `crypto` module:
`scrypt` for password hashing, `createHmac` for session signing, cookies via
Next.js's `cookies()` API.

**Alternatives.**
- Auth.js → 20+ packages, opaque internals, heavy for a small team.
- Clerk → vendor lock-in, costs money past free tier, external dependency at
  every login.
- Supabase Auth → tied to Supabase as a whole.

**Consequence.** No new dependencies. Fewer failure modes on flaky networks.
We understand every line of the auth layer, which means we can defend it in
review and debug it when it breaks. If we ever need OAuth or magic links, we
swap in Auth.js behind the same session interface.

The trade-off: we don't get password reset, email verification, or session
revocation for free. Those are v2 concerns and documented separately.

---

## ADR-009: Sessions, not JWTs

**Context.** After login, the browser needs a way to prove it's the operator on
subsequent requests. Two main approaches: signed JWT or server-side session.

**Decision.** Signed session cookie. Format: `<operatorId>.<hmac-sha256>`.
The HMAC proves we issued it. The `operatorId` is read back on each request.

**Alternatives.**
- JWT → stateless, but you can't revoke. A stolen JWT is valid until expiry.
- Database-backed session → revocable, but adds a DB round-trip per request.

**Consequence.** Simple, revocable in theory (rotate `AUTH_SECRET` to
invalidate all), no DB hit. The trade-off: we cannot log out a single operator
remotely without a Session table. If we add one in v2, the cookie becomes a
session ID and the operator ID lives in the DB.

---

## ADR-010: httpOnly + SameSite=Lax cookies

**Context.** Where should the session token live in the browser?

**Decision.** Cookie, not localStorage. Cookie is `httpOnly` (JS cannot read
it), `SameSite=Lax` (sent on top-level navigations, not cross-site POSTs),
`Secure` in production (HTTPS only).

**Alternatives.**
- localStorage → readable by any script on the page, including injected ones.
  Exposed to XSS.
- Cookie with `SameSite=None` → requires `Secure`, and enables CSRF.

**Consequence.** XSS cannot steal the session. Cross-site form posts cannot
forge authenticated requests. The trade-off: `SameSite=Lax` blocks
cross-site navigation with POST, which is fine because our POSTs come from
forms on the same origin.

---

## ADR-011: Scoped queries by operatorId

**Context.** Multiple operators will use Q-Not. Operator A must never see
Operator B's routes, buses, trips, or queues.

**Decision.** Every read and write that touches operator-owned data includes
`where: { operatorId }` where `operatorId` comes from the session — never
from the request body, query string, or URL.

**Alternatives.**
- Trust the client → obviously wrong. Never do this.
- Middleware that filters → too easy to forget. The filter belongs in the
  query itself.

**Consequence.** Cross-tenant access is not possible because the session
operatorId cannot be spoofed and the query cannot be tricked into returning
another operator's data. This is the difference between authentication and
authorization — both must be correct.

---

## ADR-012: Same error for unknown email and wrong password

**Context.** The login endpoint can leak whether an email is registered by
returning different errors ("user not found" vs "wrong password").

**Decision.** Return the same message for both cases: `"Invalid email or
password"`. Perform a dummy password verification when the operator is not
found, so the response time is identical.

**Alternatives.**
- Distinct errors → helpful for debugging, harmful for security.
- Rate limiting only → doesn't help; attacker can still enumerate slowly.

**Consequence.** An attacker cannot build a list of registered emails through
login. The trade-off: users can't tell whether they typed the wrong password
or used the wrong email. That's the correct trade for a public endpoint.

---

## ADR-013: Prisma 7 driver adapter (@prisma/adapter-pg)

**Context.** Prisma 7 requires a driver adapter instead of a connection URL.
The old `url = env("DATABASE_URL")` in `schema.prisma` no longer works.

**Decision.** Install `@prisma/adapter-pg` and `pg`. Construct the adapter in
`src/lib/db.ts` with `connectionString: env.DATABASE_URL`. Remove the `url`
field from the datasource block; the URL now lives in `prisma.config.ts`
for migrations and in `db.ts` for the client.

**Alternatives.**
- Prisma Accelerate → hosted proxy, costs money, extra dependency.
- Downgrade to Prisma 6 → defers the problem and locks us out of fixes.

**Consequence.** Two places to keep the URL in sync (`prisma.config.ts` and
`db.ts`, both reading from `env.DATABASE_URL`). The trade-off: Prisma 7's
adapter architecture is more explicit and less magic, which is easier to
debug when connections fail.
