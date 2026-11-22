# Q-not — UNN & Nsukka Transport Pilot Readiness Pack

**Research cut-off: 22 November 2026**
**Code baseline audited:** GitHub `main` at `3d06444a42ba2dc0ac658d9e60669e63113fb306` (merged campus-demo baseline).
**Purpose:** operate UNN as a real area inside Q-not's existing transport network. This is not a second demo product and does not create fictional drivers, trips, payments or fleet records.

---

## 1. Product decision: build on the existing operating system

Q-not already has the core production objects and workflows needed for a controlled first corridor:

| Role | Existing application workflow | What the user actually does |
|---|---|---|
| Passenger | `/c/login`, `/c/dashboard`, `/trips`, `/c/requests`, `/c/tickets`, `/c/q-funds`, `/c/profile` | Sign in; browse published departures; submit a demand request; join a real trip queue or pay for a seat; receive a persisted ticket; view eligible live-trip information and payment history. |
| Driver | `/driver/login`, `/driver/onboarding`, `/driver/profile`, `/driver/dashboard` | Sign in; complete real driver profile; register or select an actual vehicle; request access to a corridor; complete phone and document checks; publish an actual service only after approval. |
| Operator | `/signup`, `/login`, `/dashboard`, `/dashboard/routes/new`, `/dashboard/fleet`, `/network/dispatch`, `/network/verification`, `/dashboard/finance` | Create the operator account; wait for network review (unless it is an allowlisted network-admin account); register routes and mapped stops; register vehicles; manage driver associations; match route demand to real trips; reconcile actual fare records. |
| Network administrator | `/network/verification`, `/network/dispatch` | Perform human document checks, approve or reject eligible drivers, vehicles and route access, and coordinate actual dispatch. The allowlisted email is controlled by `QNOT_NETWORK_ADMIN_EMAILS`. |

The application already enforces material driver/vehicle gates at the server: verified driver phone, approved driver profile, unexpired licence, approved vehicle, unexpired registration/insurance/inspection, active driver–vehicle assignment, and approved driver access to the route. The trip publication, passenger availability and boarding actions check these conditions. The installer also activates an operator-review gate using the existing `Operator.verificationStatus` field: non-admin operator accounts remain blocked from creating routes, changing fleet or dispatching until an allowlisted reviewer approves them. An email in `QNOT_NETWORK_ADMIN_EMAILS` is the trusted network-admin exception; an admin cannot approve their own operator account. A signup must never mean automatic permission to carry passengers.

### What the pilot configuration means

UNN corridors are ordinary `Route` records owned by an operator account. Their stops are ordinary, ordered `Stop` records with surveyed latitude/longitude. Trips, queues, tickets, payments and GPS remain the existing Q-not records. The app has no separate route-level institutional permit field or student-only access whitelist: an allowlisted network reviewer must check written campus/terminal permission externally before approving each driver-to-route request, and UNN must decide whether the route is open to all commuters or only a verified student cohort. No new `CampusDemo` state, mock wallet or local-only bookings are part of the operating path.

The route form now offers three **name templates only**:

1. `UNN · Odim Gate` → `UNN · Civil Engineering Building`
2. `UNN · Odim Gate` → `UNN · Faculty of Pharmaceutical Sciences`
3. `UNN · Hilltop Gate` → `UNN · Faculty of Education`

These labels do not create records automatically. The operator must create the route, survey and add real stops on the route detail map, obtain written approval, register real vehicles, approve drivers and then publish a genuine departure. Coordinates, fare, vehicle class, passenger capacity, operating times and exact campus access points must be field-verified with the University and the responsible transport authority. Do not use the old simulator's approximate coordinates as a survey.

### Passenger journey semantics

A **journey request is demand information**, not a confirmed booking, seat, driver dispatch or payment. The actual booking begins when a passenger chooses a published trip and uses the existing queue/seat/payment flow. A passenger should only be told a trip is confirmed after the database confirms it and the ticket/payment state has been issued. If an operator has created route names but not published approved trips, students can request service but there is no live service to book.

