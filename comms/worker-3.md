# worker-3 comms (worker-3 writes this file; newest entry on top)

## 2026-11-07 22:50 - STATUS: done
What I did / what I need: Followed master NEXT ACTION (2026-11-08), all 5 steps.
1. Merged origin/main into worker-3 (clean, fast-forward).
2. New `IntroScreen({ onStart, showControls? })` in src/ui/IntroScreen.tsx, exported from src/ui/index.ts: title "AI 2126", the plan-1 pitch, the plan-9.2 speculation note (+ "All companies are fictional"), Start button (autofocused). Set `showControls={false}` if the App header already shows the text-size/theme controls.
3. ReportCard has a "How this compares to real forecasts" section (plan 9.2) with links to IPCC AR6 Synthesis Report, IEA "Energy and AI" and UN World Population Prospects. Marked "General context, not a verdict on your run". It quotes NO real figures (plan 9.3); each line shows only the game's own number next to the source (temperature + sea level; regions short of power; total population). NOTE: this session's network blocks those three sites, so I could not open the links to check them; please click them once.
4. HQ background is now a layered skyline (src/ui/Skyline.tsx, also exported) that reacts to `activeCityEffects` in the company's home city: all 12 CityEffectKinds change the picture, scaled by intensity (blackout/ghostOffices switch windows off, flooding water, gridlock tail lights, protest/unrest crowd with signs, bank-run queue, surveillance drones, embargo containers, solar panels + sun, war searchlights, outbreak signs, sky tints). A "Now in <city>:" chip row lists the effects in text too. Deterministic (no Math.random), animations off with reduced motion.
5. Tests: new src/ui/screens.test.tsx (18 tests). typecheck + 110 tests + build pass. Deleted stray `src/ui/demo/screenshots$1.png`. Demo views added: #intro #crisis #sunny. Screenshots: intro, intro-dark, hq, hq-crisis, hq-crisis-dark, hq-solar, report (src/ui/demo/screenshots/).
PR: worker-3 -> main.
Files touched: src/ui/IntroScreen.tsx (new), src/ui/Skyline.tsx (new), src/ui/screens.test.tsx (new), src/ui/HQScreen.tsx, src/ui/ReportCard.tsx, src/ui/index.ts, src/ui/ui.css, src/ui/demo/**, comms/worker-3.md
Question for master (if any): none. To wire it: render `<IntroScreen onStart={...} />` before the map.

## 2026-11-07 21:30 - STATUS: done
What I did / what I need: Followed master #5. Merged origin/main into worker-3 (clean). ReportCard now shows `status.score`: a big ring with the total, bars for wellbeing / company / survival, and a one-line verdict. It handles `score` being undefined ("Score not available"), the ending title is bigger, and the score is in the share text. Duplicate controls: `Dashboard` no longer renders A11yControls by default (`showControls` defaults to false), so the dashboard screen shows only the app header's set. `HQScreen` keeps its own set because App hides the header set on HQ, and `ReportCard` shows one (`showControls`, default true) because App renders it with no header. Dropped the demo-only `title` prop from EventModal; it takes the EventLogEntry fields (headline, year, valence), which is how App already calls it, so no App change is needed. The demo now uses data/cards.json + data/events.json, with no made-up cards. Non-demo code has no demo data. typecheck + 80 tests + build pass. New screenshots in src/ui/demo/screenshots/ (report, report-dark, report-noscore, hq, event, dashboard).
Files touched: src/ui/ReportCard.tsx, src/ui/Dashboard.tsx, src/ui/EventModal.tsx, src/ui/format.ts, src/ui/format.test.ts, src/ui/ui.css, src/ui/demo/**, comms/worker-3.md
Question for master (if any): PR from worker-3 into main: I have no `gh` CLI, so the human is opening it from the compare link. Optional for src/app: if you'd rather have ONE set of controls everywhere, keep A11yControls in the App header on every screen and pass `showControls={false}` to ReportCard; HQScreen would need the same prop (say if you want it).

## 2026-11-07 18:20 - STATUS: done
What I did / what I need: Tasks 1-5 done in src/ui/ (public API: src/ui/index.ts). HQScreen(state, decisions, onChoose, companyId?, cities?, onBack?), Dashboard(state), EventModal, RaceTracker, ReportCard(state, decisions?), UiRoot + A11yControls (wrap the app in <UiRoot> so theme/text size apply). Typecheck + 8 tests pass, build passes. Demo: `npm run dev` then open /src/ui/demo/index.html (#hq #rival #dash #danger #event #report, ?theme=dark&scale=1.3). Screenshots in src/ui/demo/screenshots/. Added recharts 2.15.4 to package.json (pre-approved). PR: worker-3 -> main (needs a human to look at the screenshots).
Files touched: src/ui/**, package.json, package-lock.json, comms/worker-3.md
Question for master (if any):
1. Event pop-ups: WorldState.eventLog only has {year, eventId, headline}, so the UI can't tell which events are `popup: true` or their valence. EventModal takes headline/year/valence as props for now; src/app must look up the GameEvent by id. Want a `popup`/`valence` field on EventLogEntry instead?
2. Plan 2 says the end card shows a SCORE; contracts have none. Add `status.score` (sim computes it) and I'll show it?
3. Race tracker ranks countries by their best home lab's aiCapability (no per-country capability in contracts). OK?
4. Public trust / wealth gap on the dashboard are population-weighted averages across regions. OK?

## 2026-11-07 - STATUS: started
What I did / what I need: Read CLAUDE.md, docs/plan.md, contracts v0.1 and my TASKS.md section. Starting task 1 (HQScreen), then Dashboard, pop-ups/race tracker/report card, accessibility. Building against mockWorldState / mockDecisions. Adding `recharts` (pre-approved in DECISIONS.md) to package.json.
Files touched: comms/worker-3.md
Question for master (if any): none yet
