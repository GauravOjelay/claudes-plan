import { Suspense, lazy, useMemo, useState, type KeyboardEvent } from 'react';
import { FallbackChip, NO_WEBGL, ThreeBoundary, hasWebGL } from './ThreeFallback';
import type { CityInfo, RegionId, WorldState } from '../contracts';
import { ALL_CITIES } from './roster';
import { MAP_H, MAP_W, OTHER_LAND_PATH, REGION_LABEL_POS, REGION_NAMES, REGION_PATHS } from './geo';
import { EFFECT_INFO, clamp01, effectsForCity, fmtMoneyBn, fmtPct, fmtPeopleM } from './util';
import { METRIC_LABEL, RAMPS, rampColor, regionMetric, type MapMetric, type MapOverlay } from './mapMetrics';

export type { MapMetric, MapOverlay } from './mapMetrics';
export { rampColor, regionMetric } from './mapMetrics';

const WorldMap3D = lazy(() => import('./map3d/WorldMap3D'));

import './world.css';


export interface WorldMapProps {
  state: WorldState;
  onSelectCity: (cityId: string) => void;
  /** City list. Defaults to ALL_CITIES (contract CITIES + proposed extras in roster.ts). */
  cities?: CityInfo[];
  initialMetric?: MapMetric;
  initialOverlays?: MapOverlay[];
  /** Opens the player's HQ (decision cards). Without it the map's "make a decision" button opens the player's home city. */
  onOpenHQ?: (companyId: string) => void;
  /** '3d' (default): Apple-Maps-style interactive globe. '2d': the SVG map (also the fallback without WebGL). */
  initialMode?: '3d' | '2d';
}

export function WorldMap(props: WorldMapProps) {
  const { cities = ALL_CITIES, initialMode = '3d' } = props;
  const webgl = useMemo(hasWebGL, []);
  const [mode, setMode] = useState<'3d' | '2d'>(() => (initialMode === '3d' && webgl ? '3d' : '2d'));
  const [reason, setReason] = useState<string | null>(() => (initialMode === '3d' && !webgl ? NO_WEBGL : null));
  const [attempt, setAttempt] = useState(0);
  const retry = () => { setReason(null); setMode('3d'); setAttempt((a) => a + 1); };
  const flat = (
    <div style={{ position: 'relative' }}>
      <WorldMap2D {...props} />
      {reason && <FallbackChip reason={reason} onRetry={webgl ? retry : undefined} />}
    </div>
  );
  if (mode === '2d') return flat;
  return (
    <div className="w-root" style={{ padding: 12 }}>
      <ThreeBoundary key={attempt} fallback={flat} onError={(r) => { setReason(r); setMode('2d'); }}>
        <Suspense fallback={<div className="wm-wrap wm-loading">Loading map…</div>}>
          <WorldMap3D state={props.state} onSelectCity={props.onSelectCity} cities={cities} initialMetric={props.initialMetric} initialOverlays={props.initialOverlays} onOpenHQ={props.onOpenHQ} />
        </Suspense>
      </ThreeBoundary>
    </div>
  );
}

