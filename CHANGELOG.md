# Q-not Access and Reliability Integration

## 2026-11-21 - Integrated from the Q-not repair v3 package

- Fixed the persistent OTP advisory-lock query so Prisma receives an integer projection instead of PostgreSQL `void`.
- Allowed Google/email-authenticated drivers to enter onboarding and complete profile/vehicle registration before mobile verification.
- Kept mobile verification, driver approval, licence validity, vehicle approval and route approval enforced in the existing server-side service actions.
- Updated driver dashboard readiness so the publish-service form stays hidden until mobile verification and other approvals pass; preserved the current live route map and trip operations.
- Added a driver Profile & Verification page and dashboard link for later phone linking.
- Added passenger guidance that phone verification is not required to explore; retained email and Google access.
- Switched passenger and driver Google OAuth entry links to ordinary browser anchors to avoid client-side RSC navigation to a redirecting route handler.
- Added high-contrast passenger/driver login actions.
- Added graceful database-unavailable states to passenger journey request list and route-choice pages.
- Fixed corrupted punctuation/arrow characters in active page metadata, splash UI and stylesheet comments.
- Removed direct `state.clock.elapsedTime` usage from the Q-not bus animation; a remaining `THREE.Clock` warning may originate inside the installed React Three Fiber 9.x runtime.
- Added an interaction register and a legal/consent implementation plan. These documents are plans, not legally approved terms or an active consent system.

## Not changed

- No Prisma schema or migration files changed.
- No dependencies or lockfiles changed.
- No `.env.local` or provider credentials changed.
- No Git push or deployment performed.

## Configuration still required

- Confirm `DATABASE_URL_POOLED` in the developer's local `.env.local` uses the actual Neon pooled host. The working snapshot excludes `.env.local`, so this could not be checked.
- A database connection timeout is not repaired by a UI fallback. If the pooled connection is correctly configured and Neon still times out, inspect database availability, network access and Neon connection limits.
- Final passenger/driver/operator Terms, Privacy Notice and versioned acceptance persistence still require legal review and technical implementation.
