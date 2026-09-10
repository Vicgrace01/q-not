# Full-Stack Roadmap — The 80 Topics

**Source of truth:** The Blacksmith Full-stack Engineering track. 24 modules, 80
topics. "0/80 explained" is the number that matters. Not the projects. Not the
commits. Not the PRs.

**How topics get counted:** When the engineering team reviews your work, they
mark topics "mentioned" if they see evidence in your repo, and "confirmed" when
you can explain the topic in your own words. Both count toward coverage.
Explanation is worth more.

**The trap:** You can ship 10,000 lines of code and still be at 0/80 if you
can't explain why any of it works. Coverage tracks understanding, not output.

---

## Part 1 — Honest read of the current state

You're at **0/80**. That's the starting line, not a verdict.

Here's what that means in practice:

- You shipped a foundation PR with an architecture doc, 7 ADRs, a 12-model
  schema, and a channel adapter. **None of that is counted yet** because the
  team hasn't confirmed you can explain any of it.
- You can describe what you built in loose language ("the operator creates a
  route") but probably not in the vocabulary the rubric uses ("a resource-
  oriented endpoint that validates input at the trust boundary and persists
  through a transaction-scoped ORM call").
- Moving to 15/80 by end of Q-Not is realistic. 25/80 is ambitious. 40/80 is
  not going to happen in 14 days.

**The lesson:** Coverage is not about how much you build. It's about how many
concepts you can defend. Q-Not will teach you maybe 20–30 of these 80. The
rest come from OffGrid Pro, RENDIFY, and production work.

---

## Part 2 — The curriculum, mapped to your projects

Every one of the 80 topics falls into a module. Each module gets taught by
one of your projects. Here's the mapping — this is the real roadmap.

### Legend

- **Q** = Q-Not (BuildIt, now)
- **O** = OffGrid Pro (after BuildIt)
- **V** = Vicgrace Labs studio site (side project)
- **R** = RENDIFY (later)
- **A** = ARIS-Gold (ML, not full-stack — does not count here)
- **—** = not covered by any of your projects; needs a separate exercise

---

### Module 01 — Where the two halves meet (6 topics)

| Topic | Project | Why |
|---|---|---|
| The API contract as the coordination artifact | Q | Your webhook and API routes are the contract |
| The same rule, expressed twice | Q | Zod validates on client and server |
| How a session survives from browser to row | Q | Operator login → session cookie → middleware → DB row |
| From a stack trace to a sentence someone reads | Q | Error shape consistency, user-facing messages |
| Where the time actually goes | Q | Add timing to your endpoints, document the budget |
| Shipping a feature through every layer | Q | Every Q-Not feature spans UI → API → DB → back |

**Covered by Q-Not: all 6.** This is the module Q-Not teaches best.

---

### Module 02 — Rendering and state (4 topics)

| Topic | Project | Why |
|---|---|---|
| Render, commit, and reconciliation | Q | React renders the map markers as location updates |
| State as a snapshot | Q | Common bug when updating the queue position |
| Effects, and when you do not need one | Q | Polling logic — where to put the interval |
| Memoisation and its cost | — | Q-Not won't naturally hit this. Skip unless needed. |

**Covered by Q-Not: 3 of 4.** Topic 4 (memoisation) is optional.

---

### Module 03 — Where state belongs (4 topics)

| Topic | Project | Why |
|---|---|---|
| Local, lifted, and shared state | Q | Where the queue state lives |
| Context, and what it costs | Q | If you use context for auth user |
| The URL is state | Q | Route filters should be URL params, not memory |
| Forms: validation, errors and submission state | Q | Operator route-creation form |

**Covered by Q-Not: all 4.**

---

### Module 04 — Talking to the server (5 topics)

| Topic | Project | Why |
|---|---|---|
| HTTP semantics and idempotency | Q | Webhook receives retries, ticket issue is idempotent |
| Server state is not UI state | Q | Use React Query or SWR for fetched data |
| Optimistic updates and rollback | Q | Queue join feels instant, then confirms |
| Loading, empty, error — the states people forget | Q | Every list view in Q-Not |
| Realtime: websockets, SSE and polling | Q | Q-Not polls; document why not WebSockets |

**Covered by Q-Not: all 5.** This is another Q-Not-heavy module.

---

### Module 05 — Types across the boundary (2 topics)

| Topic | Project | Why |
|---|---|---|
| Types stop at the boundary | Q | Every API response needs runtime validation with Zod |
| Narrowing and discriminated unions | Q | Trip status enum, message type |

**Covered by Q-Not: both.**

---

### Module 06 — Asynchronous UI (1 topic)

| Topic | Project | Why |
|---|---|---|
| Race conditions and cancellation | Q | Queue position polls — late responses must not overwrite |

**Covered by Q-Not: yes.**

---

### Module 07 — The browser as a platform (3 topics)

| Topic | Project | Why |
|---|---|---|
| Same-origin policy and CORS | Q | If you call Paystack or webhook receiver from the browser |
| Storage: cookies, localStorage, IndexedDB | Q | Session cookie (httpOnly) + no localStorage tokens |
| CSR, SSR, SSG and streaming | Q | Q-Not mixes Server and Client Components |

**Covered by Q-Not: all 3.**

---

### Module 08 — Performance (2 topics)

| Topic | Project | Why |
|---|---|---|
| Core Web Vitals | V | The studio site needs fast loads — build it to pass |
| Measuring before fixing | Q | Profile a slow query in Q-Not; document the fix |

**Covered by: 1 in Q, 1 in V.** Split.

---

### Module 09 — Accessibility (3 topics)

| Topic | Project | Why |
|---|---|---|
| Semantics as an interface contract | Q | Every button/link in Q-Not done right |
| Keyboard and focus management | Q | The chat UI must work with keyboard alone |
| ARIA, roles and accessible names | Q | Icon-only buttons need labels |

**Covered by Q-Not: all 3.** This module is frequently skipped. Don't skip it.

---

### Module 10 — Frontend security (3 topics)

| Topic | Project | Why |
|---|---|---|
| XSS and untrusted content | Q | Chat messages must never be rendered as HTML |
| Where auth lives | Q | Session cookie vs localStorage — document the trade |
| Content Security Policy | Q | Add CSP headers in `next.config.ts` |

**Covered by Q-Not: all 3.**

---

### Module 11 — Shape of a frontend system (3 topics)

| Topic | Project | Why |
|---|---|---|
| Component boundaries and coupling | Q | Chat vs dashboard components should not share state |
| What runs on the client, and why | Q | Server Components for lists, Client for interactivity |
| Failure modes of a UI | Q | Map fails → page still works |

**Covered by Q-Not: all 3.**

---

### Module 12 — Modelling the data (4 topics)

| Topic | Project | Why |
|---|---|---|
| Normal forms, and when to deliberately break them | Q | `seatsTaken` on Trip is denormalized — document why |
| Natural keys, surrogate keys and UUIDs | Q | cuid() vs phone number as ID |
| Constraints are the only guarantee you have | Q | Unique constraint on `(trip_id, commuter_id)` queue entry |
| Soft deletes, audit trails and temporal data | O | Wallet transactions must be append-only |

**Covered by: 3 in Q, 1 in O.**

---

### Module 13 — Querying, and why it got slow (4 topics)

| Topic | Project | Why |
|---|---|---|
| Reading an execution plan | Q | `EXPLAIN ANALYZE` a real query on Q-Not data |
| What an index can and cannot serve | Q | Add an index to `Trip.routeId` and measure |
| N+1 queries and how ORMs hide them | Q | Loading trips with their drivers — use `include` |
| Why OFFSET pagination degrades | — | Q-Not won't hit this at scale. Skip unless needed. |

**Covered by: 3 in Q, 1 skipped.** Add pagination discussion to DECISIONS.md.

---

### Module 14 — Transactions and concurrency (4 topics)

| Topic | Project | Why |
|---|---|---|
| ACID, and which letter your database bends | Q | Document Postgres default isolation level |
| Where a transaction should begin and end | Q | The seat assignment transaction is short and DB-only |
| Check-then-act, and why it loses | Q | The last-seat race is literally this |
| Side effects that escape the transaction | O | Notification must not fire until the transaction commits |

**Covered by: 3 in Q, 1 in O.** This is your highest-value module.

---

### Module 15 — Designing the interface (5 topics)

| Topic | Project | Why |
|---|---|---|
| Modelling resources, not database tables | Q | API exposes `trips`, not `Trip` rows |
| Status codes and a consistent error shape | Q | One `{ error: { code, message } }` shape everywhere |
| Idempotency and safe retries | Q | Cowry Card webhook uses eventId for dedupe |
| Versioning and backward compatibility | O | OffGrid will have a public API for meter providers |
| The schema as a generated artifact | — | Add OpenAPI via Zod-to-OpenAPI if time |

**Covered by: 3 in Q, 1 in O, 1 optional.**

---

### Module 16 — HTTP and the network underneath (2 topics)

| Topic | Project | Why |
|---|---|---|
| Cache-Control, ETags and conditional requests | V | Studio site's static pages |
| Timeouts, pools and the failure you inherit | Q | Every fetch to Cowry Card needs a timeout |

**Covered by: 1 in V, 1 in Q.**

---

### Module 17 — Authentication and authorisation (4 topics)

| Topic | Project | Why |
|---|---|---|
| Authentication is not authorisation | Q | Operator login is authn; "can only edit own buses" is authz |
| Sessions, JWTs and what each costs | Q | Session cookie. Document why not JWT |
| Object-level permissions and tenancy | Q | Every operator query scoped by operatorId |
| Secrets, rotation and what never goes in git | Q | `.env.local` gitignored; add rotation plan |

**Covered by Q-Not: all 4.** Second-highest-value module.

---

### Module 18 — Backend security (3 topics)

| Topic | Project | Why |
|---|---|---|
| Injection, and why parameterisation is the fix | Q | Prisma parameterizes by default — document it |
| Trust boundaries and where validation belongs | Q | Zod schemas on every Server Action |
| Rate limiting, quotas and abuse | Q | Login and OTP endpoints need limits |

**Covered by Q-Not: all 3.**

---

### Module 19 — Work that happens later (3 topics)

| Topic | Project | Why |
|---|---|---|
| At-least-once, at-most-once, exactly-once | O | Background meter readings are at-least-once |
| Retries, backoff and the thundering herd | O | Meter provider outages |
| Scheduled jobs, overlap and missed runs | O | Hourly meter jobs — cron + lock |

**Covered by OffGrid Pro: all 3.** Q-Not doesn't teach this.

---

### Module 20 — Caching and shared state (2 topics)

| Topic | Project | Why |
|---|---|---|
| Invalidation strategies and staleness budgets | V | Studio site's cached venture pages |
| Why servers should be stateless | Q | Vercel functions are stateless by design — document |

**Covered by: 1 in V, 1 in Q.**

---

### Module 21 — Changing a schema that is in use (2 topics)

| Topic | Project | Why |
|---|---|---|
| Which migrations take a lock, and for how long | O | OffGrid will do a real migration on live data |
| Expand and contract migrations | O | Adding meter_id to wallets without downtime |

**Covered by OffGrid Pro: both.** Q-Not has no live users, so this can't be honestly taught.

---

### Module 22 — Running it in production (4 topics)

| Topic | Project | Why |
|---|---|---|
| Structured logs and correlation ids | Q | JSON logs with a per-request ID |
| Metrics, percentiles and why averages lie | Q | Add basic metrics to key endpoints |
| Deploys, health checks and rollback | Q | Vercel deploy + `/api/health` endpoint |
| Incident response and blameless postmortems | Q | Write up the first bug you fixed in production |

**Covered by Q-Not: all 4.**

---

### Module 23 — Configuration and environments (2 topics)

| Topic | Project | Why |
|---|---|---|
| Config in the environment, not the code | Q | Already done — document the pattern |
| Feature flags and decoupling deploy from release | O | Let you ship unfinished OffGrid features safely |

**Covered by: 1 in Q, 1 in O.**

---

### Module 24 — Shape of a system (5 topics)

| Topic | Project | Why |
|---|---|---|
| Layers, boundaries and the dependency rule | Q | Adapter pattern in `src/lib/whatsapp` |
| When to split a service, and when not to | Q | Document why Q-Not is a monolith |
| Strong and eventual consistency | O | Wallet balance: strong; analytics: eventual |
| Partial failure, and the fallacies underneath it | Q | Cowry Card webhook can hang or half-happen |
| Writing a design document people can disagree with | Q | Your `DECISIONS.md` is exactly this |

**Covered by: 4 in Q, 1 in O.**

---

## Part 3 — Coverage summary by project

| Project | Modules it teaches | Topics covered |
|---|---|---|
| **Q-Not** | 01–07, 09–11, 12 (part), 13 (part), 14 (part), 15 (part), 16 (part), 17, 18, 20 (part), 22, 23 (part), 24 (part) | ~45 of 80 |
| **OffGrid Pro** | 12 (part), 14 (part), 15 (part), 19, 21, 23 (part), 24 (part) | ~15 additional |
| **Vicgrace Labs site** | 08 (part), 16 (part), 20 (part) | ~3 additional |
| **RENDIFY** | 04, 06, 13, 19, 21, 24 (deeper) | ~10 additional |
| **ARIS-Gold** | none (ML, not full-stack) | 0 |

**Total reachable: ~73 of 80** across all four projects. The remaining 7 are
either highly specialized (sharding, multi-region) or require production traffic
you won't have for a while. That's fine — 73/80 is a full-stack engineer.

---

## Part 4 — The actual build order

Given Q-Not's 14-day BuildIt window, here's how to sequence the modules so
that coverage increases naturally and you never learn out of order.

### Phase 1 — Foundations (Days 1–5 of BuildIt)

**Modules touched:** 02, 03, 05, 17

| Day | Feature | Modules taught |
|---|---|---|
| 1 | Operator signup + login (bcrypt, session cookie) | 17 (authn), 23 (config) |
| 2 | Route CRUD (list, create, edit) | 03 (forms), 15 (resources) |
| 3 | Bus CRUD + assign to route | 05 (types), 12 (constraints) |
| 4 | Commuter phone + OTP | 17 (authn different flow) |
| 5 | Commuter sees live trips | 02 (state), 04 (fetching) |

At end of Phase 1: **~15 topics exposable, maybe 5 confirmed.**

### Phase 2 — The hard parts (Days 6–10)

**Modules touched:** 04, 06, 11, 13, 14, 15

| Day | Feature | Modules taught |
|---|---|---|
| 6 | Queue join + position | 06 (race), 11 (boundaries) |
| 7 | Seat assignment transaction + test | 14 (all 4 topics) |
| 8 | QR ticket generation | 15 (idempotency) |
| 9 | Driver location page | 04 (polling) |
| 10 | Operator map view | 02 (render), 04 (loading/error/empty) |

At end of Phase 2: **~30 topics exposable, maybe 12 confirmed.**

### Phase 3 — Production hardening (Days 11–14)

**Modules touched:** 09, 10, 16, 18, 22, 24

| Day | Feature | Modules taught |
|---|---|---|
| 11 | Cowry Card webhook + idempotency | 15, 24 |
| 12 | Logging, correlation IDs, error shape | 22 |
| 13 | CI pipeline + tests | 22 (deploys) |
| 14 | Docs, demo, security pass | 10, 18, 24 (design doc) |

At end of Phase 3: **~45 topics exposable, ~20 confirmed.**

### After BuildIt — OffGrid Pro adds 15 more

OffGrid covers the modules Q-Not can't: 19 (background work), 21 (migrations
on live data), 12 (soft deletes/audit trails). These are the topics that
require a running system with real users and real history.