---

## 2. Finance product: learn from OPay and Cowry without becoming an unlicensed wallet

### What to learn

OPay is a licensed Mobile Money Operator in the Central Bank of Nigeria's current Payment Service Providers list. Its app is a broad financial product: account/wallet, transfers, bills, airtime and debit-card/payment functions. It is a useful benchmark for clear balances, transaction history, receipts, support, trust, status updates and accessible payment methods.

Cowry is the transit-payment product operated by Touch and Pay Technologies (TAP), **not Cowrywise**. Cowry's current app listing (updated 14 July 2026) says users can browse bus and rail routes, buy tickets and scan an in-app QR code to tap in/out. TAP's own product pages describe a Cowry card that can capture offline NFC transactions and an online Cowry app/wallet. This is the likely “tap/chip” system you remembered. Ask TAP to demonstrate its current card, reader, offline-sync, QR, wallet and API flows before designing an integration around any one payment method.

### What Q-not should implement now

Q-not's current passenger `Q-Funds` is a transport-payment history and confirmation surface, not a general bank account. The new operator Finance Board is a **read-only gross fare ledger** using actual persisted `Payment` rows for trips running on routes owned by the operator. It separates successful records, online provider records, driver-recorded cash, pending attempts and refunds already marked in the system.

Prioritise the following transport-finance capabilities:

- A clear fare before the passenger commits.
- A persisted reference and unambiguous pending/success/failed/refunded state.
- A ticket only after confirmed payment or the existing authorised cash-fare flow.
- Passenger receipts and payment history.
- Operator reconciliation by trip, route, method, reference and date.
- A separate record and approval process for any real refund.
- A signed cash sheet / supervisor reconciliation for cash fares.
- Later: partner-provided QR/NFC card acceptance and offline reconciliation, with agreed settlement and dispute processes.

### What Q-not must not pretend to offer

Do not show a fictitious wallet balance, credit a passenger with demo funds, accept user deposits into a Q-not-controlled stored-value balance, promise driver payouts, or label gross database fare records as cleared bank settlement. The Finance Board is not a bank statement: it does not deduct Paystack fees, taxes, operator shares or driver splits and does not verify physical cash. There is no Q-not stored-value wallet, peer-to-peer transfer or self-service refund system in the audited code.

The CBN's framework says Mobile Money Operators must be licensed and lists wallet creation/management and e-money issuance as permissible MMO activities. Its current Payment Service Providers list places OPay Digital Services in the MMO category, Paystack Payment in Switching & Processing, and Touch & Pay Technologies in the PSSP category. Keep fare acceptance under the existing approved payment-provider arrangement; discuss a licensed partner if the product later needs a stored-value wallet, transit-card float, agent cash-in/cash-out or NFC/QR acquiring. Obtain Nigerian payments counsel's view before handling customer funds beyond the present fare-payment model.

---

## 3. Safety, privacy, reliability and launch controls

### Driver, vehicle and route clearance

Before a real departure is published, the operations team must check the original documents and record the result:

- Driver identity and legal name; valid driving licence and expiry; verified phone; emergency contact; photo/identity match; driver conduct and reference check.
- Actual vehicle plate, make/model, legal vehicle class, inspected passenger capacity, roadworthiness, registration, insurance, inspection expiry, owner/operator authority and emergency equipment.
- Written route access for each driver, and permission for the actual vehicle class to use each gate, stop and road.
- Driver–vehicle assignment; no shared or reassigned vehicle without recorded authority.
- Driver training: passenger handling, safe stop/boarding, incident response, accessibility, cash/payment disputes, GPS sharing and how to contact the supervisor.

The current form stores limited licence information (including last four digits and expiry) and status. The operator review screen records only the operator verification status; it does not upload company registration, campus permit or terminal documents. Keep the original-document checks and permit references in the approved restricted operations register. This is not a substitute for a secure original-document verification process. The application does not itself verify a physical licence, insurance policy, vehicle inspection, campus permit or driver's criminal history.

