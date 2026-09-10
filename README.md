# Q-Not

**Transit intelligence for Nigerian bus terminals.**

Commuters in structured transit systems lose 1–2 hours daily standing in
physical queues because they have no real-time data on bus proximity, capacity,
or ETAs. Q-Not closes that gap: virtual queues, live seat availability, and
ETAs delivered where commuters already are.

Built by [Vicgrace Labs](https://github.com/Vicgrace01) for the BuildIt
Challenge 2026.

## Status

Early v1. Web-first messaging (WhatsApp adapter pending Meta approval).
Driver-phone GPS. Leaflet maps. Postgres via Prisma.

## Stack

- Next.js 16 (App Router, TypeScript)
- Prisma 7 + PostgreSQL
- Zod
- Tailwind CSS
- Leaflet + OpenStreetMap
- Vercel (deploy target)

## Getting started

```bash
pnpm install
cp .env.example .env.local
# edit .env.local with your DATABASE_URL
pnpm exec prisma migrate dev
pnpm dev
