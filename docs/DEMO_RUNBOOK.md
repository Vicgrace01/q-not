# Q-not live demo runbook

Use one laptop and one browser profile. Open `/`, `/operator` and `/driver` in separate tabs. The demo state is shared through localStorage on the same origin.

## Passenger flow (45–60 seconds)

1. Start on `/` and point out the `DEMO NETWORK` / sample-data disclosure.
2. Filter departures to Nsukka.
3. Click `Join Q` on Enugu → Nsukka.
4. Enter fictional passenger details only (for example, Demo Passenger / +2348000000001). Do not enter real personal information.
5. Show the queue panel: queue position, estimated wait and the statement that a queue place is not a confirmed seat.

## Operator flow (45–60 seconds)

1. Switch to `/operator`.
2. Select Enugu → Nsukka.
3. Point out current seats, waiting passengers and the sample fleet status.
4. Click `Call next passenger`.
5. Show the temporary ticket code and that available seats reduce while `seatsTaken` remains unchanged.
6. Click `Boarded` and show the boarded count increment.

## Driver flow (30–45 seconds)

1. Switch to `/driver`.
2. Select Enugu → Nsukka.
3. Click `Start / resume trip`.
4. Click `Advance route +12%` twice and show the route progress and estimated time changing.
5. Explain that this controlled movement simulation will be replaced by driver-phone GPS updates sent to a secured backend endpoint. The optional GPS button currently records a local browser reading only.

## Judge-facing explanation

- The core software mechanism is real in this prototype: queue ordering, duplicate prevention, temporary seat holds, seat accounting and state propagation between views.
- Bus movement, departure records, fares and terminal feeds are sample/demo data.
- The first pilot does not need dedicated trackers: a driver's phone is the location source, with explicit permission and a secure ingestion API.
- Production requires PostgreSQL-backed queue transactions, operator and driver authentication, stale-location handling, real terminal data, notification adapters and provider agreements.

## Reset

On `/operator`, use `Reset demo network` to restore the seed state before another run.
