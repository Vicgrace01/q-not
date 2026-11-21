# Q-not Interaction Register

**Purpose:** keep the growing number of navigation links, buttons, forms and operational actions accountable. A control is not complete merely because it renders; its action, permission, success state, error state and data effect must be documented and tested.

**Status vocabulary**
- `Implemented / needs E2E`: a source action exists but full browser/provider testing is outstanding.
- `Blocked by configuration`: requires provider credentials, verified domain, SMS credits, public webhook URL or external approval.
- `Not implemented`: no operational code path has been verified.
- `Must remain gated`: a safety or permission prerequisite is enforced server-side.

## Passenger portal

| Page | Control / action | Intended outcome | Server/data dependency | Test still required |
|---|---|---|---|---|
| `/c/login` | Continue with phone | Request OTP and establish passenger session | Persistent OTP + SMS provider | Real SMS delivery and account reuse |
| `/c/login` | Continue with email | Request email OTP and establish session | OTP challenge + Resend | Delivery, expiry, replay prevention |
| `/c/login` | Continue with Google | OAuth sign-in/account linking | Google OAuth + `AuthIdentity` | Existing phone-only account linking |
| `/trips` | Search/filter departures | Discover published services | Route/trip/vehicle/driver eligibility | Filters and empty/error states |
| `/trips/[id]` | Request/hold/confirm seat | Reserve a real seat | Queue, payment and seat transaction | Concurrent booking, timeout and cancellation |
| `/c/dashboard` | Find bus / request route | Start passenger journey | Passenger session + routes | Empty network and reconnect state |
| `/c/requests/new` | Submit journey request | Add demand to corridor | Stops, route and passenger account | Duplicate/time-window validation |
| `/c/requests` | Cancel request | Withdraw unfulfilled demand | JourneyRequest status transition | Matched/expired edge cases |
| `/c/tickets` | Open ticket / journey | View boarding credential and status | Ticket ownership + trip records | Used/cancelled/expired tickets |
| `/c/q-funds` | Add/pay/review activity | Pay fare and inspect ledger | Paystack + webhook reconciliation | Success, decline, duplicate webhook, refund |
| `/c/profile` | Edit profile / link phone/email | Maintain verified contact and safety details | Account session + OTP | Duplicate contact, expired code |
| Trip map | View assigned bus | Show authorised bus position | Active ticket + fresh driver GPS | Stale GPS, permission denial, ended trip |

## Driver and vehicle portal

| Page | Control / action | Intended outcome | Server/data dependency | Test still required |
|---|---|---|---|---|
| `/driver/login` | Phone/email/Google sign-in | Enter driver workspace | OTP / OAuth | Account linking and recovery |
| `/driver/onboarding` | Save driver profile | Store identity/profile data | Driver record | Partial save and validation |
| `/driver/onboarding` | Register vehicle | Record actual vehicle, capacity and documents | Bus + ownership/assignment | Duplicate plate and document expiry |
| `/driver/onboarding` | Request route access | Create route approval | DriverRouteApproval | Wrong-operator route rejection |
| `/driver/onboarding/phone` | Verify mobile from Driver Profile | Unlock service-publishing eligibility | Termii/local OTP + driver record | No Termii credentials, wrong/expired code |
| `/driver/profile` | View/edit profile and verify mobile | Keep contact, licence, vehicle and route status current | Driver record + OTP | Verified contact and approval states |
| `/driver/dashboard` | Publish departure | Create eligible scheduled service | Approved driver + phone + bus + route | Capacity, fare and time validation |
| `/driver/dashboard` | Open boarding / call passenger | Manage queue and seats | Approved trip + QueueEntry | Over-capacity and simultaneous calls |
| `/driver/dashboard` | Confirm boarding / complete trip | Issue/use ticket and close trip | Payment/ticket/Trip status | Duplicate scan and outstanding payments |
| Driver route map | Share GPS | Update active driver location | DriverSession + geolocation | HTTPS, permission denied, stale/offline |

**Safety rule:** driver registration and viewing the driver workspace must not be blocked by mobile verification. A driver must have verified contact, approved driver record, current licence, approved vehicle and route approval before publishing a departure, opening boarding or accepting passengers. Server actions remain authoritative; hiding a button is not security.

## Operator and network portals

| Page | Control / action | Intended outcome | Server/data dependency | Test still required |
|---|---|---|---|---|
| `/login`, `/signup` | Password/Google access | Operator account/session | Operator auth + OAuth | Existing-account linking |
| `/dashboard/routes/new` | Create route/stop | Build a corridor | Route + Stop coordinates | Duplicate stop sequence and map selection |
| `/dashboard/routes/[id]` | Assign driver/vehicle, publish departure | Operate a service | Fleet, approvals, fare and schedule | Unapproved/expired assets blocked |
| `/dashboard/fleet` | Review/manage vehicles | Operator fleet control | Bus, driver assignment and documents | Expired/rejected records |
| `/network/dispatch` | Review demand and supply | Coordinate network | JourneyRequest + active sessions | Stale location and route compatibility |
| Verification review | Approve/reject driver/vehicle/route | Control operational eligibility | Role-authorised review actions | Audit trail and reviewer permissions |

## Release gate for every button

Before a button is considered complete, verify: (1) clear label and accessible contrast, (2) keyboard/touch support, (3) disabled/pending feedback, (4) server-side authorisation, (5) validation and useful error message, (6) success state and navigation, (7) database transaction or provider side-effect, (8) duplicate submission/idempotency, and (9) empty/offline/retry state.