export function WorldMap2D({ state, onSelectCity, cities = ALL_CITIES, initialMetric = 'gdp', initialOverlays = [] }: WorldMapProps) {
  const [metric, setMetric] = useState<MapMetric>(initialMetric);
  const [overlays, setOverlays] = useState<MapOverlay[]>(initialOverlays);
  const [hover, setHover] = useState<string | null>(null);
  const [hoverRegion, setHoverRegion] = useState<RegionId | null>(null);

  const values = regionMetric(state, metric);
  const regionIds = Object.keys(REGION_PATHS) as RegionId[];
  const toggleOverlay = (o: MapOverlay) =>
    setOverlays((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]));

  const hoverCity = cities.find((c) => c.id === hover) ?? null;
  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectCity(id);
    }
  };

  return (
    <div className="w-root w-map">
      <div className="w-toolbar">
        <span className="w-label">Colour by</span>
        <div className="w-seg" role="group" aria-label="Map colour">
          {(Object.keys(METRIC_LABEL) as MapMetric[]).map((m) => (
            <button key={m} aria-pressed={metric === m} onClick={() => setMetric(m)}>
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
        <span className="w-label" style={{ marginLeft: 12 }}>Overlays</span>
        <button className="w-chip" aria-pressed={overlays.includes('energy')} onClick={() => toggleOverlay('energy')}>
          ⚡ Grid stress
        </button>
        <button className="w-chip" aria-pressed={overlays.includes('water')} onClick={() => toggleOverlay('water')}>
          💧 Water stress
        </button>
        <span className="w-label" style={{ marginLeft: 'auto' }}>Year {state.year}</span>
      </div>

      <div style={{ position: 'relative', margin: '0 12px' }}>
        <svg className="w-map-svg" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={`World map coloured by ${METRIC_LABEL[metric]}`}>
          <defs>
            <pattern id="w-hatch-energy" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="rgba(255,90,60,0.25)" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#ff5a3c" strokeWidth="3" />
            </pattern>
            <pattern id="w-dots-water" width="7" height="7" patternUnits="userSpaceOnUse">
              <circle cx="3.5" cy="3.5" r="1.6" fill="#7fd3ff" />
            </pattern>
            <pattern id="w-nodata" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <rect width="6" height="6" fill="#2b3754" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#3a4870" strokeWidth="2" />
            </pattern>
            <radialGradient id="w-ocean-glow" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#12305a" />
              <stop offset="100%" stopColor="#071226" />
            </radialGradient>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="url(#w-ocean-glow)" />
          {/* graticule */}
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={MAP_H} stroke="#ffffff" strokeOpacity={0.04} />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 100} x2={MAP_W} y2={i * 100} stroke="#ffffff" strokeOpacity={0.04} />
          ))}
          <path d={OTHER_LAND_PATH} fill="#26324a" stroke="#0a1830" strokeWidth={0.8} />

          {regionIds.map((r) => {
            const v = values[r];
            const reg = state.regions[r];
            return (
              <g key={r} onMouseEnter={() => setHoverRegion(r)} onMouseLeave={() => setHoverRegion(null)}>
                <path className="w-region" d={REGION_PATHS[r]} fill={v === null ? 'url(#w-nodata)' : rampColor(RAMPS[metric], v)}>
                  <title>{REGION_NAMES[r]}</title>
                </path>
                {overlays.includes('energy') && reg && reg.energy < 0 && (
                  <path d={REGION_PATHS[r]} fill="url(#w-hatch-energy)" opacity={0.35 + 0.65 * clamp01(-reg.energy / 20)} pointerEvents="none" />
                )}
                {overlays.includes('water') && reg && (
                  <path d={REGION_PATHS[r]} fill="url(#w-dots-water)" opacity={clamp01(reg.waterStress / 100)} pointerEvents="none" />
                )}
              </g>
            );
          })}
          {regionIds.map((r) => (
            <text key={r} className="w-region-label" x={REGION_LABEL_POS[r].x * MAP_W} y={REGION_LABEL_POS[r].y * MAP_H} textAnchor="middle">
              {r}
            </text>
          ))}

          {cities.map((c) => {
            const fx = [...effectsForCity(state, c.id).values()];
            const bad = fx.some((e) => !EFFECT_INFO[e.kind].positive);
            const ringColor = bad ? '#ff6b5b' : fx.length ? '#4fd18b' : '#5cc8ff';
            const x = c.mapPos.x * MAP_W;
            const y = c.mapPos.y * MAP_H;
            return (
              <g
                key={c.id}
                className="w-city"
                tabIndex={0}
                role="button"
                aria-label={`${c.name}${fx.length ? `, ${fx.length} active event${fx.length > 1 ? 's' : ''}` : ''}. Open city view`}
                onClick={() => onSelectCity(c.id)}
                onKeyDown={(e) => onKey(e, c.id)}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(c.id)}
                onBlur={() => setHover(null)}
              >
                {fx.length > 0 && <circle className="w-city-pulse" cx={x} cy={y} r={9} fill="none" stroke={ringColor} strokeWidth={2} />}
                <circle className="w-city-ring" cx={x} cy={y} r={10} fill="rgba(5,10,22,0.6)" stroke={ringColor} strokeWidth={2} />
                <circle cx={x} cy={y} r={4} fill="#fff" />
                <text className="w-city-name" x={x + 14} y={y + 4}>
                  {c.name}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverCity && <CityTooltip state={state} city={hoverCity} />}
        {!hoverCity && hoverRegion && state.regions[hoverRegion] && (
          <div className="w-tooltip" style={{ left: `${Math.min(70, REGION_LABEL_POS[hoverRegion].x * 100)}%`, top: `${REGION_LABEL_POS[hoverRegion].y * 100 + 4}%` }}>
            <h4>{REGION_NAMES[hoverRegion]}</h4>
            <RegionStats state={state} region={hoverRegion} />
          </div>
        )}
      </div>

      <div className="w-legend">
        <span>{METRIC_LABEL[metric]}: low</span>
        <span className="w-legend-bar" style={{ background: `linear-gradient(90deg, ${RAMPS[metric].join(',')})` }} />
        <span>high</span>
        {metric === 'gdp' && <span>(log scale)</span>}
        {metric === 'ai' && <span>(strongest lab headquartered there; hatched = no lab)</span>}
        {metric === 'tension' && <span>(world-wide: {Math.round(state.global.geopoliticalTension)}/100)</span>}
        {overlays.includes('energy') && <span>· red hatching = power shortage</span>}
        {overlays.includes('water') && <span>· blue dots = water stress</span>}
      </div>
    </div>
  );
}