### Campus and passenger safety

- No operation on university property or use of campus gates/stands until the authorised University office gives written permission.
- No passenger under the approved age/consent rules; agree a policy with UNN and legal counsel before serving minors.
- Clearly display the actual vehicle plate, driver identity and Q-not trip reference before boarding.
- Board and alight only at agreed, physically safe, accessible stops. Do not stop on carriageways, junctions, pedestrian crossings or emergency access routes.
- Establish a trained duty dispatcher and named on-call incident lead for every pilot shift.
- Publish service hours, maximum capacity, fare, cancellation/refund policy, accessibility arrangements and service suspension rules.
- Use a manual fallback register and dispatch phone when data coverage or a device fails. Never mark a fare as paid based solely on a passenger screenshot or an unsolicited bank alert.
- Feedback in the app is not an emergency line. The new feedback box opens WhatsApp with a prepared message; the passenger must review and send it. For immediate danger, contact campus security or emergency services.

### Data protection

The product handles account identifiers, contact details, trip history, payment references and precise location. Treat driver/passenger GPS and campus movement as sensitive operational data even when the legal classification is not “sensitive personal data”.

Before the live pilot, Q-not and UNN should decide in writing who is controller, joint controller or processor for each dataset; define the purpose and lawful basis; publish a plain-language privacy notice; agree data sharing, access, retention and deletion; restrict location access by role and active trip; and document incident/breach handling. Collect only the minimum information needed, avoid putting OTPs, passwords, full card data or identity-document images in feedback/chat, and do not run background tracking outside an active service.

The NDPC's 2025 GAID says a DPIA is mandatory in specified high-risk cases, including systematic monitoring, innovative solutions that may create significant privacy risks, financial services, and educational services processing student records. The NDPC's 2026 guidance also identifies more than 200 data subjects in six months and specified ICT/sector cases as data-controller/processor-of-major-importance triggers. Because this pilot combines student context, geolocation and digital payments, obtain a DPIA review by a suitably accredited DPO/privacy professional **before** real tracking and scaled student onboarding; confirm whether Q-not/UNN must register or file compliance returns. This is a launch gate, not something this installer can certify.

### Payments and refunds

- Confirm Paystack live keys, callback URL and webhook secret in the hosting dashboard; test with low-value controlled transactions first.
- Confirm the production webhook endpoint and a secured payment-reconciliation schedule. Never put secrets in client code, public GitHub, screenshots or chat.
- Do not use test keys in production or production keys in `.env.test`.
- Document who owns settlement, whose bank account receives fares, who is merchant of record, how Paystack fees are handled, whether the transport operator is sub-merchant/beneficiary, cash reconciliation and refund approval.
- The operator Finance Board shows gross persisted payment records. Reconcile it against Paystack's settlement report and supervisor-signed cash logs before paying out anyone.

