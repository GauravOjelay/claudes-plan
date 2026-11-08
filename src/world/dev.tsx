/**
 * Dev page for src/world (not part of the game). Run `npm run dev` and open /src/world/dev.html
 *   #map                       live globe with the event demo
 *   #city?city=lagos           live 3D city with the event demo (any city id)
 *   #city?effect=<kind>&i=0.8  one effect, fixed intensity (for screenshots); effect=all | none | cycle | demo
 *   #timeline?city=sf
 *   add &mode=2d inside the hash for the 2D fallback, and ?fps=0 in the page URL to hide the fps chip.
 * Uses mockWorldState plus a few dev-only log entries so the timeline has something to show.
 */
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CityEffectKind, WorldState } from '../contracts';
import { mockDecisions, mockJoe, mockWorldState } from '../contracts/mocks';
import type { JoeSituation } from '../contracts';
import { CityTimeline } from './CityTimeline';
import { CityView } from './CityView';
import { useEventDemo } from './demo';
import { ALL_CITIES } from './roster';
import { ALL_EFFECT_KINDS, EFFECT_INFO } from './util';
import { WorldMap, type MapMetric, type MapOverlay } from './WorldMap';
import './dev.css';

const devBase: WorldState = {
  ...mockWorldState,
  year: 2031,
  regions: {
    ...mockWorldState.regions,
    US: { ...mockWorldState.regions.US, energy: -12, waterStress: 55 },
    GULF: { ...mockWorldState.regions.GULF, gdp: 2400, waterStress: 90 },
    IN: { ...mockWorldState.regions.IN, gdp: 4200, population: 1450, energy: -6, waterStress: 70 },
    EU: { ...mockWorldState.regions.EU, gdp: 19000, population: 450 },
    AFRICA: { ...mockWorldState.regions.AFRICA, gdp: 3000, population: 1500, waterStress: 65 },
  },
  choiceLog: [
    { year: 2026, decisionId: 'mock-fossil-power', optionId: 'gas', companyId: 'closedai' },
    { year: 2028, decisionId: 'mock-fossil-power', optionId: 'renewables', companyId: 'helix' },
    { year: 2028, decisionId: 'mock-fossil-power', optionId: 'gas', companyId: 'silicara' },
    { year: 2030, decisionId: 'mock-fossil-power', optionId: 'renewables', companyId: 'closedai' },
  ],
  eventLog: [
    { year: 2027, eventId: 'blackout-belt', headline: 'Rolling blackouts spread across the Bay as campus demand spikes', valence: 'negative', popup: true, city: 'sf' },
    { year: 2030, eventId: 'breakthrough-year', headline: 'Open materials model halves solar panel costs', valence: 'positive', popup: true, city: 'sf' },
  ],
  headlines: [
    ...mockWorldState.headlines,
    { year: 2027, text: 'Rolling blackouts spread across the Bay as campus demand spikes', city: 'sf' },
    { year: 2030, text: 'Open materials model halves solar panel costs', city: 'sf' },
    { year: 2029, text: 'Office vacancy hits record as agents take over back-office work', city: 'sf' },
  ],
  unlockedPathways: ['ubi-pilot', 'fusion-bet'],
  activeCityEffects: [],
};

