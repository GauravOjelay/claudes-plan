/**
 * City effect lifecycle. The CityEffect contract is unchanged ({ city, kind, intensity 0-1, sinceYear }); only how the
 * sim moves `intensity` over the years changes, and it now differs by kind:
 *
 *   intensity
 *   peak |        ___________
 *        |      /            \\
 *        |    /                \\___
 *        |  /                       \\___
 *        +--build----hold----decay------> years since the event
 *
 * - build: years the effect takes to climb to its peak (0 = it hits at full strength at once)
 * - hold: years it stays at its peak after building up
 * - decay: intensity lost per year afterwards (0.1 means about ten years from a full-strength effect)
 * The peak is the `intensity` the event data asks for (data/events.json). Effects of different kinds in the same city
 * (or different cities) are independent: each follows its own profile, so they overlap freely.
 */
import type { CityEffect, CityEffectKind, GameEvent, WorldState } from '../contracts';
import { CITIES } from '../contracts/cities';

export interface EffectProfile {
  build: number;
  hold: number;
  decay: number;
}

/** Longer, slower things (floods, surveillance, empty offices) build up and last; sudden things (gridlock, protests) are short. */
export const EFFECT_PROFILES: Record<CityEffectKind, EffectProfile> = {
  blackout: { build: 0, hold: 0, decay: 0.1 }, // hits at once, lingers until the grid is repaired
  gridlock: { build: 0, hold: 0, decay: 0.7 }, // very short: a day or two of stalled cars
  bankRun: { build: 0, hold: 0, decay: 0.5 }, // short: queues clear within a year or two
  deepfakeProtests: { build: 0, hold: 0, decay: 0.35 }, // short: protests flare and burn out
  unrest: { build: 0, hold: 0, decay: 0.35 }, // short
  outbreak: { build: 1, hold: 1, decay: 0.25 }, // spreads, peaks, then is brought under control
  embargo: { build: 1, hold: 2, decay: 0.12 }, // ports go quiet for a few years
  warBuildup: { build: 2, hold: 2, decay: 0.12 }, // escalates over several years, then slowly de-escalates
  ghostOffices: { build: 2, hold: 2, decay: 0.1 }, // floor by floor, then a long hangover
  solarBoom: { build: 1, hold: 2, decay: 0.1 }, // panels spread over a couple of years
  flooding: { build: 3, hold: 3, decay: 0.05 }, // builds up visibly, then a long slow recovery
  surveillance: { build: 2, hold: 3, decay: 0.06 }, // cameras sprout, and stay for a long time
};

/** A blackout clears this fast once its region's grid is no longer short (the picture follows the cause). */
export const BLACKOUT_REPAIR_FADE = 0.3;

const round3 = (x: number): number => Math.round(x * 1000) / 1000;
const key = (city: string, kind: CityEffectKind): string => `${city}|${kind}`;

/** Peak intensity per (city, kind), taken from the event data. */
export function peaksFromEvents(events: GameEvent[]): Map<string, number> {
  const peaks = new Map<string, number>();
  for (const e of events) {
    if (!e.cityEffect) continue;
    const k = key(e.cityEffect.city, e.cityEffect.kind);
    peaks.set(k, Math.max(peaks.get(k) ?? 0, e.cityEffect.intensity));
  }
  return peaks;
}

/** Intensity an effect starts with when its event fires: full strength if it has no build-up, else the first rung. */
export function startIntensity(kind: CityEffectKind, peak: number): number {
  const { build } = EFFECT_PROFILES[kind];
  return round3(build === 0 ? peak : peak / (build + 1));
}

/**
 * Move every active effect one year along its profile (mutates `state`, which callers pass as a clone).
 * Effects that reach zero are removed.
 */
export function updateCityEffects(state: WorldState, peaks: Map<string, number>): void {
  for (const e of state.activeCityEffects) {
    const { build, hold, decay } = EFFECT_PROFILES[e.kind];
    const peak = peaks.get(key(e.city, e.kind)) ?? e.intensity;
    const age = state.year - e.sinceYear; // 1 on the first update after the event fired
    const region = CITIES.find((c) => c.id === e.city)?.region;
    const repaired = e.kind === 'blackout' && region !== undefined && state.regions[region].energy >= 0;
    if (!repaired && age >= 1 && age <= build) {
      e.intensity = round3(peak * Math.min(1, (age + 1) / (build + 1))); // still building up
    } else if (!repaired && age >= 1 && age <= build + hold) {
      e.intensity = round3(peak); // holding at the peak
    } else {
      e.intensity = round3(e.intensity - (repaired ? BLACKOUT_REPAIR_FADE : decay)); // decaying
    }
  }
  state.activeCityEffects = state.activeCityEffects.filter((e: CityEffect) => e.intensity > 0);
}
