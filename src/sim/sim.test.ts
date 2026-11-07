import { describe, expect, it } from 'vitest';
import type { PlayerChoice, WorldState } from '../contracts';
import { COMPANY_ROSTER } from '../contracts/cities';
import { createInitialState, createRng, createStep, defaultContent, rngForTurn, step } from './index';
import { computeScore, deriveTakeoverRisk } from './endings';
import { TUNING, automation, companyEconomy, concentration, energyLimit, gdpGrowth, riots, robotGrowth, tensionDrift, trustAndRegulation, unrest, type Rule } from './rules';
import { END_YEAR, ENDING_THRESHOLDS, endingFit } from './endings';

const NONE = createStep({ decisions: [], events: [] }); // rules only, no events or cards
const fresh = (seed = 1): WorldState => createInitialState(seed, 'novacore');
const pick = (optionId: string): PlayerChoice => ({ decisionId: 'datacentre-campus', optionId, companyId: 'novacore' });

/** Play `years` turns, making `first` in year one. Uses rngForTurn so runs are reproducible. */
function play(seed: number, first: PlayerChoice[], years: number, stepFn = step): WorldState {
  let s = fresh(seed);
  for (let i = 0; i < years; i++) s = stepFn(s, i === 0 ? first : [], rngForTurn(s));
  return s;
}

describe('rng', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 200 }, () => a.next());
    expect(xs).toEqual(Array.from({ length: 200 }, () => b.next()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(createRng(43).next()).not.toBe(createRng(42).next());
  });
  it('accepts numeric strings (JSON) and rejects junk', () => {
    expect(createRng('7').next()).toBe(createRng(7).next());
    expect(() => createRng('abc')).toThrow();
    expect(() => createRng(Number.NaN)).toThrow();
  });
  it('rngForTurn depends only on seed and year', () => {
    const s = fresh(5);
    expect(rngForTurn(s).next()).toBe(rngForTurn({ seed: 5, year: 2026 }).next());
    expect(rngForTurn(s).next()).not.toBe(rngForTurn({ seed: 5, year: 2027 }).next());
  });
});

describe('createInitialState', () => {
  it('builds companies from the roster, all ten regions and one history row', () => {
    const s = fresh();
    expect(s.year).toBe(2026);
    expect(s.companies.map((c) => c.id)).toEqual(COMPANY_ROSTER.map((c) => c.id));
    expect(Object.keys(s.regions)).toHaveLength(10);
    expect(s.history).toHaveLength(1);
    expect(s.status.over).toBe(false);
  });
  it('rejects unknown and non-playable companies, and does not alias the roster', () => {
    expect(() => createInitialState(1, 'nope')).toThrow();
    expect(() => createInitialState(1, 'silicara')).toThrow();
    const s = fresh();
    s.companies[0].vars.money = -1;
    expect(COMPANY_ROSTER[0].vars.money).toBe(500);
  });
  it('picks all three outlooks across seeds, deterministically', () => {
    const seen = new Set(Array.from({ length: 60 }, (_, i) => fresh(i).outlook));
    expect(seen).toEqual(new Set(['severeShock', 'middle', 'overblown']));
    expect(fresh(9).outlook).toBe(fresh(9).outlook);
  });
});

describe('step: purity and determinism', () => {
  it('never mutates its input', () => {
    const s = fresh();
    const before = JSON.stringify(s);
    step(s, [pick('fastTrack')], createRng(1));
    expect(JSON.stringify(s)).toBe(before);
  });
  it('same seed + same choices = identical game', () => {
    expect(play(3, [pick('fastTrack')], 8)).toEqual(play(3, [pick('fastTrack')], 8));
  });
  it('advances the year and records history', () => {
    const s = play(1, [], 3);
    expect(s.year).toBe(2029);
    expect(s.history.map((h) => h.year)).toEqual([2026, 2027, 2028, 2029]);
  });
  it('rejects unknown decisions, options and non-player companies', () => {
    const s = fresh();
    expect(() => step(s, [{ decisionId: 'x', optionId: 'y', companyId: 'novacore' }], createRng(1))).toThrow();
    expect(() => step(s, [pick('nope')], createRng(1))).toThrow();
    expect(() => step(s, [{ ...pick('staged'), companyId: 'silicara' }], createRng(1))).toThrow();
  });
});

