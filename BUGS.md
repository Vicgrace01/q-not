# Bugs found and fixed

Every entry: what the bug was, how it surfaced, how it was fixed, and how we
know it stays fixed.

---

## BUG-001: Last-seat race condition

**Found:** 2026-09-10, during design of the queue feature.
**Severity:** Critical. Would ship tickets for seats that don't exist.

### What it was

`joinQueueTx` originally did check-then-act:

1. Read the trip: `seatsTaken = 14`, `capacity = 15`
2. Check: `14 < 15` → yes
3. Create ticket
4. Increment `seatsTaken`

If two requests ran this at the same time, both would read `seatsTaken = 14`,
both would see "1 seat left", both would issue a ticket. The bus oversells.

### How it surfaced

Not from users — we have none yet. Found by reading the code critically and
recognising the classic **check-then-act** pattern. Same bug that affects
inventory systems, ticket sales, and any "last item" scenario.

### The fix

Wrap the whole operation in a Postgres transaction and take a row lock on the
Trip being modified:

```sql
BEGIN;
  SELECT id, "seatsTaken", status FROM "Trip" WHERE id = $1 FOR UPDATE;
  -- any concurrent transaction on this trip now waits here
  ...
  UPDATE "Trip" SET "seatsTaken" = "seatsTaken" + 1 WHERE id = $1;
  INSERT INTO "QueueEntry" ...;
COMMIT;
