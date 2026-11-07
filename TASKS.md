# Tasks (master writes this file; workers read only)

Game: AI 2126 (see `docs/plan.md`, the single source of truth). Minimum version = years 2026-2036,
one playable company, ~10 variables, ~20 cards, 10 events, 4+ endings, one city + one HQ screen.
Your full role prompt is in `roles/worker-N.md`.

**FIRST MILESTONE (everyone works toward it):** one decision card -> `step()` -> one variable
changes on the dashboard -> one `CityEffect` appears in the city view. Nothing else is merged
until this loop works on `main`.

## worker-1  (Claude 1: Simulation and data)
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
