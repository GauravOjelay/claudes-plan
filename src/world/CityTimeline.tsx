import { useState } from 'react';
import type { CityInfo, Decision, WorldState } from '../contracts';
import { mockCities } from '../contracts/mocks';
import { EFFECT_INFO } from './util';
import './world.css';

export interface CityTimelineProps {
  state: WorldState;
  cityId: string;
  cities?: CityInfo[];
  /** Used to show decision titles and option labels instead of ids. */
  decisions?: Decision[];
  /** Called when the player scrubs to a year. */
  onScrub?: (year: number) => void;
}

export interface TimelineItem {
  year: number;
  type: 'choice' | 'event' | 'effect';
  text: string;
  good?: boolean;
}

/**
 * Everything that happened to one city, oldest first.
 * EventLogEntry has no city in contracts v0.1, so an event counts for this city when a headline
 * with the same year and text is tagged with this city (or with its region and no city).
 */
export function cityTimelineItems(state: WorldState, city: CityInfo, decisions: Decision[] = []): TimelineItem[] {
  const items: TimelineItem[] = [];
  const localCompanies = new Set([...city.companyIds, ...state.companies.filter((c) => c.homeCity === city.id).map((c) => c.id)]);
  const companyName = new Map(state.companies.map((c) => [c.id, c.name]));
  const decisionById = new Map(decisions.map((d) => [d.id, d]));

  for (const ch of state.choiceLog) {
    if (!localCompanies.has(ch.companyId)) continue;
    const d = decisionById.get(ch.decisionId);
    const opt = d?.options.find((o) => o.id === ch.optionId);
    const who = companyName.get(ch.companyId) ?? ch.companyId;
    items.push({ year: Number(ch.year), type: 'choice', text: `${who}: ${d?.title ?? ch.decisionId} → ${opt?.label ?? ch.optionId}` });
  }

  for (const ev of state.eventLog) {
    const year = Number(ev.year);
    const local = state.headlines.some(
      (h) => Number(h.year) === year && h.text === ev.headline && (h.city === city.id || (!h.city && h.region === city.region)),
    );
    if (local) items.push({ year, type: 'event', text: ev.headline });
  }

  for (const fx of state.activeCityEffects) {
    if (fx.city !== city.id) continue;
    const info = EFFECT_INFO[fx.kind];
    items.push({ year: Number(fx.sinceYear), type: 'effect', text: `${info.icon} ${info.label} began (${Math.round(fx.intensity * 100)}% now)`, good: info.positive });
  }

  return items.filter((i) => Number.isFinite(i.year)).sort((a, b) => a.year - b.year);
}

const PAST_WIDTH = 78; // % of the track used for the past; the rest shows future branches

export function CityTimeline({ state, cityId, cities = mockCities, decisions, onScrub }: CityTimelineProps) {
  const city = cities.find((c) => c.id === cityId);
  const [selected, setSelected] = useState<number | null>(null);
  if (!city) return null;

  const items = cityTimelineItems(state, city, decisions);
  const start = Math.min(2026, ...items.map((i) => i.year));
  const now = Math.max(state.year, ...items.map((i) => i.year));
  const span = Math.max(1, now - start);
  const pos = (y: number) => ((y - start) / span) * PAST_WIDTH;
  const year = selected ?? now;
  const pick = (y: number) => {
    setSelected(y);
    onScrub?.(y);
  };

  // One marker per (year, type) so busy years stay clickable.
  const groups = new Map<string, TimelineItem[]>();
  for (const it of items) {
    const key = `${it.year}:${it.type}`;
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  const tickEvery = span > 40 ? 10 : span > 15 ? 5 : span > 6 ? 2 : 1;
  const ticks: number[] = [];
  for (let y = start; y <= now; y += tickEvery) ticks.push(y);
  if (ticks[ticks.length - 1] !== now) ticks.push(now);

  const yearItems = items.filter((i) => i.year === year);
  const yearHeadlines = state.headlines.filter((h) => Number(h.year) === year && h.city === city.id && !yearItems.some((i) => i.text === h.text));
  const branches = state.unlockedPathways;

  return (
    <section className="w-root w-timeline w-panel" style={{ margin: 12 }} aria-label={`${city.name} timeline`}>
      <h3>{city.name} timeline</h3>
      <div className="w-tl-legend">
        <span><i style={{ background: 'var(--w-warn)' }} />Events</span>
        <span><i style={{ background: 'var(--w-accent)' }} />Decisions by local HQs</span>
        <span><i style={{ background: 'var(--w-bad)' }} />City effects</span>
        <span>- - Unlocked pathways</span>
      </div>
      <div className="w-tl-track">
        <div className="w-tl-axis" />
        <div className="w-tl-past" style={{ width: `${pos(year)}%` }} />
        {ticks.map((t) => (
          <span key={t} className="w-tl-year" style={{ left: `${pos(t)}%` }}>{t}</span>
        ))}
        {[...groups.entries()].map(([key, g]) => {
          const it = g[0];
          return (
            <button key={key} className={`w-tl-mark ${it.type}${it.good ? ' good' : ''}`} style={{ left: `${pos(it.year)}%` }}
              aria-pressed={year === it.year} title={g.map((x) => `${x.year}: ${x.text}`).join('\n')}
              aria-label={`${it.year}: ${g.length} ${it.type}${g.length > 1 ? 's' : ''}`} onClick={() => pick(it.year)}>
              {g.length > 1 ? g.length : ''}
            </button>
          );
        })}
        <div className="w-tl-now" style={{ left: `${pos(now)}%` }}><span>NOW</span></div>
        <div className="w-tl-branches" style={{ left: `calc(${PAST_WIDTH}% + 44px)`, right: 0 }}>
          {branches.length === 0 && <span className="w-tl-branch" style={{ top: 38, opacity: 0.6 }}>no pathways unlocked yet</span>}
          {branches.slice(0, 4).map((p, i) => (
            <span key={p} className="w-tl-branch" style={{ top: 6 + i * 18 }}>{p}</span>
          ))}
          {branches.length > 4 && <span className="w-tl-branch" style={{ top: 78 }}>+{branches.length - 4} more</span>}
        </div>
      </div>
      <input className="w-tl-range" type="range" min={start} max={now} step={1} value={year}
        aria-label="Scrub timeline year" onChange={(e) => pick(Number(e.target.value))}
        style={{ width: `calc(${PAST_WIDTH}% + 16px)` }} />
      <div className="w-tl-detail" aria-live="polite">
        <strong>{year}</strong>
        {yearItems.length === 0 && yearHeadlines.length === 0 ? (
          <span style={{ color: 'var(--w-muted)' }}> · nothing recorded for {city.name}</span>
        ) : (
          <ul>
            {yearItems.map((i, n) => <li key={n}>{i.text}</li>)}
            {yearHeadlines.map((h, n) => <li key={`h${n}`} style={{ color: 'var(--w-muted)' }}>📰 {h.text}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