---

## Part 5 — How topics get "confirmed"

You don't get coverage by shipping. You get it by explaining. Here's the
protocol.

**For each topic, at the moment you touch it, write down in one sentence:**
- What problem does this solve?
- What breaks without it?
- Why this approach and not the obvious alternative?

Put those in `DECISIONS.md`. Format:

```
### Topic: Check-then-act, and why it loses

We assign seats with a transaction that takes a row lock on the Trip row, then
checks `seatsTaken < capacity`, then inserts the ticket and increments the
counter. Without the lock, two concurrent requests both read `seatsTaken=14`
for a 15-seat bus, both write a ticket, and the bus oversells. The fix is not
a longer check — it's making the check and the write atomic. We chose
`SELECT ... FOR UPDATE` on the Trip row because Prisma exposes it via
`$queryRaw` and the scope is exactly one row. The alternative — a unique
constraint on `(trip_id, seat_number)` — doesn't work because buses don't have
seat numbers; riders sit anywhere.
```

That paragraph alone will count toward 2–3 topics (14's "check-then-act",
12's "constraints", and possibly 15's "idempotency").

**Write one paragraph like that per hard thing you build.** Over 14 days you'll
write 15–25 paragraphs. That's 15–25 topics confirmed.

---

## Part 6 — The gap you can't close with projects

