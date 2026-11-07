import { describe, expect, it } from 'vitest';
import type { CityEffect, CityEffectKind, GameEvent, WorldState } from '../contracts';
import { BLACKOUT_REPAIR_FADE, EFFECT_PROFILES, peaksFromEvents, startIntensity, updateCityEffects } from './cityEffects';
import { createInitialState, createRng, createStep } from './index';

const KINDS = Object.keys(EFFECT_PROFILES) as CityEffectKind[];
const fresh = (): WorldState => createInitialState(1, 'novacore');
const effect = (kind: CityEffectKind, city = 'london', year = 2026): CityEffect => ({ city, kind, intensity: 0, sinceYear: year });

/** Follow one effect for up to 40 years from the moment an event of peak `peak` fires; returns intensity by year. */
function lifetime(kind: CityEffectKind, peak = 0.8): number[] {
  const peaks = new Map([[`london|${kind}`, peak]]);
  const s = fresh();
  const e = { ...effect(kind), intensity: startIntensity(kind, peak) };
  s.activeCityEffects = [e];
  const out = [e.intensity];
  for (let i = 0; i < 40 && s.activeCityEffects.length > 0; i++) {
    s.year += 1;
    updateCityEffects(s, peaks);
    out.push(s.activeCityEffects[0]?.intensity ?? 0);
  }
  return out;
}
/** Years the effect stays visible (intensity above zero). */
const years = (kind: CityEffectKind): number => lifetime(kind).filter((x) => x > 0).length;

describe('profiles', () => {
  it('cover every CityEffectKind with sane numbers', () => {
    expect(KINDS).toHaveLength(12);
    for (const k of KINDS) {
      const p = EFFECT_PROFILES[k];
      expect(Number.isInteger(p.build) && p.build >= 0).toBe(true);
      expect(Number.isInteger(p.hold) && p.hold >= 0).toBe(true);
      expect(p.decay).toBeGreaterThan(0);
      expect(p.decay).toBeLessThanOrEqual(1);
    }
  });
  it('different kinds last different lengths: gridlock < protests < outbreak < war build-up < flooding', () => {
    const [gridlock, protests, unrest, bankRun] = [years('gridlock'), years('deepfakeProtests'), years('unrest'), years('bankRun')];
    expect(gridlock).toBeLessThanOrEqual(2);
    expect(bankRun).toBeLessThanOrEqual(3);
    expect(gridlock).toBeLessThan(protests);
    expect(protests).toBeLessThanOrEqual(4);
    expect(unrest).toBeLessThanOrEqual(4);
    expect(protests).toBeLessThan(years('outbreak'));
    expect(years('outbreak')).toBeLessThan(years('warBuildup'));
    expect(years('warBuildup')).toBeLessThan(years('flooding'));
    expect(years('flooding')).toBeGreaterThanOrEqual(15); // "builds up and lasts several years"
    expect(years('surveillance')).toBeGreaterThanOrEqual(10);
  });
  it('short effects are all shorter than long ones', () => {
    const shortest = ['gridlock', 'bankRun', 'deepfakeProtests', 'unrest'] as CityEffectKind[];
    const longest = ['flooding', 'surveillance', 'ghostOffices', 'warBuildup'] as CityEffectKind[];
    for (const s of shortest) for (const l of longest) expect(years(s)).toBeLessThan(years(l));
  });
});

describe('build-up, hold and decay', () => {
  it('flooding builds up visibly: it starts below its peak, climbs year by year, holds, then calms', () => {
    const path = lifetime('flooding', 0.9);
    const { build, hold } = EFFECT_PROFILES.flooding;
    expect(path[0]).toBeLessThan(0.9);
    for (let i = 1; i <= build; i++) expect(path[i]).toBeGreaterThan(path[i - 1]); // climbing
    expect(path[build]).toBeCloseTo(0.9, 6); // reaches the peak
    for (let i = build; i <= build + hold; i++) expect(path[i]).toBeCloseTo(0.9, 6); // holds
    expect(path[build + hold + 1]).toBeLessThan(0.9); // then calms
    expect(Math.max(...path)).toBeLessThanOrEqual(0.9 + 1e-9); // never overshoots
    expect(path[path.length - 1]).toBe(0); // and goes away eventually
  });
  it('protests hit at full strength at once, then die out quickly', () => {
    const path = lifetime('deepfakeProtests', 0.8);
    expect(path[0]).toBeCloseTo(0.8, 6);
    expect(path[1]).toBeLessThan(path[0]);
    expect(path.filter((x) => x > 0).length).toBeLessThanOrEqual(4);
  });
  it('intensity always stays within 0-1 and removal happens at zero', () => {
    for (const k of KINDS) for (const x of lifetime(k, 1)) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1); }
    const s = fresh();
    s.activeCityEffects = [{ ...effect('gridlock'), intensity: 0.2 }];
    s.year += 1;
    updateCityEffects(s, new Map());
    expect(s.activeCityEffects).toEqual([]);
  });
  it('a blackout follows its cause: it clears fast once the grid is repaired, even during its hold', () => {
    const s = fresh();
    s.regions.UK.energy = 5;
    s.activeCityEffects = [{ ...effect('blackout'), intensity: 0.6 }];
    s.year += 1;
    updateCityEffects(s, new Map([['london|blackout', 0.6]]));
    expect(s.activeCityEffects[0].intensity).toBeCloseTo(0.6 - BLACKOUT_REPAIR_FADE, 6);
  });
});

