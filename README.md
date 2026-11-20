# Q-not

**Know before you go. Catch your bus. Stay in control.**

Q-not is a transit availability, reservation and journey-intelligence concept for intercity bus passengers and operators. It helps a passenger check whether a bus is worth travelling to, compare fares and queue pressure, secure a place through a payment-backed hold, follow the vehicle and use approved pickup/drop-off points.

Built by **Vicgrace Labs**.

## The problem

A study at Old Park, Enugu examined passenger actual and perceived waiting times across six routes, including Enugu–Nsukka. It reported that 80–90% of surveyed passengers experienced actual terminal waits of 21 minutes to an hour or more; 80–90% also overestimated their wait by 25–60%. The research collected observations/interviews over 30 days in 2023 and was published in the *Nigerian Journal of Technology* in 2024.

Reference: Ibrahim, M. N. & Ede, J. K. (2024). “Development of Passenger’s Waiting Time Model at Bus Public Transit Terminal.” *Nigerian Journal of Technology*, 42(4), 437–446. https://doi.org/10.4314/njt.v42i4.3

## Product flow

1. **Check before leaving:** search a route and compare departures, fares, seats open, passengers ahead and estimated waiting time.
2. **Reserve with commitment:** authorise a fare or place a wallet hold. A confirmed hold consumes capacity; browsing and a free waitlist do not.
3. **Cancel or replace:** under the published cutoff rules, release the hold/refund and offer a released place to the next eligible waitlisted passenger.
4. **Track the journey:** follow the bus, see the ETA and choose an approved pickup/drop-off point along its route.
5. **Board and pay:** use a QR ticket or compatible tap-to-pay validator. Walk-in passengers can still board and pay without a prior app reservation.
6. **Reconcile occupancy:** combine reservation/QR events, tap events, privacy-preserving door counts and driver exception handling.

## What this prototype demonstrates

The one-day hackathon build is an interactive concept, not a deployed transport/payment network.

| Experience | Current demonstration boundary |
|---|---|
| 3D bus / S-curve hero | Client-side Three.js scene; no live vehicle feed |
| Departure, seat and wait comparison | Sample Enugu–Nsukka data |
| Pickup/drop-off selector | Sample approved stops |
| Payment-backed seat hold | Browser-side simulation; no payment is taken |
| Cancel/release/waitlist replacement | Browser-side simulation; no refund is sent |
| Boarding and settlement state | Simulated QR/boarding event |
| Tap-to-pay walk-in | Simulated tap event; no NFC reader connected |
| Door camera occupancy | Simulated anonymous count; no camera or edge device connected |
| GPS, route progress and ETA | Simulated; no live driver telemetry feed |
| Hisa financial concept | Unofficial concept panel; no Hisa API, wallet access, partnership or endorsement is claimed |

The actual app routes and current backend are still being validated end-to-end. A successful Next.js build confirms route compilation, not authentication/session correctness or a production payment integration.

## Core product rules

- A **waitlist entry is not a seat reservation** and must not consume bus capacity.
- A **payment-backed hold** consumes capacity while it is active and must have an expiry/cancellation policy.
- **Boarding confirmation** triggers capture/settlement according to the payment provider's capabilities and agreed rules.
- **Cancellation/release** frees capacity and releases or refunds funds. Do not allocate the same seat to two people.
- **Walk-ins** must be represented separately from app reservations.
- **Onboard count** is an occupancy signal, not passenger identity. Process camera line-crossing events on the bus where feasible; avoid face recognition and routine raw-video uploads.
- For journeys with intermediate stops, seat inventory ultimately needs to be modelled by route segment so a seat can be reused after a passenger alights.

## Technology

- Next.js 16 App Router, React 19 and TypeScript
- Prisma 7 and PostgreSQL
- Tailwind CSS 4
- Three.js / React Three Fiber for the 3D experience
- Vitest for automated tests
- Neon PostgreSQL for hosted data during the prototype

## Local setup

Requirements: Node.js 22.x and pnpm 12.3.4.

```powershell
pnpm install
Copy-Item .env.example .env.local
# Edit .env.local with your own development DATABASE_URL and AUTH_SECRET.
pnpm exec prisma generate
pnpm exec prisma migrate dev
pnpm dev
```

Keep `.env.local` and `.env.test` on separate database branches. The `tests/helpers/db.ts` reset helper deletes data from the database configured for tests, so **never point `.env.test` at a development or production database**.

## Validation

```powershell
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

The most recently reported local run (20 November 2026) passed 9/9 automated tests and `next build`. Re-run all checks after any further changes.

## Deployment: Render + Neon

A Render Blueprint is provided in [`render.yaml`](./render.yaml). It creates a Node web service in Ohio and uses the existing Neon PostgreSQL database.

1. Push the complete local Q-not project to `main` on GitHub.
2. In Render, choose **New → Blueprint** and connect `Vicgrace01/q-not`.
3. Render reads `render.yaml`. Supply `DATABASE_URL`, `AUTH_SECRET` and `NEXT_PUBLIC_APP_URL` when prompted.
4. Use the **direct Neon endpoint** for the main/production branch in `DATABASE_URL`; do not use the `qnot-test` branch or commit the URL.
5. Generate a new production `AUTH_SECRET`. Set `NEXT_PUBLIC_APP_URL` to the exact HTTPS URL Render assigns to the service, then redeploy if needed.
6. Check `/api/health`, `/`, `/trips`, `/login`, `/signup` and `/c/login` after deploy.

The Blueprint runs `prisma migrate deploy` in the build command because Render's pre-deploy command is not available on Free web services. For a paid service, move `pnpm exec prisma migrate deploy` into `preDeployCommand` and remove it from `buildCommand`.

Render Free web services spin down after 15 minutes without inbound traffic and can take about a minute to wake. They are suitable for a hackathon preview, not a production transport service. Warm the service before a judge demo. See Render's [Free service limitations](https://render.com/docs/free) and [Next.js deployment guide](https://render.com/docs/deploy-nextjs-app).

## Security and product boundaries

- Never commit `.env.local`, `.env.test`, real credentials, payment tokens, passenger personal data or camera footage.
- Rotate any credentials previously shared in chat before deployment.
- No live Hisa integration is assumed. Any future customer-funds feature requires a contracted and appropriately licensed payment partner, provider documentation, safeguarding/settlement design and legal review.
- Live bus, GPS, validator and camera integrations require operator agreements, hardware tests, data-protection controls and real-world pilot validation.