describe('first milestone: card -> step -> variable -> CityEffect', () => {
  it('fast-tracking the campus changes a variable and later causes a blackout in SF', () => {
    const after = step(fresh(), [pick('fastTrack')], createRng(1));
    expect(after.regions.US.energy).toBe(-10);
    expect(after.choiceLog).toHaveLength(1);
    const blackouts = Array.from({ length: 30 }, (_, seed) => play(seed, [pick('fastTrack')], 4))
      .filter((s) => s.activeCityEffects.some((e) => e.city === 'sf' && e.kind === 'blackout'));
    expect(blackouts.length).toBeGreaterThan(20); // chance 0.6 a turn over several turns
    const hit = blackouts[0];
    expect(hit.eventLog[0]).toMatchObject({ eventId: 'blackout-belt', valence: 'negative', popup: true, city: 'sf' });
    expect(hit.headlines[hit.headlines.length - 1].city).toBe('sf');
  });
  it('the staged option never causes the blackout (the event is caused by the decision)', () => {
    for (let seed = 0; seed < 40; seed++) {
      expect(play(seed, [pick('staged')], 6).eventLog.some((e) => e.eventId === 'blackout-belt')).toBe(false);
    }
  });
  it('city effects fade and are not duplicated while one is live', () => {
    const s = play(2, [pick('fastTrack')], 6);
    const sf = s.activeCityEffects.filter((e) => e.kind === 'blackout');
    expect(sf.length).toBeLessThanOrEqual(1);
  });
});

/** Apply one rule on a copy of the state, in isolation from the other rules. */
function only(rule: Rule, s: WorldState): WorldState {
  const c = structuredClone(s);
  rule.apply(c);
  return c;
}