describe('overlap: several effects in one city, each on its own clock', () => {
  it('protests, a war build-up and a solar boom in London run side by side, then drop out in their own order', () => {
    const peaks = new Map<string, number>([['london|deepfakeProtests', 0.8], ['london|warBuildup', 0.7], ['london|solarBoom', 0.6]]);
    const s = fresh();
    s.activeCityEffects = [
      { ...effect('deepfakeProtests'), intensity: startIntensity('deepfakeProtests', 0.8) },
      { ...effect('warBuildup'), intensity: startIntensity('warBuildup', 0.7) },
      { ...effect('solarBoom'), intensity: startIntensity('solarBoom', 0.6) },
    ];
    expect(s.activeCityEffects.filter((e) => e.city === 'london')).toHaveLength(3);
    const gone: Partial<Record<CityEffectKind, number>> = {};
    for (let y = 1; y <= 30; y++) {
      s.year += 1;
      updateCityEffects(s, peaks);
      for (const k of ['deepfakeProtests', 'warBuildup', 'solarBoom'] as CityEffectKind[]) {
        if (gone[k] === undefined && !s.activeCityEffects.some((e) => e.kind === k)) gone[k] = y;
      }
      if (y === 2) { // protests already fading while war is still building: they truly overlap
        const byKind = Object.fromEntries(s.activeCityEffects.map((e) => [e.kind, e.intensity]));
        expect(byKind.deepfakeProtests).toBeLessThan(0.8);
        expect(byKind.warBuildup).toBeGreaterThan(0.4);
        expect(Object.keys(byKind)).toHaveLength(3);
      }
    }
    expect(gone.deepfakeProtests!).toBeLessThan(gone.solarBoom!);
    expect(gone.solarBoom!).toBeLessThanOrEqual(gone.warBuildup!);
  });
  it('different cities are independent', () => {
    const peaks = new Map<string, number>([['london|gridlock', 0.8], ['sf|gridlock', 0.8]]);
    const s = fresh();
    s.activeCityEffects = [
      { city: 'london', kind: 'gridlock', intensity: 0.8, sinceYear: 2026 },
      { city: 'sf', kind: 'gridlock', intensity: 0.8, sinceYear: 2026 },
    ];
    s.year += 1;
    updateCityEffects(s, peaks);
    expect(s.activeCityEffects.map((e) => e.city).sort()).toEqual(['london', 'sf']);
  });
  it('the sim can have several effects active in one city at once, and does not duplicate a live one', () => {
    const ev = (id: string, kind: CityEffectKind): GameEvent => ({
      id, valence: 'negative', trigger: { kind: 'year', cmp: '>=', value: 2026 }, chancePerTurn: 1, effects: [], headline: `${id} headline here`,
      cityEffect: { city: 'london', kind, intensity: 0.8 },
    });
    const sim = createStep({ decisions: [], events: [ev('a', 'deepfakeProtests'), ev('b', 'warBuildup'), ev('c', 'surveillance')] });
    let s = sim(fresh(), [], createRng(1));
    expect(s.activeCityEffects.filter((e) => e.city === 'london').map((e) => e.kind).sort()).toEqual(['deepfakeProtests', 'surveillance', 'warBuildup']);
    for (let i = 0; i < 4; i++) s = sim(s, [], createRng(2 + i));
    const counts = new Map<string, number>();
    for (const e of s.activeCityEffects) counts.set(`${e.city}|${e.kind}`, (counts.get(`${e.city}|${e.kind}`) ?? 0) + 1);
    for (const n of counts.values()) expect(n).toBe(1); // never two of the same kind in the same city
  });
  it('the peak comes from the event data', () => {
    const peaks = peaksFromEvents([
      { id: 'x', valence: 'negative', trigger: { kind: 'year', cmp: '>=', value: 2026 }, chancePerTurn: 1, effects: [], headline: 'x headline here', cityEffect: { city: 'sf', kind: 'flooding', intensity: 0.4 } },
      { id: 'y', valence: 'negative', trigger: { kind: 'year', cmp: '>=', value: 2026 }, chancePerTurn: 1, effects: [], headline: 'y headline here', cityEffect: { city: 'sf', kind: 'flooding', intensity: 0.9 } },
    ]);
    expect(peaks.get('sf|flooding')).toBe(0.9);
  });
});