Some topics require context you can only get from reading or from production.

- **Module 08 (Performance):** Core Web Vitals and profiling need real users.
  Read the docs, measure once with Lighthouse, call it.
- **Module 13 (Querying):** You'll only really understand execution plans
  after running `EXPLAIN ANALYZE` on a table with 100k+ rows. Load 100k fake
  trips in Q-Not and profile. Do it once.
- **Module 19 (Work that happens later):** Only OffGrid teaches this. Do OffGrid
  or accept the gap.
- **Module 21 (Migrations on live data):** Only real production teaches this.
  Document the theory in DECISIONS.md. Do the actual practice on a staging
  environment you create for OffGrid.
- **Module 24 (Shape of a system):** "When to split a service" requires having
  been burned by a bad split. You'll learn it when RENDIFY gets slow.

**Reading list for the gaps:**
- *Designing Data-Intensive Applications* (Kleppmann) — Modules 19, 20, 24
- *Database Internals* (Petrov) — Modules 13, 14, 21
- Postgres docs on EXPLAIN — Module 13
- OWASP Top 10 — Modules 10, 17, 18

Read them slowly. Not for a project. For the concepts.

---

## Part 7 — The one rule

**You do not move to the next topic until you can explain the current one.**

Not to me. Not to Adaeze. **To yourself, out loud, in a mirror.**

