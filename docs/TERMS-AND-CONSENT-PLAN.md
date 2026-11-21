# Q-not Signup Terms, Privacy and Consent Implementation Plan

**Status: required before public production onboarding.** This file records the content and technical work still required; it is not a final legal instrument and must be reviewed by a Nigerian lawyer/privacy professional before users are asked to accept it.

## Separate agreements by account role

### Passenger Terms of Service
1. Account eligibility, accurate contact information, account security and account recovery.
2. How Q-not displays routes, fares, capacity, ETAs and service status; estimates are not guarantees.
3. Journey requests versus confirmed bookings; a request is not a seat reservation until confirmed.
4. Ticket issue, seat holds, payment authorisation, fare confirmation, cash collection and boarding.
5. Cancellation, missed departures, late arrival, operator cancellations, refunds and chargebacks.
6. Passenger conduct, prohibited behaviour, luggage/property rules and accessibility requests.
7. Driver/vehicle information, route permissions, safety reporting and limits of Q-not's role versus the transport operator.
8. Location sharing: optional pickup sharing, active-trip tracking, who can see it and when it ends.
9. Emergency guidance, complaints, support, incident reporting and dispute handling.
10. Service availability, maintenance, force majeure, liability limits and consumer rights.
11. Account suspension/termination, notices, governing law and changes to terms.

### Driver and Vehicle Owner Agreement
1. Accurate identity, contact, licence, vehicle ownership/authority and document declarations.
2. Verification consent, verification provider use, document review, renewals and expiry handling.
3. Route/terminal/union authorisation and prohibition on operating unapproved corridors.
4. Vehicle roadworthiness, passenger capacity, insurance, inspection and substitution rules.
5. Passenger safety, conduct, accessibility, non-discrimination and incident reporting.
6. GPS/location sharing, location accuracy, device permissions and no false location claims.
7. Dispatch recommendations are offers/coordination signals, not permission to violate applicable transport rules.
8. Fare display, cash handling, digital payments, fees, settlement, refunds and dispute evidence.
9. No-show, cancellation, breakdown, substitute-driver and vehicle-change procedures.
10. Suspension, appeal, audit, data privacy, account security and operator/owner responsibilities.

### Operator / Fleet Agreement
1. Authority to register the organisation, terminals, routes, vehicles and drivers.
2. Responsibility for document accuracy, operator permissions, service quality and vehicle roadworthiness.
3. Route and timetable management; no publishing unapproved routes or unverified vehicles.
4. Fare setting, payment processing, cash reconciliation, fees, refunds and settlements.
5. Driver assignment, shift management, substitutes and incident escalation.
6. Data access restrictions, audit logs, security incidents and staff permissions.
7. Service-level limitations, suspension, termination, disputes and legal compliance.

## Privacy Notice / Data Processing Notice

Must clearly explain purposes, lawful basis, categories, sharing, retention, user rights, contact details and security for: account data, verified phone/email, trip history, payment metadata, location, device/session data, support and incident records. If NIN, face matching or liveness checks are introduced, add a dedicated high-risk/sensitive-data notice and a Data Protection Impact Assessment before processing. Do not collect or retain raw NIN/biometric data merely because a provider can return it.

## Required signup experience

- Link to Passenger Terms, Driver Agreement, Operator Agreement as appropriate, and Privacy Notice at registration.
- Separate mandatory checkbox: "I have read and agree to the [role] Terms and Privacy Notice." Do not pre-check it.
- Record policy version, role, account ID, acceptance timestamp and the exact document version. Avoid collecting IP/device fingerprints unless a documented lawful purpose requires them.
- Google sign-in must show the applicable agreement before first account creation/activation; OAuth consent is not a substitute for Q-not terms acceptance.
- Existing accounts must be prompted to accept updated material terms before using affected features.
- Store acceptance records server-side and provide links to current and archived versions.
- Do not block a passenger from browsing public routes or trying non-transactional product previews before account creation. Require acceptance before creating an account or placing a request/booking.
- A driver may browse the portal and complete a profile, but cannot publish/accept passenger services until verification and route/vehicle approvals pass.

## Technical implementation still required

- Add versioned legal-document pages: `/legal/passenger-terms`, `/legal/driver-agreement`, `/legal/operator-terms`, `/legal/privacy` and `/legal/location-sharing`.
- Add a `TermsAcceptance` (or equivalent) table with account role, account ID, document key/version and accepted timestamp; enforce uniqueness per account/document/version.
- Add mandatory, accessible, unchecked consent controls to passenger account creation, driver onboarding activation and operator signup.
- Add server-side acceptance validation before signup completion, journey requests/booking, driver service publication and operator operations where appropriate.
- Add an admin-controlled current-version setting and acceptance audit view.
- Version changes must not silently overwrite old acceptance records.

**Release blocker:** do not present these documents as "legally complete" until counsel has reviewed the final wording against Nigerian consumer, transport, payments and data-protection obligations.
