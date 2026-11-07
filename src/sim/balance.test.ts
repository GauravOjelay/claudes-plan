import { describe, expect, it } from 'vitest';
import type { EndingId } from '../contracts';
import { END_YEAR, ENDING_THRESHOLDS } from './endings';
import { POLICIES, playGame, runBalance, type PolicyName } from './balance';

/** Endings the minimum version implements (EndingId also lists stretch endings: drowned world, immortal oligarchy, extinction). */
const IMPLEMENTED: EndingId[] = ['abundanceUtopia', 'corporateFeudalism', 'slowdown', 'ww3', 'aiTakeover', 'bankrupt', 'nationalised'];
const N = 400; // games per policy (7 policies = 2,800 games)
const report = runBalance(N);
const share = (p: PolicyName, e: EndingId): number => (report.byPolicy[p][e] ?? 0) / N;

describe('balance run (thousands of simulated games)', () => {
  it('plays every game to a finish, inside the minimum-version horizon', () => {
    expect(report.games).toBe(N * POLICIES.length);
    const total = Object.values(report.overall).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(report.games);
    for (const y of Object.values(report.meanYear)) expect(y).toBeLessThanOrEqual(END_YEAR + 1);
  });
  it('reaches EVERY implemented ending at least once (when players can answer any available card)', () => {
    for (const e of IMPLEMENTED) expect(report.overall[e] ?? 0, `ending ${e}`).toBeGreaterThan(0);
  });
  it('only produces implemented endings', () => {
    for (const e of Object.keys(report.overall)) expect(IMPLEMENTED).toContain(e);
  });
  it('no ending is too easy: a random player gets no single ending more than 60% of the time', () => {
    for (const e of IMPLEMENTED) expect(share('random', e), `ending ${e}`).toBeLessThan(0.6);
  });
  it('good endings are possible but not the default (Utopia: 5-45% for random play)', () => {
    expect(share('random', 'abundanceUtopia')).toBeGreaterThan(0.05);
    expect(share('random', 'abundanceUtopia')).toBeLessThan(0.45);
  });
  it('a player who aims for an ending mostly gets it (choices matter)', () => {
    expect(share('generous', 'abundanceUtopia')).toBeGreaterThan(0.3);
    expect(share('cautious', 'slowdown')).toBeGreaterThan(0.5);
    expect(share('reckless', 'aiTakeover')).toBeGreaterThan(0.1);
    expect(share('profit', 'corporateFeudalism')).toBeGreaterThan(0.5);
    expect(share('spender', 'bankrupt')).toBeGreaterThan(0.5);
    expect(share('villain', 'nationalised') + share('villain', 'ww3')).toBeGreaterThan(0.05);
  });
  it('the dangerous endings are rare for ordinary (random) play', () => {
    for (const e of ['ww3', 'aiTakeover', 'bankrupt', 'nationalised'] as EndingId[]) expect(share('random', e), `ending ${e}`).toBeLessThan(0.05);
  });
  it('is deterministic: the same seeds give the same report', () => {
    expect(runBalance(50)).toEqual(runBalance(50));
  });
});

/**
 * The app today shows ONE card per year, the first available in data order (src/ui/HQScreen.tsx). The same 11 cards
 * come up in every game, so reachability has to hold in that flow too, not only when players can pick any card.
 */
describe('balance in the app as it is today (one card per year, in data order)', () => {
  const first = runBalance(N, POLICIES, 1, 'first');
  const fshare = (p: PolicyName, e: EndingId): number => (first.byPolicy[p][e] ?? 0) / N;
  it('every game finishes inside the horizon', () => {
    expect(Object.values(first.overall).reduce((a, b) => a + (b ?? 0), 0)).toBe(first.games);
    for (const y of Object.values(first.meanYear)) expect(y).toBeLessThanOrEqual(END_YEAR + 1);
  });
  it('the bad endings are reachable by a player who aims for them: AI takeover, WW3 and bankruptcy', () => {
    expect(fshare('reckless', 'aiTakeover')).toBeGreaterThan(0.3);
    expect(fshare('warmonger', 'ww3')).toBeGreaterThan(0.1);
    expect(fshare('spender', 'bankrupt')).toBeGreaterThan(0.5);
    for (const e of ['aiTakeover', 'ww3', 'bankrupt'] as EndingId[]) expect(first.overall[e] ?? 0, e).toBeGreaterThan(0);
  });
  it('the good endings are reachable too', () => {
    expect(fshare('generous', 'abundanceUtopia')).toBeGreaterThan(0.5);
    expect(fshare('cautious', 'slowdown') + fshare('cautious', 'abundanceUtopia')).toBeGreaterThan(0.9);
    expect(first.overall.slowdown ?? 0).toBeGreaterThan(0);
    expect(first.overall.corporateFeudalism ?? 0).toBeGreaterThan(0);
  });
  it('no ending is too easy: a random player gets no single ending more than 60% of the time', () => {
    for (const e of Object.keys(first.byPolicy.random) as EndingId[]) expect(fshare('random', e), e).toBeLessThan(0.6);
  });
  it('careful play does not go bankrupt, and the dangerous endings are rare for random play (under 10%)', () => {
    expect(fshare('cautious', 'bankrupt')).toBeLessThan(0.05);
    expect(fshare('generous', 'bankrupt')).toBeLessThan(0.05);
    for (const e of ['ww3', 'aiTakeover', 'bankrupt', 'nationalised'] as EndingId[]) expect(fshare('random', e), e).toBeLessThan(0.1);
  });
});

describe('early endings only happen when their prerequisites hold', () => {
  it('AI takeover: low safety AND more than 1bn robots, in every game that ends that way', () => {
    let seen = 0;
    for (let seed = 1; seed <= 600 && seen < 25; seed++) {
      const r = playGame(seed, 'reckless');
      if (r.ending !== 'aiTakeover') continue;
      seen++;
      expect(r.final.companies[0].vars.safetyLevel).toBeLessThan(ENDING_THRESHOLDS.takeoverSafety);
      expect(r.final.global.robotCount).toBeGreaterThan(ENDING_THRESHOLDS.takeoverRobots);
    }
    expect(seen).toBeGreaterThan(0);
  });
  it('WW3: tension at the war threshold', () => {
    let seen = 0;
    for (let seed = 1; seed <= 800 && seen < 5; seed++) {
      const r = playGame(seed, 'villain');
      if (r.ending !== 'ww3') continue;
      seen++;
      expect(r.final.global.geopoliticalTension).toBeGreaterThanOrEqual(ENDING_THRESHOLDS.ww3Tension);
    }
    expect(seen).toBeGreaterThan(0);
  });
  it('every finished game has a score with parts in 0-100', () => {
    for (const p of POLICIES) {
      const s = playGame(7, p).final.status.score;
      expect(s).toBeDefined();
      for (const v of Object.values(s!)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
    }
  });
});
