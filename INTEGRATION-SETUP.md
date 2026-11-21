# Q-not integration setup

This release adds the application-side integration points. External services remain inactive until you configure your own credentials. Do not send credentials, NINs, identity documents, webhook secrets, or access tokens in chat or commit them to Git.

## Before installing

- Work on a feature branch, not `main` or `master`.
- Back up your development database before applying the migration.
- Keep your existing `.env.local` and add only the required variables. Never replace `DATABASE_URL` or `AUTH_SECRET` with example values.
- This update changes the session-cookie signing format. All existing operator, passenger, and driver sessions must sign in again after installation.

## Required application environment

```dotenv
DATABASE_URL="postgresql://..."
AUTH_SECRET="a-new-random-secret-at-least-32-characters-long"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate a strong secret locally, for example with Node:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Google sign-in

1. Create a Web OAuth client in Google Cloud Console.
2. Add this exact local authorised redirect URI:
   `http://localhost:3000/api/auth/google/callback`
3. Add the production HTTPS callback when a production hostname is available.
4. Set the client values in `.env.local`:

```dotenv
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

The code validates OAuth state, nonce, PKCE, issuer, audience, and Google's verified-email claim. The Google integration supports passenger, driver and operator entry points. It does not perform NIN verification. The local and production redirect URI must exactly match the Google Cloud configuration.

## Email verification (Resend)

1. Create a Resend account.
2. Verify a sending domain and complete its DNS records.
3. Create an API key with the minimum permissions needed.
4. Configure:

```dotenv
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Q-not <verify@your-verified-domain.ng>"
```

The code sends passenger and driver email login/link codes. Without these values, local development prints a masked-address development code in the server terminal. Production fails closed rather than returning a code to the browser.

Resend currently advertises a free tier of 3,000 emails per month with a 100-email daily limit. Check its current terms before relying on it for live operations: https://resend.com/pricing

## SMS verification (Termii)

1. Create a Termii account and obtain the API key.
2. Use the exact API base URL displayed in your Termii dashboard; the default shown below may need to be changed for your account/region.
3. Register/approve the sender ID and confirm that the selected channel and Nigerian DND route are enabled for your account.
4. Ensure the account has the necessary SMS credits/billing arrangement.

```dotenv
TERMII_API_KEY="..."
TERMII_BASE_URL="https://api.ng.termii.com"
TERMII_SENDER_ID="YOUR_APPROVED_SENDER"
TERMII_CHANNEL="dnd"
```

A Termii account/API key is not equivalent to free physical SMS delivery. SMS is subject to account balance, route, sender approval, delivery status, and provider terms. If Termii is not configured, local development logs the code in the terminal only. Production refuses phone sign-in rather than returning a development OTP.

Termii API documentation: https://developers.termii.com/

## Maps and routing

```dotenv
NEXT_PUBLIC_MAP_TILE_URL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
QNOT_ROUTING_BASE_URL="https://router.project-osrm.org"
```

Leaflet renders maps and markers; the browser Geolocation API captures driver GPS only after the driver gives permission and starts sharing for an active journey. GPS updates are authenticated, timestamp-checked, rate-limited, and associated with the driver's active trip. A passenger who holds a ticket for that trip can view the location. Updates older than 45 seconds are marked stale; the API stops exposing the location once it is older than five minutes.

Important limitations:

- This is phone/browser GPS, not a dedicated vehicle tracker. The driver must keep the browser/app active and location permission enabled. Closing the browser, loss of GPS, low battery, or network interruption stops fresh updates.
- Browser GPS does not prove that a device is physically at the reported coordinates. This release does not provide hardware attestation or robust GPS-spoof detection.
- OpenStreetMap's standard tile server is community-funded, best-effort and has no SLA. Keep visible attribution, honour caching headers, do not bulk-download or prefetch tiles, and be prepared to switch to a contracted tile provider or self-hosted service before commercial scale. Policy: https://operations.osmfoundation.org/policies/tiles/
- The default public OSRM demo router is a development/low-volume integration target, not a production availability guarantee. Replace it with a contracted or self-hosted routing service before serving sustained commercial traffic. OSRM route API: https://project-osrm.org/docs/v5.24.0/api/

## Paystack fare collection

Use **test keys first**. Configure:

```dotenv
PAYSTACK_PUBLIC_KEY="pk_test_..."
PAYSTACK_SECRET_KEY="sk_test_..."
PAYSTACK_WEBHOOK_SECRET="whsec_..."
```

Register the webhook endpoint in the Paystack dashboard:

`https://YOUR_PUBLIC_HOST/api/payments/paystack/webhook`

The webhook verifies the raw request body using the timestamped `Paystack-Signature` (`whsec_` secret) and accepts the legacy `x-paystack-signature` format while migrating. It checks amount, currency, payment reference, and pending seat hold before issuing a ticket. The browser return URL alone never proves that payment succeeded.

For local webhook testing, expose the local server over an HTTPS tunnel and register that public tunnel URL as the webhook temporarily. Do not publish the tunnel URL or credentials in a public repository.