### Reliability/security release checks

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --check`
- Confirm the deployed health endpoint `/api/health`, database connectivity, auth/OTP provider, Paystack webhook signature, reconciliation secret, map tile/routing services, TLS and backup/restore procedures.
- Confirm `DATABASE_URL` points to the intended production database. Render's `render.yaml` runs `prisma migrate deploy` during deployment; review migration status before deploying. This installer adds no schema/migration and does not touch a database.
- Run at least one full test for each role on separate devices and real independent accounts. Local component state or one browser cannot prove cross-device booking/seat consistency.

---

## 4. Practical pilot operating sequence

### Phase A — Permission and baseline (before publishing routes)

1. Get written UNN approval for a time-limited, named-route pilot, vehicle classes, stop positions, service hours, signage, student recruitment and collection of anonymised performance data.
2. Ask the Ministry of Transport who is the responsible operator/terminal manager for Nsukka Central Station and which permits apply to each vehicle class and commercial activity.
3. Field-survey the three proposed corridors with campus transport/security/works representatives. Capture stop coordinates with a phone/GNSS on site; note safe pedestrian paths, shade/lighting, accessibility, loading space, traffic conflicts and emergency access.
4. Observe demand before deployment for at least five representative weekdays and relevant peak periods. Record queue length, wait times, departures per hour, vehicle occupancy, walking time and traffic blockages. Do not invent a congestion baseline.
5. Agree fare rules, service level, pilot size, duration, staffing, data roles, safety escalation, cash handling, refunds, insurance and exit criteria in a signed pilot memorandum.

### Phase B — Configure Q-not using existing pages

1. Use the existing Q-not operator account intended to own the campus routes. Add its email to the production `QNOT_NETWORK_ADMIN_EMAILS` secret only if it is the authorised network reviewer. Do not share an administrator password.
2. In `/dashboard/routes/new`, select one of the campus route-name templates. Create the route. Open its route detail page and add all real boarding/alighting stops with coordinates captured and approved on site.
3. In `/dashboard/fleet`, register actual vehicles with the legal class and documented capacity/expiry dates. Submit all required evidence through the agreed secure verification channel.
4. Drivers sign up through the existing `/driver/login` flow, complete `/driver/onboarding`, verify their phone, request access to the correct route, and provide required documents. The network reviewer checks them and marks them approved only after the physical/official checks.
5. Assign each approved driver to an approved vehicle. Create a trip on the route with an agreed departure time and fare. Test publication and booking with an internal test user first.
6. Passengers sign up through `/c/login`, choose a real published trip or submit a journey request. Explain the difference between a request and a confirmed ticket.
7. Dispatch/operator watches `/network/dispatch`; drivers use `/driver/dashboard`; passengers use `/c/dashboard`, `/c/tickets` and `/c/q-funds`; the operator uses `/dashboard/finance` for transaction reconciliation.

### Phase C — Controlled live pilot

Start with one corridor and a limited number of approved vehicles for a short supervised pilot window. Add the other two corridors only after the first one passes the safety, queue, payment and reliability checks. Use actual passengers who have opted in; keep a manual supervisor/dispatcher present. Do not begin all three corridors just because route labels have been added.

### Phase D — Evidence and scale decision

Compare against the observed baseline. Report:

- Median and 90th-percentile wait time from passenger arrival/request to boarding.
- Queue length and dwell time at each stop during the matched peak periods.
- On-time departure rate, cancellations, no-shows, completed trips and incident rate.
- Vehicle load factor (occupied seats / legal capacity), passengers per trip and trips per vehicle-hour.
- Average fare, cashless share, payment success rate, refund/complaint rate and time to resolution.
- Passenger and driver satisfaction; accessibility problems; operator cost and contribution margin.
- Measured traffic interference at the gate/stop. Reduced waiting does not automatically prove reduced road congestion.

The defensible promise is **reduce uncertainty and waiting by coordinating demand, verified vehicles and departures**. Do not market “congestion eliminated” unless a before/after study with a credible comparison supports it.

---

## 5. Who to contact first — permission, terminal and technology partners

### University of Nigeria, Nsukka

1. **Dean, Student Affairs — Prof. Christian Ezeibe**
   `christian.ezeibe@unn.edu.ng` · `dean.studentaffairsunn@unn.edu.ng`
   Ask for a meeting to present a small supervised pilot, student-recruitment/communications route, SUG introduction, student-protection requirements and the appropriate unit for campus transport approval. Source: [UNN Student Affairs contact page](https://studentaffairs.unn.edu.ng/contact-us/).

2. **Deputy Vice-Chancellor (Administration), Nsukka Campus — Prof. Mike Ebie Onyia**
   `michael.onyia@unn.edu.ng`
   Ask for the formal permission process for commercial vehicles, route access, pickup/drop-off points, campus gates, signs and operating hours; request referral to the relevant Works/Services, Security, Transport and Legal officers. The official contact page also lists Vice-Chancellor Prof. Simon Ortuanya at `simon.ortuanya@unn.edu.ng` and Registrar Dr. Ngozi Nnebedum at `ngozi.nnebedum@unn.edu.ng` if the DVC office directs a formal submission. The same page links the [Works Department](https://works.unn.edu.ng/) and [Institute Security](https://security.unn.edu.ng/); ask the DVC/Student Affairs office to route the request to the current responsible officers rather than guessing staff names. Source: [UNN official contact page](https://www.unn.edu.ng/contact/).

3. **Students' Union Government and campus security/works/transport units**
   Ask Student Affairs/DVC to introduce the current office-holders. Do not rely on an unverified personal mobile number or an old SUG officer list. SUG can support demand discovery and student feedback but does not replace institutional permission.

### Enugu state transport and terminal access

4. **Enugu State Ministry of Transport**
   Phone: `07040244022`
   Office: No. 5 FSP Avenue, Independence Layout, Enugu, Nigeria
   Official portal: [etransport.enugustate.gov.ng](https://etransport.enugustate.gov.ng/)
   The portal currently lists Riders Permit ₦50,000, Bus Permit ₦35,000, Mass Transit Permit ₦50,000, Parking Permit ₦30,000 and Vehicle Inspection ₦10,000. These are the website's displayed prices, not a conclusion about which permit applies to Q-not, a keke or an individual pilot. Call the Ministry and ask for the correct classification, application process, current fees, insurance/vehicle documents and the authorised Nsukka terminal/route manager before paying anything. The portal identifies Dr. Obi Ozor as Commissioner of Transport. Source: [Ministry portal and contacts](https://etransport.enugustate.gov.ng/).

5. **Nsukka Central Station (the official terminal name)**
   Nsukka Terminal / Nsukka Central Station was one of five terminals inaugurated by Governor Peter Mbah on 15 August 2025. It is not officially named “Peter Mbah Bus Terminal” in the government report. Ask the Ministry for the named terminal manager/operator, commercial access policy, stand allocation, terminal fee, route permit and whether a third-party dispatch/booking platform can conduct a controlled trial. Source: [Federal Ministry of Information report, 15 August 2025](https://fmino.gov.ng/gov-mbah-inaugurates-5-ultramodern-bus-terminals-rolls-out-100-mass-transit-cng-buses-across-enugu/).

6. **Blue Noble Motors / Enugu Smart Bus**
   Published contact: `+234 803 319 6377` · `info@enugusmartbus.com` · `support@enugusmartbus.com`
   Office shown on the official site: Suite 16, Flagship Plaza, No. 16 Ezilo Street, Independence Layout, Enugu, Nigeria.
   The Enugu Smart Bus site says the service is operated by Blue Noble Motors Limited and names Rev. Dr. Engr. Nnamdi Obiakalusi as Chairman/CEO. The same site currently labels the programme “Launching soon” and displays 67% launch readiness, so treat it as a **prospective operator/technology partner**, not proof that routes are already operating. Ask for a partnership/operations meeting and a referral to the Nsukka terminal's authorised manager. Discuss a complementary campus feeder/first-last-mile corridor, driver/fleet standards, data boundaries, ticketing/payment interoperability and referrals. Do not assume Blue Noble controls the Nsukka terminal or that the terminal itself is managed by the bus company; confirm directly. Sources: [Enugu Smart Bus contact/about](https://enugusmartbus.com/about), [Blue Noble profile](https://enugusmartbus.com/blue-noble), [team](https://enugusmartbus.com/team).

### Payment and card interoperability

7. **Touch and Pay Technologies (Cowry)**
   `ask@touchandpay.me` · `+234 902 442 9918`
   Lagos office listed by TAP: 5th Floor, SAPETRO Towers, 1 Adeola Odeku Street, Victoria Island, Lagos, Nigeria. Ask for Partnerships / Product / Enterprise Integrations. Request a technical and commercial discussion on QR acceptance, NFC/Cowry card readers, offline fare capture, settlement, reversals/refunds, reconciliation APIs, merchant onboarding, device costs and terminal deployment. Ask specifically whether a new campus partner can use an existing Cowry card/app, issue a co-branded card, use QR only, or integrate through API. Do not claim Cowrywise built the card; the transit product is Cowry by Touch and Pay. Sources: [TAP contact](https://touchandpay.me/contact), [TAP NFC/offline product overview](https://touchandpay.me/about), [Cowry app listing](https://play.google.com/store/apps/details?id=com.cowry).

### Local startup and funding ecosystem

8. **Enugu MSME & Startup Agency / Enugu SME Center**
   `info@enugusme.en.gov.ng` · `08028545013` · `09128954467`
   Address: 2A Market Garden Avenue, opposite Ebeano Tunnel Roundabout, G.R.A., Enugu, Nigeria.
   Ask for the next DBN Entrepreneurship Training Programme cohort, startup/MSME grant window, mobility/transport innovation support and the route for a university-based venture. The agency advertises a DBN training/pitch programme linked to a ₦100M pool, but its detailed page says the referenced 2025 cohort finished its online phase by 31 October 2025 and held its workshop/pitch in November 2025. The programme page says prospective applicants can contact the agency to be notified when applications reopen; it is **not an open grant application today**. The 234 Finance Bootcamp is free and focuses on finance-readiness, but its page also says to contact the team for the next opening rather than showing an active intake. Source: [Enugu SME Center programmes and contacts](https://enugusme.en.gov.ng/programs), [DBN programme details](https://enugusme.en.gov.ng/programs/dbn-entrepreneurship).

### Meeting request agenda

Bring a two-page pilot brief, one actual corridor map, vehicle/driver checklist, product demo of the existing real workflows (not the removed simulator), data protection note, insurance/permit evidence, operating hours, emergency escalation and a short baseline-observation plan. Ask for: (1) permission owner; (2) exact authorized route/stands; (3) permitted vehicle classes; (4) pilot size/period; (5) insurance/permit requirements; (6) fare/terminal fee terms; (7) data sharing and publicity approval; (8) the named day-to-day terminal supervisor. Request written next steps and an introduction to the authorised decision-maker.

---

## 6. Funding and competition pipeline (checked 22 November 2026)

### Act immediately: ATF AI Challenge 2026/27

**African Technology Forum AI Challenge** — [official programme](https://www.atfchallenge.org/) · [FAQ and dates](https://2026.atfchallenge.org/faq)
Enrollment is open until **30 November 2026** in Nigeria, Ghana, Kenya and South Africa. It is fully funded/free to participate, requires about two hours per day for 1–2 weeks of AI School, and accepts university students or graduates within the past three years. Team registration happens later; founders can enrol alone and join a team. The country prize pool is **US$10,000**, split US$5,000 / US$3,000 / US$2,000 among the top three teams. Cohort 3: team registration 11–22 January 2027, build begins 15 February, MVP deadline 30 April 2027, judging in May and Demo Days in June 2027.
**Why it fits:** the challenge accepts Nigeria-based university students. A credible Q-not-related AI problem could be peak-demand forecasting or dispatch/headway recommendations using properly permissioned, aggregated pilot observations. AI is not a prerequisite for launching the transport pilot; do not delay the core operational launch or invent data to fit the challenge. Start the free enrolment now if the time commitment is realistic.

### Best direct sector fit: Sandbox Africa — Logistics & Mobility Accelerator

[Programme page](https://sandbox.africa/sector-studios/programs/logistics-mobility-accelerator)
The official page currently shows **Open / continuous intake** for Africa-focused founders and operating teams in EV/mobility, last-mile delivery, freight and cross-border technology. It follows diagnose → prepare → prove → pitch → dealflow → outcome and includes a pathway to recurring Sandbox Friday Pitch. It is a sector accelerator/dealflow channel, **not a guaranteed grant**; commercial terms are disclosed for each cohort/partner-backed pathway. Apply with a named pilot buyer/operator, real route, baseline observations and an agreed pilot plan, rather than only a software feature list.

### Strong South-East funding fit; the 2026 competition is closed

**South East Venture Capital Program (SEVCP) / South East Development Commission**
[SEVCP pitch programme](https://www.sedc.gov.ng/programs/sevcp/pitch)
The 2026 timeline shows applications closed 27 March, finals 25 May and awards 26 May 2026. It is therefore not open now. The programme is unusually relevant to Q-not: its incubation track accepts a working prototype/validated MVP and early evidence such as pilots, waitlists or partnerships, and offers selected winners **US$5,000 equity investment**; its accelerator track expects measurable traction and offers selected winners **US$20,000 equity investment**. It explicitly includes logistics, commerce, fintech and digital platforms and requires South-East operating presence. Prepare for the next cycle with a permissioned pilot, paying or active users, route-level outcome metrics and signed letters of support.

### Local funding-readiness and next-intake routes

**Enugu SME Center / Enugu MSME & Startup Agency**
[Programmes](https://enugusme.en.gov.ng/programs) · [DBN programme](https://enugusme.en.gov.ng/programs/dbn-entrepreneurship) · [234 Finance Bootcamp](https://enugusme.en.gov.ng/programs/234-finance-bootcamp)
The DBN page describes a 2025 Enugu/Abia cohort that concluded in November 2025; the page asks new applicants to contact the team for the next opening. The 234 Finance Bootcamp is described as free financial-literacy, record-keeping and investment/bankability training, but also says to contact them when applications reopen. This is a good local relationship and readiness channel, not a grant that can be claimed as open today. The current programmes page also lists the Enugu Campus Hackathon and Tech & Innovation Park, but there is no dated open Q-not grant call on that page at this cut-off. Ask for the next challenge/hackathon and startup application window.

### Conditional or not suitable for Q-not today

- **AI Startup Challenge (AI in Nigeria × Flutterwave), Lagos 2026** — applications run 16–30 November and the prize pool is ₦3M, but every team member must reside in Lagos State. Only apply if the entire team genuinely meets the Lagos rule and can demonstrate a real AI use-case; a Nsukka-based pilot team should not assume eligibility. [Official challenge](https://aiinnigeria.com/ai-startup-challenge/).
- **D-Prize 2026** — the competition page currently shows a live application pathway and top awards of up to US$20,000. However, the official eligibility says existing organisations are considered only if their core focus is distributing an existing, evidence-based poverty intervention. Q-not as a new transport-coordination platform is not a natural fit. Do not contort the problem statement to apply. [Eligibility and timeline](https://d-prize.org/).
- **Orange Corners Nigeria Cohort 16** — official programme page currently marks applications closed and describes a Lagos/Ogun programme. Not a live opportunity for an Enugu/Nsukka pilot unless FATE confirms an extension and the venture genuinely meets the base/geography criteria. [Official programme](https://ocn.fatefoundation.org/incubation).
- **USPF Changemaker Challenge 2026** — application period ended 15 November 2026; the current call is closed. Watch for the next cycle. [Official challenge](https://uspfchangemaker.ng/).
- **National AI Innovation Challenge (N-ATLAS) 2026** — deadline was 12 October 2026 and the finals period was 8–10 November; closed. [Official programme](https://ncair.nitda.gov.ng/naic/).
- **Tony Elumelu Foundation and Africa's Business Heroes** — keep on the 2027 watchlist. The next dates were not confirmed by the official pages at this research cut-off; do not use third-party deadline rumours.

### How to make the ask investable

Request a **small, milestone-based pilot budget**, not a vague large technology grant. Break it into approved driver/vehicle readiness, insurance/permits, stop signage, dispatcher training, customer support, payment integration and independent before/after measurement. Offer a defined corridor, fixed dates, permitted vehicle classes, service hours, maximum occupancy, weekly reports, data minimisation and an agreed stop/go decision. Separate cash requested from in-kind terminal, vehicle, reader, marketing or staff support. A signed permission letter and measured queue/wait-time improvement are the strongest evidence for the next SEDC cycle.

---

## 7. First 10 working-day action list

- [ ] Send the UNN Student Affairs meeting request; request DVC (Administration, Nsukka Campus) routing.
- [ ] Request a Ministry of Transport appointment and the authorised Nsukka Central Station manager's contact.
- [ ] Contact Blue Noble/Enugu Smart Bus for an operating partnership discussion.
- [ ] Contact Touch and Pay for Cowry QR/NFC/API/settlement discussion; no integration until written terms and test credentials.
- [ ] Agree the data controller/processor roles and book a DPIA/privacy review.
- [ ] Conduct the baseline queue and travel-time observations.
- [ ] Verify all corridor stops and coordinates with UNN/terminal staff.
- [ ] Select only one initial corridor; confirm driver, vehicle, insurance, route approval and emergency coverage.
- [ ] Configure the real operator-owned route/stops and publish one supervised test departure.
- [ ] Run passenger, driver, operator and finance tests on separate accounts/devices; reconcile test payments and GPS permissions.
- [ ] Launch only after written permissions and the safety/privacy gates are signed off.
- [ ] Apply to the open Sandbox Africa mobility pathway; prepare for the next SEVCP round with measured traction.

---

## 8. Primary sources

- [UNN Student Affairs — contacts](https://studentaffairs.unn.edu.ng/contact-us/)
- [University of Nigeria — official contacts](https://www.unn.edu.ng/contact/)
- [Federal Ministry of Information — five Enugu terminals, 15 August 2025](https://fmino.gov.ng/gov-mbah-inaugurates-5-ultramodern-bus-terminals-rolls-out-100-mass-transit-cng-buses-across-enugu/)
- [Enugu Ministry of Transport — permits and contact](https://etransport.enugustate.gov.ng/)
- [Enugu Smart Bus — operator, services and contacts](https://enugusmartbus.com/about)
- [Blue Noble Motors](https://enugusmartbus.com/blue-noble)
- [Touch and Pay — contact](https://touchandpay.me/contact)
- [Touch and Pay — NFC/offline product overview](https://touchandpay.me/about)
- [Cowry app — published consumer functionality](https://play.google.com/store/apps/details?id=com.cowry)
- [OPay app — published consumer functionality](https://play.google.com/store/apps/details?id=team.opay.pay)
- [Central Bank of Nigeria — licensed Payment Service Providers](https://www.cbn.gov.ng/PaymentsSystem/PSPs.html)
- [CBN — Framework and Guidelines on Mobile Money Services in Nigeria](https://www.cbn.gov.ng/Out/2021/CCD/Framework%20and%20Guidelines%20on%20Mobile%20Money%20Services%20in%20Nigeria%20-%20July%202021.pdf)
- [NDPC — 2025 General Application and Implementation Directive](https://ndpc.gov.ng/wp-content/uploads/2025/03/NDP-ACT-GAID-2025-MARCH-20TH.pdf)
- [NDPC — 2026 Guidance on Controllers/Processors of Major Importance](https://ndpc.gov.ng/wp-content/uploads/2026/01/NDP-ACT-GAID-2025-MARCH-20-1.pdf)
- [Sandbox Africa — Logistics & Mobility Accelerator](https://sandbox.africa/sector-studios/programs/logistics-mobility-accelerator)
- [SEDC — SEVCP Pitch Competition](https://www.sedc.gov.ng/programs/sevcp/pitch)
- [Enugu SME Center — programmes](https://enugusme.en.gov.ng/programs)
- [African Technology Forum AI Challenge](https://www.atfchallenge.org/)
- [USPF Changemaker Challenge](https://uspfchangemaker.ng/)
- [National AI Innovation Challenge](https://ncair.nitda.gov.ng/naic/)
- [AI in Nigeria — AI Startup Challenge](https://aiinnigeria.com/ai-startup-challenge/)
- [Orange Corners Nigeria — Cohort 16](https://ocn.fatefoundation.org/incubation)
- [D-Prize — current competition and eligibility](https://d-prize.org/)
