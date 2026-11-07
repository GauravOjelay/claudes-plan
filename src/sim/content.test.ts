import { describe, expect, it } from 'vitest';
import type { CityEffectKind, Condition, Effect } from '../contracts';
import { ERAS } from '../contracts';
import { CITIES } from '../contracts/cities';
import { createInitialState, createRng, defaultContent, step } from './index';

const { decisions, events } = defaultContent;
const CITY_KINDS: CityEffectKind[] = [
  'blackout', 'ghostOffices', 'deepfakeProtests', 'gridlock', 'bankRun', 'warBuildup', 'outbreak', 'embargo', 'surveillance', 'solarBoom', 'flooding', 'unrest',
];
const REGION_KEYS = Object.keys(createInitialState(1, 'novacore').regions.US);
const GLOBAL_KEYS = Object.keys(createInitialState(1, 'novacore').global);
const COMPANY_KEYS = Object.keys(createInitialState(1, 'novacore').companies[0].vars);

const allEffects = (): Effect[] => [...decisions.flatMap((d) => d.options.flatMap((o) => o.effects)), ...events.flatMap((e) => e.effects)];

function pathwaysIn(c: Condition | undefined): string[] {
  if (!c) return [];
  if (c.kind === 'pathway') return [c.pathwayId];
  if (c.kind === 'all' || c.kind === 'any') return c.of.flatMap(pathwaysIn);
  if (c.kind === 'not') return pathwaysIn(c.of);
  return [];
}

describe('content size and shape', () => {
  it('has about 20 cards across both eras and 10 events', () => {
    expect(decisions.length).toBeGreaterThanOrEqual(20);
    expect(events.length).toBeGreaterThanOrEqual(10);
    expect(decisions.filter((d) => d.era === '2026-2030').length).toBeGreaterThanOrEqual(8);
    expect(decisions.filter((d) => d.era === '2031-2036').length).toBeGreaterThanOrEqual(8);
  });
  it('every card has a valid era, 2+ options with unique ids, and valid -1/0/1 hints', () => {
    for (const d of decisions) {
      expect(ERAS).toContain(d.era);
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.options.length).toBeGreaterThanOrEqual(2);
      expect(new Set(d.options.map((o) => o.id)).size).toBe(d.options.length);
      for (const o of d.options) {
        expect(o.effects.length).toBeGreaterThan(0);
        for (const h of [o.shortTerm, o.longTerm]) for (const v of Object.values(h)) expect([-1, 0, 1]).toContain(v);
      }
    }
  });
  it('contains the four named signature events', () => {
    const ids = events.map((e) => e.id);
    for (const id of ['blackout-belt', 'ghost-offices', 'deepfake-election', 'breakthrough-year']) expect(ids).toContain(id);
  });
});

describe('effects are well-formed', () => {
  it('all values are finite numbers, ops valid, delays positive whole years, targets real', () => {
    for (const e of allEffects()) {
      expect(typeof e.value).toBe('number');
      expect(Number.isFinite(e.value)).toBe(true);
      expect(['add', 'mul', 'set']).toContain(e.op);
      if (e.delayYears !== undefined) expect(Number.isInteger(e.delayYears) && e.delayYears > 0).toBe(true);
      if (e.target.scope === 'region') expect(REGION_KEYS).toContain(e.target.variable);
      if (e.target.scope === 'global') expect(GLOBAL_KEYS).toContain(e.target.variable);
      if (e.target.scope === 'company') expect(COMPANY_KEYS).toContain(e.target.variable);
    }
  });
  it('no effect sets takeoverRisk (it is derived)', () => {
    expect(allEffects().some((e) => e.target.scope === 'global' && e.target.variable === 'takeoverRisk')).toBe(false);
  });
  it('multipliers are sane (0.5 to 50) and adds are bounded', () => {
    for (const e of allEffects()) {
      if (e.op === 'mul') expect(e.value >= 0.5 && e.value <= 50).toBe(true);
      if (e.op === 'add') expect(Math.abs(e.value)).toBeLessThanOrEqual(200);
    }
  });
});

