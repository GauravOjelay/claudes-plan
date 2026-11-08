import { describe, expect, it } from 'vitest';
import type { CityEffectKind, CityEffect } from '../contracts';
import { mockCities, mockWorldState } from '../contracts/mocks';
import { cityTimelineItems } from './CityTimeline';
import { windowLight } from './CityView';
import { buildScene } from './scene';
import { ALL_EFFECT_KINDS, EFFECT_INFO, effectsForCity } from './util';
import { EFFECT_RENDERERS } from './effects';

const fx = (kinds: Partial<Record<CityEffectKind, number>>) =>
  new Map(Object.entries(kinds).map(([kind, intensity]) => [kind as CityEffectKind, { city: 'sf', kind, intensity, sinceYear: 2026 } as CityEffect]));

describe('scene', () => {
  it('is deterministic per city and has 3 HQ slots', () => {
    expect(buildScene('sf')).toEqual(buildScene('sf'));
    expect(buildScene('sf').buildings.filter((b) => b.kind === 'hq')).toHaveLength(3);
  });

  it('has a renderer and label for every CityEffectKind', () => {
    for (const k of ALL_EFFECT_KINDS) {
      expect(EFFECT_INFO[k]).toBeDefined();
      expect(Object.keys(EFFECT_RENDERERS[k]).length).toBeGreaterThan(0);
    }
  });
});

describe('window lighting', () => {
  const scene = buildScene('sf');
  const lit = (f: ReturnType<typeof fx>) =>
    scene.buildings.filter((b) => b.kind !== 'hq').flatMap((b) => b.windows.map((w) => windowLight(b, w, f))).filter((l) => l === 'lit').length;

  it('blackout darkens the city but never the HQs', () => {
    expect(lit(fx({ blackout: 1 }))).toBeLessThan(lit(fx({})) / 3);
    const hq = scene.buildings.find((b) => b.kind === 'hq')!;
    const hqLit = (f: ReturnType<typeof fx>) => hq.windows.filter((w) => windowLight(hq, w, f) === 'lit').length;
    expect(hqLit(fx({ blackout: 1 }))).toBe(hqLit(fx({})));
  });

  it('solar boom partly reverses a blackout', () => {
    expect(lit(fx({ blackout: 0.8, solarBoom: 1 }))).toBeGreaterThan(lit(fx({ blackout: 0.8 })));
  });

  it('ghost offices darken more floors as intensity rises', () => {
    expect(lit(fx({ ghostOffices: 0.9 }))).toBeLessThan(lit(fx({ ghostOffices: 0.3 })));
  });
});

describe('effectsForCity', () => {
  it('keeps the strongest effect per kind, clamped to 0-1, for that city only', () => {
    const state = {
      ...mockWorldState,
      activeCityEffects: [
        { city: 'sf', kind: 'flooding' as const, intensity: 0.2, sinceYear: 2026 },
        { city: 'sf', kind: 'flooding' as const, intensity: 1.7, sinceYear: 2027 },
        { city: 'beijing', kind: 'unrest' as const, intensity: 0.5, sinceYear: 2027 },
      ],
    };
    const m = effectsForCity(state, 'sf');
    expect([...m.keys()]).toEqual(['flooding']);
    expect(m.get('flooding')!.intensity).toBe(1);
  });
});

describe('cityTimelineItems', () => {
  it('collects local choices, local events and city effects in year order', () => {
    const state = {
      ...mockWorldState,
      choiceLog: [
        { year: 2028, decisionId: 'd1', optionId: 'a', companyId: 'novacore' },
        { year: 2027, decisionId: 'd2', optionId: 'b', companyId: 'dragonmind' }, // Beijing: excluded
      ],
      eventLog: [
        { year: 2027, eventId: 'e1', headline: 'Local thing', valence: 'negative' as const, popup: false },
        { year: 2029, eventId: 'e3', headline: 'Tagged local', valence: 'positive' as const, popup: false, city: 'sf' },
        { year: 2027, eventId: 'e2', headline: 'Elsewhere thing', valence: 'negative' as const, popup: false },
      ],
      headlines: [
        { year: 2027, text: 'Local thing', city: 'sf' },
        { year: 2027, text: 'Elsewhere thing', city: 'beijing' },
      ],
    };
    const items = cityTimelineItems(state, mockCities[0]);
    expect(items.map((i) => [i.year, i.type])).toEqual([[2026, 'effect'], [2027, 'event'], [2028, 'choice'], [2029, 'event']]);
  });
});

