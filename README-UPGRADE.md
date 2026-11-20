# Q-not v0.3 visual upgrade overlay

This is a focused overlay for the local Q-not project. It adds:

- A generated, illustrative intercity-coach hero image (`public/qnot-coach-hero.webp` and `public/qnot-coach-fleet.webp`).
- Coach imagery in the departure rows.
- An interactive, orbitable 3D cabin viewer built with Three.js / React Three Fiber.
- Available / held-for-boarding / boarded visual states and seat-count summaries.
- The existing passenger queue workflow remains the booking/boarding action.

## Apply it

1. Open PowerShell in the Q-not project root (`C:\Users\DELL\Projects\q-not`).
2. Extract this ZIP into that folder, allowing the listed files to overwrite their local counterparts.
3. Install the new dependencies:

   ```powershell
   pnpm install
   ```

4. Run checks:

   ```powershell
   pnpm exec tsc --noEmit
   pnpm test
   pnpm build
   ```

5. Start the app:

   ```powershell
   pnpm dev
   ```

## Changed / added files

- `package.json` — adds React 19-compatible Three.js dependencies.
- `src/app/globals.css` — extends styles for the photo hero, coach thumbnails and seat viewer.
- `src/components/qnot-experience.tsx` — uses the hero image, adds 3D seat-view entry points and a seat-view modal.
- `src/components/seat-cabin-3d.tsx` — new procedural Three.js cabin scene.
- `public/qnot-coach-hero.webp` and `public/qnot-coach-fleet.webp` — generated illustrative coach/terminal photo assets.

## Demo boundary

The 3D cabin is a procedural visual model, not a manufacturer-accurate coach CAD model. Occupied and held seats are visualised from the trip's aggregate counters; individual seat numbers are not stored or assigned in this demo. The modal states this explicitly. Joining Q-not's virtual queue still does **not** reserve a specific seat. Operator-confirmed boarding remains the action that updates the boarded count.

The generated coach image is illustrative and should not be presented as a photograph of a contracted operator's actual fleet.

## Dependency compatibility

The project uses React 19. React Three Fiber v9 is the matching major version for React 19. The listed stable dependencies were checked against their package listings on 20 November 2026. See the official React Three Fiber installation guide and package listings before future major upgrades.
