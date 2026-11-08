import { describe, expect, it } from 'vitest';
import type { PlayerChoice, WorldState } from '../contracts';
import { COMPANY_ROSTER } from '../contracts/cities';
import { createInitialState, createStep, defaultContent, rngForTurn, step } from './index';
import { deriveTakeoverRisk, groupSafety } from './endings';
import { TUNING, concentration, companyEconomy } from './rules';
import { GROUP_DAMPING, companySize, directedCompanies, groupWeight } from './vars';

/** The player runs every company (owner decision 2026-11-08): these tests cover steering 1 to 17 of them in one year. */
const fresh = (seed = 1): WorldState => createInitialState(seed, 'closedai');
const NONE = createStep({ decisions: [], events: [] });
const ch = (companyId: string, optionId = 'staged', decisionId = 'datacentre-campus'): PlayerChoice => ({ decisionId, optionId, companyId });
const co = (s: WorldState, id: string) => s.companies.find((c) => c.id === id)!;

describe('groups of companies', () => {
  it('directedCompanies is the flagship, plus every company that has had a decision', () => {
    const s = fresh();
    expect(directedCompanies(s).map((c) => c.id)).toEqual(['closedai']);
    const next = step(s, [ch('pineapple'), ch('cancer')], rngForTurn(s));
    expect(directedCompanies(next).map((c) => c.id).sort()).toEqual(['cancer', 'closedai', 'pineapple']);
  });

  it('every roster company can be given a decision', () => {
    const s = fresh();
    const all = COMPANY_ROSTER.map((c) => ch(c.id));
    const next = step(s, all, rngForTurn(s));
    expect(next.choiceLog).toHaveLength(COMPANY_ROSTER.length);
    expect(directedCompanies(next)).toHaveLength(COMPANY_ROSTER.length);
  });

  it('company effects land on the company that decided, not on the flagship', () => {
    const s = fresh();
    const next = NONE(s, [], rngForTurn(s)); // baseline with no decisions
    const one = createStep(defaultContent)(s, [ch('mvidia', 'staged')], rngForTurn(s)); // staged: money -40
    const ref = createStep(defaultContent)(s, [], rngForTurn(s));
    expect(co(one, 'mvidia').vars.money).toBeLessThan(co(ref, 'mvidia').vars.money);
    expect(co(one, 'closedai').vars.money).toBe(co(ref, 'closedai').vars.money);
    expect(next.year).toBe(s.year + 1);
  });

  it('money and company-value changes scale with company size (a start-up does not pay a lab\'s bill)', () => {
    const s = fresh();
    const small = createStep(defaultContent)(s, [ch('cancer', 'staged')], rngForTurn(s)); // staged: money -40
    const big = createStep(defaultContent)(s, [ch('pineapple', 'staged')], rngForTurn(s));
    const none = createStep(defaultContent)(s, [], rngForTurn(s));
    const dSmall = co(small, 'cancer').vars.money - co(none, 'cancer').vars.money;
    const dBig = co(big, 'pineapple').vars.money - co(none, 'pineapple').vars.money;
    expect(dSmall).toBeCloseTo(-40 * companySize('cancer'), 6);
    expect(dBig).toBeCloseTo(-40 * companySize('pineapple'), 6);
    expect(companySize('closedai')).toBe(1);
  });

  it('delayed effects still hit the company that chose them, years later', () => {
    const s = fresh();
    const a = createStep(defaultContent)(s, [ch('twelvelabs', 'clean', 'energy-source')], rngForTurn(s));
    expect(a.pending.length).toBeGreaterThan(0);
    expect((a.pending[0] as { companyId?: string }).companyId).toBe('twelvelabs');
    // clean: publicTrust +4 now, energy +8 later (region 'any' = the acting company's home region, UK)
    let t = a;
    const before = t.regions.UK.energy;
    for (let i = 0; i < 3; i++) t = createStep(defaultContent)(t, [], rngForTurn(t));
    expect(t.regions.UK.energy).toBeGreaterThan(before);
  });

  it('every choice is checked against the state at the start of the year', () => {
    // alignment-scare needs flagship aiCapability >= 30; an earlier choice in the same year must not decide that
    const s = fresh();
    s.year = 2029;
    s.companies[0].vars.aiCapability = 30;
    const first = ch('pineapple', 'fastTrack');
    const scare = { decisionId: 'alignment-scare', optionId: defaultContent.decisions.find((d) => d.id === 'alignment-scare')!.options[0].id, companyId: 'closedai' };
    expect(() => createStep(defaultContent)(s, [first, scare], rngForTurn(s))).not.toThrow();
    // and an illegal choice is still refused
    s.companies[0].vars.aiCapability = 5;
    expect(() => createStep(defaultContent)(s, [scare], rngForTurn(s))).toThrow(/Requirements/);
  });
});

describe('the bigger the group, the bigger the swing (but not unbounded)', () => {
  it('a single company has the full effect (the old single-company game)', () => {
    expect(groupWeight(1)).toBe(1);
    expect(groupWeight(0)).toBe(1);
  });
  it('n companies swing the world n^(1 - damping) times as hard as one', () => {
    for (const n of [2, 3, 8, 17]) {
      expect(n * groupWeight(n)).toBeCloseTo(n ** (1 - GROUP_DAMPING), 9);
      expect(n * groupWeight(n)).toBeGreaterThan(1);
      expect(n * groupWeight(n)).toBeLessThan(n);
    }
  });
  it('the same decision for 3 companies moves a region more than for 1, and less than 3 times as much', () => {
    const s = fresh();
    const gain = (ids: string[]) => {
      const next = createStep(defaultContent)(s, ids.map((id) => ch(id, 'staged')), rngForTurn(s)); // staged: US trust +2
      const none = createStep(defaultContent)(s, [], rngForTurn(s));
      return next.regions.US.publicTrust - none.regions.US.publicTrust;
    };
    const one = gain(['closedai']);
    const three = gain(['closedai', 'cancer', 'pineapple']);
    expect(three).toBeGreaterThan(one);
    expect(three).toBeLessThan(3 * one);
  });
});

