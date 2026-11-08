# worker-2 comms (worker-2 writes this file; newest entry on top)

## 2026-11-08 04:00 - STATUS: done (#14 Joe realism, PR #18)
What I did / what I need:
- New articulated human (`src/world/joe/human.tsx`) at real scale (1.75 m; Joe used to be about 2.5 m). It has a head with nose, ears and hair (or a hood/cap), neck, chest, belly, upper arms and forearms with elbows, hands, thighs and shins with knees, and shoes. Outfits follow `joe.job` (blazer, hoodie + backpack, work jacket + cap, retraining jacket + backpack, UBI). Skin and hair are deterministic from the citizen's name.
- Real walk cycle: thigh swing, knee flex during the swing phase, counter-swinging arms with soft elbows, double-frequency hip bob, sway, torso twist and a steady head. Wading in a flood shortens the stride.
- Pedestrians and protesters are human-shaped instanced figures (clothes in per-instance colours) instead of capsules.
- Street: asphalt and paving-slab textures drawn in code, kerbs, cornices / string courses / fascias on every building, rounded parked cars with glass and wheels (far kerb), metal lamp posts, a contact shadow under Joe, softer shadows, a cool rim light, and the protest crowd moved into view.
- Camera is now over Joe's shoulder on the pavement, so cars and lamp posts no longer block it. The "Drag to look around" hint moved to the top left, so bottom-left stays free for `.app-continue`.
- Screenshots (9 situations, 1280x720): `src/world/screenshots/joe/`. Typecheck, tests and build pass.
Files touched: src/world/joe/**, src/world/world.css, comms/worker-2.md
Question for master (if any): none.

## 2026-11-08 03:10 - STATUS: done (#13) + 2 owner requests for the app (yours / worker-3's)
What I did / what I need:
- #13: kept the city view's bottom centre free for `.app-continue`. The FPS chip moved to the top right (3D city and Average Joe), and the shortcut help bar moved to the top. I checked it in the real app at 1280x720 after "Skip year" ("2026 is over... Continue to 2027 →" is clear). Screenshot: `src/world/screenshots/v2/app-after-round-1280x720.png`.
- The `joe?: AverageJoe` prop and the City/Average Joe toggle are in PR #16, so you can pass `joe={averageJoe(state, cityId)}` once #16 is merged.
Files touched: src/world/world.css, comms/worker-2.md
Question for master (if any): owner (Charles) requests for files I don't own:
1. NEWS TICKER PADDING: the bottom news bar is edge to edge. He asked for `padding: 0 10px` (match the parent). Suggest in `src/app/app.css`: `.app-shell > .ui-ticker { margin: 0 12px 10px; }` (12px matches the city/map page gutter), or the equivalent in worker-3's `.ui-ticker`.
2. ROUND FLOW / ROUTING: he likes the floating Continue after every round (your `.app-continue` already matches his CSS: flex, border, `:active { scale(0.96); opacity: .8 }`). He suggested react-router (`useNavigate("/game", { state: { roundData } })`, with the city screen copying `location.state` into its own `useState` so data doesn't leak between screens). react-router is NOT a dependency, so this is your call. Today App keeps the single source of truth in state and passes props, which already avoids leaks. If you add routing, CityView/WorldMap need nothing new: they only take `state`, `cityId` and callbacks.

## 2026-11-08 02:40 - STATUS: done (#11 + #12 ready on worker-2, PR #16) + REQUEST for worker-3
What I did / what I need:
- #12.1 AVERAGE JOE: a "🏙 City / 🚶 Average Joe" toggle at the top right of the city view (black and yellow, prominent). Joe view = lazy-loaded street-level THIRD-PERSON 3D scene (`src/world/joe/JoeScene3D.tsx`): the citizen walks down an endless street in their neighbourhood, with the camera over their shoulder (drag to look around). The street follows `joe.situation`:
  - prosperous: sun, cafés, crowds
  - normal: daytime street
  - struggling: overcast, shutters, "to let" signs
  - blackout: night, dark windows, flickering candles
  - protests: crowd with signs ahead
  - flood: water in the street, sandbags, slower wading walk
  - war: empty, boarded shops, distant smoke, emergency lights (non-graphic)
  - surveillance: scanning cameras and drones
  - outbreak: ambulance, empty street
  The citizen card (bottom right) shows name, age, occupation, job status, income, a mood bar and the `lines`. New props: `CityView joe?: AverageJoe` (falls back to `mockJoe` for that city) and `initialView?: 'city' | 'joe'`. There is a 2D card fallback. Screenshots: `src/world/screenshots/joe/` (all 9 situations, 1280x720).
- #12.2 / #11.3 "Your move": the text is forced white (higher specificity than `.ui-root button`), the kicker is yellow, and it pulses gently (off with reduced motion).
- #11.2 3D fallback is no longer silent: a shared `ThreeBoundary` calls `console.error` in `componentDidCatch`. A visible chip shows "3D off: WebGL not available" / "3D scene crashed (see console)" / "running slowly on this device" / "switched off by you", with a "Try 3D again" button. This covers both `WorldMap` and `CityView`.
- #11.3 The globe YEAR chip moved to the top right (next to the zoom buttons), so it no longer overlaps the toolbar at 1280px.
- Merged origin/main. Typecheck, 166 tests and build pass; the Joe scene is its own 19 kB lazy chunk.
Files touched: src/world/**, comms/worker-2.md
Question for master (if any):
1. REQUEST for worker-3 (owner Charles reported it): on the HQ screen the company name sign at the top is cropped on wide screens (seen at 1917x790). Cause: `src/ui/Boardroom.tsx:200` uses `viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"`, which crops about 120 units off the top on wide, short viewports, and the sign is at `translate(800 78)` (line 303). Fix: `preserveAspectRatio="xMidYMin slice"` (keep the top, crop the floor), or move the sign to about y 170. I did not edit src/ui because it is worker-3's.
2. App: pass `joe={averageJoe(state, cityId)}` to `<CityView>` once worker-1 ships it, and `onOpenHQ` to `<WorldMap>`.

## 2026-11-08 01:30 - STATUS: done (owner fixes #10 A-D ready, PR open)
What I did / what I need: Merged origin/main (TopBar, app shell, roster in contracts) and checked the REAL app (root URL) at 1280x720 and 1920x1080 with headless Chrome:
- A. The globe fits the viewport (your `.app-shell`/`is-map` rules plus my globe container) and is centred. Nothing scrolls on the map page.
- B. The city stat card is now a compact overlay inside the 3D scene (bottom-left; expand ▸ for all stats), so it is always visible. The scene height follows the viewport (`--w-scene-h`) and the right column scrolls internally if needed.
- C. "Your move" button: I clicked it in the real app and it opens NovaCore HQ. The real bug was that its text was invisible in the light theme, because `src/ui` sets `.ui-root button { color: inherit }` and that beat my button colours (black text on black). The same applied to the globe toolbar and the 3D HQ labels. All src/world buttons now use higher-specificity colours.
- D. All world buttons are styled; the dev page has a styled bar, and there is no debug text any more.
- Screenshots: `src/world/screenshots/v2/app-*-1280x720.png` and `app-*-1920x1080.png`.
- Checks: typecheck, tests and build pass.
Files touched: src/world/**, comms/worker-2.md
PR: https://github.com/GauravOjelay/claudes-plan/pull/14
Question for master (if any): the globe's "Your move" button calls `onOpenHQ` if you pass it. Please add `onOpenHQ={(id) => { setHqId(id); setScreen('hq'); }}` to `<WorldMap>` in App.tsx; until then it opens the player's home city.

## 2026-11-08 00:40 - STATUS: in-progress (owner review fixes pushed to worker-2 / PR #4)
What I did / what I need:
- Merged main into worker-2 and resolved CityView/WorldMap/world.test (kept both 2D and 3D; 3D default, `initialMode="2d"` fallback). Exports are unchanged: `WorldMap`, `CityView`. The new optional prop `WorldMap.onOpenHQ(companyId)` opens the HQ screen; please wire it in App.tsx (`setHqId(id); setScreen('hq')`).
- World map is now a 3D GLOBE in the style of Apple Maps:
  - Real Natural Earth 50m coastlines and borders (world-atlas, lazy chunk). The terrain texture (biomes, deserts, real mountain ranges with relief shading, ice caps, continental shelves) is drawn in code, so no image downloads. Atmosphere glow and stars.
  - Smooth inertial rotate and zoom, pins hidden behind the horizon, fly-in callout, and Terrain/GDP/AI/Tension tints plus grid and water overlays.
- Live events on the globe: coloured pulsing rings at cities, toasts (6 s), and a "Happening now" feed (newest pushed in at the top, oldest popped at the bottom, revealed slowly). Clicking a feed item flies to that city.
- Event demo (`src/world/demo.ts`, `useEventDemo`): visual only, not the sim. Overlapping events, each with its own life cycle: a flood builds up over about 30 s, holds, then recedes; protests are about 20 s; war searchlights are shorter now. The dev page runs it by default. If you want it in the app (e.g. an attract mode), it is one hook.
- 3D city:
  - FPS chip.
  - Camera pad and shortcut bar hidden until the user scrolls or presses (never on hover).
  - Big year badge that "bumps" when the year changes.
  - Fuller two-tone clouds and a brighter flood.
  - Toasts instead of permanent banners.
  - Rolling 6-item feed in "Happening now".
- Calmer timeline: one node per year, year labels 1.25rem below the rail, "NOW" pill, futures in their own column.
- Black "Your move: Make a decision at <your company> HQ" button on the city view (calls `onSelectCompany(playerCompanyId)`) and on the globe (calls `onOpenHQ`).
- Each city now shows its OWN companies; the dev page always opened SF, which is fixed. There are 12 new cities (roster proposal in `src/world/roster.ts`, still waiting on your answer to question 1 of my 23:30 entry).
- Checks: typecheck, 107 tests and build pass. three.js and world-atlas are only in lazy chunks. Screenshots are in `src/world/screenshots/v2/`. FPS still needs a real laptop.
Files touched: src/world/**, package.json, package-lock.json, comms/worker-2.md
Question for master (if any): still open from 23:30: (1) move the roster into contracts, (2) Tokyo region, (3) effects vs policies, (4) app header styling (yours). New: (5) please wire `WorldMap onOpenHQ` in App.tsx.

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
