import { Suspense, lazy, useMemo, useState, type KeyboardEvent } from 'react';
import type { AverageJoe, CityEffect, CityEffectKind, CityInfo, Company, Decision, WorldState } from '../contracts';
import { mockJoe } from '../contracts/mocks';
import { CRASHED, FallbackChip, NO_WEBGL, ThreeBoundary, hasWebGL } from './ThreeFallback';
import { ALL_CITIES } from './roster';
import { CityTimeline } from './CityTimeline';
import { EFFECT_RENDERERS } from './effects';
import { REGION_NAMES } from './geo';
import { GROUND_Y, QUAY_BOTTOM, ROAD_BOTTOM, ROAD_TOP, SCENE_H, SCENE_W, buildScene, type Building, type Window } from './scene';
import { ALL_EFFECT_KINDS, ARCHETYPE_LABEL, EFFECT_INFO, companiesInCity, effectsForCity, fmtMoneyBn, fmtPct, fmtPeopleM, orderHqs } from './util';
import { EventFeed } from './EventFeed';
import './world.css';

const CityScene3D = lazy(() => import('./city3d/CityScene3D'));
const JoeScene3D = lazy(() => import('./joe/JoeScene3D'));

export type CityRenderMode = '3d' | '2d';

export interface CityViewProps {
  state: WorldState;
  cityId: string;
  onSelectCompany: (companyId: string) => void;
  /** City list. Defaults to ALL_CITIES (contract CITIES + proposed extras in roster.ts). */
  cities?: CityInfo[];
  /** Used by the timeline to show decision titles instead of ids. */
  decisions?: Decision[];
  onBack?: () => void;
  showTimeline?: boolean;
  /** 3D is the default (DECISIONS.md #4); 2D SVG skyline is the fallback. */
  initialMode?: CityRenderMode;
  /** The city's average citizen for the "Average Joe" view. Until the sim ships `averageJoe`, `mockJoe` is used. */
  joe?: AverageJoe;
  initialView?: 'city' | 'joe';
  /** Companies that still have a decision card this year (shown as "Decision waiting"). */
  waitingCompanyIds?: string[];
}

type Fx = Map<CityEffectKind, CityEffect>;
type Light = 'lit' | 'dark' | 'flicker';

const BASE_LIT: Record<Building['kind'], number> = { office: 0.62, resi: 0.48, hq: 0.85, bank: 0.6, hospital: 0.85 };

/** Window lighting is where blackout, ghost offices, bank run and solar boom meet. */
export function windowLight(b: Building, w: Window, fx: Fx): Light {
  const k = (kind: CityEffectKind) => fx.get(kind)?.intensity ?? 0;
  if (b.kind === 'hospital' && k('outbreak') > 0) return 'lit';
  if (b.kind === 'bank' && k('bankRun') > 0.6) return 'dark';
  if (b.kind === 'office' && w.row < b.rows * k('ghostOffices')) return 'dark';
  // The data centres (HQs) keep their power; hospitals run generators. Solar partly reverses blackouts.
  const blackout = Math.max(0, k('blackout') - 0.6 * k('solarBoom'));
  if (b.kind !== 'hq' && b.kind !== 'hospital' && b.district < blackout) return w.r > 0.86 ? 'flicker' : 'dark';
  return w.r < BASE_LIT[b.kind] + 0.15 * k('solarBoom') ? 'lit' : 'dark';
}

const BODY: Record<Building['kind'], string> = { office: '#1c2944', resi: '#24273d', hq: '#1b3354', bank: '#3a3a46', hospital: '#d7dde6' };
const LIT: Record<Building['kind'], string> = { office: '#bfe0ff', resi: '#ffd98a', hq: '#9fe8ff', bank: '#ffe6a8', hospital: '#e9fbff' };

