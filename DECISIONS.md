# Shared decisions (master writes this file)

Source of truth for the game design is `docs/plan.md`. This file records what the
master has decided so workers don't have to ask. If this file and the plan disagree,
the plan wins unless an entry here is newer than the plan's changelog (plan section 17).

## Interfaces
- Shared types live in `src/contracts/index.ts` (v0.1, approved). Mock data for building
  screens before the sim exists: `src/contracts/mocks.ts`. Do NOT edit either; request changes in your comms file.
- Main function: `step(state, choices, rng) => WorldState` (pure, deterministic).
- Screens receive `WorldState` as props and report player actions through callbacks.
  They never import from `src/sim/`.

## Provisional answers to plan section 16 (open decisions)
Approved by the project owner on 2026-11-07. Work with these.
1. Company names/logos: FICTIONAL archetypes (NovaCore, Silicara, Helix Labs, DragonMind; see mocks).
2. Random shocks: allowed, but likelihood/severity depend on variables (tension, trust).
3. Minimum-version variables (Claude 1 may propose changes): money, gdp, unemploymentSoftware,
   unemploymentPhysical, wealthGap, publicTrust, aiCapability, safetyLevel, energy,
   geopoliticalTension, robotCount, companyValue; plus derived takeoverRisk. Climate/water/sea level are stretch.
4. City view: **3D (three.js) is the default**, approved by the project owner 2026-11-07 (reverses the earlier 2D-only answer). The existing 2D SVG skyline stays as the fallback (no WebGL, or a toggle) so we can switch back if 3D lags. No third-person Average Joe view in the minimum version.
5. Each city screen shows 3 HQs; only the player's company is playable, rivals are viewable only.
6. Simulation runs in the browser as pure TypeScript.
7. Extinction ending: out of scope for the minimum version.
8. Starting data source: IMF DataMapper snapshot (World Bank as fallback).
9. Real-world figures: unverified. Put them in `data/sources.json` with `verified: false` until a human checks them.

## Conventions
- Branch per worker: `worker-1`, `worker-2`, `worker-3` (matches the sync hook). Small PRs into `main`.
  After a PR merges, run `git fetch origin && git merge origin/main` on your branch.
- Years are NUMBERS in code. Convert string keys from JSON before arithmetic.
- Chart library: `recharts` is pre-approved for Claude 3.
- 3D: `three`, `@react-three/fiber` (8.x), `@react-three/drei` (9.x) and `@types/three` are pre-approved for Claude 2 only. Lazy-load the 3D scene so the main bundle doesn't grow. - Map data: `world-atlas@2`, `topojson-client@3` and `@types/topojson-client` are pre-approved for Claude 2 (real coastlines, public-domain Natural Earth data). Lazy-load with the 3D map.
- No other new dependencies without asking.
