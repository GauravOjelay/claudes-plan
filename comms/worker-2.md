# worker-2 comms (worker-2 writes this file; newest entry on top)

## 2026-11-07 23:30 - STATUS: in-progress + QUESTIONS (owner review round)
What I did / what I need: Merged main into worker-2 (kept both 2D and 3D, typecheck + 105 tests + build pass), removed the stray `screenshots$*.png` files, added world-atlas/topojson. The owner reviewed my work and asked for: a real Apple-Maps-style 3D GLOBE with realistic land, more cities each with their OWN companies, a visible FPS readout, controls hidden until used, a prominent current year, fuller clouds, toasts that time out, a rolling "happening now" feed, a live demo of overlapping events with different durations, a cleaner timeline, and a high-contrast "make a decision" call to action. Working on all of these on worker-2.
Files touched: src/world/**, package.json, package-lock.json, comms/worker-2.md
Question for master (if any):
1. CITY ROSTER (owner request): 12 more cities with 3 fictional companies each, mixing strong and weak firms: New York, Mexico City, São Paulo, Paris, Munich, Moscow, Dubai, Cairo, Lagos, Bengaluru, Singapore, Tokyo. They are ready in contract shapes in `src/world/roster.ts` (`EXTRA_CITIES`, `EXTRA_COMPANIES`). Please move them into `src/contracts/cities.ts` (CITIES / COMPANY_ROSTER) so the sim carries them. Until then the world views merge them in, and companies resolve by the city's `companyIds` reference (live state first, then the static roster), so each city shows its own HQs.
2. TOKYO has no region: contracts have no Japan/East-Asia RegionId. Add `JP` (or `EASTASIA`)? It is provisionally in SEA.
3. Are CityEffects the player's "policies"? The owner asked. My reading of plan 10.4 is no: effects are consequences of events, and decisions (policies) are made only on the HQ screen. Correct? The owner wants it "glaringly obvious" that the player can make decisions, so I am adding a high-contrast (black) "Make a decision at <your company> HQ" button to the city view and the map callout, which calls `onSelectCompany(playerCompanyId)`. If you want a different callback, tell me.
4. App header (`src/app/App.tsx`, yours): the owner said the top bar "shows unformatted buttons". Part of it was my dev page, which showed `onSelectCity(sf)` debug text; that is fixed. The real app header uses plain browser buttons; could you (or worker-3) style it? The owner also mentioned react-router state for passing city data; that is app-level and yours. CityView only needs `cityId`, and a city's companies come from its `companyIds`.
5. FPS: the owner wants the user to see the frame rate, so I show a small FPS chip on both 3D views by default; `?fps=0` hides it. Your `?fps` flag also forces it on.

## 2026-11-07 22:10 - STATUS: done (2 PRs open)
What I did / what I need:
- Followed your #3 conditions. 2D work is on its own branch `worker-2-2d` (main merged in, typecheck + 34 tests + build pass): PR https://github.com/GauravOjelay/claudes-plan/pull/3
- 3D on `worker-2` (main merged in, typecheck + 35 tests + build pass, main bundle unchanged at 143 kB because three.js only loads in lazy chunks): PR https://github.com/GauravOjelay/claudes-plan/pull/4 (merge #3 first).
  - City: `CityView` defaults to 3D; a 3D/2D toggle sits in the title bar, and `initialMode="2d"` is the one-line flag to revert. It also falls back to 2D automatically with no WebGL or if the 3D scene throws. All 12 CityEffectKinds render in 3D. Screenshots are in `src/world/screenshots/3d/`.
  - World map: Apple-Maps-style 3D map (inertial pan/zoom, tilt/rotate, 2D/3D tilt button, compass, zoom buttons, pins that fly the camera in and open a callout with "Open <city>" -> `onSelectCity`). Regions are raised by the chosen metric, with grid/water overlays. Same props as before; `initialMode="2d"` gives the old SVG map.
  - FPS: merged geometry (about 6 draw calls for all buildings), instancing for trees/sprawl/cars/crowds, 2048 shadow map, and adaptive pixel ratio (drei PerformanceMonitor lowers it from 1.5 down to 0.6 when frames drop). If it stays slow, a "Switch to 2D" button appears. I could only measure in headless Chrome with software WebGL (no GPU): about 3 fps at 1440x1000, which is a worst case. Please have a human check fps on a real laptop.
Files touched: src/world/**, package.json, package-lock.json, comms/worker-2.md
Question for master (if any):
1. Still open: may I add `world-atlas@2` + `topojson-client@3` for real coastlines on the 3D map? Current land shapes are my hand-drawn ones.
2. src/app wiring: `import { WorldMap, CityView } from './world'`. Both lazy-load 3D themselves. Nothing else is needed.

## 2026-11-07 21:20 - STATUS: in-progress (+ question)
What I did / what I need:
- Merged main; now using `CITIES` (default `cities` prop) and `EventLogEntry.city` in the timeline. Thanks.
- 3D city view done on worker-2 (`src/world/city3d/`, lazy-loaded, 2D skyline kept as fallback + 3D/2D toggle): golden-hour aerial city like the reference photo, smooth camera (drag pan, right-drag tilt/rotate, wheel zoom, W/S fly forward/back, A/D, Q/E, on-screen hold pad, double-click glide, idle drift), time of day (golden/dusk/night), glowing clickable HQ markers, all 12 CityEffectKinds in 3D (window-lighting shader for blackout/ghost offices/bank run/solar; traffic+gridlock, port+embargo, hospital+outbreak, crowds, screens, searchlights, drones, smoke, flood). Main bundle unchanged.
- Our human asked (before going on break) for the WORLD MAP to feel like Apple Maps: smooth pan/zoom/tilt/rotate, interactive. Building `WorldMap` in three.js now (same props), old SVG map kept as fallback.
Files touched: src/world/**, comms/worker-2.md
Question for master (if any):
1. APPROVE `world-atlas@2` (Natural Earth 110m TopoJSON, ~100 KB, public domain) + `topojson-client@3` (+ `@types/topojson-client`)? Real coastlines would make the map look like Apple Maps instead of hand-drawn blobs. Until you answer I use my own simplified shapes; swapping is a one-file change.
2. Our human said not to ask them anything until they are back; please answer here/TASKS.md.

## 2026-11-07 19:00 - STATUS: question
What I did / what I need: Our human (worker-2) asked for the city view to look like a real aerial city photo (golden-hour skyline, towers, parks, river) with live camera movement: zoom in/out, pan, fly forward/back, "a smoother, zoomed-out Google Street View". That needs real 3D, which changes DECISIONS.md #4 (2D skyline, 3D stretch).
Plan: build `CityScene3D` in src/world/ with three.js, lazy-loaded so it does not grow the main bundle, keeping the existing 2D skyline as fallback (no WebGL / toggle). Same props, same callbacks, all 12 CityEffectKinds rendered in 3D. Building it on worker-2 now; will rip it out if you say no.
Files touched: comms/worker-2.md, package.json, package-lock.json (+ src/world/** next)
Question for master (if any):
1. APPROVE NEW DEPENDENCIES? `three` (0.169), `@react-three/fiber` (8.x, React 18 compatible), `@react-three/drei` (9.x, camera controls/sky/labels), devDep `@types/three`.
2. OK to update DECISIONS.md #4 to "3D city view (three.js), 2D skyline fallback"?

## 2026-11-07 18:40 - STATUS: done
What I did / what I need: Tasks 1-4 done in src/world/ (public API: src/world/index.ts), no new dependencies (pure SVG/CSS).
- `WorldMap({ state, onSelectCity, cities? })`: stylised 2D map, regions tinted by GDP (log) / AI capability / tension, grid-stress + water-stress overlays, clickable + keyboard-focusable city points with hover stats and active-effect tags.
- `CityView({ state, cityId, onSelectCompany, cities?, decisions?, onBack? })`: layered night skyline, 3 HQ towers with glowing bobbing arrows (player in the middle, rivals labelled view-only), city/country stats, "happening now" list, and a renderer for EVERY CityEffectKind scaled by intensity. Blackout/ghost offices/bank run/solar boom also change window lighting (HQ data centres keep power; solar partly reverses blackouts).
- `CityTimeline({ state, cityId, decisions?, onScrub? })`: horizontal scrubber of local HQ decisions, events and city effects, with unlocked pathways as future branches. Embedded in CityView.
- Dev page: `npm run dev` then /src/world/dev.html (#map, #city?effect=cycle|all|<kind>&i=0.8, #timeline). Screenshots of every effect kind in src/world/screenshots/.
- Checks: `npm run typecheck`, `npm test` (7 world tests), `npm run build` all pass.
Files touched: src/world/**, comms/worker-2.md
Question for master (if any):
1. Real city list: where will `CityInfo[]` live? Both components take `cities?` (defaults to mockCities). Use `mapPosFromLonLat(lon, lat)` from src/world so dots land on the right land. Beijing has only 1 HQ in mocks; CityView shows what exists and notes it.
2. `EventLogEntry` has no `city`/`region`, so the timeline matches events to a city via a headline with the same year+text tagged with that city. Could the sim add `city?: string` to EventLogEntry (contracts change)?
3. Tension is global in v0.1, so "colour by tension" tints every region the same. Want per-region tension, or is that fine?
4. AI capability per region = strongest lab headquartered there (same approach as worker-3's race tracker).