function BuildingShape({ b, fx }: { b: Building; fx: Fx }) {
  const top = GROUND_Y - b.h;
  return (
    <g>
      <rect x={b.x} y={top} width={b.w} height={b.h} fill={BODY[b.kind]} />
      {b.kind !== 'hospital' && <rect x={b.x} y={top} width={3} height={b.h} fill="#ffffff" opacity={0.05} />}
      {b.roofStyle === 1 && b.kind !== 'hospital' && b.kind !== 'bank' && (
        <g>
          <line x1={b.x + b.w * 0.7} y1={top} x2={b.x + b.w * 0.7} y2={top - 24} stroke="#5a6478" strokeWidth={2} />
          <circle className="w-blink" cx={b.x + b.w * 0.7} cy={top - 25} r={2} fill="#ff4040" />
        </g>
      )}
      {b.roofStyle === 2 && b.kind === 'office' && <rect x={b.x + b.w * 0.2} y={top - 14} width={b.w * 0.6} height={14} fill={BODY[b.kind]} />}
      {b.windows.map((w, i) => {
        const l = windowLight(b, w, fx);
        return (
          <rect key={i} className={l === 'flicker' ? 'w-flicker' : undefined} x={w.x} y={w.y} width={8} height={10}
            fill={l === 'dark' ? (b.kind === 'hospital' ? '#9aa6b5' : '#141a28') : b.kind === 'hospital' && l === 'lit' ? '#9fd8ff' : LIT[b.kind]}
            opacity={l === 'dark' ? 1 : 0.9} style={l === 'flicker' ? { animationDelay: `${w.r * 3}s` } : undefined} />
        );
      })}
    </g>
  );
}

function Hospital({ b }: { b: Building }) {
  const cx = b.x + b.w / 2;
  const top = GROUND_Y - b.h;
  return (
    <g>
      <rect x={cx - 16} y={top - 30} width={32} height={30} fill="#ffffff" stroke="#c9d1db" />
      <rect x={cx - 3.5} y={top - 26} width={7} height={22} fill="#e02020" />
      <rect x={cx - 11} y={top - 18.5} width={22} height={7} fill="#e02020" />
    </g>
  );
}

function Bank({ b }: { b: Building }) {
  const top = GROUND_Y - b.h;
  const colTop = GROUND_Y - 58;
  return (
    <g>
      <polygon points={`${b.x - 4},${colTop} ${b.x + b.w + 4},${colTop} ${b.x + b.w / 2},${colTop - 22}`} fill="#cfc8b4" />
      <rect x={b.x - 4} y={colTop} width={b.w + 8} height={6} fill="#bdb6a2" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={b.x + 6 + i * ((b.w - 20) / 5)} y={colTop + 6} width={8} height={52} fill="#e2dccb" />
      ))}
      <text x={b.x + b.w / 2} y={colTop - 5} fontSize={9} textAnchor="middle" fill="#3a3a46" fontWeight={700}>BANK</text>
      <rect x={b.x} y={top} width={b.w} height={4} fill="#4a4a58" />
    </g>
  );
}

