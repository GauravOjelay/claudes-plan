# Tasks (master writes this file; workers read only)

Game: AI 2126 (see `docs/plan.md`, the single source of truth). Minimum version = years 2026-2036,
one playable company, ~10 variables, ~20 cards, 10 events, 4+ endings, one city + one HQ screen.
Your full role prompt is in `roles/worker-N.md`.

**FIRST MILESTONE (everyone works toward it):** one decision card -> `step()` -> one variable
changes on the dashboard -> one `CityEffect` appears in the city view. Nothing else is merged
until this loop works on `main`.

## worker-1  (Claude 1: Simulation and data)
> **DECISION + NEW TASK (master, 2026-11-08 #8) for worker-1:** Great work on the demo (PR #11 merged). Your question: choose **option 3**. Keep ONE card per year in data order (the demo script depends on it). Retune the first-card flow so the bad endings (`aiTakeover`, `ww3`, `bankrupt`) are reachable by an aiming player in the real app, WITHOUT breaking `src/sim/demo.lock.test.ts`. Report the new 'first' mode table in your comms.
> Also from the team's feedback: city effects need DIFFERENT DURATIONS and must OVERLAP. Today every effect fades at the same `CITY_EFFECT_FADE`. Add per-kind build-up and decay (e.g. flood/blackout build up and last several years; unrest/protests/deepfakeProtests are short; gridlock very short), keep several effects active in one city at once, and add tests. Keep the `CityEffect` contract shape unchanged (intensity 0-1, sinceYear); only the sim's behaviour changes.
> **NEW TASKS (master, 2026-11-08 #7) - the hook was broken and hid this section until now; sorry. Do these in order:**
> 1. `git fetch origin && git merge origin/main`.
> 2. **Demo script (most important).** Plan 11.3: a 2-3 minute demo where ONE early decision causes a BIG consequence years later. Find the best seed and the exact card/option choices, then write `data/demo.md`: for each year, the card shown, the option to pick, what the player should say out loud, and the headline/CityEffect/variable that appears. The "wow" must be visible in the UI (e.g. fast-track the data-centre -> blackout in SF -> later breakthrough/solar reversal). Add a test that locks the seed + choices so nobody breaks the demo by tuning.
> 3. **Verification checklist.** Write `data/VERIFY.md`: every real-world figure the game can show (from `data/sources.json`), with the exact IMF DataMapper page/indicator link so a human can tick each one off in 10 minutes (plan 9.3).
> 4. Open a PR; write a short note in your comms file.
> **NEXT ACTION (master, 2026-11-08) - do this now, in order:**
> 1. `git fetch origin && git merge origin/main` (PR #6 and worker-3 are merged).
> 2. Step 6: balance run. Add `npm run balance` that simulates thousands of random games (seeds 1..N, random options). Print how often each ending happens. Every ending must be reachable and none above ~60%. Tune `TUNING` / `ENDING_THRESHOLDS`. Runs are only ~10 turns, so endings must be reachable in that time.
> 3. Check the demo path: with seed 1 and the sensible choices (safety first, UBI, treaty), a good ending (`abundanceUtopia` or `slowdown`) should be reachable; with reckless choices (skip safety, hoard chips) a bad one (`ww3`, `aiTakeover` or `nationalised`). Add a test for both.
> 4. Open a PR when done and write the numbers into your comms file.
- Branch: `worker-1`
- Owns files: `src/sim/`, `data/`, `scripts/`
- Task, in order:
  1. `src/sim/rng.ts`: seeded RNG (e.g. mulberry32) matching the `Rng` interface.
  2. `src/sim/index.ts`: `createInitialState(seed, playerCompanyId)` and `step` (type `StepFn`) as a pipeline: apply choices -> apply scheduled effects -> run rules -> check event thresholds -> derive takeoverRisk -> advance year -> check endings. Start with 3 rules and 1 event that emits a `blackout` CityEffect (first milestone).
  3. All section-3 rules/thresholds for the minimum variables, the randomised expert outlook, 4+ endings.
  4. `data/cards.json` (~20 cards, eras 2026-2030 and 2031-2036), `data/events.json` (10 events incl. Blackout belt, Ghost offices, Deepfake election, Breakthrough year), at least 1 positive event per 2 negative.
  5. `scripts/snapshot.ts` + `data/baseline.json` + `data/sources.json` from IMF DataMapper with source, indicator, unit, year, retrieved date, verified flag.
  6. Tests (Vitest): each rule, determinism (same seed+choices = identical game), prerequisites (no takeover without low safety AND >1bn robots), and a balance run over thousands of random games.
- Done when: `npm run typecheck && npm test` pass, and every ending is reachable in the balance run.

> [master, 2026-11-07] to worker-1: Contracts changed on main (pull, then merge into worker-1):
> 1. New `src/contracts/cities.ts`: `COMPANY_ROSTER` (9 fictional companies, NovaCore is the only playable one) and `CITIES` (sf, beijing, london, 3 HQs each). Build `createInitialState().companies` from `COMPANY_ROSTER`; do not make up your own roster.
> 2. `EventLogEntry` now also has `valence`, `popup`, optional `city`. Fill them from the GameEvent when an event fires.
> 3. New `Score {total, wellbeing, company, survival}` (each 0-100) and `GameStatus.score`. Compute it when the game ends (wellbeing: world trust/low unemployment/low wealth gap; company: companyValue + money; survival: low takeoverRisk/tension). Document your formula in a comment.

> [master, 2026-11-07 #5] to worker-1: PRs #2 and #5 are merged; the first milestone loop works on main (see `src/app/game.test.ts`) and the app is wired (`src/app/`). Carry on with step 5 (baseline snapshot + sources) then step 6 (balance runs; every ending must be reachable and none too easy). Tuning note: a run is only ~10 turns (one card per year, 21 cards, 2036 horizon), so endings must be reachable within that.

## worker-2  (Claude 2: World and city)
> **EXTRA FIXES FROM THE OWNERS (master, 2026-11-08 #10) for worker-2, do these right after the globe:**
> A. **World map page is taller than the screen (scrolls).** Make the map page container `height: 100vh; overflow: hidden` (use `100dvh` too), make the globe's container a flexbox with `justify-content: center; align-items: center`, and size the globe from its container (reduce its radius / the container size so the whole globe fits in the viewport, centred).
> B. **The city stat card is outside the viewport** because of that oversized page; after A it must be fully visible on a 1280x720 screen. Check at 1280x720 and 1920x1080.
> C. **The "Your move" button** (top right, above the headquarters panel) does nothing. It must call `onSelectCompany(state.playerCompanyId)` (open the player's HQ).
> D. **The top nav bar** in the real app is the new `TopBar` (in `src/ui`, already on main), so merge `origin/main` first and make sure your pages/dev pages don't show bare native buttons any more. Any buttons inside `src/world` need proper styling (same look as TopBar tabs).
> Please screenshot at 1280x720 and put them in the PR.
> **TEAM FEEDBACK CONFIRMED (master, 2026-11-08 #8): the owners (Krish, Charles, Rishi) re-sent their list. Priority order, do the first one first:**
> 1. **WORLD MAP MUST BE A REAL GLOBE** like Apple Maps: a sphere you orbit/zoom/spin, atmosphere glow, day/night shading, and land that looks REAL (relief/terrain shading or extrusion with coast detail), not flat origami plates. Use the approved `world-atlas`. 2D map stays as the fallback.
> 2. Every city shows ITS OWN companies (from the city's `companyIds`; all 15 cities and 45 companies are in `src/contracts/cities.ts`). No city may show San Francisco's companies.
> 3. Effects: different durations and overlapping (search lights + flood at once). Flood builds up visibly then calms (long); protests are short; searchlights are short. worker-1 is changing the sim durations; make the 3D scene follow `intensity` smoothly. Add a demo mode that plays overlapping events.
> 4. "Happening now": a list of 5-6 recent events; newest slides in at the top, oldest slides out at the bottom, with an animation, and a SLOWER pace than every 2 seconds.
> 5. Toasts that are not important disappear after 5-7 seconds. Timeline: 1-2rem gap between event circles and year text, cleaner layout.
> 6. Navigation buttons/shortcut bars in 3D views hidden by default; show on scroll or press (`:active`), NOT on hover. Current year must be prominent. Clouds a little fuller. FPS chip stays.
> 7. The city view must feel like a smooth zoomed-out street view (zoom, pan, forward/back).
> Answers already given: effects are consequences, not policies; policies are chosen on the HQ screen (keep your black "Make a decision" button). The app top bar is now styled (TopBar). Please push small PRs and tell me when each is ready.
> **UPDATE (master, 2026-11-08 #6) for worker-2:** merged your latest into main (kept your versions of `WorldMap.tsx`/`CityView.tsx`). Answers: (1) DONE: your 12 cities + 36 companies are now in `src/contracts/cities.ts` (CITIES / COMPANY_ROSTER), so the sim carries them; your `roster.ts` dedupes (contracts win), keep it as is. (2) Tokyo stays in SEA for now; no new RegionId. (3) Correct: CityEffects are consequences, decisions are made only on the HQ screen. Your black "Make a decision" button calling `onSelectCompany(playerCompanyId)` is fine. (4) I will style the app header myself. (5) FPS chip default-on is fine. Next: `git fetch origin && git merge origin/main`, then carry on with the rest of the owner's list.
> **UPDATE (master, 2026-11-08): your 3D PR #4 is MERGED into main. I resolved the conflicts for you (kept 2D + 3D, 3D default). You do NOT need to fix conflicts any more.**
> Do this now: `git fetch origin && git checkout worker-2 && git merge origin/main` (your branch was 22 commits behind, so you had no game logic until now). Then run the real app (`npm run dev`, open the root URL, not the dev page) and check the 3D city + map work inside the full game. Then: (1) delete `src/world/screenshots$1.png` and `src/world/screenshots$name.png`, (2) add the `?fps` readout, (3) world-atlas coastlines if time allows. Open a small PR for each.
> **NEXT ACTION (master, 2026-11-08) - do this now, in order:**
> 1. `git fetch origin && git merge origin/main` on `worker-2`. Fix the conflicts in `CityView.tsx`, `WorldMap.tsx`, `world.test.ts`. Keep BOTH 2D and 3D: 3D default, `initialMode="2d"` fallback.
> 2. Delete `src/world/screenshots$1.png` and `src/world/screenshots$name.png`.
> 3. Add the `?fps` URL flag: a small FPS readout in the corner when the page URL has `?fps`.
> 4. `npm run typecheck && npm test && npm run build`, push, and write "PR #4 ready" in your comms file. Real GDP numbers now flow in from IMF data (US about 32,642 bn), so check your labels and colour scales still look right.
> 5. Then: add `world-atlas` coastlines (approved) if time allows.
- Branch: `worker-2`
- Owns files: `src/world/`
- Task, in order:
  1. `WorldMap` (props: `state: WorldState`, `onSelectCity(cityId)`): 2D map, countries tinted by GDP/AI capability/tension (toggle), clickable city points from `CityInfo[]`, overlay toggles for energy and water stress.
  2. `CityView` (props: `state`, `cityId`, `onSelectCompany(companyId)`): layered 2D skyline, city + country stats, glowing clickable arrows to at least 3 HQs, and rendering of EVERY `CityEffectKind` from `state.activeCityEffects` (blackout, ghostOffices, deepfakeProtests, gridlock, bankRun, warBuildup, outbreak, embargo, surveillance, solarBoom, flooding, unrest) scaled by `intensity`.
  3. Per-city timeline scrubber from `state.choiceLog` and `state.eventLog`.
  4. Build and demo everything against `mockWorldState`; add a small dev page `src/world/dev.tsx` that cycles through all effect kinds.
- Done when: typecheck passes and the PR has screenshots of each effect kind (a human reviews visuals).

> [master, 2026-11-07] to worker-2: Answer to your question: city list now lives in `src/contracts/cities.ts` on main (`CITIES`: sf, beijing, london, 3 HQs each; `COMPANY_ROSTER`). Pull main, merge it into worker-2, and import `CITIES` as the default for your `cities` prop. `mockCities` still works (it re-exports CITIES). Keep the optional `cities?` prop.

> [master, 2026-11-07 #2] to worker-2: Answers to your 18:40 questions: (1) city list is `CITIES` in `src/contracts/cities.ts` (already told you). (2) Done: `EventLogEntry` now has `city?`; use it instead of the headline matching. (3) Per-region tension is out of scope; global tension tinting every region the same is fine. (4) Yes, same approach as worker-3.
> About the 3D city view (your 19:00 question): HOLD. It reverses DECISIONS.md #4, which the project owner approved, so the owner has to decide. Do NOT add three/@react-three/* dependencies or build CityScene3D yet. Meanwhile: merge origin/main into worker-2, make sure typecheck/tests/build pass, and open the PR for your finished 2D work so it can be reviewed and merged. I'll relay the owner's decision.

> [master, 2026-11-07 #3] to worker-2: APPROVED by the project owner: build the 3D city view. Update: DECISIONS.md #4 now says 3D (three.js) is the default with the 2D skyline as fallback; `three`, `@react-three/fiber` 8.x, `@react-three/drei` 9.x and `@types/three` are approved (add them to package.json yourself). Conditions: (1) keep the 2D CityView working and switchable (no WebGL, or a toggle/one-line flag) so we can revert if 3D lags; (2) lazy-load the 3D scene; (3) same props/callbacks, all 12 CityEffectKinds in 3D; (4) first open the PR for your finished 2D work (merge main in first, typecheck/tests/build passing) so it isn't blocked behind the 3D build; (5) put 3D on its own PR; (6) keep frame rate smooth on an ordinary laptop (cap pixel ratio, low poly) and mention FPS in your comms; (7) the owner asked: if 3D lags we change later, so make the fallback easy.

> [master, 2026-11-07 #4] to worker-2: Thanks, great progress. (1) APPROVED: `world-atlas@2`, `topojson-client@3`, `@types/topojson-client`, lazy-loaded with the 3D map. (2) PR #3 (2D) and PR #2 (worker-1) merge cleanly and pass checks. PR #4 (3D) CONFLICTS with #3 in `CityView.tsx`, `WorldMap.tsx` and `world.test.ts`, so once #3 is merged into main, run `git fetch origin && git merge origin/main` on `worker-2`, resolve those three files and re-run typecheck/tests/build. Don't touch #3 any more; any further 2D fixes go on `worker-2` after the merge. (3) FPS: 3 fps in software WebGL tells us nothing; a human with a real laptop must check it. Add a visible FPS readout behind a `?fps` URL flag so they can read it off. (4) I'll wire `src/app` using `WorldMap` and `CityView` from `./world`.

> [master, 2026-11-07 #5] to worker-2: PR #3 (2D) is merged into main. Next: `git fetch origin && git merge origin/main` on `worker-2`, resolve `CityView.tsx`, `WorldMap.tsx`, `world.test.ts` (keep BOTH 2D and 3D paths; 3D default, `initialMode="2d"` fallback), re-run typecheck/tests/build, push, and PR #4 becomes mergeable. Also: delete the two stray files `src/world/screenshots$1.png` and `src/world/screenshots$name.png` (shell typo). Add the `?fps` readout. The app already imports `WorldMap` and `CityView` from `./world`, so keep those exports stable.

## worker-3  (Claude 3: Interface)
> **NEW TOP-PRIORITY TASK (master, 2026-11-08 #9) for worker-3: the HQ boardroom scene.** The owners sent a reference image: a dusk boardroom, long dark conference table, executives seated and one standing and presenting, floor-to-ceiling windows with a glowing golden-hour city skyline behind, strip lights overhead. Make the HQ screen background look like that (`src/ui/` only, keep the left stats panel, card and news readable on top):
> 1. **Scene:** layered SVG/CSS (no heavy deps): window wall with the skyline, table in perspective, 5-7 stylised seated/standing figures (simple silhouettes are fine, no real people), overhead light strips, subtle reflections on the glass.
> 2. **Company logo, built in:** use `CompanyLogo` on the room itself, e.g. glowing sign on the back wall or glass, on the presenter's screen/lectern, and a small mark on the table. It must be clearly readable.
> 3. **Every HQ looks different:** derive a look from the company (id/archetype/home city): different skyline for its city (sf, beijing, london, new york, tokyo etc.), time of day (golden hour/dusk/night), room palette, table shape, number of people, logo placement. Rivals (view-only) get their own looks too.
> 4. **Light movement:** gentle, slow, realistic: drifting clouds/haze, flickering window lights in the skyline, a slow light sweep, subtle idle motion of the figures, soft glass glare. Respect `prefers-reduced-motion` (no animation then). Keep it smooth (CSS transforms/opacity only).
> 5. Reactive bit if time: when the player's city has a blackout/unrest effect, dim or change the skyline outside the window.
> 6. PR with screenshots of at least 4 different companies, light and dark theme. Do it after you merge `origin/main`.
> **NEW TASKS (master, 2026-11-08 #7) - the hook was broken and hid this section until now; sorry. Your intro screen is wired into the app now. Do these in order:**
> 1. `git fetch origin && git merge origin/main`.
> 2. `TopBar` in `src/ui/` (the app's plain browser-button header looks unfinished): props `{ year, screen, onNavigate(screen), cardsWaiting, onSkipYear, children }` where screen is `'map'|'city'|'hq'|'dashboard'`. Style it: big readable year, clear active tab, a high-contrast "N cards waiting" call to action. Export it; I will wire it into `src/app`.
> 3. `HowToPlay` overlay in `src/ui/` (3 short steps: pick a city -> open your HQ -> answer cards; watch the world change), with `onClose` and a "?" help button component. Keep it under 60 words.
> 4. Click the three links in the report card debrief once from a normal browser (your session could not) and report any that are dead.
> 5. Open a PR with screenshots.
> **NEXT ACTION (master, 2026-11-08) - do this now, in order:** (your score work is merged, thanks)
> 1. `git fetch origin && git merge origin/main`.
> 2. Add `IntroScreen` in `src/ui/`: title "AI 2126", the one-sentence pitch, the speculation note (plan 9.2: future events are speculative, based on real forecasts where they exist), and a Start button (`onStart`). Export it from `src/ui/index.ts`. I will wire it into `src/app`.
> 3. Add the real-world debrief to `ReportCard` (plan 9.2): a short "How this compares to real forecasts" section with 3 links (IPCC, IEA, UN World Population Prospects). Keep text neutral and mark it as general context, not a verdict on the player's run.
> 4. The HQ background is a flat grey skyline. Make it a nicer layered skyline that reacts to the company's city effects if time allows.
> 5. Open a PR with screenshots, then write what you did in your comms file.
- Branch: `worker-3`
- Owns files: `src/ui/`
- Task, in order:
  1. `HQScreen` (props: `state`, `decisions: Decision[]`, `onChoose(decisionId, optionId)`): company logo area (fictional), company stats on the left, Reigns-style decision card with short/long-term consequence icons, news pop-ups on the right, news ticker showing only this company/city's headlines.
  2. `Dashboard`: line charts of GDP per country from `state.history`, wealth-gap split gauge, three risk bars (misuse, malfunction, systemic), tension bar, trust bar that flash red when dangerous.
  3. Event pop-up modal (screen shake, optional sound), rival race tracker, end-of-game "Your 2126" report card (ending title + key decisions, uses `state.status.ending`).
  4. Accessibility: colour-blind-safe palette, text size control, light/dark toggle.
  5. Build and demo everything against `mockWorldState` and `mockDecisions`.
- Done when: typecheck passes and the PR has screenshots (a human reviews visuals).

> [master, 2026-11-07] to worker-3: Answers (pull main and merge into worker-3; contracts changed):
> 1. Yes. `EventLogEntry` now has `valence`, `popup` and optional `city`, so use those instead of props from src/app. Fix any mock EventLogEntry you build.
> 2. Yes. `GameStatus.score?: Score` = `{total, wellbeing, company, survival}`, each 0-100, set by the sim at game end. Show total plus the three parts on the report card; handle `score` being undefined.
> 3. Yes, ranking by each country's best home lab's aiCapability is fine.
> 4. Yes, population-weighted averages are fine.
> Also: I see your branch pushed but no PR is open yet. Please open the PR into main. A human will look at your screenshots before it is merged.

> [master, 2026-11-07 #4] to worker-3: Your branch has had no new commits for several hours and no PR is open. Please: `git fetch origin && git merge origin/main` (contracts changed: `EventLogEntry` has `valence`/`popup`/`city`, `GameStatus.score` exists), add the score (total + wellbeing/company/survival) to `ReportCard`, re-run typecheck/tests/build, and open the PR into main. Also drop the demo-only EventModal props if they are now redundant.

> [master, 2026-11-07 #5] to worker-3: your branch is merged into main and wired into `src/app/`. Next: `git fetch origin && git merge origin/main`, then add `status.score` (total + wellbeing/company/survival) to `ReportCard` (it can be undefined), remove the duplicate A11y controls problem if any remains, and open a PR. The report card is the last thing the player sees, so make the ending title and score prominent. Also use `data/cards.json` real cards only; drop demo-only data from non-demo code.

## master (lead)
`docs/plan.md`, `CLAUDE.md`, `src/contracts/`, `src/app/` wiring, PR reviews, integration.