The endpoint `/api/payments/reconcile` is intended for a scheduled server-side POST with:

```http
Authorization: Bearer YOUR_QNOT_CRON_SECRET
```

Configure a strong `QNOT_CRON_SECRET` and call the reconciliation endpoint periodically from a trusted scheduler. Do not expose it in client code.

Paystack fees apply to live transactions. Never expose the secret key in the browser. Paystack documentation: https://paystack.com/docs/payments/webhooks/ and https://paystack.com/docs/payments/accept-payments/

## Driver account association

Operators cannot attach an existing independent driver account to their fleet using only the driver's phone number. Until a driver-approved invitation/claim flow is implemented, the operator fleet form will refuse to attach an existing self-managed account and display an explanatory message. Existing accounts already owned by the same operator remain manageable; accounts owned by another operator remain blocked.

## Q-not Network reviewer access

Create or use an operator account for the trusted reviewer, then add that exact account email to:

```dotenv
QNOT_NETWORK_ADMIN_EMAILS="reviewer@example.com,another-reviewer@example.com"
```

Only allowlisted operator accounts can access `/network/verification` and network-wide dispatch views. Do not use a public or shared inbox as an administrator identity. Keep this list short and controlled.

## Automated test database safety

The full Vitest suite uses real PostgreSQL and its reset helper deletes test records. Before running `pnpm test`, create a local `.env.test` file that points to a dedicated, disposable test branch (never production). In addition to `DATABASE_URL`, set an exact host and database allowlist:

```dotenv
DATABASE_URL="postgresql://...@YOUR-DEDICATED-TEST-ENDPOINT/neondb?sslmode=verify-full"
QNOT_TEST_DATABASE_HOST="YOUR-DEDICATED-TEST-ENDPOINT"
QNOT_TEST_DATABASE_NAME="neondb"
```

The `tests/helpers/db.ts` reset helper checks `NODE_ENV=test` and requires the parsed database hostname and database name to match these allowlist values **before issuing its first delete**. A missing or mismatched value aborts the reset. Keep `.env.test` local and out of Git. CI must supply the same three variables as protected test-environment variables. Do not point the full integration suite at development or production data.

For the current local Neon setup, set `QNOT_TEST_DATABASE_HOST` to the direct host for the `q-not test` branch (remove `-pooler` from its pooled hostname) and `QNOT_TEST_DATABASE_NAME` to `neondb`.

## Development install and database migration

From the repository root, on your feature branch:

```powershell
npx --yes pnpm@12.3.4 install --lockfile-only --no-frozen-lockfile
npx --yes pnpm@12.3.4 install --frozen-lockfile
npx --yes pnpm@12.3.4 exec prisma generate
npx --yes pnpm@12.3.4 exec prisma validate
```

Back up the development database, confirm `.env.local` points to that development database, then apply the migration:

```powershell
npx --yes pnpm@12.3.4 exec prisma migrate dev
```

Do not run this migration against production until it has been reviewed, tested against a staging copy, and backed up. Do not run the full Vitest suite against production: the integration test helpers reset database tables. `test:demo` is isolated from the database reset helper.

Then validate locally:

```powershell
npx --yes pnpm@12.3.4 lint
npx --yes pnpm@12.3.4 exec tsc --noEmit
npx --yes pnpm@12.3.4 test:demo
npx --yes pnpm@12.3.4 dev
```

## Functional scope and boundaries

- Q-Funds is currently the passenger's transport-payment history and fare-checkout centre. It is **not** an e-money wallet: no stored-value balance, deposit, withdrawal, peer transfer, or automatic refund facility is enabled. A licensed financial partner and a suitable regulatory arrangement are required before offering stored value.
- Driver identity, driving-licence, vehicle and route records have a manual review workflow. This release does not integrate NIMC/NINAuth, FRSC, facial recognition, liveness, insurance validation, or vehicle-inspection authority APIs. Do not approve a driver or vehicle without checking supporting evidence through the relevant authority/process. Do not collect full NIN or raw biometric templates in ordinary profile fields.
- Driver document expiry dates are captured, but this release does not securely store uploaded document evidence. Add a private object-storage upload pipeline with access controls, retention rules and audit logging before collecting document images.
- The 3D vehicle selector is a category preview. The registered plate, vehicle class and capacity must correspond to the actual inspected vehicle and supporting records; selecting a 3D preview does not prove the vehicle's identity or seating capacity.
- Demand-to-service matching is rules-based. A match is a dispatch recommendation, not a seat reservation, ticket, or fare payment. Those are separate operations.
- Fare checkout is integrated with Paystack when credentials are supplied. Q-Funds records successful fare transactions; it does not hold user funds. Automated refunds and operator payouts are not implemented.
- Location display is permission-based and trip-scoped. The driver explicitly starts sharing before GPS sampling begins. Location writes and Stop operations lock the same active driver-session row; a location POST cannot re-enable sharing after Stop commits. Stop clears the stored last point. Location is not guaranteed real-time and is hidden when stale or when the driver stops sharing.
- Emergency contact details can be recorded, but this release does not yet provide an SOS command centre or verified emergency-response dispatch.