describe('3D layout', () => {
  it('is deterministic, has 3 HQs, a bank and a hospital, and keeps buildings out of the river', async () => {
    const { buildLayout3D, riverX, RIVER_W } = await import('./city3d/layout3d');
    const a = buildLayout3D('sf');
    expect(buildLayout3D('sf')).toEqual(a);
    expect(a.hq).toHaveLength(3);
    expect(a.buildings.filter((b) => b.kind === 4)).toHaveLength(1);
    expect(a.buildings.filter((b) => b.kind === 3)).toHaveLength(1);
    for (const b of a.buildings) for (const p of b.parts) expect(p.x - p.w / 2).toBeGreaterThan(riverX(p.z) + RIVER_W / 2);
  });
});

describe('event demo envelopes', () => {
  it('floods build up, hold and recede, and outlast protests; searchlights (war) stay short', async () => {
    const { ENVELOPES, envelopeAt } = await import('./demo');
    const f = ENVELOPES.flooding;
    expect(f.dur).toBeGreaterThan(ENVELOPES.deepfakeProtests.dur * 2);
    expect(ENVELOPES.warBuildup.dur).toBeLessThan(40);
    expect(envelopeAt(f, 1, 0)).toBe(0);
    expect(envelopeAt(f, 1, f.dur * f.attack * 0.5)).toBeGreaterThan(0);
    expect(envelopeAt(f, 1, f.dur * f.attack * 0.5)).toBeLessThan(1); // still building up
    expect(envelopeAt(f, 1, f.dur * 0.5)).toBe(1); // peak
    expect(envelopeAt(f, 1, f.dur * 0.95)).toBeLessThan(0.5); // calming down
    expect(envelopeAt(f, 1, f.dur + 1)).toBe(0);
  });
});

describe('city roster', () => {
  it('gives every extra city 3 companies of its own, with a spread of good and weak firms', async () => {
    const { EXTRA_CITIES, EXTRA_COMPANIES, ALL_CITIES } = await import('./roster');
    expect(ALL_CITIES.length).toBeGreaterThanOrEqual(15);
    for (const c of EXTRA_CITIES) {
      expect(c.companyIds).toHaveLength(3);
      for (const id of c.companyIds) expect(EXTRA_COMPANIES.find((k) => k.id === id)?.homeCity).toBe(c.id);
    }
    const ids = EXTRA_COMPANIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(EXTRA_COMPANIES.some((c) => c.vars.safetyLevel >= 75 && c.vars.publicTrust >= 65)).toBe(true);
    expect(EXTRA_COMPANIES.some((c) => c.vars.safetyLevel <= 35 && c.vars.publicTrust <= 45)).toBe(true);
  });
});

describe('smooth effects', () => {
  it('eases intensity toward the target at a capped rate, never overshooting', async () => {
    const { easeToward, SMOOTH_RATE } = await import('./smoothEffects');
    expect(easeToward(0, 1, 1)).toBeCloseTo(SMOOTH_RATE);
    expect(easeToward(0.9, 1, 1)).toBe(1);
    expect(easeToward(1, 0, 0.5)).toBeCloseTo(1 - SMOOTH_RATE * 0.5);
    let v = 0;
    for (let i = 0; i < 100; i++) v = easeToward(v, 0.8, 0.05);
    expect(v).toBe(0.8);
  });
});

describe('pathway labels', () => {
  it('turns sim pathway ids into readable text', async () => {
    const { pathwayLabel } = await import('./util');
    expect(pathwayLabel('openSourcedMaterials')).toBe('Open materials science');
    expect(pathwayLabel('ubi')).toBe('Universal basic income');
    expect(pathwayLabel('someNewPathway')).toBe('Some new pathway');
  });
});
