# Tasks (master writes this file; workers read only)

Game: AI 2126 (see `docs/plan.md`, the single source of truth). Minimum version = years 2026-2036,
one playable company, ~10 variables, ~20 cards, 10 events, 4+ endings, one city + one HQ screen.
Your full role prompt is in `roles/worker-N.md`.

**FIRST MILESTONE (everyone works toward it):** one decision card -> `step()` -> one variable
changes on the dashboard -> one `CityEffect` appears in the city view. Nothing else is merged
until this loop works on `main`.

## worker-1  (Claude 1: Simulation and data)
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

## worker-2  (Claude 2: World and city)
- Branch: `worker-2`
- Owns files: `src/world/`
- Task, in order:
  1. `WorldMap` (props: `state: WorldState`, `onSelectCity(cityId)`): 2D map, countries tinted by GDP/AI capability/tension (toggle), clickable city points from `CityInfo[]`, overlay toggles for energy and water stress.
  2. `CityView` (props: `state`, `cityId`, `onSelectCompany(companyId)`): layered 2D skyline, city + country stats, glowing clickable arrows to at least 3 HQs, and rendering of EVERY `CityEffectKind` from `state.activeCityEffects` (blackout, ghostOffices, deepfakeProtests, gridlock, bankRun, warBuildup, outbreak, embargo, surveillance, solarBoom, flooding, unrest) scaled by `intensity`.
  3. Per-city timeline scrubber from `state.choiceLog` and `state.eventLog`.
  4. Build and demo everything against `mockWorldState`; add a small dev page `src/world/dev.tsx` that cycles through all effect kinds.
- Done when: typecheck passes and the PR has screenshots of each effect kind (a human reviews visuals).

## worker-3  (Claude 3: Interface)
- Branch: `worker-3`
- Owns files: `src/ui/`
- Task, in order:
  1. `HQScreen` (props: `state`, `decisions: Decision[]`, `onChoose(decisionId, optionId)`): company logo area (fictional), company stats on the left, Reigns-style decision card with short/long-term consequence icons, news pop-ups on the right, news ticker showing only this company/city's headlines.
  2. `Dashboard`: line charts of GDP per country from `state.history`, wealth-gap split gauge, three risk bars (misuse, malfunction, systemic), tension bar, trust bar that flash red when dangerous.
  3. Event pop-up modal (screen shake, optional sound), rival race tracker, end-of-game "Your 2126" report card (ending title + key decisions, uses `state.status.ending`).
  4. Accessibility: colour-blind-safe palette, text size control, light/dark toggle.
  5. Build and demo everything against `mockWorldState` and `mockDecisions`.
- Done when: typecheck passes and the PR has screenshots (a human reviews visuals).

## master (lead)
`docs/plan.md`, `CLAUDE.md`, `src/contracts/`, `src/app/` wiring, PR reviews, integration.
