# Demo script: "one early decision, a big consequence years later" (plan 11.3)

**Length:** about 3 minutes. **Seed:** `44`. **Open:** `http://localhost:5173/?seed=44` (after `npm run dev`).
**One-click links** (replay links, see the next section): the main run parked on any year, the what-if, and the end report.
Locked by `src/sim/demo.lock.test.ts` and `data/demo.json`: if anyone retunes the sim or reorders `data/cards.json` and the demo breaks, that test fails.
**Checked on screen:** years 2026 to 2029 were played in the real app on 2026-11-08 and matched this script (cards, options, alerts, money 492 / 483 / 413), and 2026 to 2028 were played again after the "round recap" change (the city opens by itself, floating Continue banner, both alerts, both chips). Years 2030 onwards follow the same steps and are locked by the test, but have not been clicked through by hand.
**Replay links checked in the real app on 2026-11-08:** the what-if link lands on 2032 in San Francisco with the Continue banner and the card "What does the lab work on?"; the main report link opens the Abundance Utopia report (69); a wrong option shows a red note with the valid options.

## Replay links (jump straight to a year)

`/?seed=44&replay=<choices>&at=<year>` opens the game with those choices already played, so you never have to click through to get to the what-if or the end. It lands exactly where pressing **End <year>** would: in your home city (San Francisco), with that year's alert and the floating **"Continue to <year> →"** banner. (The intro and "How to play" are skipped.) The list has **one entry per year**, starting in 2026: the option id for the card your HQ shows that year, or `-` for no decision. `at=<year>` stops before that year is played; `at=end` plays on to the ending (the report card opens). Add `+cancer:optionId` to also decide for another company that year. If a link is wrong, a red note at the bottom says where it stopped and lists the valid options. Replays are the real sim: they match clicking through.

| What you want | Link (after `npm run dev`) |
|---|---|
| **Parked on 2029** of the main run (the solar-boom beat just happened) | `http://localhost:5173/?seed=44&replay=fastTrack,openMaterials,clean&at=2029` |
| **Parked on 2032, what-if** (open this in a second tab; pick the card, press End 2032 and the blackout comes back) | `http://localhost:5173/?seed=44&replay=fastTrack,keepMaterials,clean,backUbi,buildSafeguards,treaty&at=2032` |
| **The what-if report** (Slowdown, score about 67) | `http://localhost:5173/?seed=44&replay=fastTrack,keepMaterials,clean,backUbi,buildSafeguards,treaty,fundScience,pauseAndFix,controlledRobots,humansInLoop,acceptRules&at=end` |
| **The main run's report** (Abundance Utopia, score about 69) | `http://localhost:5173/?seed=44&replay=fastTrack,openMaterials,clean,backUbi,buildSafeguards,treaty,pauseAndFix,fundScience,controlledRobots,humansInLoop,acceptRules&at=end` |
| The main run, all years, parked after the last card (2036 to answer) | `http://localhost:5173/?seed=44&replay=fastTrack,openMaterials,clean,backUbi,buildSafeguards,treaty,pauseAndFix,fundScience,controlledRobots,humansInLoop&at=2036` |

Locked by `src/sim/replay.test.ts` (the links above are built from `data/demo.json` and the test fails if the story changes).

## The story in one breath

You fast-track a giant data centre in 2026. The grid can't take it and **San Francisco goes dark**. Next year you **open-source a materials model**. A year later **solar spreads across the rooftops and the blackout fades**. Your choices keep paying off until 2036, and the world you made is an **Abundance Utopia**. Then the twist: *change just the one decision to open-source, and the blackout comes back in 2032 and the world ends up somewhere else.*

## The one rule of every year

1. **Your HQ** has one card on screen. **Click the option** from the table below. (The card also takes the ← → keys.)
2. The card says "No decisions waiting" and the top-right button now reads **"End 2026 →"** (it shows the current year). **Click it.**
3. The app now jumps to **your home city, San Francisco**, by itself. If something happened, an **alert** pops up over the city: read it out, press **Continue** in the alert. This is where you talk and point at the skyline and the numbers.
4. When you are ready, click the floating **"Continue to 2027 →"** banner at the bottom of the screen. It takes you back to Your HQ with the next card.