describe('rules (each in isolation)', () => {
  it('automation: capability raises software unemployment, scaled by outlook', () => {
    const run = (outlook: WorldState['outlook']): number => {
      const s = { ...fresh(), outlook };
      return only(automation, s).regions.US.unemploymentSoftware - s.regions.US.unemploymentSoftware;
    };
    expect(run('severeShock')).toBeGreaterThan(run('middle'));
    expect(run('middle')).toBeGreaterThan(run('overblown'));
    expect(run('overblown')).toBeGreaterThan(0);
  });
  it('automation: physical unemployment only moves once robots are plentiful', () => {
    const s = fresh();
    expect(only(automation, s).regions.US.unemploymentPhysical).toBe(s.regions.US.unemploymentPhysical);
    s.global.robotCount = 1e9;
    expect(only(automation, s).regions.US.unemploymentPhysical).toBeGreaterThan(s.regions.US.unemploymentPhysical);
  });
  it('energy limit: a short grid lowers trust and halves AI progress', () => {
    const ok = only(energyLimit, fresh());
    expect(ok.global.aiCapability - 10).toBe(TUNING.baseCapabilityGrowth);
    const s = fresh();
    s.regions.US.energy = -1;
    const short = only(energyLimit, s);
    expect(short.regions.US.publicTrust).toBe(s.regions.US.publicTrust - TUNING.blackoutTrustHit);
    expect(short.global.aiCapability - s.global.aiCapability).toBe(TUNING.baseCapabilityGrowth * TUNING.blackoutSlowdown);
  });
  it('riots: very low trust lowers GDP and raises tension', () => {
    const s = fresh();
    s.regions.CN.publicTrust = 5;
    const out = only(riots, s);
    expect(out.regions.CN.gdp).toBeLessThan(s.regions.CN.gdp);
    expect(out.global.geopoliticalTension).toBeGreaterThan(s.global.geopoliticalTension);
    expect(out.regions.US.gdp).toBe(s.regions.US.gdp);
  });
  it('unrest: high unemployment with no safety net lowers trust and raises the wealth gap; a safety net softens it', () => {
    const s = fresh();
    s.regions.US.unemploymentSoftware = 30;
    s.regions.US.unemploymentPhysical = 20;
    const bare = only(unrest, s);
    expect(bare.regions.US.publicTrust).toBeLessThan(s.regions.US.publicTrust);
    expect(bare.regions.US.wealthGap).toBeGreaterThan(s.regions.US.wealthGap);
    expect(bare.regions.CN.publicTrust).toBe(s.regions.CN.publicTrust); // calm elsewhere
    s.unlockedPathways.push('ubi');
    const net = only(unrest, s);
    expect(net.regions.US.publicTrust).toBeGreaterThan(bare.regions.US.publicTrust);
    expect(net.regions.US.wealthGap).toBeLessThan(bare.regions.US.wealthGap);
  });
  it('concentration: the wealth gap creeps up with capability', () => {
    const s = fresh();
    expect(only(concentration, s).regions.US.wealthGap).toBeGreaterThan(s.regions.US.wealthGap);
  });
  it('gdp growth: capability helps; unemployment and blackouts hurt', () => {
    const s = fresh();
    const base = only(gdpGrowth, s).regions.US.gdp / s.regions.US.gdp;
    expect(base).toBeGreaterThan(1);
    const jobless = structuredClone(s);
    jobless.regions.US.unemploymentSoftware = 60;
    expect(only(gdpGrowth, jobless).regions.US.gdp / s.regions.US.gdp).toBeLessThan(base);
    const dark = structuredClone(s);
    dark.regions.US.energy = -5;
    expect(only(gdpGrowth, dark).regions.US.gdp / s.regions.US.gdp).toBeLessThan(base);
    const smart = structuredClone(s);
    smart.global.aiCapability = 80;
    expect(only(gdpGrowth, smart).regions.US.gdp / s.regions.US.gdp).toBeGreaterThan(base);
  });
  it('robots multiply each year', () => {
    const s = fresh();
    expect(only(robotGrowth, s).global.robotCount).toBeCloseTo(s.global.robotCount * TUNING.robotGrowth);
  });
  it('tension drifts back toward its home value from both sides', () => {
    const hi = fresh();
    hi.global.geopoliticalTension = 70;
    const lo = fresh();
    lo.global.geopoliticalTension = 5;
    expect(only(tensionDrift, hi).global.geopoliticalTension).toBeLessThan(70);
    expect(only(tensionDrift, lo).global.geopoliticalTension).toBeGreaterThan(5);
  });
  it('trust recovers slowly and pushes regulation up', () => {
    const s = fresh();
    s.regions.US.publicTrust = 20;
    s.regions.US.regulationStrictness = 10;
    const out = only(trustAndRegulation, s);
    expect(out.regions.US.publicTrust).toBeGreaterThan(20);
    expect(out.regions.US.publicTrust).toBeLessThan(60);
    expect(out.regions.US.regulationStrictness).toBeGreaterThan(10);
  });
  it('company economy: income, burn, value and trust following the home region', () => {
    const s = fresh();
    const out = only(companyEconomy, s);
    expect(out.companies[0].vars.companyValue).toBeGreaterThan(100);
    s.regions.US.publicTrust = 10;
    s.companies[0].vars.publicTrust = 10;
    const unpopular = only(companyEconomy, s);
    expect(unpopular.companies[0].vars.publicTrust).toBeLessThan(60);
    expect(unpopular.companies[0].vars.companyValue).toBeLessThan(out.companies[0].vars.companyValue);
  });
  it('clamps percentages to 0-100', () => {
    const s = fresh();
    s.regions.US.unemploymentSoftware = 99.99;
    s.global.aiCapability = 1000;
    expect(only(automation, s).regions.US.unemploymentSoftware).toBe(100);
  });
  it('a full step stays finite and in range over the whole minimum-version game', () => {
    let s = fresh(11);
    while (!s.status.over) s = step(s, [], rngForTurn(s));
    expect(s.year).toBe(END_YEAR + 1);
    for (const v of Object.values(s.regions)) for (const x of Object.values(v)) expect(Number.isFinite(x)).toBe(true);
  });
});

