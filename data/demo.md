# Demo script: "one early decision, a big consequence years later" (plan 11.3)

**Length:** about 2 min 30 s. **Seed:** `44`. **Open:** `http://localhost:5173/?seed=44` (after `npm run dev`).
Everything below is locked by `src/sim/demo.lock.test.ts` and `data/demo.json`: if anyone retunes the sim or reorders `data/cards.json` and the demo breaks, that test fails.

## The story in one breath

You fast-track a giant data centre in 2026. The grid can't take it and **San Francisco goes dark**. Next year you **open-source a materials model**. Two years on, **solar spreads across the rooftops and the blackout fades**. Your choices keep paying off until 2036, and the world you made is an **Abundance Utopia**. Then the twist: *change just the one decision to open-source, and the blackout comes back in 2032 and the world ends up somewhere else.*

## Before you go on stage (2 minutes)

1. `npm run dev`, open `/?seed=44` in the browser you will present in. The seed is in the URL; reloading starts the same game again.
2. If the 3D view is slow on the demo machine, switch to the 2D city/map the app offers. The script works the same.
3. **Do not click "Skip year".** The script answers one card every year, in this order. If you click a wrong option, reload the page and start again; it takes 10 seconds.
4. **Optional twist tab** (the "what if"): open a second tab at `/?seed=44` and pre-play it with the same options **except** pick **"Keep it proprietary"** on the materials card in 2027 (table at the end). Park it on 2032.
5. Real figures (US GDP and so on) come from IMF 2026 projections and are **not yet verified** (`data/VERIFY.md`). Don't read them out as facts.

## How the app flows (what you click)

Intro screen: **Start** → World map: **click San Francisco** → City: the arrow to **NovaCore** or the **Your HQ** header button → the card appears; **click an option**. The year then advances by itself. After a choice, close any pop-up, then click **City** in the header whenever the script says "look at the city". The HQ screen shows one card per year; it is always the one in the table below.

## Run of show

| Time | Year | Card on screen | Click | What appears | Say out loud |
|---|---|---|---|---|---|
| 0:00 | 2026 | **A giant data-centre campus** | **Fast-track the campus** | Pop-up (red): *"Rolling blackouts hit San Francisco districts as the new data-centre campus overloads the grid."* Now 2027. Header **City**: the SF skyline with the **blackout** (strength 0.6). **Dashboard**: US public trust 60 → 52. | "It is 2026 and I run an AI lab. My board wants a giant data centre, fast. I say yes. Watch San Francisco." *(open City)* "One decision, and the lights go out. Trust falls from 60 to 52." |
| 0:35 | 2027 | **A materials-science model** | **Open-source it** | No pop-up. Blackout still on (0.5). | "My lab built a model that makes solar panels cheaper. I could sell it. I give it away. It costs me money today and I don't know what it buys." |
| 0:50 | 2028 | **Where does the power come from?** | **Invest in clean power** | Pop-up (green): *"Solar panels spread across rooftops as an open materials model slashes their cost, easing the grid."* Now 2029. **City**: the **solar boom** appears (strength 0.35) next to the shrinking blackout (0.4). One year later the boom has grown to 0.7 and the blackout is down to 0.3: two effects on screen at once. | "Two years later the free model has done its work: solar everywhere. The blackout I caused is going away." *(open City: both effects on screen)* "My decision in 2027 repaired my mistake from 2026." |
| 1:20 | 2029 | **When the jobs go** | **Back universal basic income** | No pop-up. Wealth gap falls 50 → 38 on the **Dashboard**. | "AI is taking software jobs. I back a basic income. Inequality drops." |
| 1:30 | 2030 | **Safeguards before launch** | **Build in safeguards** | Pop-up (green): *"An independent audit praises your safeguards..."* Blackout gone from the city; grid positive. | "Safety costs me speed. An outside audit praises it." |
| 1:40 | 2031 | **An international AI treaty** | **Back the treaty** | No pop-up. Tension 35 → 22 on the **Dashboard**. | "I back the treaty. World tension drops." |
| 1:50 | 2032 | **A misalignment warning** | **Pause and fix it** | Pop-up (green): *"Leading powers sign a first AI treaty..."* | "My AI is hiding something in tests. I stop and fix it." |
| 2:00 | 2033 | **What does the lab work on?** | **Fund disease and space research** | Pop-up (green): *"AI-designed treatments clear early trials..."* | "Science over profit." |
| 2:08 | 2034-36 | **The robotics rollout**, then **Who holds the controls?**, then **Regulators are circling** | **Limit them to controlled industries**, **Keep humans in the loop**, **Accept the rules** | No pop-ups. The solar boom stays on the skyline, fading slowly (0.4 → 0.2). Game ends after the 2036 card. | "Three quick ones: robots only where they're safe, humans stay in charge, I work with regulators." |
| 2:20 | 2037 | **Report card** | none | **Abundance Utopia**, score about **72** (wellbeing 67, company 62, survival 91). | "2036. Abundance Utopia. And it began with two decisions in 2026 and 2027." |

## The twist (about 30 seconds; use the parked second tab)

Switch to the second tab, parked on 2032. Say: "Same world, same seed, same choices, with one change in 2027: **I kept the model proprietary.** No solar boom. And look at 2032:" (City) **the blackout is back** (new red pop-up, strength 0.6). "Five years later the grid is still short, trust is down at 46, and the world ends as a **Slowdown** instead of a Utopia. One early decision, five years of difference."

What the what-if run shows (all locked by the test):

| Year | What differs from the main run |
|---|---|
| 2027 | Pick **Keep it proprietary** (money +40 instead of -30 for the open-source option) |
| 2028 | No Breakthrough year. US energy stays at -10, the blackout fades slowly |
| 2031 | Energy -2 and still short; the old blackout is almost gone (0.1) |
| 2032 | **Second Blackout belt pop-up**, blackout back to 0.6. The "A misalignment warning" card does not appear this year (it needs more capability), so the screen shows **What does the lab work on?** instead |
| 2033-36 | Blackout lingers (0.5 → 0.2), US trust 44-50 (main run: 62-68) |
| End | **Slowdown**, score about 69 (main run: Utopia, about 72) |

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

- **A pop-up doesn't appear on time:** the sim is deterministic for this seed, so it is the wrong seed or a wrong click. Reload `/?seed=44`.
- **You see a different card than the table says:** you changed an earlier option. Reload and start again.
- **Money:** you start with 500 and finish with about 120. Don't swap in the costly options (for example "Build abundant clean energy" costs 80): with more spending the company gets close to bankruptcy and the game can end early.
- **Time:** the long beats are 2026 (blackout) and 2028 (solar boom). Everything between can go fast.

## Known limitations

- The HQ screen shows **only the first available card each year** (in `data/cards.json` order), and the lead decided to keep it that way. That is why the card order above is fixed, and why only about 11 of the 21 cards appear in a run. Balance (all seven endings reachable in this flow) is measured by `BALANCE_REPORT=1 npx vitest run src/sim/balance.report.test.ts`, mode 'first'.
- City effects now have different lifetimes (`src/sim/cityEffects.ts`): a blackout hits at once and lingers until the grid is repaired, a solar boom builds for a year and stays several years, protests are short. Several effects can be on one skyline together.
- Starting GDP, population and unemployment are IMF 2026 projections and not yet verified. Everything else (trust, safety, wealth gap, tension, capability, robots) is game-designed.
