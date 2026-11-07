/**
 * "Happening now" feed: the 5-6 most recent city events. A new event is pushed in at the top (animated),
 * the oldest pops out at the bottom. New arrivals are revealed one at a time, at most one every
 * `revealEvery` ms, so a burst of events doesn't flash past. Ended events stay listed (dimmed) until pushed out.
 * Also exports `useToasts` for short-lived, auto-dismissing notices (5-7 s).
 */
import { useEffect, useRef, useState } from 'react';
import type { CityEffectKind, CityInfo, WorldState } from '../contracts';
import { EFFECT_COLOR, EFFECT_INFO } from './util';

export interface FeedItem {
  key: string; // city:kind:n
  city: string;
  kind: CityEffectKind;
  seenAt: number;
}

/** Tracks when each (city, kind) effect starts; returns the newest-first list of starts (revealed gradually). */
export function useEffectStarts(state: WorldState, cityFilter?: string, revealEvery = 1600): FeedItem[] {
  const active = useRef(new Set<string>());
  const queue = useRef<FeedItem[]>([]);
  const counter = useRef(0);
  const [shown, setShown] = useState<FeedItem[]>([]);

  // detect starts
  const now = new Set<string>();
  for (const e of state.activeCityEffects) {
    if (e.intensity <= 0 || (cityFilter && e.city !== cityFilter)) continue;
    now.add(`${e.city}:${e.kind}`);
  }
  for (const k of now) {
    if (!active.current.has(k)) {
      const [city, kind] = k.split(':') as [string, CityEffectKind];
      queue.current.push({ key: `${k}:${++counter.current}`, city, kind, seenAt: Date.now() });
    }
  }
  active.current = now;

  useEffect(() => {
    const id = setInterval(() => {
      const next = queue.current.shift();
      if (next) next.seenAt = Date.now(); // time it was revealed
      if (next) setShown((cur) => [next, ...cur].slice(0, 12));
    }, revealEvery);
    // reveal the first one right away
    const first = queue.current.shift();
    if (first) first.seenAt = Date.now();
    if (first) setShown((cur) => [first, ...cur].slice(0, 12));
    return () => clearInterval(id);
  }, [revealEvery]);

  return shown;
}

export function EventFeed({ state, cities, cityId, max = 6, onPick, title = 'Happening now' }: {
  state: WorldState;
  cities: CityInfo[];
  /** Only this city's events (city view). Omit for the whole world (map). */
  cityId?: string;
  max?: number;
  onPick?: (cityId: string) => void;
  title?: string;
}) {
  const starts = useEffectStarts(state, cityId);
  const items = starts.slice(0, max);
  const leaving = starts[max]; // animate the one being pushed out
  const live = new Map(state.activeCityEffects.map((e) => [`${e.city}:${e.kind}`, e.intensity]));
  const name = (id: string) => cities.find((c) => c.id === id)?.name ?? id;

  return (
    <section className="w-feed" aria-label={title}>
      <h3>{title}</h3>
      {items.length === 0 && <div className="w-feed-empty">Quiet streets. Events will appear here as they unfold.</div>}
      <ol className="w-feed-list" aria-live="polite">
        {items.map((it) => {
          const info = EFFECT_INFO[it.kind];
          const k = live.get(`${it.city}:${it.kind}`) ?? 0;
          const Tag = onPick ? 'button' : 'div';
          return (
            <li key={it.key} className={`w-feed-item${k > 0 ? '' : ' ended'}`} style={{ ['--fx' as string]: EFFECT_COLOR[it.kind] }}>
              <Tag className="w-feed-row" {...(onPick ? { onClick: () => onPick(it.city) } : {})}>
                <span className="w-feed-icon" aria-hidden>{info.icon}</span>
                <span className="w-feed-text">
                  <strong>{info.label}</strong>
                  <small>{cityId ? (k > 0 ? info.blurb : 'Over') : `${name(it.city)}${k > 0 ? '' : ' · over'}`}</small>
                </span>
                <span className="w-feed-meter" aria-label={`intensity ${Math.round(k * 100)}%`}><i style={{ width: `${k * 100}%` }} /></span>
              </Tag>
            </li>
          );
        })}
        {leaving && (
          <li key={`${leaving.key}-out`} className="w-feed-item leaving" aria-hidden>
            <div className="w-feed-row"><span className="w-feed-icon">{EFFECT_INFO[leaving.kind].icon}</span><span className="w-feed-text"><strong>{EFFECT_INFO[leaving.kind].label}</strong></span></div>
          </li>
        )}
      </ol>
    </section>
  );
}

/** Short-lived notices for newly started effects. Each disappears after `ms` (default 6 s). */
export function Toasts({ state, cities, cityId, ms = 6000 }: { state: WorldState; cities: CityInfo[]; cityId?: string; ms?: number }) {
  const starts = useEffectStarts(state, cityId, 900);
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 500);
    return () => clearInterval(id);
  }, []);
  const now = Date.now();
  const visible = starts.filter((s) => now - s.seenAt < ms + 500).slice(0, 3);
  const name = (id: string) => cities.find((c) => c.id === id)?.name ?? id;
  return (
    <div className="w-toasts" role="status">
      {visible.map((s) => {
        const info = EFFECT_INFO[s.kind];
        const age = now - s.seenAt;
        return (
          <div key={s.key} className={`w-toast${info.positive ? ' good' : ''}${age > ms ? ' out' : ''}`} style={{ ['--fx' as string]: EFFECT_COLOR[s.kind] }}>
            <span aria-hidden>{info.icon}</span> {info.label}{cityId ? '' : ` · ${name(s.city)}`}
          </div>
        );
      })}
    </div>
  );
}
