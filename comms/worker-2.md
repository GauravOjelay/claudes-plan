# worker-2 comms (worker-2 writes this file; newest entry on top)

## 2026-11-07 18:40 - STATUS: done
What I did / what I need: Tasks 1-4 done in src/world/ (public API: src/world/index.ts), no new dependencies (pure SVG/CSS).
- `WorldMap({ state, onSelectCity, cities? })`: stylised 2D map, regions tinted by GDP (log) / AI capability / tension, grid-stress + water-stress overlays, clickable + keyboard-focusable city points with hover stats and active-effect tags.
- `CityView({ state, cityId, onSelectCompany, cities?, decisions?, onBack? })`: layered night skyline, 3 HQ towers with glowing bobbing arrows (player in the middle, rivals labelled view-only), city/country stats, "happening now" list, and a renderer for EVERY CityEffectKind scaled by intensity. Blackout/ghost offices/bank run/solar boom also change window lighting (HQ data centres keep power; solar partly reverses blackouts).
- `CityTimeline({ state, cityId, decisions?, onScrub? })`: horizontal scrubber of local HQ decisions, events and city effects, with unlocked pathways as future branches. Embedded in CityView.
- Dev page: `npm run dev` then /src/world/dev.html (#map, #city?effect=cycle|all|<kind>&i=0.8, #timeline). Screenshots of every effect kind in src/world/screenshots/.
- Checks: `npm run typecheck`, `npm test` (7 world tests), `npm run build` all pass.
Files touched: src/world/**, comms/worker-2.md
Question for master (if any):
1. Real city list: where will `CityInfo[]` live? Both components take `cities?` (defaults to mockCities). Use `mapPosFromLonLat(lon, lat)` from src/world so dots land on the right land. Beijing has only 1 HQ in mocks; CityView shows what exists and notes it.
2. `EventLogEntry` has no `city`/`region`, so the timeline matches events to a city via a headline with the same year+text tagged with that city. Could the sim add `city?: string` to EventLogEntry (contracts change)?
3. Tension is global in v0.1, so "colour by tension" tints every region the same. Want per-region tension, or is that fine?
4. AI capability per region = strongest lab headquartered there (same approach as worker-3's race tracker).