describe('takeover risk and endings follow the companies the player directs', () => {
  it('takeover safety is the mean over the directed group (just the flagship at first)', () => {
    const s = fresh();
    expect(groupSafety(s)).toBe(co(s, 'closedai').vars.safetyLevel);
    const next = step(s, [ch('spacey', 'staged'), ch('shallowseek', 'staged')], rngForTurn(s));
    const mean = (co(next, 'closedai').vars.safetyLevel + co(next, 'spacey').vars.safetyLevel + co(next, 'shallowseek').vars.safetyLevel) / 3;
    expect(groupSafety(next)).toBeCloseTo(mean, 9);
  });
  it('risk falls when the directed group is safer', () => {
    const s = fresh();
    s.global.aiCapability = 60; s.global.robotCount = 1e9;
    const lowSafety = structuredClone(s); lowSafety.companies[0].vars.safetyLevel = 10;
    const highSafety = structuredClone(s); highSafety.companies[0].vars.safetyLevel = 90;
    expect(deriveTakeoverRisk(lowSafety)).toBeGreaterThan(deriveTakeoverRisk(highSafety));
  });
  it('one bankrupt company is a headline; most going under ends the game; the score averages all companies', () => {
    const s = fresh();
    const rich = NONE(s, [], rngForTurn(s)).status.score;
    expect(rich).toBeUndefined();
    const few = structuredClone(s);
    few.companies[1].vars.money = -1;
    expect(NONE(few, [], rngForTurn(few)).status.over).toBe(false);
    const most = structuredClone(s);
    const n = most.companies.length;
    const half = Math.floor(n / 2) + 1;
    for (const c of most.companies.slice(0, half)) c.vars.money = -1;
    const over = NONE(most, [], rngForTurn(most));
    expect(over.status).toMatchObject({ over: true, ending: 'bankrupt' });
    expect(over.status.reason).toContain(`${half} of your ${n} companies`);
  });
  it('the state takes the companies over when most of the ones the player steers sit in a region regulated to the limit', () => {
    const s = fresh();
    s.regions.US.regulationStrictness = 100; // the flagship alone is in the US
    expect(NONE(s, [], rngForTurn(s)).status.ending).toBe('nationalised');
    const t = fresh();
    t.regions.UK.regulationStrictness = 100; // a UK firm the player does not steer: not counted
    expect(NONE(t, [], rngForTurn(t)).status.over).toBe(false);
    const mixed = fresh();
    mixed.choiceLog = ['cancer', 'twelvelabs', 'shallowseek'].map((companyId) => ({ year: 2026, decisionId: 'x', optionId: 'y', companyId }));
    mixed.regions.US.regulationStrictness = 100; // 2 of the 4 steered companies: not a majority
    expect(NONE(mixed, [], rngForTurn(mixed)).status.over).toBe(false);
    mixed.choiceLog.push({ year: 2026, decisionId: 'x', optionId: 'y', companyId: 'pineapple' }); // 3 of 5
    expect(NONE(mixed, [], rngForTurn(mixed)).status.ending).toBe('nationalised');
  });
});

describe('every company has its own books', () => {
  it('each company earns and spends by its own size, and the flagship is unchanged', () => {
    const s = fresh();
    const before = structuredClone(s.companies);
    companyEconomy.apply(s);
    for (const c of s.companies) {
      const b = before.find((x) => x.id === c.id)!;
      const size = companySize(c.id);
      const expected = TUNING.incomeRate * b.vars.companyValue * (b.vars.publicTrust / 60) - (TUNING.burnBase + TUNING.burnPerCapability * b.vars.aiCapability) * size;
      expect(c.vars.money - b.vars.money).toBeCloseTo(expected, 9);
    }
    const f = s.companies.find((c) => c.id === 'closedai')!;
    expect(f.vars.money).toBeCloseTo(500 + 0.1 * 100 * (60 / 60) - (12 + 0.4 * 10), 9);
  });
  it('the small companies stay solvent on their own for the whole game', () => {
    let s = fresh();
    while (!s.status.over) s = step(s, [], rngForTurn(s));
    for (const c of s.companies) expect(c.vars.money, c.name).toBeGreaterThan(0);
  });
});

describe('running the whole industry concentrates wealth', () => {
  it('a player steering most of a region\'s AI company value widens the gap there; the flagship alone does not', () => {
    const rule = (s: WorldState) => { const before = s.regions.US.wealthGap; concentration.apply(s); return s.regions.US.wealthGap - before; };
    const alone = fresh();
    const all = fresh();
    all.choiceLog = COMPANY_ROSTER.map((c) => ({ year: 2026, decisionId: 'x', optionId: 'y', companyId: c.id }));
    expect(rule(all)).toBeGreaterThan(rule(alone));
    // the flagship alone owns ~7% of US company value, under the free share, so there is no monopoly term
    expect(TUNING.monopolyFreeShare).toBeGreaterThan(0.07);
  });
});