If you can't explain why a session cookie is `httpOnly`, don't move on to JWTs.
If you can't explain what `SELECT ... FOR UPDATE` does, don't move on to
transactions with external side effects.

The 80 topics are sequential for a reason. Skipping creates the illusion of
learning. It collapses the first time someone asks "but why?"

---

## Part 8 — Realistic timeline

| Timeline | Coverage | Note |
|---|---|---|
| End of Q-Not (Sep 27) | ~20/80 | Realistic. Maybe 25. |
| End of OffGrid Pro (Nov 2026) | ~35/80 | Only if you do it well. |
| End of RENDIFY v1 (Q1 2027) | ~50/80 | |
| One year of production work | ~70/80 | The last 10 come from incidents. |

**Do not try to force coverage.** Trying to hit all 80 in 14 days will produce
80 shallow explanations and 0 real understanding. The screen counts confirmed
understanding, not claims.

---

## Part 9 — What to do right now

1. Read this document once.
2. Open `DECISIONS.md` in the Q-Not repo.
3. For each topic you already touched today (architecture, schema, adapter),
   write one paragraph like the example in Part 5.
4. Commit it as `docs: add topic explanations for foundation work`.
5. Move to PR #2.

That's it. The roadmap is not a course you take. It's a list of what you learn
while shipping.

---

**Last updated:** 2026-09-10
**Status:** Living document. Update after every project.
