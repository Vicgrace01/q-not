# Q-not Network foundation audit

## Product model

Q-not coordinates passenger demand with available shared-transport capacity across route corridors. It is not one-passenger-to-one-driver ride-hailing. Passengers request or book a compatible departure; independent drivers, fleet owners, operators and terminals publish services; the network matches compatible demand to approved supply.

## Included in this implementation

- Passenger phone/email OTP, Google OAuth entry point, passenger profile, journey requests, departures, tickets, and Q-Funds payment ledger.
- Driver phone/email login, Google OAuth entry point, onboarding, independent owner-driver and operator-assigned vehicle paths, vehicle catalogue, route applications, driver dashboard and trip operations.
- Operator route management, coordinate selection on a map, fleet/driver assignment workspace, and scheduled service creation.
- Leaflet maps with OpenStreetMap attribution, route geometry via an OSRM-compatible endpoint, explicit driver GPS sharing, trip-scoped passenger location access, stale-location handling and a network dispatch map.
- Rules-based demand matching constrained by route, time, capacity, driver approval, vehicle approval, driver/vehicle assignment, and route approval.
- Paystack fare checkout, raw-body webhook signature verification, amount/currency/reference checks, seat holds, idempotent settlement, ticket issue, and protected reconciliation endpoint.
- Persistent database OTP challenges, request throttling, expiry, attempt limits and one-time consumption.
- HMAC-signed role-bound session cookies with server-verified expiry.
- Queue/seat accounting correction: queue position alone does not consume a physical seat; confirmed bookings hold capacity; boarding transfers a held seat into occupied capacity.

## Not included / do not claim as live

- NIN/NIMC identity lookup, FRSC licence verification, police/background checks, facial recognition, liveness or automated document authenticity checks.
- Secure document/image uploads or third-party registry integrations.
- Hardware GPS devices, background tracking after a browser is closed, GPS-spoof proofing or guaranteed real-time location.
- A guaranteed production map-tile/routing SLA. Default OSM tiles and public OSRM are replaceable community/public services.
- Stored-value wallet, customer top-ups, withdrawals, peer-to-peer transfer, safeguarded balances, operator payouts, or automated refunds.
- A real-time emergency dispatch centre, 24/7 support or verified response to emergency alerts.
- Machine-learning dispatch. The initial demand-to-service matching is deterministic/rules-based.
- Manufacturer-accurate 3D bus assets. The catalogue provides class-level visual previews; actual vehicle identity and capacity must be verified from the real vehicle/evidence.
- Seat number selection/seat map locking for every bus class. The cabin view is a visual preview; booking currently holds trip capacity, and driver boarding confirmation determines the occupied seat count.

## Important operational cases for the next release

1. Payment succeeds after a reservation hold has expired or has been released. Define late-success handling and a reliable refund/manual-reconciliation queue.
2. Passenger cancels after payment, misses boarding, changes departure, or requests a refund. Define the policy and append-only financial audit records before live rollout.
3. Passenger boards/alights at intermediate stops. Current capacity accounting is trip-wide and conservative; introduce segment-level occupancy if seats are to be reallocated after intermediate alighting.
4. Driver no-show, substitute driver, vehicle substitution, route detour, traffic incident, vehicle breakdown and emergency handling.
5. Device location stale, inaccurate, denied, spoofed, duplicated or clock-skewed; sharing switched off; driver runs out of battery or loses data.
6. Shared vehicle assignment across shifts, owner-driver vs employed driver, assignment overlap and operator/route transfer.
7. Route permits/authorisation vary by corridor, vehicle class, local authority and reform programme. Do not treat a route chosen in onboarding as proof of permission.
8. Passenger groups, children, accessibility requirements, luggage, fare changes, multi-stop journey and partial capacity by route segment.
9. Non-smartphone passengers, USSD/agent/terminal booking, cash-only journeys and no-data boarding verification.
10. Account takeover, SIM swap, compromised email, reused phone numbers, operator staff abuse, review conflicts, appeals and audit trails.
11. Document expiry, stolen/duplicated registration plates, false vehicle photos, changed vehicle capacity and expired insurance/roadworthiness inspection.
12. Payment disputes, duplicate webhook delivery, provider downtime, chargebacks, network timeouts and idempotent reconciliation.
13. Data retention, access logs, privacy requests, security incident response and NDPC obligations for sensitive identity data.
14. Service-area boundaries, transport union/cooperative relationships, route changes, stop closure and terminal queue governance.

## Deployment gate

Do not use this release for live passenger transport until migrations, access control, provider credentials, external verification procedures, document evidence handling, refund/late-payment policy, operational monitoring, incident response and a staging pilot have been reviewed and tested. Test on an isolated development database first; the full integration test helpers clear database tables.