function HqTower({ b, company, waiting, stagger, onSelect }: { b: Building; company: Company; waiting: boolean; stagger: number; onSelect: (id: string) => void }) {
  const cx = b.x + b.w / 2;
  const top = GROUND_Y - b.h;
  const lift = stagger; // alternate label heights so neighbouring signs never overlap
  const ty = top - lift;
  const color = waiting ? '#ffd60a' : '#5cc8ff';
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(company.id);
    }
  };
  return (
    <g className="w-hq-arrow" role="button" tabIndex={0} aria-label={`${company.name} headquarters${waiting ? ', decision waiting' : ''}`}
      onClick={() => onSelect(company.id)} onKeyDown={onKey}>
      {/* building outline glow */}
      {lift > 0 && <line x1={cx} y1={ty - 6} x2={cx} y2={top} stroke={color} strokeOpacity={0.5} strokeWidth={1.5} />}
      <rect className="w-glow" x={b.x - 2} y={top - 2} width={b.w + 4} height={b.h + 2} fill="none" stroke={color} strokeWidth={2} opacity={0.55} filter="url(#w-glow)" />
      <rect x={b.x} y={top} width={b.w} height={4} fill={color} />
      {/* name sign */}
      <rect x={cx - 60} y={ty - 26} width={120} height={20} rx={4} fill="rgba(5,10,22,0.85)" stroke={color} />
      <text x={cx} y={ty - 12} textAnchor="middle" fontSize={10.5} textLength={company.name.length > 16 ? 112 : undefined} lengthAdjust="spacingAndGlyphs" fontWeight={700} fill={color}>{company.name}</text>
      {/* bobbing glowing arrow */}
      <g className="w-bob" style={{ animationDelay: `${(b.hqSlot ?? 0) * 0.3}s` }}>
        <circle className="w-glow" cx={cx} cy={ty - 58} r={22} fill={color} opacity={0.3} filter="url(#w-glow)" />
        <polygon points={`${cx - 16},${ty - 72} ${cx + 16},${ty - 72} ${cx},${ty - 40}`} fill={color} stroke="#fff" strokeWidth={1.5} filter="url(#w-glow-soft)" />
        <text x={cx} y={ty - 80} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={600}>{waiting ? 'DECISION WAITING' : ARCHETYPE_LABEL[company.archetype].toUpperCase()}</text>
      </g>
      {/* larger invisible hit area */}
      <rect x={b.x - 10} y={ty - 100} width={b.w + 20} height={b.h + 100 + lift} fill="transparent" />
    </g>
  );
}

