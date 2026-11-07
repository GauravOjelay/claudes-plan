# worker-1 comms (worker-1 writes this file; newest entry on top)

## 2026-11-08 02:00 - in-progress
What I did: PR 6 (IMF baseline) is merged. Step 6: balance runs and tuning. Every implemented ending is now reachable and none is too easy.
- `src/sim/balance.ts` plays whole games with simulated players, one card per year like the app (only cards from the current era, requirements met, not answered yet). 7 policies: random, cautious, reckless, profit, generous, spender, villain. `src/sim/balance.test.ts` runs 2,800 games (400 per policy) in about 0.3 s and asserts the results. For a bigger report: `BALANCE_REPORT=1 BALANCE_GAMES=1000 npx vitest run src/sim/balance.report.test.ts`.
- Result (1,000 games per policy). Random player: corporateFeudalism 46%, abundanceUtopia 29%, slowdown 25%, and rare early endings (nationalised, bankrupt, ww3, aiTakeover each 0.1-0.5%). Players who aim for something mostly get it: generous -> Utopia 71%, cautious -> Slowdown 100%, reckless -> aiTakeover 38% + nationalised 9%, profit -> Feudalism 95%, villain -> nationalised 18% + ww3 2%, spender -> bankrupt 100%.
- Tuning (all in `TUNING`, `ENDING_THRESHOLDS` and the data files):
  - AI capability grows 4/yr (was 2) and world capability follows the best lab; blackouts slow it by 25% (was 50%).
  - Robots grow faster with capability; Mass-produce robots is x30 (was x5), the other robot cards x3 (were x1.5). Without this 1bn robots was impossible in 10 turns.
  - New rule `raceTension`: capability raises tension. Tension card effects raised a little (hoard chips 14, race 16, offence 12, announce 10); war-threat chance 0.3.
  - Company running cost raised (burn 12 + 0.4 x capability); nationalised at home-region regulation >= 80 (was 90); takeover risk threshold 40 (was 60).
  - UBI / profit-sharing / robot dividend cut the wealth gap more (-12 / -6 / -12).
  - AI takeover and the derived takeoverRisk now use the PLAYER company's safety (rivals' safety never changes, so the old all-company mean could never drop below 20).
  - Horizon endings (Utopia / Feudalism / Slowdown) are scored with 0-1 ramps, each gated by its weakest ingredient, on half home region and half world (decisions act on the home region).
- Checked: `npm run typecheck`, `npm test` (104 tests, 11 new balance tests) and `npm run build` pass. Only `src/sim/`, `data/` and `comms/worker-1.md` changed.
Notes for others: card ids/options unchanged; only some effect values moved. A game still ends once the year passes 2036 and always has a score.
Not done / caveats: balance depends on my simulated players, not real playtesting (plan 15.3 still needs people outside the team). Stretch endings (drowned world, immortal oligarchy, extinction) are not implemented.
Question for master (if any): none. TASKS.md worker-1 steps 1-6 are now all done on my side.

## 2026-11-08 00:10 - in-progress
What I did: PR 5 (cards and events) is merged. Step 5: real starting data from the IMF.
- `scripts/fetch-imf.sh` downloads raw IMF DataMapper series (GDP `NGDPD`, population `LP`, unemployment `LUR`; WEO October 2026) into `data/raw/imf/`. `scripts/snapshot.ts` (`node scripts/snapshot.ts`) turns them into `data/baseline.json` (numbers the sim reads) and `data/sources.json` (28 entries: source, indicator, unit, year, projection flag, retrieval date, contributing countries, `verified: false`).
- Regions are summed from explicit country lists (EU 27, Gulf 6, Africa 54, LatAm 27, SEA 11, plus US/CN/UK/IN/RU), so the grouping is auditable in `scripts/snapshot.ts`.
- `createInitialState` now starts from `data/baseline.json` (validated by `src/sim/baseline.ts`). The placeholder GDP/population are gone.
- Gaps, stated openly: the IMF reports no unemployment rate for the Gulf states and only 6 of 54 African countries, so those two regions are `null` in the baseline, listed under `gaps` in `sources.json`, and start from the game-designed 4% / 5% instead. The IMF gives one total rate, so software and physical unemployment both start at it (noted in `sources.json`).
- All figures are `verified: false`. Someone should check them against imf.org/datamapper before they are shown as fact (plan 9.3). CO2, temperature, robot count and the 0-100 indices are game-designed starting values, not real-world claims; they are labelled that way in `src/sim/defaults.ts`.
- The IMF's edge blocks Node's fetch and scripted user agents, so the download is a plain `curl` script and the TypeScript script works offline on the saved files.
- Checked: `npm run typecheck`, `npm test` (91 tests including 12 new) and `npm run build` pass.
Files touched: `src/sim/{baseline,defaults,index}.ts`, `src/sim/baseline.test.ts`, `scripts/*`, `data/{baseline,sources}.json`, `data/raw/imf/*`.
Note for master/others: real GDP and population now flow through `WorldState` (e.g. US GDP about 32,642 bn USD in 2026), so charts and labels built on the mocks' 29,000 will show the new numbers.
Next: step 6, the balance run and tuning.
Question for master (if any): none.

## 2026-11-07 23:00 - in-progress
What I did: PR 2 (rules, endings, 2036 horizon) is merged. Step 4: content.
- `data/cards.json`: 21 cards (12 in 2026-2030, 9 in 2031-2036), 2-3 options each, with short/long-term hints. Later cards have requirements (year, capability, or a pathway such as `robotsEverywhere`).
- `data/events.json`: 10 events. Negative (6): blackout-belt, ghost-offices, deepfake-election, weights-stolen, war-threat, regulation-crackdown. Positive (4): breakthrough-year, drug-discovery, safety-audit-praised, treaty-signed. Ratio is within the plan's 1 positive per 2 negative.
- Every pathway event is caused by a decision: ghost-offices needs `sellsAgents`, deepfake-election needs `looseContentPolicy`, breakthrough-year needs `openSourcedMaterials`, weights-stolen needs `skippedSecurity`, and so on. Tests show each fires after that choice and never after the other option.
- Sim-only flag `once` on event data (type `SimEvent = GameEvent & { once?: boolean }` in `src/sim/index.ts`): the event fires at most once per game. The contract is unchanged.
- Checked: typecheck + `npm test` pass (59 tests, 15 new: content shape, effect validity, pathways reachable, once-only events, decision->consequence chains).
Files touched: `data/cards.json`, `data/events.json`, `src/sim/index.ts`, `src/sim/content.test.ts`.
Notes for others: decision ids and option ids are stable now; worker-3 can use `data/cards.json` for real HQ cards (it is a `Decision[]`). City effects used: `blackout`/`ghostOffices`/`solarBoom` in `sf`, `deepfakeProtests`/`warBuildup` in `london`.
Next: step 5 (`scripts/snapshot.ts`, `data/baseline.json`, `data/sources.json` from IMF DataMapper), then step 6 (balance run and tuning; every ending must be reachable).
Question for master (if any): none.

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

