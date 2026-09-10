# Q-Not — Architecture

Q-Not is a transit intelligence platform for Nigerian bus terminals. It gives
commuters real-time seat availability, virtual queue positions, and ETAs, and
gives operators a live view of their fleet and queue.

This document is the system design. It answers: what are the entities, how does
data flow, where are the boundaries, what can fail, and why is it built this way.

## Design principles

1. **Channel-agnostic messaging.** Commuters will talk to Q-Not through WhatsApp
   in production. In v1 they talk through a web chat UI that mimics WhatsApp.
   The business logic does not know which channel it is on.
2. **Driver phone as GPS source.** Real buses have no trackers we can read. The
   driver's phone is the sensor. This is what Bolt and Uber do in markets
   without hardware.
3. **Polling, not WebSockets.** v1 polls every 5 seconds. Simpler to reason
   about, simpler to debug, good enough for a bus that moves every few minutes.
4. **Postgres handles the hard case.** Two commuters claiming the last seat is a
   real race condition. It is resolved in a database transaction, not in
   application code.
5. **Every external dependency has an adapter.** Cowry Card, WhatsApp, payments.
   Each sits behind an interface so the rest of the code does not care which
   provider is live.

## Entity model

| Entity | Purpose |
|---|---|
| Operator | Bus company / terminal operator. Owns routes and buses. Logs in. |
| Driver | Driver account. Phone number is the identifier. Logs in from phone. |
| Route | origin → destination, plus schedule. Belongs to one Operator. |
| Stop | A boarding point along a Route. Has lat/lng and sequence order. |
| Bus | One physical bus. Belongs to one Operator. Has capacity. |
| Trip | One scheduled run: Bus + Route + Driver + departure time. |
| DriverSession | An active driver-phone session tied to a Trip. Holds last known location. |
| QueueEntry | One commuter waiting for a Route. Has a position and an ETA. |
| Ticket | Issued when a QueueEntry gets a seat. Has a QR code. |
| TapEvent | Inbound webhook from a fare collector (Cowry Card mock). |
| Message | Inbound/outbound comms. Written by the messaging adapter. |
| BoardingPass | QR-verifiable artifact tied to a Ticket. |

## Data flow — commuter

1. Commuter sends a message (web chat v1, WhatsApp v2).
2. Adapter normalizes to `InboundMessage { channel, from, text }`.
3. `handleInboundMessage()` routes by intent.
4. Handler queries DB: available routes, seats left, queue length.
5. Handler composes an `OutboundMessage`.
6. Adapter sends it back on the same channel.

## Data flow — driver phone

1. Driver opens driver page on their phone (auth by phone + OTP).
2. Driver taps "Start trip". A `DriverSession` row is created.
3. The page posts `{ lat, lng }` to `/api/driver/ping` every 10 seconds.
4. Backend updates `DriverSession.lastLat/lastLng/lastUpdateAt`.
5. Commuter and operator map views poll `/api/trips/:id/location` every 5s.

## Data flow — seat and queue

1. Operator marks a Trip as `boarding`.
2. Commuters join the queue for that Trip.
3. When the operator seats a commuter, a transaction runs:
   - `SELECT ... FOR UPDATE` on the Trip row
   - Check `seats_taken < bus.capacity`
   - If a seat is free: create Ticket, increment `seats_taken`, remove the QueueEntry
   - Else: return `409 Conflict` and offer the next Trip
4. The transaction is what prevents two commuters from getting the last seat.

## Failure modes we design for

| Failure | Handling |
|---|---|
| Driver phone dies mid-trip | `DriverSession.lastUpdateAt` goes stale. UI shows "last seen Xm ago". Commuters see reduced confidence. |
| Two commuters race for last seat | DB transaction with row lock. One wins, one gets 409. |
| Operator never marks "departed" | Trip auto-expires after scheduled time + grace period. Queue shifts to next Trip. |
| Cowry Card webhook retries | `TapEvent.eventId` is unique. Duplicate insert rejected. Idempotency. |
| WhatsApp API not approved yet | Channel adapter swaps. Business logic unchanged. |
| Network down | v1 degrades to stale data with "last updated" label. No crash. |

## Boundaries (adapters)

- **`src/lib/whatsapp/adapter.ts`** — `MessageAdapter` interface. Two impls: `WebAdapter` (v1) and `WhatsAppAdapter` (v2).
- **`src/lib/payments/adapter.ts`** — (later) `PaymentAdapter` interface. `PaystackAdapter`, `MockAdapter`.
- **`src/lib/fare/adapter.ts`** — (later) `FareAdapter` for Cowry Card tap-ins.

## Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL (Neon in production, local Docker in dev)
- **ORM:** Prisma 7
- **Validation:** Zod
- **Map:** Leaflet + OpenStreetMap (no API key)
- **Auth:** Phone + OTP (v1 mocked OTP logged to server console)
- **Deploy:** Vercel
- **CI:** GitHub Actions

## What is out of scope for v1

- Real WhatsApp Business API (awaiting Meta approval)
- Real Cowry Card integration (mocked webhook)
- Real payments (mock only)
- WebSockets (polling instead)
- PostGIS (plain lat/lng floats)
- Driver mobile PWA (web page on phone for v1)
- Multi-tenant operator isolation beyond a simple ownerId check
