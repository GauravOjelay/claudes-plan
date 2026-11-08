# worker-1 comms (worker-1 writes this file; newest entry on top)

## 2026-11-08 12:00 - done: Average Joe + demo script for the "Next year" flow (your #12), and a real-app check
1. **`averageJoe(state, cityId)`** in `src/sim/averageJoe.ts`, exported from `src/sim/index.ts`, matches your `AverageJoeFn` contract. Pure and deterministic, no rng. Name, age and occupation come from a hash of the city id (stable per city; 12 first names x 12 surnames, 6 software jobs, 6 physical jobs). From the world:
- **job**: Joe works in the software or the physical sector (hash). He has his own "lay-off point" between 4% and 20% (hash). When his sector's unemployment in his region reaches it, he has lost the job. A lost job is `onUbi` if the `ubi` pathway is unlocked, else `retraining` if regional trust >= 65, else `lostSoftwareJob` / `lostPhysicalJob`. Otherwise `employed`.
- **income** (USD/yr, game scale, nearest 100): GDP per person x 0.5 x (1.3 - wealth gap/100) when employed; 15% of that when jobless, 35% retraining, 45% on UBI.
- **mood** 0-100: 50 + 0.3 x (trust - 50) - 0.5 x (wealth gap - 50) + job effect + situation effect.
- **situation**: `war` if world tension > 80 or a warBuildup effect (>= 0.25) is on that city; else the strongest city effect at >= 0.25 strength (blackout, flooding -> `flood`, deepfakeProtests / unrest -> `protests`, surveillance, outbreak); else `prosperous` (mood >= 65), `normal` (>= 40) or `struggling`. Effects in other cities, weak effects and kinds with no street scene (solarBoom, gridlock...) are ignored.
- **lines**: 1-3 first-person, non-graphic sentences, cause then effect (the lost job and occupation, the situation, "Nobody here trusts the AI companies" when trust < 35, "A few people are getting very rich..." when the wealth gap >= 70).
Tests (`averageJoe.test.ts`, 28): every job outcome and every situation can happen, precedence (war beats effects, strongest effect wins), weak and foreign-city effects ignored, income/mood rules, determinism and purity, unknown city throws, all 15 cities valid every year of a whole game, no graphic words. All numbers are game-designed, none is a real-world claim (stated in the file header). Whoever wires the app: `averageJoe(state, cityId)` takes the same `WorldState` the screens get.
2. **`data/demo.md` rewritten for the "Next year ->" flow**: every year says click the option, then click the blue "Next year ->", then Continue on the alert. `demo.lock.test.ts` still passes unchanged (`playTurn` takes the held choice, so the logic is identical).
3. **I ran the real app** (dev server, built-in browser) and played seed 44 from 2026 to 2029 by hand. It matches: the data-centre card, the orange "ALERT - 2026" blackout pop-up, the next card already showing, the green "BREAKTHROUGH - 2028" solar pop-up, HQ chips "Blackouts" then "Blackouts, Solar boom", and money 492.3 / 483.2 / 413.1, the numbers the sim predicts. At Night the SF skyline shows dark districts, so the blackout is visible. Findings that changed the script: the Dashboard shows WORLD numbers only (so trust/wealth gap for the US are on the City screen's "United States" panel, not the Dashboard); the "Your move" button on the globe goes straight to the HQ. Years 2030+ I have not clicked by hand (locked by the test only).
4. Things for you / others (not mine): (a) the "How to play" box still says "Each choice moves the year on", which is no longer true with "Next year ->"; (b) in my test browser (software graphics) the 3D globe and city ran at 1-2 fps, the globe took a while to appear and the screen felt unresponsive; the 2D toggle exists but the demo machine should have a real GPU; (c) `npm run balance` is still not in `package.json`.
Checked: `npm run typecheck`, `npm test` (192 tests) and `npm run build` pass. Files touched: `src/sim/{averageJoe,index}.ts`, `src/sim/averageJoe.test.ts`, `data/demo.md`, `comms/worker-1.md`.
Question for master: none.

## 2026-11-08 09:00 - done: first-card flow retuned + city effect durations (your DECISION #8)
Done as you decided: ONE card per year in data order (option 3), the bad endings are now reachable in the real app, `src/sim/demo.lock.test.ts` still passes untouched.

**1. App flow ('first' mode: the HQ shows only the first available card).** Table, 1,000 games per player type (`BALANCE_REPORT=1 npx vitest run src/sim/balance.report.test.ts` prints it; the tests assert it with 400 per type):
| player | Utopia | Slowdown | Feudalism | AI takeover | bankrupt | nationalised | WW3 |
|---|---|---|---|---|---|---|---|
| random | 38.7% | 16.5% | 37.4% | 3.2% | 3.8% | 0.2% | 0.2% |
| cautious | 67.2% | 32.8% | - | - | - | - | - |
| generous | 100% | - | - | - | - | - | - |
| reckless | - | - | - | 87.1% | - | - | 12.9% |
| spender | - | - | - | - | 100% | - | - |
| warmonger | - | - | - | 59.2% | - | - | 40.8% |
| villain / profit | - | - | - | 60.3% | - | - | 39.7% |
All 7 endings occur; a random player gets no ending above 39%. Before (same flow): only Utopia, Slowdown, Feudalism and a rare nationalised; takeover, WW3 and bankruptcy were impossible. Careful play does not go bankrupt (cautious and generous under 5%, tested).
What I changed (only options/numbers the demo does not pick, so the demo is untouched): "Ignore it and keep going" safety -10 (was -8; a fully reckless run now ends below the takeover line of 20); tension up on racing choices that are on screen: "Ship first" +6, "Mass-produce robots" +12 (robot arms race, plan 6.4), "Hand it control" +8, "Keep it proprietary" +4, "Leave it to governments" +3; war-threat event chance 0.4 and +10 tension; two new money-sink options for a deliberate spender: "Build your own power plant" (-150 money, energy +20 after 2 years) on the power card and "Launch a moonshot research programme" (-120) on the research card, both without a trust benefit so ordinary careful play does not pick them. Test limits: adds may now be up to 200.
Still true (your call, no action needed): only ~11 of the 21 cards appear in any game. Nationalised is reachable but very rare in this flow (0.2% random); it is fine in the free-choice mode.

**2. City effects: different durations, overlapping** (`src/sim/cityEffects.ts`, tests in `cityEffects.test.ts`). `CityEffect` shape unchanged. Each kind has build-up (years to reach its peak; the event's `intensity` is the peak), hold, and decay per year:
- hits at full strength, short: gridlock (gone in 1-2 years), bankRun, deepfakeProtests, unrest (2-4 years)
- builds then calms: outbreak (1 yr build), embargo, solarBoom (1 yr build, stays several years), ghostOffices, warBuildup (2 yrs build)
- long: flooding (3 yrs build, 3 hold, very slow decay, about 18 years) and surveillance (2 build, 3 hold, slow decay)
- blackout hits at once, lingers, and clears fast (0.3/yr) once the grid is repaired (so the solar boom visibly reverses it).
Different kinds (and different cities) are independent, so several can be active in one city at once; a second effect of the same kind in the same city is still not started while one is live. worker-2: `intensity` is what changes smoothly year to year (for example solarBoom starts at 0.35 and grows to 0.7 the next year; flooding climbs for 3 years). `startIntensity()` and `EFFECT_PROFILES` are exported if you want the same curve for a demo mode.
`data/demo.md` updated with the new solar boom numbers (0.35, then 0.7, fading 0.4 to 0.2 by 2037).

Checked: `npm run typecheck`, `npm test` (159 tests) and `npm run build` pass. Files touched: `src/sim/{cityEffects,index,balance,content.test,sim.test,balance.test,cityEffects.test}.ts`, `data/{cards,events}.json`, `data/demo.md`, `comms/worker-1.md`.
Question for master: none. Free for the next task.

## 2026-11-08 06:00 - question (needs your decision) + done: demo script and verification checklist
**Please read the QUESTION first: it changes what the app can show.**

QUESTION / PROBLEM for master: `HQScreen` shows only the FIRST available card each year (`decisions.find(d => !answered.has(d.id))`), in `data/cards.json` order, and the player can only pick an option or "Skip year". So (a) a player can never choose which card to answer, (b) only ~11 of the 21 cards ever appear (5 in 2026-2030, 6 in 2031-2036; the rest sit behind them until the era ends), and (c) the same 11 cards come up every game. I measured the app as it is today (1,000 games per player type, `BALANCE_REPORT=1 npx vitest run src/sim/balance.report.test.ts` now prints it as mode 'first'): only 4 of the 7 endings can happen. Random player: Utopia 38%, Feudalism 40%, Slowdown 22%, nationalised 0.2%. AI takeover, WW3 and bankruptcy cannot happen, and neither can most events (Deepfake election, Ghost offices, weights stolen). With a free choice of card (mode 'any', what the balance tests assert) all 7 endings are reachable.
Options (your call, this is app/UI, not mine): (1) let the HQ answer ALL waiting cards each year and advance on a button ("End year"); `step()` already takes `choices[]`, and plan 6.8 says several decisions per year; (2) a card picker on the HQ; (3) keep it as is and I reorder/retune so more endings fit the 11 cards. I recommend (1). Tell me which and I will re-balance.

What I did (your NEXT ACTION: demo script + checklist):
- **`data/demo.md` + `data/demo.json`: the demo script.** Seed **44**, open `/?seed=44`, about 2:30. Story: 2026 fast-track the data centre -> San Francisco blackout (pop-up, city effect, trust 60 -> 52); 2027 open-source the materials model -> 2028 Breakthrough year (solar boom in SF while the blackout shrinks) -> blackout gone by 2031; positive beats 2030 (audit), 2032 (treaty), 2033 (drug discovery); ends Abundance Utopia (score about 72). Twist (30 s): replay with "Keep it proprietary" in 2027 and the blackout comes BACK in 2032 and the world ends as Slowdown (about 69). `demo.md` has the exact cards, clicks, what appears, what to say, prep and recovery steps.
- **`src/sim/demo.lock.test.ts`** locks seed + choices using the app's own `availableDecisions` / `playTurn` (so it follows what the HQ really shows): the scripted card is on screen every year, the beats land in the right years, the ending and the what-if both hold, money never drops below 60. If tuning breaks the demo, this test fails.
- To make the story reachable in the real UI I REORDERED `data/cards.json` into story order (no values changed): datacentre-campus, materials-model, energy-source, response-to-job-losses, safety-mechanisms, then the rest; era 2: treaty-or-race, alignment-scare, research-priority, robotics-rollout, final-oversight, lobby-regulation, then the rest.
- Small sim change so the picture follows the cause: a blackout now fades faster (0.3/yr instead of 0.1) once the region's energy is back at or above 0 (tested).
- **`data/VERIFY.md`: the verification checklist**, generated from `data/sources.json`. Part 1: the 15 single-country figures (US, CN, UK, IN, RU: GDP, population, unemployment) with API and page links. Part 2: the 13 aggregated region figures with links to every country used and the three biggest contributors to spot-check. Gaps stated (no Gulf or Africa unemployment). Part 3: the software/physical unemployment split is a game assumption, not a figure. Part 4: the 3 debrief links (IMF links answered 200 from a script; IPCC and IEA answered 403 = bot protection, so open those by hand). Ticking a figure = set `"verified": true` in `data/sources.json`; do NOT re-run `node scripts/snapshot.ts` afterwards (it resets the flags).
- Test change: `baseline.test.ts` now only requires `verified` to be a boolean, so a human ticking a figure does not break the tests.
- Checked: `npm run typecheck`, `npm test` (139 tests) and `npm run build` pass.
Files touched: `data/{cards.json,demo.json,demo.md,VERIFY.md}`, `src/sim/{index,balance,balance.report.test,baseline.test,sim.test,demo.lock.test}.ts`, `comms/worker-1.md`.
Still open: `npm run balance` in `package.json` (yours). Real-people playtesting.

## 2026-11-08 03:30 - in-progress (follow-up to your NEXT ACTION)
What I did: PR 7 (balance + tuning) is merged. Your NEXT ACTION items 2-4, finished:
- Demo path tests (`src/sim/demo.test.ts`). Seed 1, scripted player: safety first + UBI + treaty (+ share compute, partner with governments, pause and fix, humans in the loop) ends in a good ending (`abundanceUtopia` or `slowdown`). Reckless (skip safety, hoard chips, open-source, sell agents, hype, mass-produce robots, race, hand over control, ignore the warning) ends in `aiTakeover`. Over seeds 1-30, sensible is never `ww3`/`aiTakeover`/`nationalised` and reckless is never Utopia or Slowdown. The two paths also differ in the numbers (survival score, tension, safety).
- To make the reckless path hit a bad ending I changed one card value: `safety-mechanisms` / `skipSafety` now costs 20 safety (was 15). Before, a fully reckless run stopped at exactly 20 and never crossed the "below 20" takeover line.
- Balance report, 1,000 games per player type (7,000 total). `BALANCE_REPORT=1 npx vitest run src/sim/balance.report.test.ts` prints a table.
  - Random player: corporateFeudalism 46.8%, abundanceUtopia 27.5%, slowdown 24.6%, nationalised 0.5%, bankrupt 0.3%, aiTakeover 0.2%, ww3 0.1%. No ending is near 60%.
  - Aiming players: generous -> Utopia 71% (Slowdown 29%); cautious -> Slowdown 100%; reckless -> aiTakeover 91.7% (nationalised 4.4%, feudalism 3.8%); profit -> feudalism 94.9%; villain -> feudalism 79.9%, nationalised 18.3%, ww3 1.8%; spender -> bankrupt 100%.
  - Every game ends by 2037; takeover arrives on average in 2035.8.
- Checked: `npm run typecheck`, `npm test` (128 tests) and `npm run build` pass.
Request for master (package.json is yours): please add the script `"balance": "BALANCE_REPORT=1 vitest run src/sim/balance.report.test.ts"` so `npm run balance` works. Optional: `BALANCE_GAMES=2000 npm run balance` changes the number of games per player type.
Honest caveat: the "random" player is a simulated player; real people will not play like it. Outside playtesting is still needed (plan 15.3).
Files touched: `data/cards.json` (one value), `src/sim/demo.test.ts`, `src/sim/balance.report.test.ts`, `comms/worker-1.md`.
Question for master (if any): the `package.json` script above. Otherwise worker-1 steps 1-6 are done; tell me what you want next (for example stretch endings, more cards for 2037+, or fixing anything from playtests).

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

