import { describe, expect, it } from 'vitest';
import type { EndingId } from '../contracts';
import { END_YEAR, ENDING_THRESHOLDS } from './endings';
import { POLICIES, playGame, runBalance, type PolicyName } from './balance';

/** Endings the minimum version implements (EndingId also lists stretch endings: drowned world, immortal oligarchy, extinction). */
const IMPLEMENTED: EndingId[] = ['abundanceUtopia', 'corporateFeudalism', 'slowdown', 'ww3', 'aiTakeover', 'bankrupt', 'nationalised'];
const N = 400; // games per policy (8 policies = 3,200 games)
// 'flagship' = the player decides only for ClosedAI (the old single-company game and the demo).
// The player may run all 17 companies since 2026-11-08; see the last describe() for those scopes.
const report = runBalance(N);
const share = (p: PolicyName, e: EndingId): number => (report.byPolicy[p][e] ?? 0) / N;

describe('balance run (thousands of simulated games)', () => {
  it('plays every game to a finish, inside the minimum-version horizon', () => {
    expect(report.games).toBe(N * POLICIES.length);
    const total = Object.values(report.overall).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(report.games);
    for (const y of Object.values(report.meanYear)) expect(y).toBeLessThanOrEqual(END_YEAR + 1);
  });
  it('reaches every implemented ending but bankruptcy at least once when only the flagship decides (when players can answer any available card)', () => {
    // Bankruptcy needs MOST of the companies to go under, so it takes a player who runs many of them (last describe()).
    for (const e of IMPLEMENTED.filter((x) => x !== 'bankrupt')) expect(report.overall[e] ?? 0, `ending ${e}`).toBeGreaterThan(0);
    expect(report.overall.bankrupt ?? 0).toBe(0);
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
  it('the bad endings are reachable by a player who aims for them: AI takeover and WW3 (bankruptcy needs many companies, see below)', () => {
    expect(fshare('reckless', 'aiTakeover')).toBeGreaterThan(0.3);
    expect(fshare('warmonger', 'ww3')).toBeGreaterThan(0.1);
    for (const e of ['aiTakeover', 'ww3'] as EndingId[]) expect(first.overall[e] ?? 0, e).toBeGreaterThan(0);
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
  it('the dangerous endings are rare for random play (under 10%)', () => {
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

/**
 * The player runs every company (owner decision 2026-11-08) and can decide for 1-17 of them each year. More decisions
 * mean bigger swings, so the endings must still be spread out and reachable when the player steers 3 or all 17.
 */
describe('balance when the player directs several companies (one card per company per year)', () => {
  const M = 200; // games per policy
  const few = runBalance(M, POLICIES, 1, 'first', 'few');
  const all = runBalance(M, POLICIES, 1, 'first', 'all');
  const sh = (r: typeof all, p: PolicyName, e: EndingId): number => (r.byPolicy[p][e] ?? 0) / M;

  it('every game finishes inside the horizon', () => {
    for (const r of [few, all]) {
      expect(Object.values(r.overall).reduce((a, b) => a + (b ?? 0), 0)).toBe(r.games);
      for (const y of Object.values(r.meanYear)) expect(y).toBeLessThanOrEqual(END_YEAR + 1);
    }
  });
  it('random play under full control is spread over endings (no single one above 60%)', () => {
    for (const e of Object.keys(all.byPolicy.random) as EndingId[]) expect(sh(all, 'random', e), e).toBeLessThanOrEqual(0.6);
    expect(Object.keys(all.byPolicy.random).length).toBeGreaterThanOrEqual(2);
  });
  it('random play with 3 companies stays under 75% for any ending', () => {
    for (const e of Object.keys(few.byPolicy.random) as EndingId[]) expect(sh(few, 'random', e), e).toBeLessThan(0.75);
  });
  it('bankruptcy is reachable only by running many companies into the ground', () => {
    expect(sh(all, 'spender', 'bankrupt')).toBeGreaterThan(0.5);
    expect(sh(all, 'generous', 'bankrupt')).toBe(0);
    expect(sh(all, 'cautious', 'bankrupt')).toBe(0);
  });
  it('good play still reaches the good endings, even with all 17 companies', () => {
    expect(sh(all, 'generous', 'abundanceUtopia') + sh(all, 'generous', 'slowdown')).toBeGreaterThan(0.9);
    expect(sh(all, 'generous', 'abundanceUtopia')).toBeGreaterThan(0.1);
    expect(sh(all, 'cautious', 'slowdown')).toBeGreaterThan(0.5);
    expect(sh(few, 'generous', 'abundanceUtopia')).toBeGreaterThan(0.5);
  });
  it('running the whole industry for profit ends badly; running it safely does not', () => {
    expect(sh(all, 'profit', 'ww3') + sh(all, 'profit', 'aiTakeover')).toBeGreaterThan(0.8);
    expect(sh(all, 'cautious', 'ww3')).toBe(0);
  });
  it('corporate feudalism is the natural drift of running the whole industry at random', () => {
    expect(sh(all, 'random', 'corporateFeudalism')).toBeGreaterThan(0.2);
  });
  it('together with the flagship-only runs, every implemented ending is reachable', () => {
    for (const e of IMPLEMENTED) expect((report.overall[e] ?? 0) + (few.overall[e] ?? 0) + (all.overall[e] ?? 0), e).toBeGreaterThan(0);
  });
});