function SceneDefs() {
  return (
    <defs>
      <linearGradient id="w-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#050a1a" />
        <stop offset="70%" stopColor="#13234a" />
        <stop offset="100%" stopColor="#2a3d6e" />
      </linearGradient>
      <linearGradient id="w-war-haze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a0505" stopOpacity={0} />
        <stop offset="100%" stopColor="#c0392b" stopOpacity={0.8} />
      </linearGradient>
      <linearGradient id="w-dawn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffcf6b" stopOpacity={0} />
        <stop offset="100%" stopColor="#ffcf6b" stopOpacity={0.9} />
      </linearGradient>
      <linearGradient id="w-ember" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff7a2a" stopOpacity={0} />
        <stop offset="100%" stopColor="#ff7a2a" stopOpacity={0.8} />
      </linearGradient>
      <linearGradient id="w-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3f8fd0" stopOpacity={0.85} />
        <stop offset="100%" stopColor="#0d2f5a" stopOpacity={0.95} />
      </linearGradient>
      <pattern id="w-scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="2" fill="#000" opacity={0.25} />
      </pattern>
      <pattern id="w-stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="10" fill="#1a1a1a" opacity={0.6} />
      </pattern>
      <filter id="w-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="w-glow-soft" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );
}

export function CitySkyline({ state, city, onSelectCompany, waiting = [] }: { state: WorldState; city: CityInfo; onSelectCompany: (id: string) => void; waiting?: string[] }) {
  const hqCount = companiesInCity(state, city).length;
  const layout = useMemo(() => buildScene(city.id, hqCount), [city.id, hqCount]);
  const fx = effectsForCity(state, city.id);
  const companies = companiesInCity(state, city).slice(0, layout.hqSlots.length);
  // Slots are left to right; the tallest slot gets the first company in HQ order.
  const ordered = orderHqs(companies, state.playerCompanyId, waiting);
  const bySize = layout.hqSlots.map((s, i) => [i, s.h] as const).sort((a, b) => b[1] - a[1]).map(([i]) => i);
  const hqBySlot = new Map(ordered.map((c, i) => [bySize[i], c]));
  const active = ALL_EFFECT_KINDS.filter((k) => fx.has(k));
  const layer = (name: 'sky' | 'street' | 'top') =>
    active.map((kind) => {
      const draw = EFFECT_RENDERERS[kind][name];
      return draw ? <g key={kind} data-effect={kind}>{draw(layout, fx.get(kind)!.intensity, `${city.id}:${kind}`)}</g> : null;
    });

  const nonHq = layout.buildings.filter((b) => b.kind !== 'hq');
  const hqs = layout.buildings.filter((b) => b.kind === 'hq');

  return (
    <svg className="w-scene" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} role="img"
      aria-label={`${city.name} skyline${active.length ? `. Active: ${active.map((k) => EFFECT_INFO[k].label).join(', ')}` : ''}`}>
      <SceneDefs />
      <rect width={SCENE_W} height={SCENE_H} fill="url(#w-sky)" />
      {layout.stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.6} />)}
      <circle cx={1080} cy={80} r={26} fill="#f3f0dc" opacity={0.85} />
      <circle cx={1090} cy={74} r={24} fill="#0a1430" opacity={0.6} />
      {layer('sky')}
      {layout.far.map((f, i) => <rect key={i} x={f.x} y={GROUND_Y - f.h} width={f.w} height={f.h} fill="#141d36" />)}
      {nonHq.map((b) => <BuildingShape key={b.id} b={b} fx={fx} />)}
      <Hospital b={layout.hospital} />
      <Bank b={layout.bank} />
      {hqs.map((b) => {
        const c = hqBySlot.get(b.hqSlot!);
        return (
          <g key={b.id} opacity={c ? 1 : 0.55}>
            <BuildingShape b={b} fx={fx} />
            {!c && <text x={b.x + b.w / 2} y={GROUND_Y - b.h - 10} textAnchor="middle" fontSize={10} fill="#93a0ba">no HQ</text>}
          </g>
        );
      })}
      {/* street */}
      <rect x={0} y={GROUND_Y} width={SCENE_W} height={ROAD_TOP - GROUND_Y} fill="#2b3142" />
      <rect x={0} y={ROAD_TOP} width={SCENE_W} height={ROAD_BOTTOM - ROAD_TOP} fill="#1a1d26" />
      {Array.from({ length: 30 }, (_, i) => <rect key={i} x={i * 42} y={(ROAD_TOP + ROAD_BOTTOM) / 2 - 1} width={22} height={2} fill="#c8b25a" opacity={0.6} />)}
      <rect x={0} y={ROAD_BOTTOM} width={SCENE_W} height={QUAY_BOTTOM - ROAD_BOTTOM} fill="#353b4b" />
      <rect x={0} y={QUAY_BOTTOM} width={SCENE_W} height={SCENE_H - QUAY_BOTTOM} fill="#0c1a33" />
      {Array.from({ length: 14 }, (_, i) => <line key={i} x1={i * 90 + 10} y1={QUAY_BOTTOM + 12 + (i % 3) * 9} x2={i * 90 + 50} y2={QUAY_BOTTOM + 12 + (i % 3) * 9} stroke="#3a5a8a" strokeOpacity={0.5} />)}
      {layer('street')}
      {layer('top')}
      {hqs.map((b) => {
        const c = hqBySlot.get(b.hqSlot!);
        return c ? <HqTower key={c.id} b={b} company={c} waiting={waiting.includes(c.id)} stagger={(b.hqSlot ?? 0) % 2 ? 34 : 0} onSelect={onSelectCompany} /> : null;
      })}
      <text x={16} y={SCENE_H - 12} fontSize={12} fill="#93a0ba">{city.name} · {state.year}</text>
    </svg>
  );
}

