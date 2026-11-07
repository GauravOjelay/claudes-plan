/**
 * Live EVENT DEMO for the world views (visual only, not the simulation).
 * Starts overlapping city events over time; each kind has its own life cycle, e.g. a flood visibly builds up,
 * holds, then recedes (long), a protest flares and fades (short). Intensities follow attack/hold/release
 * envelopes and are quantised so the 3D scenes don't rebuild every tick.
 */
import { useEffect, useRef, useState } from 'react';
import type { CityEffect, CityEffectKind, Headline, WorldState } from '../contracts';
import { ALL_EFFECT_KINDS, EFFECT_INFO, visualRng } from './util';

export interface Envelope {
  dur: number; // seconds, whole life
  attack: number; // fraction of dur spent building up
  release: number; // fraction of dur spent fading out
  peak: [number, number]; // peak intensity range
}

export const ENVELOPES: Record<CityEffectKind, Envelope> = {
  flooding: { dur: 75, attack: 0.4, release: 0.35, peak: [0.7, 1] }, // slow build-up, then calms down
  outbreak: { dur: 60, attack: 0.3, release: 0.35, peak: [0.6, 0.95] },
  solarBoom: { dur: 70, attack: 0.5, release: 0.15, peak: [0.6, 1] },
  ghostOffices: { dur: 50, attack: 0.5, release: 0.2, peak: [0.5, 0.9] },
  embargo: { dur: 45, attack: 0.15, release: 0.2, peak: [0.6, 1] },
  surveillance: { dur: 40, attack: 0.25, release: 0.25, peak: [0.5, 0.9] },
  blackout: { dur: 32, attack: 0.08, release: 0.3, peak: [0.6, 0.95] },
  warBuildup: { dur: 28, attack: 0.3, release: 0.3, peak: [0.5, 0.85] },
  unrest: { dur: 26, attack: 0.15, release: 0.35, peak: [0.5, 0.9] },
  bankRun: { dur: 22, attack: 0.2, release: 0.3, peak: [0.5, 0.9] },
  deepfakeProtests: { dur: 20, attack: 0.15, release: 0.3, peak: [0.6, 1] },
  gridlock: { dur: 14, attack: 0.05, release: 0.25, peak: [0.6, 1] },
};

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Intensity of an effect `age` seconds after it started (0 once it is over). */
export function envelopeAt(env: Envelope, peak: number, age: number): number {
  if (age < 0 || age > env.dur) return 0;
  const p = age / env.dur;
  if (p < env.attack) return peak * smooth(p / env.attack);
  if (p > 1 - env.release) return peak * smooth((1 - p) / env.release);
  return peak;
}

interface Running {
  id: number;
  city: string;
  kind: CityEffectKind;
  start: number; // seconds since demo start
  peak: number;
}

const HEADLINES: Record<CityEffectKind, (city: string) => string> = {
  flooding: (c) => `Flood waters rise across ${c}`,
  outbreak: (c) => `Hospitals in ${c} brace for an outbreak`,
  solarBoom: (c) => `Cheap solar panels spread across ${c} rooftops`,
  ghostOffices: (c) => `${c} office towers empty as agents take over desk work`,
  embargo: (c) => `Chip export controls leave ${c} port idle`,
  surveillance: (c) => `${c} switches on citywide face recognition`,
  blackout: (c) => `Rolling blackouts hit ${c} as data centres spike demand`,
  warBuildup: (c) => `Troops gather near ${c} as tensions rise`,
  unrest: (c) => `Unrest spreads through ${c}`,
  bankRun: (c) => `AI rumour sparks a run on ${c} banks`,
  deepfakeProtests: (c) => `Deepfake video brings crowds to ${c} squares`,
  gridlock: (c) => `Robotaxi update freezes ${c} traffic`,
};

export interface DemoOptions {
  enabled: boolean;
  cityIds: string[];
  cityNames?: Record<string, string>;
  /** Most events land here (e.g. the city on screen). */
  focusCity?: string;
  /** Seconds between new events. Default 9-15s (calm enough to read). */
  every?: [number, number];
  maxConcurrent?: number;
  seed?: string;
}

/** Returns `base` with the demo's live effects (and headlines) merged in. Re-renders ~4x per second. */
export function useEventDemo(base: WorldState, opts: DemoOptions): WorldState {
  const { enabled, cityIds, focusCity, every = [9, 15], maxConcurrent = 6, seed = 'demo' } = opts;
  const [now, setNow] = useState(0);
  const run = useRef<{ t0: number; next: number; items: Running[]; heads: Headline[]; id: number; rnd: () => number }>({
    t0: 0, next: 1.5, items: [], heads: [], id: 0, rnd: visualRng(seed),
  });

  useEffect(() => {
    if (!enabled) return;
    const r = run.current;
    r.t0 = performance.now() - now * 1000;
    const tick = setInterval(() => setNow((performance.now() - r.t0) / 1000), 250);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const r = run.current;
  if (enabled) {
    r.items = r.items.filter((it) => now - it.start <= ENVELOPES[it.kind].dur);
    while (now >= r.next && cityIds.length) {
      const city = focusCity && r.rnd() < 0.6 ? focusCity : cityIds[Math.floor(r.rnd() * cityIds.length)];
      const busy = new Set(r.items.filter((i) => i.city === city).map((i) => i.kind));
      const options = ALL_EFFECT_KINDS.filter((k) => !busy.has(k));
      if (options.length && r.items.length < maxConcurrent) {
        const kind = options[Math.floor(r.rnd() * options.length)];
        const env = ENVELOPES[kind];
        r.items.push({ id: ++r.id, city, kind, start: r.next, peak: env.peak[0] + r.rnd() * (env.peak[1] - env.peak[0]) });
        r.heads.push({ year: base.year, text: HEADLINES[kind](opts.cityNames?.[city] ?? city), city });
        r.heads = r.heads.slice(-20);
      }
      r.next += every[0] + r.rnd() * (every[1] - every[0]);
    }
  }

  if (!enabled) return base;
  const live: CityEffect[] = r.items
    .map((it) => ({ city: it.city, kind: it.kind, intensity: Math.round(envelopeAt(ENVELOPES[it.kind], it.peak, now - it.start) * 20) / 20, sinceYear: base.year }))
    .filter((e) => e.intensity > 0);
  return { ...base, activeCityEffects: [...base.activeCityEffects, ...live], headlines: [...base.headlines, ...r.heads] };
}

export { EFFECT_INFO };