function parseHash() {
  const [route, query = ''] = location.hash.replace(/^#/, '').split('?');
  return { route: route || 'map', params: new URLSearchParams(query) };
}

const cityNames = Object.fromEntries(ALL_CITIES.map((c) => [c.id, c.name]));

function Dev() {
  const [{ route, params }, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const nav = (h: string) => (location.hash = h);

  const cityId = params.get('city') ?? 'sf';
  const effectParam = params.get('effect') ?? 'live';
  const [intensity, setIntensity] = useState(Number(params.get('i') ?? 0.8));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (effectParam !== 'cycle') return;
    const id = setInterval(() => setTick((t) => t + 1), 6000);
    return () => clearInterval(id);
  }, [effectParam]);

  const live = effectParam === 'live';
  const kindsKey =
    effectParam === 'cycle' ? ALL_EFFECT_KINDS[tick % ALL_EFFECT_KINDS.length]
    : effectParam === 'all' ? ALL_EFFECT_KINDS.join(',')
    : ['none', 'live', 'demo'].includes(effectParam) ? ''
    : effectParam;
  const fixed = useMemo<WorldState>(() => {
    if (effectParam === 'demo') {
      return { ...devBase, activeCityEffects: [{ city: 'sf', kind: 'blackout', intensity: 0.6, sinceYear: 2027 }, { city: 'sf', kind: 'solarBoom', intensity: 0.4, sinceYear: 2030 }] };
    }
    const kinds = kindsKey ? (kindsKey.split(',') as CityEffectKind[]) : [];
    return { ...devBase, activeCityEffects: kinds.map((kind) => ({ city: cityId, kind, intensity, sinceYear: 2029 })) };
  }, [effectParam, kindsKey, intensity, cityId]);
  const demo = useEventDemo(fixed, {
    enabled: live,
    cityIds: ALL_CITIES.map((c) => c.id),
    cityNames,
    focusCity: route === 'city' ? cityId : undefined,
    seed: `dev:${route}:${cityId}`,
  });
  const state = live ? demo : fixed;
  const mode = params.get('mode') === '2d' ? '2d' : '3d';
  const view = params.get('view') === 'joe' ? 'joe' : 'city';
  const situation = (params.get('situation') ?? mockJoe.situation) as JoeSituation;
  const joe = { ...mockJoe, cityId, situation };

  return (
    <div className="dev">
      <header className="dev-bar">
        <strong className="dev-brand">AI 2126 <span>world dev</span></strong>
        <nav className="dev-tabs" aria-label="Screens">
          <button aria-current={route === 'map'} onClick={() => nav('#map')}>Globe</button>
          <button aria-current={route === 'city'} onClick={() => nav(`#city?city=${cityId}`)}>City</button>
          <button aria-current={route === 'timeline'} onClick={() => nav(`#timeline?city=${cityId}`)}>Timeline</button>
        </nav>
        <label className="dev-field">
          City
          <select value={cityId} onChange={(e) => nav(`#${route === 'map' ? 'city' : route}?city=${e.target.value}`)}>
            {ALL_CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {route === 'city' && (
          <>
            <label className="dev-field">
              Events
              <select value={effectParam} onChange={(e) => nav(`#city?city=${cityId}&effect=${e.target.value}&i=${intensity}`)}>
                <option value="live">Live demo</option>
                <option value="cycle">Cycle kinds (6 s)</option>
                <option value="all">All at once</option>
                <option value="none">None</option>
                {ALL_EFFECT_KINDS.map((k) => <option key={k} value={k}>{EFFECT_INFO[k].label}</option>)}
              </select>
            </label>
            {!live && (
              <label className="dev-field">
                Intensity
                <input type="range" min={0} max={1} step={0.05} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
                <output>{Math.round(intensity * 100)}%</output>
              </label>
            )}
          </>
        )}
        {route === 'city' && (
          <label className="dev-field">
            Joe
            <select value={view === 'joe' ? situation : ''} onChange={(e) => nav(e.target.value ? `#city?city=${cityId}&view=joe&situation=${e.target.value}` : `#city?city=${cityId}`)}>
              <option value="">(city view)</option>
              {(['prosperous', 'normal', 'struggling', 'blackout', 'protests', 'flood', 'war', 'surveillance', 'outbreak'] as JoeSituation[]).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        )}
        <span className="dev-live" data-on={live}>{live ? 'Live event demo' : 'Fixed effects'}</span>
      </header>

      {route === 'map' && (
        <WorldMap state={state} cities={ALL_CITIES} onSelectCity={(id) => nav(`#city?city=${id}`)}
          onOpenHQ={() => nav(`#city?city=${devBase.companies.find((c) => c.id === devBase.playerCompanyId)?.homeCity ?? 'sf'}`)}
          initialMetric={(params.get('metric') as MapMetric) ?? undefined}
          initialOverlays={(params.get('overlays')?.split(',').filter(Boolean) as MapOverlay[]) ?? []} initialMode={mode} />
      )}
      {route === 'city' && (
        <CityView key={`${cityId}:${mode}:${view}:${situation}`} state={state} cityId={cityId} cities={ALL_CITIES} decisions={mockDecisions}
          onSelectCompany={() => undefined} onBack={() => nav('#map')} initialMode={mode} joe={joe} initialView={view} />
      )}
      {route === 'timeline' && <CityTimeline state={devBase} cityId={cityId} cities={ALL_CITIES} decisions={mockDecisions} />}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dev />
  </StrictMode>,
);
