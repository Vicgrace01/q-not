# Render deployment notes

Q-not is a full Next.js application with server routes and existing Prisma-backed pages. Deploy it as a **Node web service**, not a static site.

## Render settings

The root `render.yaml` is the starting blueprint. The current service configuration is:

- Runtime: Node
- Region: Singapore (valid Render region; choose a nearer region only if you recreate the service)
- Build: install pinned pnpm, install dependencies, generate Prisma Client, build Next.js
- Start: apply committed production migrations, then start Next.js
- Health check: `/api/health`

## Required environment variables

- `DATABASE_URL`: PostgreSQL connection string. Use a persistent database for an ongoing pilot.
- `AUTH_SECRET`: a unique random string of at least 32 characters. Render blueprint generates one.
- `NEXT_PUBLIC_APP_URL`: the deployed HTTPS URL, e.g. `https://q-not.onrender.com`.
- `NODE_VERSION`: set by the blueprint to 22.16.0.

The database can be Render Postgres or another PostgreSQL provider. Use an internal Render database connection string only when the service and database are in the same Render region; otherwise use the provider's appropriate external connection string.

## Demo limitations

The commuter, operator and driver prototype screens currently use localStorage in one browser profile. They are suitable for a controlled same-browser demonstration, not multi-user live terminal operations. GPS captured by the browser is not uploaded. Do not present the prototype's simulated data as live bus telemetry.

Render free web services spin down after 15 minutes of inactivity. Render free Postgres expires 30 days after creation. Check current Render limits before selecting a tier: https://render.com/docs/free.

## Release checklist

1. Set all required environment variables.
2. Confirm the production database is reachable.
3. Confirm migrations complete in the start logs.
4. Confirm `/api/health` returns HTTP 200.
5. Open `/`, `/operator` and `/driver` on the same browser profile and run `docs/DEMO_RUNBOOK.md`.
6. Verify mobile width and reduced-motion behaviour.
