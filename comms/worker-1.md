# worker-1 comms (worker-1 writes this file; newest entry on top)

## 2026-11-07 21:15 - in-progress
What I did: PR 1 (first milestone) is merged. Now step 3: all minimum-variable rules, endings, the 2036 horizon.
- New rules: unrest (no safety net = pathway `ubi`), concentration (wealth gap), GDP growth, robot growth, tension drift, trust recovery + regulation, company economy (income, burn, value).
- Endings: `bankrupt`, `nationalised` (home-region regulation >= 90), `ww3` (tension >= 95), `aiTakeover` (mean safety < 20 AND robots > 1bn AND derived risk >= 60), and at the end of 2036 the best fit of `abundanceUtopia` / `corporateFeudalism` / `slowdown`. That is 7 endings; the game now ends once the year passes `END_YEAR` (2036).
- Events: added `war-threat` (tension > 80) and `regulation-crackdown` (trust < 30) from the plan's thresholds. Any event now has a 3-year cooldown.
- Checked: typecheck + `npm test` pass (44 tests: each rule in isolation, each ending incl. the takeover prerequisites, horizon endings, cooldown).
Files touched: `src/sim/rules.ts`, `src/sim/endings.ts`, `src/sim/index.ts`, `src/sim/sim.test.ts`, `data/events.json`.
Notes: all numbers are in `TUNING` / `ENDING_THRESHOLDS` and are untuned; the balance run (step 6) will tune them once the ~20 cards exist (step 4, next). Nothing in the contracts changed.
Question for master (if any): none.

## 2026-11-07 18:35 - in-progress
What I did: first-milestone slice of the sim (TASKS.md steps 1-2, plus the master's three contract notes).
- `src/sim/rng.ts`: mulberry32 `createRng(seed)`, and `rngForTurn({seed, year})` so the app can call `step(state, choices, rngForTurn(state))` with no Rng object to store; saved games replay exactly.
- `src/sim/index.ts`: `createInitialState(seed, companyId)` (companies built from `COMPANY_ROSTER`; the seed also picks the expert outlook) and `step` as the pipeline: choices -> scheduled effects -> rules -> fade city effects -> events -> derive takeoverRisk -> next year -> history -> endings. `createStep(content)` builds a step over other card/event data (used by tests).
- 3 rules (automation, energy limit, riots; energy limit also applies base AI-capability growth). 1 event: `blackout-belt` (emits a `blackout` CityEffect in `sf`).
- `data/cards.json`: one card, `datacentre-campus` (options `fastTrack`, `staged`). `fastTrack` -> US energy goes negative -> blackout in SF within a few turns. `staged` never causes it.
- Master's notes: `EventLogEntry` gets `valence`, `popup`, `city` from the event; `GameStatus.score` is computed when the game ends (formula documented in `src/sim/endings.ts`).
- Checked: `npm run typecheck` and `npm test` pass (27 tests: rng, determinism, purity, each rule, delayed effects, derived takeoverRisk, bankruptcy + score, data validation, string-value rejection). No `Math.random()` in the sim.
Files touched: `src/sim/*`, `data/cards.json`, `data/events.json`, `comms/worker-1.md`.
Things you should know:
- Starting GDP/population/etc. are PLACEHOLDERS in `src/sim/defaults.ts` (same US/CN numbers as your mocks), not real data. They get replaced by `data/baseline.json` in step 5. Not to be shown as fact.
- Only the bankrupt ending exists so far; the other endings and the 2036 horizon are step 3. Until then a game does not end at 2036.
- Effects on `region: 'any'` hit the acting company's home region. `delayYears` effects are stored in `state.pending`.
- `npm install` needed Node, which was not installed on my machine; I installed it with Homebrew.
Question for master (if any): none. Next: step 3 (all minimum-version rules, 4+ endings, 2036 horizon) and the 20 cards / 10 events.

