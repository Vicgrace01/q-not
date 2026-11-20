# Deploy Q-not to Render

This project is a full Next.js web service, not a static export. Use a Render **Web Service** or create it from the supplied Blueprint. Render's Next.js guide recommends a Node web service for applications that use server-side logic.

## Before deployment

- Push the complete local Q-not app to `main` on GitHub. The GitHub `main` branch must contain the Q-not homepage and all local changes; the old starter page must not remain at `src/app/page.tsx`.
- Rotate the Neon role password and all authentication secrets that were ever shared in chat.
- Keep `.env.local` and `.env.test` ignored and untracked.
- Use `.env.local` for your development Neon branch and `.env.test` for the separate test branch.
- The Render `DATABASE_URL` must point to the main/production Neon branch, not `qnot-test`. Use a direct Neon host for migrations and `sslmode=verify-full`.

## Blueprint deployment

1. Open https://dashboard.render.com/.
2. Choose **New → Blueprint**.
3. Connect GitHub and select `Vicgrace01/q-not`.
4. Select the `main` branch. Render reads `render.yaml` from the repository root.
5. When prompted for secret values, provide:
   - `DATABASE_URL`: the rotated direct Neon connection string for the main database branch.
   - `AUTH_SECRET`: a newly generated production secret (at least 32 characters; use 32 random bytes encoded as base64).
   - `NEXT_PUBLIC_APP_URL`: the HTTPS URL Render assigns, e.g. `https://q-not.onrender.com` if that name is available.
6. Review the service settings: Node runtime, Ohio region, Free plan, `pnpm start`, `/api/health` health check.
7. Create the Blueprint and watch the deploy logs.
8. When Render assigns the final URL, make sure `NEXT_PUBLIC_APP_URL` exactly matches it. Update the variable and redeploy if necessary.
9. Open `/api/health` first, then `/`, `/trips`, `/login`, `/signup`, `/c/login` and `/operator`. You can also run `scripts/SMOKE-RENDER.ps1 -BaseUrl "https://YOUR-URL.onrender.com"` for a public-route reachability check. This does not validate credentials or role-based access.

## Why migration is in the build command

Render's `preDeployCommand` is available for paid web services, not Free web services. The provided Free-plan Blueprint therefore runs `pnpm exec prisma migrate deploy` during the build, before `pnpm build`. If moving to a paid plan, put the migration command in `preDeployCommand` and remove it from `buildCommand`.

Never run `prisma migrate dev` on Render. Do not use the test Neon branch in production.

## Free-plan demo caveat

Render Free web services spin down after 15 minutes without inbound traffic and take about one minute to wake. The instance filesystem is ephemeral, so do not rely on local files for persistent user data. Neon is the database. Warm the service shortly before judging/presentation and keep the dashboard open.

## Manual Web Service settings (if not using Blueprint)

- Repository: `Vicgrace01/q-not`
- Branch: `main`
- Runtime: Node
- Region: Ohio
- Plan: Free (hackathon preview only)
- Build command: `corepack enable && corepack prepare pnpm@12.3.4 --activate && pnpm install --frozen-lockfile && pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm build`
- Start command: `pnpm start`
- Health check path: `/api/health`
- Environment variables: `NODE_VERSION=22.22.0`, `NODE_ENV=production`, `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`

Official Render references:
- https://render.com/docs/deploy-nextjs-app
- https://render.com/docs/blueprint-spec
- https://render.com/docs/deploys
- https://render.com/docs/node-version
- https://render.com/docs/free