Since 2026-11-08 you could decide for all 17 companies, but the demo uses **ClosedAI only**: after you pick the option, the top bar also shows a small yellow "Decide for more companies" button. **Ignore it** and click the blue "End <year> →". (The score averages every company's success, 51 of them now, so the "companies" part is lower than it was with one company: about 49.)

Never click **"Skip year"** (the small grey button next to the yellow "Make your … decision →" button): it throws the year away without answering and breaks the script. You never need the top-bar tabs during the run, except to open **Your HQ** the first time (or the yellow "Make your 2026 decision →" button, or the "Your move" button on the city screen).

## Before you go on stage (2 minutes)

1. `npm run dev`, open `/?seed=44` in the browser you will present in. The seed is in the URL; reloading starts the same game again.
2. Click **Start**. A "How to play" box appears (three steps: Make decisions, Look around, End the year); press **Got it**. It matches the flow below.
3. **Graphics:** the 3D globe and city need a moment to load the first time (it can feel stuck for a few seconds), then run smoothly on a normal machine (60 fps on the test machine). On a machine without a graphics card use the **2D** toggle at the top right of the City screen and the 2D map. The script is the same.
4. **If you click a wrong option, reload the page and start again;** it takes 10 seconds.
5. **Optional twist tab** (the "what if"): open a second tab with the **what-if link** above (parked on 2032). No clicking needed.
6. The real figures (US GDP, population, unemployment) come from IMF 2026 projections and are **not yet verified** (`data/VERIFY.md`). Don't read them out as facts.

## Which screen shows what

- **Your HQ:** the card, the company panel (Money, Company value, AI capability, Safety level, Public trust), "Breaking" news, and a line "Now in San Francisco:" with chips such as *Blackouts* and *Solar boom*.
- **City (San Francisco)** opens by itself after every "End <year>". It has the skyline with the effects, a "Happening now" list with strength bars, and a **United States** panel in the corner of the picture. The panel starts small (GDP, Population, Software jobs lost, Public trust); **click its title to expand it** (adds Wealth gap, Energy balance, Water stress, Regulation, World tension). **Switch to "Night"** (top right of the picture): dark districts show the blackout best.
- **Dashboard:** world-wide numbers only (World GDP, software jobs lost, "Geopolitical tension", "Public trust in AI", wealth gap). Use it for tension. US trust and wealth gap are on the City screen, not here.

## Run of show

| Time | Year | Card on screen | Click | Then "End <year> →". What you see in the city | Say out loud |
|---|---|---|---|---|---|
| 0:00 | 2026 | **A giant data-centre campus** | **Fast-track the campus** | Orange alert: *"Rolling blackouts hit San Francisco districts as the new data-centre campus overloads the grid."* Now 2027 and the city opens by itself. Switch to **Night**: dark districts, "Blackout belt" chip and entry in *Happening now*. Expand the US panel: **Public trust 60 → 52, Energy balance 5 → −10**. HQ later: money 492, "Now in San Francisco: Blackouts". | "It is 2026 and I run an AI lab. My board wants a giant data centre, fast. I say yes. Watch San Francisco." *(City, Night)* "One decision and the lights go out. Trust drops from 60 to 52." Then press Continue to 2027. |
| 0:45 | 2027 | **A materials-science model** | **Open-source it** (left) | No alert. Blackout still on (0.5). | "My lab built a model that makes solar panels cheaper. I could sell it. I give it away. It costs me today and I don't know what it buys." |
| 1:00 | 2028 | **Where does the power come from?** (four options) | **Invest in clean power** (second) | Green alert: *"BREAKTHROUGH · 2028: Solar panels spread across rooftops as an open materials model slashes their cost, easing the grid."* Now 2029 and the city opens by itself: the picture shows two chips, **Solar boom** and **Blackout belt**, and *Happening now* lists the solar boom (0.35) next to the shrinking blackout (0.4). US public trust 53. | "A year later the free model has done its work: solar everywhere." *(point at both effects in Happening now)* "My decision in 2027 is repairing my mistake from 2026." |
| 1:35 | 2029 | **When the jobs go** | **Back universal basic income** | No alert. In the city, expanded US panel: **Wealth gap 50 → 38**. Solar boom up to 0.7, blackout down to 0.3. | "AI is taking software jobs. I back a basic income. Inequality drops." |
| 1:50 | 2030 | **Safeguards before launch** | **Build in safeguards** | Green alert: *"An independent audit praises your safeguards…"*. Blackout gone from the city; US energy balance +6. | "Safety costs me speed. An outside audit praises it." |
| 2:00 | 2031 | **An international AI treaty** | **Back the treaty** | No alert. **Dashboard**: Geopolitical tension 35 → 22. | "I back the treaty. World tension drops." |
| 2:10 | 2032 | **A misalignment warning** | **Pause and fix it** | Green alert: *"Leading powers sign a first AI treaty…"*. | "My AI is hiding something in tests. I stop and fix it." |
| 2:20 | 2033 | **What does the lab work on?** | **Fund disease and space research** | Green alert: *"AI-designed treatments clear early trials…"*. | "Science over profit." |
| 2:28 | 2034-36 | **The robotics rollout**, then **Who holds the controls?**, then **Regulators are circling** | **Limit them to controlled industries**, **Keep humans in the loop**, **Accept the rules** | No alerts. The solar boom stays on the skyline, fading slowly (0.4 → 0.2). The game ends after the 2036 card. | "Three quick ones: robots only where they're safe, humans stay in charge, I work with regulators." |
| 2:45 | 2037 | **Report card** | none | **Abundance Utopia**, score about **69** (wellbeing 67, companies 49, survival 91). | "2036. Abundance Utopia. And it began with two decisions in 2026 and 2027." |

## The twist (about 30 seconds; use the parked second tab)

Switch to the second tab (the what-if link, parked on 2032: press **Continue to 2032**, pick **Fund disease and space research**, press **End 2032**). Say: "Same world, same seed, same choices, with one change in 2027: **I kept the model proprietary.** No solar boom. And look at 2032:" (the city opens by itself; Night) **the blackout is back** (new alert, strength 0.6). "Five years later the grid is still short, trust is down at 46, and the world ends as a **Slowdown** instead of a Utopia. One early decision, five years of difference."

What the what-if run shows (all locked by the test):

| Year | What differs from the main run |
|---|---|
| 2027 | Pick **Keep it proprietary** (right option; money +40 instead of an open-source option that costs nothing now) |
| 2028 | No Breakthrough year. US energy balance stays at −10, the blackout fades slowly |
| 2031 | Energy balance −2 and still short; the old blackout is almost gone (0.1) |
| 2032 | **Second Blackout belt alert**, blackout back to 0.6. The card shown this year is **What does the lab work on?** (the misalignment card needs more capability and comes a year later) |
| 2033-36 | Blackout lingers (0.5 → 0.2), US public trust 44-50 (main run: 62-68) |
| End | **Slowdown**, score about 67 (main run: Utopia, about 69) |

## The exact options, in order (also in `data/demo.json`)

| Year | Card | Pick |
|---|---|---|
| 2026 | A giant data-centre campus | **Fast-track the campus** |
| 2027 | A materials-science model | **Open-source it** *(what-if: Keep it proprietary)* |
| 2028 | Where does the power come from? | **Invest in clean power** |
| 2029 | When the jobs go | **Back universal basic income** |
| 2030 | Safeguards before launch | **Build in safeguards** |
| 2031 | An international AI treaty | **Back the treaty** |
| 2032 | A misalignment warning | **Pause and fix it** |
| 2033 | What does the lab work on? | **Fund disease and space research** |
| 2034 | The robotics rollout | **Limit them to controlled industries** |
| 2035 | Who holds the controls? | **Keep humans in the loop** |
| 2036 | Regulators are circling | **Accept the rules** |

## If something goes wrong

- **An alert doesn't appear on time:** the sim is deterministic for this seed, so it is the wrong seed or a wrong click. Reload `/?seed=44`.
- **You see a different card than the table says:** you changed an earlier option. Reload and start again.
- **You pressed "Skip year" before picking:** reload and start again.
- **You land on the HQ instead of the city, or the city does not open:** you pressed something else; use the "Your move" button on the city screen to get to the HQ.
- **Money:** you start with 500 and finish with about 120. Don't swap in the costly options (for example "Build your own power plant" costs 150, "Launch a moonshot research programme" costs 120): with more spending the company gets close to bankruptcy and the game can end early.
- **Time:** the long beats are 2026 (blackout) and 2028 (solar boom). Everything between can go fast.

## Known limitations

- The HQ screen shows **only one card per year** (the first available, in `data/cards.json` order). That is why the card order above is fixed, and why only about 11 of the 21 cards appear in a run. Balance (all seven endings reachable in this flow) is measured by `BALANCE_REPORT=1 npx vitest run src/sim/balance.report.test.ts`, mode 'first'.
- City effects have different lifetimes (`src/sim/cityEffects.ts`): a blackout hits at once and lingers until the grid is repaired, a solar boom builds for a year and stays several years, protests are short. Several effects can be on one skyline together.
- Starting GDP, population and unemployment are IMF 2026 projections and not yet verified. Everything else (trust, safety, wealth gap, tension, capability, robots) is game-designed.