function RegionStats({ state, region }: { state: WorldState; region: RegionId }) {
  const r = state.regions[region];
  return (
    <dl className="w-kv">
      <dt>GDP</dt><dd>{fmtMoneyBn(r.gdp)}</dd>
      <dt>Population</dt><dd>{fmtPeopleM(r.population)}</dd>
      <dt>Software jobs lost</dt><dd>{fmtPct(r.unemploymentSoftware)}</dd>
      <dt>Physical jobs lost</dt><dd>{fmtPct(r.unemploymentPhysical)}</dd>
      <dt>Public trust</dt><dd>{Math.round(r.publicTrust)}/100</dd>
      <dt>Energy balance</dt><dd style={{ color: r.energy < 0 ? 'var(--w-bad)' : undefined }}>{r.energy > 0 ? '+' : ''}{Math.round(r.energy)}</dd>
      <dt>Water stress</dt><dd>{Math.round(r.waterStress)}/100</dd>
    </dl>
  );
}

function CityTooltip({ state, city }: { state: WorldState; city: CityInfo }) {
  const fx = [...effectsForCity(state, city.id).values()];
  const left = Math.min(city.mapPos.x * 100 + 2, 72);
  const top = city.mapPos.y * 100 + 4;
  return (
    <div className="w-tooltip" style={{ left: `${left}%`, top: `${top}%` }}>
      <h4>{city.name}</h4>
      <div style={{ color: 'var(--w-muted)', marginBottom: 6 }}>
        {REGION_NAMES[city.region]} · {city.companyIds.length} HQ{city.companyIds.length === 1 ? '' : 's'}
      </div>
      {state.regions[city.region] && <RegionStats state={state} region={city.region} />}
      {fx.length > 0 && (
        <div className="w-effect-tags">
          {fx.map((e) => (
            <span key={e.kind} className={`w-tag${EFFECT_INFO[e.kind].positive ? ' good' : ''}`}>
              {EFFECT_INFO[e.kind].icon} {EFFECT_INFO[e.kind].label}
            </span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 6, color: 'var(--w-accent)', fontSize: '0.85em' }}>Click to open the city</div>
    </div>
  );
}
