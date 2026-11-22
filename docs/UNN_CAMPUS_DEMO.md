# Q-not UNN Campus Demo Network

## What this installer adds

- A public `/campus-demo` simulator and the same experience embedded directly in the passenger dashboard.
- UNN student/visitor quick profile, faculty and department suggestions, campus destination shortcuts, typed destination entry and map pin selection. The faculty/department directory follows UNN's current central listing: https://www.unn.edu.ng/departments/ .
- Proposed demo corridors: Odim Gate to the Civil Engineering building, Odim Gate to Pharmaceutical Sciences, and Hilltop Gate to Faculty of Education.
- OpenStreetMap campus map with road routing where the public OSRM demo service returns a route; a straight-line fallback is shown when routing is unavailable.
- Vehicle choice including the existing procedural 3D electric-tricycle/Keke model, Korope, Danfo, Hiace, Shuttle and Coaster models; numbered demo seat selection.
- Predictable 20-minute demo departures, fictional passenger/driver/operator names, demo top-ups, local demo booking code, driver GPS simulation, passenger device GPS and pickup-proximity checks.

## Map and capacity notes

- UNN campus centre reference: Mapcarta/OpenStreetMap, https://mapcarta.com/30719516 .
- Odim Gate candidate point: https://nigeria.worldplaces.me/places-in-nsukka/51003832-odim-gate-unn.html .
- Civil Engineering building reference: Mapcarta/OpenStreetMap, https://mapcarta.com/W499968256 .
- Faculty of Education reference: Mapcarta/OpenStreetMap, https://mapcarta.com/W499953769 .
- Pharmaceutical Sciences and Hilltop Gate points are approximate demo pins pending confirmation of exact building entrances and waiting bays.
- A published UNN campus study identifies campus gates, the Engineering, Education and Pharmaceutical Sciences faculties, and landmarks such as Chitis, Malima and SUB: https://www.ajol.info/index.php/njt/article/download/235373/222366 .
- Vehicle capacities, fares, schedule intervals, trip durations and occupied seats in the simulator are test values only. In particular, the Keke's three demo seat positions do not establish an approved legal/passenger capacity.

## Important boundaries

This is an interactive browser simulator, not a production transport backend. It does not create Prisma routes, seed database operators/drivers, write passenger bookings, reserve database seats, persist credits, charge real money, or publish live GPS. All fictional people, availability, seats, bookings, funds and simulated driver positions live in the page state and reset when it is refreshed. The driver/passenger proximity check is a user-interface test only and must not be used as the sole real-world boarding control.

The three campus corridors and coordinates are candidate references for product testing. The map is not a survey. Confirm exact building entrances, road paths, safe waiting bays, vehicle access, legal capacity and stop locations with UNN and an on-campus survey before live service.

## After running the installer

From the Q-not repository root:

```powershell
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

Open `/campus-demo` or sign in as a passenger and use the embedded Campus Demo Network section on `/c/dashboard`. This installer does not touch `pnpm-lock.yaml`, Prisma schema/migrations, environment files, or Git staging/commits.
