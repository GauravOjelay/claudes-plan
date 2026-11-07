/**
 * Dev page for src/world (not part of the game). Run `npm run dev` and open /src/world/dev.html
 *   #map[?metric=gdp|ai|tension&overlays=energy,water]
 *   #city[?effect=cycle|all|none|<kind>&i=0.8]   (default: cycle through every CityEffectKind)
 *   #timeline
 * Uses mockWorldState plus a few dev-only log entries so the timeline has something to show.
 */
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CityEffectKind, WorldState } from '../contracts';
import { mockDecisions, mockWorldState } from '../contracts/mocks';
import { CityTimeline } from './CityTimeline';
import { CityView } from './CityView';
import { WorldMap, type MapMetric, type MapOverlay } from './WorldMap';
import { ALL_EFFECT_KINDS, EFFECT_INFO } from './util';

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
    { year: 2026, decisionId: 'mock-fossil-power', optionId: 'gas', companyId: 'novacore' },
    { year: 2028, decisionId: 'mock-fossil-power', optionId: 'renewables', companyId: 'helix' },
    { year: 2028, decisionId: 'mock-fossil-power', optionId: 'gas', companyId: 'silicara' },
    { year: 2030, decisionId: 'mock-fossil-power', optionId: 'renewables', companyId: 'novacore' },
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
  activeCityEffects: [
    { city: 'sf', kind: 'blackout', intensity: 0.6, sinceYear: 2027 },
    { city: 'sf', kind: 'solarBoom', intensity: 0.4, sinceYear: 2030 },
    { city: 'beijing', kind: 'surveillance', intensity: 0.7, sinceYear: 2029 },
  ],
};

function parseHash() {
  const [route, query = ''] = location.hash.replace(/^#/, '').split('?');
  return { route: route || 'city', params: new URLSearchParams(query) };
}

function withEffects(kinds: CityEffectKind[], intensity: number): WorldState {
  return { ...devBase, activeCityEffects: kinds.map((kind) => ({ city: 'sf', kind, intensity, sinceYear: 2029 })) };
}

function Dev() {
  const [{ route, params }, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  const effectParam = params.get('effect') ?? 'cycle';
  const [intensity, setIntensity] = useState(Number(params.get('i') ?? 0.8));
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState('');
  useEffect(() => {
    if (effectParam !== 'cycle' || paused) return;
    const id = setInterval(() => setTick((t) => t + 1), 2500);
    return () => clearInterval(id);
  }, [effectParam, paused]);

  const kinds: CityEffectKind[] =
    effectParam === 'cycle' ? [ALL_EFFECT_KINDS[tick % ALL_EFFECT_KINDS.length]]
    : effectParam === 'all' ? ALL_EFFECT_KINDS
    : effectParam === 'none' ? []
    : effectParam === 'demo' ? []
    : [effectParam as CityEffectKind];
  const state = effectParam === 'demo' ? devBase : withEffects(kinds, intensity);
  const nav = (h: string) => (location.hash = h);

  return (
    <div style={{ background: '#0b1220', minHeight: '100vh', color: '#e7ecf5', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{ display: 'flex', gap: 8, padding: 10, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid #2a3a5c' }}>
        <strong>src/world dev</strong>
        <button onClick={() => nav('#map')}>Map</button>
        <button onClick={() => nav('#city?effect=cycle')}>City: cycle effects</button>
        <button onClick={() => nav('#city?effect=demo')}>City: demo state</button>
        <button onClick={() => nav('#timeline')}>Timeline</button>
        {route === 'city' && effectParam !== 'demo' && (
          <>
            <select value={effectParam} onChange={(e) => nav(`#city?effect=${e.target.value}&i=${intensity}`)}>
              <option value="cycle">cycle</option>
              <option value="all">all at once</option>
              <option value="none">none</option>
              {ALL_EFFECT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <label>intensity <input type="range" min={0} max={1} step={0.05} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} /> {intensity.toFixed(2)}</label>
            {effectParam === 'cycle' && <button onClick={() => setPaused((p) => !p)}>{paused ? 'play' : 'pause'}</button>}
            <span style={{ color: '#ffb547' }}>{kinds.map((k) => EFFECT_INFO[k].label).join(', ')}</span>
          </>
        )}
        <span style={{ marginLeft: 'auto', color: '#93a0ba' }}>{log}</span>
      </nav>
      {route === 'map' && (
        <WorldMap state={devBase} onSelectCity={(id) => { setLog(`onSelectCity(${id})`); nav(`#city?effect=demo`); }}
          initialMetric={(params.get('metric') as MapMetric) ?? 'gdp'}
          initialOverlays={(params.get('overlays')?.split(',').filter(Boolean) as MapOverlay[]) ?? []} />
      )}
      {route === 'city' && (
        <CityView state={state} cityId={params.get('city') ?? 'sf'} decisions={mockDecisions}
          onSelectCompany={(id) => setLog(`onSelectCompany(${id})`)} onBack={() => nav('#map')} />
      )}
      {route === 'timeline' && <CityTimeline state={devBase} cityId="sf" decisions={mockDecisions} onScrub={(y) => setLog(`onScrub(${y})`)} />}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dev />
  </StrictMode>,
);