export function CityView({ state, cityId, onSelectCompany, cities = ALL_CITIES, decisions, onBack, showTimeline = true, initialMode = '3d', joe, initialView = 'city', waitingCompanyIds = [] }: CityViewProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const webgl = useMemo(hasWebGL, []);
  const [mode, setMode] = useState<CityRenderMode>(() => (initialMode === '3d' && webgl ? '3d' : '2d'));
  const [reason, setReason] = useState<string | null>(() => (initialMode === '3d' && !webgl ? NO_WEBGL : null));
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<'city' | 'joe'>(initialView);
  const crashed = () => { setReason(CRASHED); setMode('2d'); };
  const retry3D = () => { setReason(null); setMode('3d'); setAttempt((a) => a + 1); };
  const city = cities.find((c) => c.id === cityId);
  if (!city) {
    return (
      <div className="w-root" style={{ padding: 16 }}>
        <p>Unknown city “{cityId}”.</p>
        {onBack && <button className="w-btn" onClick={onBack}>← World map</button>}
      </div>
    );
  }
  const region = state.regions[city.region];
  const companies = orderHqs(companiesInCity(state, city), state.playerCompanyId, waitingCompanyIds);
  const player = state.companies.find((c) => c.id === state.playerCompanyId);
  // "Your move" goes to a company here that still has a card, else any waiting company, else the flagship.
  const nextUp = companies.find((c) => waitingCompanyIds.includes(c.id))
    ?? state.companies.find((c) => waitingCompanyIds.includes(c.id))
    ?? player;
  const joeData: AverageJoe = joe ?? { ...mockJoe, cityId: city.id };

  return (
    <div className="w-root">
      <div className="w-city-title">
        {onBack && <button className="w-btn" onClick={onBack}>← World map</button>}
        <h2>{city.name}</h2>
        <span className="w-sub">{REGION_NAMES[city.region]} · {state.year}</span>
        <div className="w-view-toggle" role="group" aria-label="City or Average Joe view">
          <button aria-pressed={view === 'city'} onClick={() => setView('city')}>🏙 City</button>
          <button aria-pressed={view === 'joe'} onClick={() => setView('joe')}>🚶 Average Joe</button>
        </div>
        <div className="w-seg w-mode" role="group" aria-label="3D or 2D">
          <button aria-pressed={mode === '3d'} disabled={!webgl} onClick={retry3D}>3D</button>
          <button aria-pressed={mode === '2d'} onClick={() => { setMode('2d'); setReason('switched off by you'); }}>2D</button>
        </div>
      </div>
      <div className="w-city-layout">
        <div className="w-scene-wrap">
          {view === 'joe' ? (
            mode === '3d' ? (
              <ThreeBoundary key={`joe${attempt}`} onError={crashed} fallback={<JoeCard2D joe={joeData} />}>
                <Suspense fallback={<JoeCard2D joe={joeData} />}>
                  <JoeScene3D joe={joeData} />
                </Suspense>
              </ThreeBoundary>
            ) : (
              <JoeCard2D joe={joeData} />
            )
          ) : mode === '3d' ? (
            <ThreeBoundary key={`city${attempt}`} onError={crashed} fallback={<CitySkyline state={state} city={city} onSelectCompany={onSelectCompany} waiting={waitingCompanyIds} />}>
              <Suspense fallback={<CitySkyline state={state} city={city} onSelectCompany={onSelectCompany} waiting={waitingCompanyIds} />}>
                <CityScene3D state={state} city={city} onSelectCompany={onSelectCompany} waiting={waitingCompanyIds} onRequest2D={() => { setMode('2d'); setReason('running slowly on this device'); }} />
              </Suspense>
            </ThreeBoundary>
          ) : (
            <CitySkyline state={state} city={city} onSelectCompany={onSelectCompany} waiting={waitingCompanyIds} />
          )}
          {mode === '2d' && reason && <FallbackChip reason={reason} onRetry={webgl ? retry3D : undefined} />}
          {region && view === 'city' && (
            <section className={`w-statcard${statsOpen ? ' open' : ''}`} aria-label={`${REGION_NAMES[city.region]} stats`}>
              <button className="w-statcard-head" aria-expanded={statsOpen} onClick={() => setStatsOpen((o) => !o)}>
                <span>{REGION_NAMES[city.region]}</span><span aria-hidden>{statsOpen ? '▾' : '▸'}</span>
              </button>
              <dl className="w-kv">
                <dt>GDP</dt><dd>{fmtMoneyBn(region.gdp)}</dd>
                <dt>Population</dt><dd>{fmtPeopleM(region.population)}</dd>
                <dt>Software jobs lost</dt><dd>{fmtPct(region.unemploymentSoftware)}</dd>
                <dt>Public trust</dt><dd>{Math.round(region.publicTrust)}/100</dd>
                {statsOpen && (
                  <>
                    <dt>Physical jobs lost</dt><dd>{fmtPct(region.unemploymentPhysical)}</dd>
                    <dt>Wealth gap</dt><dd>{Math.round(region.wealthGap)}/100</dd>
                    <dt>Energy balance</dt><dd style={{ color: region.energy < 0 ? 'var(--w-bad)' : undefined }}>{region.energy > 0 ? '+' : ''}{Math.round(region.energy)}</dd>
                    <dt>Water stress</dt><dd>{Math.round(region.waterStress)}/100</dd>
                    <dt>Regulation</dt><dd>{Math.round(region.regulationStrictness)}/100</dd>
                    <dt>World tension</dt><dd>{Math.round(state.global.geopoliticalTension)}/100</dd>
                  </>
                )}
              </dl>
            </section>
          )}
        </div>
        <aside>
          {nextUp && (
            <button className="w-cta" style={{ marginTop: 0, marginBottom: 12 }} onClick={() => onSelectCompany(nextUp.id)}>
              <span className="w-cta-kicker">Your move{waitingCompanyIds.length > 1 ? ` · ${waitingCompanyIds.length} companies waiting` : ''}</span>
              {waitingCompanyIds.length ? `Decide for ${nextUp.name} →` : `Go to ${nextUp.name} HQ →`}
            </button>
          )}
          <section className="w-panel">
            <h3>Headquarters</h3>
            <div className="w-hq-list">
              {companies.map((c) => {
                const waiting = waitingCompanyIds.includes(c.id);
                return (
                  <button key={c.id} className={`w-hq-btn${waiting ? ' waiting' : ''}`} onClick={() => onSelectCompany(c.id)}>
                    <span>{c.name}<br /><small>{ARCHETYPE_LABEL[c.archetype]}</small></span>
                    {waiting ? <span className="w-hq-badge">Decision waiting</span> : <span aria-hidden>→</span>}
                  </button>
                );
              })}
              {companies.length === 0 && (
                <p className="w-hq-empty">No AI headquarters here. The effects and Average Joe still show what this year means for {city.name}.</p>
              )}
            </div>
          </section>
          <section className="w-panel">
            <EventFeed state={state} cities={cities} cityId={city.id} max={6} />
          </section>
        </aside>
      </div>
      {showTimeline && <CityTimeline state={state} cityId={city.id} cities={cities} decisions={decisions} />}
    </div>
  );
}

/** Flat version of the Average Joe card (2D fallback or while the 3D street loads). */
function JoeCard2D({ joe }: { joe: AverageJoe }) {
  const mood = Math.max(0, Math.min(100, joe.mood));
  return (
    <div className="joe-2d">
      <div className="joe-2d-person" aria-hidden>🚶</div>
      <section className="joe-card static" aria-label={`Average Joe: ${joe.name}`}>
        <header><strong>{joe.name}</strong><span>{joe.age} · {joe.occupation}</span></header>
        <dl>
          <dt>Income</dt><dd>${Math.round(joe.income).toLocaleString()} / yr</dd>
          <dt>Mood</dt><dd className="joe-mood"><i style={{ width: `${mood}%`, background: mood >= 60 ? '#4fd18b' : mood >= 35 ? '#ffb547' : '#ff6b5b' }} /></dd>
        </dl>
        {joe.lines.length > 0 && <ul>{joe.lines.slice(0, 3).map((l, i) => <li key={i}>“{l}”</li>)}</ul>}
      </section>
    </div>
  );
}