describe('effects and conditions', () => {
  const content = {
    decisions: [{
      id: 'd', title: 't', text: 't', era: '2026-2030' as const,
      options: [{
        id: 'o', label: 'o', unlocks: ['p1'],
        effects: [
          { target: { scope: 'global' as const, variable: 'geopoliticalTension' as const }, op: 'add' as const, value: 10, delayYears: 2 },
          { target: { scope: 'global' as const, variable: 'takeoverRisk' as const }, op: 'set' as const, value: 99 },
        ],
        shortTerm: { economy: 0 as const, safety: 0 as const, publicTrust: 0 as const },
        longTerm: { economy: 0 as const, safety: 0 as const, publicTrust: 0 as const },
      }],
    }],
    events: [],
  };
  const sim = createStep(content);
  const choice: PlayerChoice = { decisionId: 'd', optionId: 'o', companyId: 'novacore' };
  it('delayed effects land after their delay, not before', () => {
    let s = sim(fresh(), [choice], createRng(1));
    expect(s.pending).toHaveLength(1);
    const base = (n: number): number => {
      let b = sim(fresh(), [], createRng(1));
      for (let i = 1; i < n; i++) b = sim(b, [], createRng(1));
      return b.global.geopoliticalTension;
    };
    s = sim(s, [], createRng(1)); // year 2027 -> 2028: not due yet (due 2028)
    expect(s.global.geopoliticalTension).toBeCloseTo(base(2), 6);
    s = sim(s, [], createRng(1));
    expect(s.global.geopoliticalTension).toBeGreaterThan(base(3) + 8); // +10, minus a little drift back
    expect(s.pending).toHaveLength(0);
    expect(s.unlockedPathways).toEqual(['p1']);
  });
  it('takeoverRisk is derived: an effect that sets it is overwritten', () => {
    expect(sim(fresh(), [choice], createRng(1)).global.takeoverRisk).toBeLessThan(5);
  });
  it('rejects string values instead of doing arithmetic on them', () => {
    const bad = createStep({
      ...content,
      decisions: [{ ...content.decisions[0], options: [{ ...content.decisions[0].options[0],
        effects: [{ target: { scope: 'global', variable: 'co2' }, op: 'add', value: '5' as unknown as number }] }] }],
    });
    expect(() => bad(fresh(), [choice], createRng(1))).toThrow(/finite number/);
  });
});

describe('takeover risk prerequisites', () => {
  const risk = (cap: number, safety: number, robots: number): number => {
    const s = fresh();
    s.global.aiCapability = cap;
    s.global.robotCount = robots;
    for (const c of s.companies) c.vars.safetyLevel = safety;
    return deriveTakeoverRisk(s);
  };
  it('is zero without robots, however capable and unsafe the AI is', () => {
    expect(risk(100, 0, 0)).toBe(0);
  });
  it('is zero when safety is perfect', () => {
    expect(risk(100, 100, 1e9)).toBe(0);
  });
  it('is maximal only with high capability, no safety and 1bn robots', () => {
    expect(risk(100, 0, 1e9)).toBe(100);
    expect(risk(100, 0, 1e9)).toBeGreaterThan(risk(100, 50, 1e9));
    expect(risk(100, 0, 1e9)).toBeGreaterThan(risk(100, 0, 1e8));
  });
});

/** Set a region variable everywhere. */
function everywhere(s: WorldState, key: keyof WorldState['regions']['US'], value: number): void {
  for (const r of Object.values(s.regions)) r[key] = value;
}
const T = ENDING_THRESHOLDS;

