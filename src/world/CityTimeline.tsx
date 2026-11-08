import { useState } from 'react';
import type { CityInfo, Decision, WorldState } from '../contracts';
import { ALL_CITIES } from './roster';
import { EFFECT_INFO, pathwayLabel } from './util';
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
 * An event counts for this city when its log entry names the city. Entries without a city fall back
 * to a headline with the same year and text tagged with this city (or with its region and no city).
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
    const local = ev.city
      ? ev.city === city.id
      : state.headlines.some(
          (h) => Number(h.year) === year && h.text === ev.headline && (h.city === city.id || (!h.city && h.region === city.region)),
        );
    if (local) items.push({ year, type: 'event', text: ev.headline, good: ev.valence === 'positive' });
  }

  for (const fx of state.activeCityEffects) {
    if (fx.city !== city.id) continue;
    const info = EFFECT_INFO[fx.kind];
    items.push({ year: Number(fx.sinceYear), type: 'effect', text: `${info.icon} ${info.label} began (${Math.round(fx.intensity * 100)}% now)`, good: info.positive });
  }

  return items.filter((i) => Number.isFinite(i.year)).sort((a, b) => a.year - b.year);
}

const TYPE_LABEL: Record<TimelineItem['type'], string> = { choice: 'Decision', event: 'Event', effect: 'City effect' };

export function CityTimeline({ state, cityId, cities = ALL_CITIES, decisions, onScrub }: CityTimelineProps) {
  const city = cities.find((c) => c.id === cityId);
  const [selected, setSelected] = useState<number | null>(null);
  if (!city) return null;

  const items = cityTimelineItems(state, city, decisions);
  const start = Math.min(2026, ...items.map((i) => i.year));
  const now = Math.max(state.year, ...items.map((i) => i.year));
  const span = Math.max(1, now - start);
  // 3% padding each side so end nodes and labels never touch the edges
  const pos = (y: number) => 3 + ((y - start) / span) * 94;
  const year = selected ?? now;
  const pick = (y: number) => {
    setSelected(y);
    onScrub?.(y);
  };

  // One node per year, summarising what happened that year.
  const byYear = new Map<number, TimelineItem[]>();
  for (const it of items) byYear.set(it.year, [...(byYear.get(it.year) ?? []), it]);
  const years = [...byYear.keys()].sort((x, y) => x - y);
  // Year labels: start, now and busy years, skipping any closer than 6% so they never overlap.
  const labels: number[] = [];
  for (const y of [...new Set([start, ...years])].sort((x, z) => x - z)) {
    if (y === now) continue;
    if (labels.length && pos(y) - pos(labels[labels.length - 1]) < 6) continue;
    if (pos(now) - pos(y) < 6) continue;
    labels.push(y);
  }
  labels.push(now);

  const yearItems = byYear.get(year) ?? [];
  const yearHeadlines = state.headlines.filter((h) => Number(h.year) === year && h.city === city.id && !yearItems.some((i) => i.text === h.text));
  const branches = state.unlockedPathways;

  return (
    <section className="w-root w-timeline w-panel" style={{ margin: 12 }} aria-label={`${city.name} timeline`}>
      <div className="w-tl-head">
        <h3>{city.name} timeline</h3>
        <div className="w-tl-legend">
          <span><i style={{ background: 'var(--w-accent)' }} />Decisions by local HQs</span>
          <span><i style={{ background: 'var(--w-warn)' }} />Events</span>
          <span><i style={{ background: 'var(--w-bad)' }} />City effects</span>
        </div>
      </div>
      <div className="w-tl2">
        <div className="w-tl2-track">
          <div className="w-tl2-rail" />
          <div className="w-tl2-past" style={{ width: `${pos(year)}%` }} />
          <div className="w-tl2-now" style={{ left: `${pos(now)}%` }}><span>NOW</span></div>
          {years.map((y) => {
            const g = byYear.get(y)!;
            const types = (['choice', 'event', 'effect'] as const).filter((t) => g.some((i) => i.type === t));
            const allGood = g.filter((x) => x.type === 'effect').every((x) => x.good);
            return (
              <button key={y} className="w-tl2-node" style={{ left: `${pos(y)}%` }} aria-pressed={year === y}
                title={g.map((x) => `${TYPE_LABEL[x.type]}: ${x.text}`).join('\n')}
                aria-label={`${y}: ${g.length} item${g.length > 1 ? 's' : ''}`} onClick={() => pick(y)}>
                {types.map((t) => <i key={t} className={`t-${t}${t === 'effect' && allGood ? ' good' : ''}`} />)}
                {g.length > 1 && <b>{g.length}</b>}
              </button>
            );
          })}
          {labels.map((y) => (
            <span key={y} className={`w-tl2-year${y === now ? ' now' : ''}`} style={{ left: `${pos(y)}%` }}>{y}</span>
          ))}
        </div>
        <div className="w-tl2-future">
          <small>Possible futures</small>
          {branches.length === 0 ? <span className="w-tl2-branch muted">None unlocked yet</span> : branches.slice(0, 4).map((p) => <span key={p} className="w-tl2-branch" title={p}>{pathwayLabel(p)}</span>)}
          {branches.length > 4 && <span className="w-tl2-branch muted">+{branches.length - 4} more</span>}
        </div>
      </div>
      <input className="w-tl-range" type="range" min={start} max={now} step={1} value={year} aria-label="Scrub timeline year" onChange={(e) => pick(Number(e.target.value))} />
      <div className="w-tl-detail" aria-live="polite">
        <div className="w-tl-detail-year">{year}</div>
        {yearItems.length === 0 && yearHeadlines.length === 0 ? (
          <span style={{ color: 'var(--w-muted)' }}>Nothing recorded for {city.name} this year.</span>
        ) : (
          <ul>
            {yearItems.map((i, n) => <li key={n}><span className={`w-tl-chip t-${i.type}`}>{TYPE_LABEL[i.type]}</span>{i.text}</li>)}
            {yearHeadlines.map((h, n) => <li key={`h${n}`}><span className="w-tl-chip">News</span>{h.text}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