describe('events', () => {
  it('have unique ids, chances in (0, 1], real cities and city-effect kinds', () => {
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
    const cityIds = CITIES.map((c) => c.id);
    for (const e of events) {
      expect(e.chancePerTurn).toBeGreaterThan(0);
      expect(e.chancePerTurn).toBeLessThanOrEqual(1);
      expect(e.headline.length).toBeGreaterThan(10);
      if (e.cityEffect) {
        expect(cityIds).toContain(e.cityEffect.city);
        expect(CITY_KINDS).toContain(e.cityEffect.kind);
        expect(e.cityEffect.intensity).toBeGreaterThan(0);
        expect(e.cityEffect.intensity).toBeLessThanOrEqual(1);
      }
    }
  });
  it('at least one positive event for every two negative ones (plan 7.4)', () => {
    const pos = events.filter((e) => e.valence === 'positive').length;
    const neg = events.filter((e) => e.valence === 'negative').length;
    expect(neg).toBeLessThanOrEqual(2 * pos);
  });
  it('every event is caused or shaped by a decision or by variables decisions move (no pure-chance event)', () => {
    for (const e of events) expect(e.trigger.kind === 'year').toBe(false);
  });
});

describe('pathways are all reachable', () => {
  const unlocked = new Set(decisions.flatMap((d) => d.options.flatMap((o) => o.unlocks ?? [])));
  it('every pathway named in a requirement or trigger is unlocked by some option', () => {
    const named = [...decisions.flatMap((d) => pathwaysIn(d.requirements)), ...events.flatMap((e) => pathwaysIn(e.trigger))];
    expect(named.length).toBeGreaterThan(0);
    for (const p of named) expect(unlocked.has(p)).toBe(true);
  });
  it('each option can be chosen (requirements permitting) without the sim throwing', () => {
    for (const d of decisions) {
      for (const o of d.options) {
        const s = createInitialState(1, 'novacore');
        s.year = 2034;
        s.companies[0].vars.aiCapability = 40;
        s.unlockedPathways = [...unlocked];
        expect(() => step(s, [{ decisionId: d.id, optionId: o.id, companyId: 'novacore' }], createRng(1))).not.toThrow();
      }
    }
  });
});

describe('signature event chains (decision -> consequence)', () => {
  const choose = (decisionId: string, optionId: string) => ({ decisionId, optionId, companyId: 'novacore' });
  const run = (seed: number, first: ReturnType<typeof choose>[], years: number, tweak?: (s: ReturnType<typeof createInitialState>) => void) => {
    let s = createInitialState(seed, 'novacore');
    tweak?.(s);
    for (let i = 0; i < years && !s.status.over; i++) s = step(s, i === 0 ? first : [], createRng(seed * 1000 + i));
    return s;
  };
  const fired = (s: ReturnType<typeof run>, id: string): boolean => s.eventLog.some((e) => e.eventId === id);
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

  it('Ghost offices: only after selling replacement agents', () => {
    expect(seeds.some((sd) => fired(run(sd, [choose('job-automation', 'sellAgents')], 6), 'ghost-offices'))).toBe(true);
    expect(seeds.some((sd) => fired(run(sd, [choose('job-automation', 'assistTools')], 6), 'ghost-offices'))).toBe(false);
  });
  it('Deepfake election: only after loosening the content policy', () => {
    const t = (s: ReturnType<typeof run>): void => { s.year = 2028; };
    expect(seeds.some((sd) => fired(run(sd, [choose('content-policy', 'loosen')], 4, t), 'deepfake-election'))).toBe(true);
    expect(seeds.some((sd) => fired(run(sd, [choose('content-policy', 'tighten')], 4, t), 'deepfake-election'))).toBe(false);
  });
  it('Breakthrough year: only after open-sourcing the materials model, and it eases the grid', () => {
    const t = (s: ReturnType<typeof run>): void => { s.year = 2028; };
    const hit = seeds.map((sd) => run(sd, [choose('materials-model', 'openMaterials')], 3, t)).filter((s) => fired(s, 'breakthrough-year'));
    expect(hit.length).toBeGreaterThan(0);
    expect(hit[0].activeCityEffects.some((e) => e.kind === 'solarBoom' && e.city === 'sf')).toBe(true);
    expect(seeds.some((sd) => fired(run(sd, [choose('materials-model', 'keepMaterials')], 3, t), 'breakthrough-year'))).toBe(false);
  });
  it('once-only events fire at most once per game', () => {
    for (const sd of seeds) {
      const s = run(sd, [choose('job-automation', 'sellAgents')], 10);
      expect(s.eventLog.filter((e) => e.eventId === 'ghost-offices').length).toBeLessThanOrEqual(1);
    }
  });
});
