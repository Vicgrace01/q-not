# Q-not repair integration audit - 21 November 2026

## Source basis

Compared the uploaded `qnot-working-copy-20261121-142233.zip` working snapshot with the original `qnot-final-repair-v3` package and its audited derivative. The current working snapshot contains 125 active source files and the newer network foundation, payments, maps, journey requests, vehicle assignments and live driver route map.

## Findings

1. The original installer is a blind file overlay rather than a merge. It replaces full pages/actions and would overwrite local implementation.
2. The package's driver dashboard removes the existing `DriverLiveRouteMap`, drops the nested trip/route-stop data required by that map, and changes the dashboard's current query shape. It was intentionally not copied.
3. The package's core driver-flow changes were applicable: allow verified email/Google or phone to enter onboarding; keep phone verification as a server-side prerequisite for actual passenger operations.
4. Current `driver-operations.ts`, `queue/join.ts`, request matching, trip publishing and location routes already include phone/driver/vehicle/route checks. Those safeguards were preserved.
5. Current `.env.example`, `src/lib/env.ts` and `src/lib/db.ts` already support `DATABASE_URL_POOLED`. The runtime configuration is not changed blindly; `.env.local` was excluded from the snapshot, so the actual Neon host cannot be verified.
6. The OTP raw query currently selects PostgreSQL's `void` advisory-lock result. This is the direct source-code match for the Prisma deserialization error and has been corrected to select an integer projection.
7. `/c/requests` and `/c/requests/new` did not catch database connection failures. They now show reconnect/retry states rather than throwing a route-level error. This does not repair an unavailable database.
8. Passenger and driver Google OAuth buttons were Next.js `Link` components pointed at redirecting route handlers. They now use normal anchors to trigger full browser navigation.
9. Active source had corrupted encoded characters in the browser title, splash skip link and stylesheet comments. These were corrected. Other mojibake matches were found only in legacy audit/backup text files, not active imported source.
10. `THREE.Clock` is not constructed in Q-not source, but the bus animation read `state.clock.elapsedTime`. That direct state access was replaced by a local elapsed accumulator. The constructor deprecation warning may still be emitted by the installed React Three Fiber 9.x Canvas internals; upgrading to R3F v10 is a breaking major-version move and was not attempted.
11. Two index cleanup migrations exist. The later one uses `IF EXISTS`, making it harmless after the earlier migration dropped the same indexes. Do not delete/rename either migration without checking the production `_prisma_migrations` table.
12. `pnpm-workspace.yaml.backup`, `migration.sql.backup`, `qnot-code-audit.txt`, and old visual backup directories are not part of the runtime fix. Do not automatically stage backup artifacts for the release.
13. Signup terms and consent are not implemented in the schema/application. The terms file is an implementation plan, not legally reviewed Terms & Conditions.

## Integrated source changes

- `src/lib/otp/persistent.ts`: OTP advisory lock returns a Prisma-safe integer projection.
- `src/lib/actions/driver-auth.ts`: Driver email sign-in redirects to onboarding/dashboard without phone gate.
- `src/lib/actions/driver-auth.ts`: Driver onboarding accepts either verified email or verified phone.
- `src/app/driver/onboarding/page.tsx`: Allow authenticated drivers into profile/vehicle onboarding before phone verification.
- `src/app/driver/onboarding/page.tsx`: Explain later mobile verification and preserve current onboarding form.
- `src/app/api/auth/google/callback/route.ts`: Google driver callback no longer blocks workspace on mobile verification.
- `src/app/driver/login/page.tsx`: Driver login copy reflects staged verification.
- `src/app/driver/login/page.tsx`: Use full browser navigation for driver OAuth start route.
- `src/app/driver/onboarding/phone/page.tsx`: Driver phone verification page explains the later operational gate.
- `src/app/driver/dashboard/page.tsx`: Hide publish form until mobile verification and operational approvals pass.
- `src/app/driver/dashboard/page.tsx`: Add persistent driver profile and verification link without replacing dashboard.
- `src/app/driver/dashboard/page.tsx`: Show mobile verification readiness on driver dashboard.
- `src/app/driver/dashboard/page.tsx`: Explain driver operations gate on dashboard.
- `src/app/driver/profile/page.tsx`: Add driver profile and contact/vehicle/route status page.
- `src/components/auth/passenger-access-experience.tsx`: Explain passenger email/Google access without mandatory phone verification.
- `src/components/auth/passenger-access-experience.tsx`: Use full browser navigation for passenger OAuth start route.
- `src/app/c/requests/page.tsx`: Catch request-list DB failures and render safe retry state.
- `src/app/c/requests/new/page.tsx`: Catch route-choice DB failures and disable submit safely.
- `src/app/globals.css`: Append accessible passenger/driver login CTA contrast styles.
- `src/app/layout.tsx`: Fix corrupted em dash in browser title metadata.
- `src/app/globals.css`: Fix corrupted character in active stylesheet comment.
- `src/app/globals.css`: Fix corrupted character in active stylesheet comment.
- `src/components/page-transition.tsx`: Fix corrupted arrow glyph in visible splash control.
- `src/components/qnot-3d-bus-scene.tsx`: Create local animation elapsed-time accumulator.
- `src/components/qnot-3d-bus-scene.tsx`: Stop reading deprecated R3F state.clock in bus animation.
- `src/components/qnot-3d-bus-scene.tsx`: Use local elapsed accumulator for bus suspension motion.
- `docs/INTERACTION-REGISTER.md`: Add operational interaction register / legal-consent implementation plan.
- `docs/TERMS-AND-CONSENT-PLAN.md`: Add operational interaction register / legal-consent implementation plan.
- `CHANGELOG.md`: Document integrated changes and outstanding release requirements.

## Validation status

- The patch was generated against the exact uploaded working snapshot.
- Static path/encoding/diff checks are performed after integration.
- Full lint, TypeScript, Vitest and production build were not run in this environment because the snapshot contains no `node_modules`; run them locally after applying the patch.
- No database migration, Git commit, push or deployment was performed.
