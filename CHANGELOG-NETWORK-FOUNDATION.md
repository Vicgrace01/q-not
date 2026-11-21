# Q-not Network foundation — implementation notes

## Added

- Leaflet mapping, stop coordinate picker, route geometry endpoint, and active trip GPS sharing/reporting APIs.
- Passenger-scoped live trip location endpoint and network dispatch map.
- Google OAuth for passenger, driver and operator entry points.
- Persistent, rate-limited OTP challenges with Termii SMS and Resend email adapters.
- Driver onboarding, vehicle registration, 3D vehicle-class catalogue, route permission requests, operator fleet management and manual verification review.
- Passenger journey requests, network demand-to-service matching, driver trip operations and boarding confirmation.
- Paystack fare checkout, webhook settlement, Q-Funds transaction history and reconciliation endpoint.
- New database entities for identities, OTP challenges, vehicle assignments, route permissions, verification checks, payment records and passenger requests.
- New integration setup and foundation audit documentation.

## Changed

- Queue membership no longer consumes a physical seat. Reserved and occupied capacity are accounted for separately.
- HMAC role-bound session cookies now include an issue time and cryptographically enforced expiry. Existing sessions must sign in again.
- Driver location sharing is explicit and can be stopped; the network map excludes stopped or stale location sessions.
- Driver and vehicle approval, document expiry, route approval and active assignment are enforced before publishing or operating a service.
- Route stops can be placed by clicking on a map; road geometry is retrieved from the configured router.
- Passenger trip pages include a cabin/capacity preview.
- Obsolete disconnected legacy homepage/demo components have been removed from the active source tree.

## External setup still required

Google OAuth credentials, a verified Resend sender domain, Termii sender/API setup and SMS credits, Paystack test/live credentials and webhook secret, network administrator allowlist, a development database migration, and a production-grade map/routing service before scale.

This changelog describes application code; it does not mean any provider account, credential or production deployment has been configured.