describe('endings and score', () => {
  it('bankruptcy ends the game with a score, and a finished game no longer changes', () => {
    const s = fresh();
    s.companies[0].vars.money = -5;
    const over = NONE(s, [], createRng(1));
    expect(over.status).toMatchObject({ over: true, ending: 'bankrupt' });
    const sc = over.status.score!;
    expect(sc.company).toBe(0);
    for (const v of Object.values(sc)) expect(v).toBeGreaterThanOrEqual(0);
    for (const v of Object.values(sc)) expect(v).toBeLessThanOrEqual(100);
    expect(NONE(over, [], createRng(1))).toEqual(over);
  });
  it('score parts stay in 0-100 and total is the weighted blend', () => {
    const sc = computeScore(fresh());
    expect(sc.total).toBeCloseTo(0.4 * sc.wellbeing + 0.3 * sc.company + 0.3 * sc.survival, 0);
    expect(sc.company).toBeGreaterThan(0);
  });
  it('the game keeps going until the year passes END_YEAR', () => {
    const s = fresh();
    s.year = END_YEAR - 1;
    expect(NONE(s, [], createRng(1)).status.over).toBe(false);
    s.year = END_YEAR;
    const over = NONE(s, [], createRng(1));
    expect(over.status.over).toBe(true);
    expect(over.status.score).toBeDefined();
    expect(over.status.reason).toBeTruthy();
  });
  it('WW3: extreme tension ends the game early', () => {
    const s = fresh();
    s.global.geopoliticalTension = 100;
    expect(NONE(s, [], createRng(1)).status.ending).toBe('ww3');
    s.global.geopoliticalTension = 60;
    expect(NONE(s, [], createRng(1)).status.over).toBe(false);
  });
  it('nationalised: maximum regulation in the home region ends the game', () => {
    const s = fresh();
    s.regions.US.regulationStrictness = 100;
    s.regions.US.publicTrust = 0; // keeps regulation pinned near 100 after trust and regulation drift
    expect(NONE(s, [], createRng(1)).status.ending).toBe('nationalised');
    const other = fresh();
    other.regions.CN.regulationStrictness = 100;
    other.regions.CN.publicTrust = 0;
    expect(NONE(other, [], createRng(1)).status.over).toBe(false); // only the home region counts
  });
  it('AI takeover needs low safety AND more than 1bn robots (and enough capability)', () => {
    const doom = (): WorldState => {
      const s = fresh();
      s.global.aiCapability = 100;
      s.global.robotCount = 5e9;
      for (const c of s.companies) c.vars.safetyLevel = 5;
      return s;
    };
    expect(NONE(doom(), [], createRng(1)).status.ending).toBe('aiTakeover');
    const fewRobots = doom();
    fewRobots.global.robotCount = T.takeoverRobots * 0.5;
    expect(NONE(fewRobots, [], createRng(1)).status.ending).not.toBe('aiTakeover');
    const safe = doom();
    for (const c of safe.companies) c.vars.safetyLevel = T.takeoverSafety + 30;
    expect(NONE(safe, [], createRng(1)).status.ending).not.toBe('aiTakeover');
    const weak = doom();
    weak.global.aiCapability = 5;
    expect(NONE(weak, [], createRng(1)).status.ending).not.toBe('aiTakeover');
  });
  const horizon = (setup: (s: WorldState) => void): WorldState => {
    const s = fresh();
    s.year = END_YEAR;
    setup(s);
    return NONE(s, [], createRng(1));
  };
  it('horizon: a fair, safe, trusting world is Abundance Utopia', () => {
    const o = horizon((s) => {
      everywhere(s, 'wealthGap', 10); everywhere(s, 'publicTrust', 90);
      everywhere(s, 'unemploymentSoftware', 0); everywhere(s, 'unemploymentPhysical', 0);
      for (const c of s.companies) c.vars.safetyLevel = 90;
      s.global.aiCapability = 90;
    });
    expect(o.status.ending).toBe('abundanceUtopia');
  });
  it('horizon: huge inequality and a very valuable company is Corporate Feudalism', () => {
    const o = horizon((s) => {
      everywhere(s, 'wealthGap', 90); everywhere(s, 'publicTrust', 40);
      s.companies[0].vars.companyValue = 400;
      for (const c of s.companies) c.vars.safetyLevel = 40;
    });
    expect(o.status.ending).toBe('corporateFeudalism');
  });
  it('horizon: kept safeguards, slow capability and low tension is the Slowdown', () => {
    const o = horizon((s) => {
      for (const c of s.companies) c.vars.safetyLevel = 95;
      s.global.aiCapability = 0;
      s.global.geopoliticalTension = 10;
    });
    expect(o.status.ending).toBe('slowdown');
  });
  it('endingFit values stay within 0-1', () => {
    for (const f of endingFit(fresh())) {
      expect(f.fit).toBeGreaterThanOrEqual(0);
      expect(f.fit).toBeLessThanOrEqual(1);
    }
  });
});

describe('event cooldown', () => {
  it('an event does not fire again within its cooldown', () => {
    const s = fresh();
    s.regions.US.publicTrust = 5; // regulation-crackdown trigger stays true
    let cur = s;
    const years: number[] = [];
    for (let i = 0; i < 8 && !cur.status.over; i++) {
      cur = step(cur, [], createRng(100 + i));
      for (const e of cur.eventLog) if (e.eventId === 'regulation-crackdown' && !years.includes(e.year)) years.push(e.year);
      cur.regions.US.publicTrust = 5;
    }
    expect(years.length).toBeGreaterThan(1); // it did fire more than once
    for (let i = 1; i < years.length; i++) expect(years[i] - years[i - 1]).toBeGreaterThanOrEqual(3);
  });
});

describe('data files', () => {
  it('have unique ids, finite numbers and at least one option per card', () => {
    const ids = [...defaultContent.decisions.map((d) => d.id), ...defaultContent.events.map((e) => e.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of defaultContent.decisions) {
      expect(d.options.length).toBeGreaterThanOrEqual(2);
      for (const o of d.options) for (const e of o.effects) expect(Number.isFinite(e.value)).toBe(true);
    }
    for (const ev of defaultContent.events) {
      expect(ev.chancePerTurn).toBeGreaterThan(0);
      expect(ev.chancePerTurn).toBeLessThanOrEqual(1);
    }
  });
});
