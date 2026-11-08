import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import demo from '../../data/demo.json';
import { ALL_DECISIONS, availableDecisions, newGame, playTurn } from '../app/game';
import type { WorldState } from '../contracts';
import { parseReplay, replayGame } from './replay';

const avail = (s: WorldState, companyId: string) => availableDecisions(s, ALL_DECISIONS, companyId);
const MAIN: Record<string, string> = Object.fromEntries(demo.main.map((m) => [m.card, m.option]));

/** The tokens of a demo run, one per year, exactly as clicking the HQ card would (first available card each year). */
function demoTokens(override?: { card: string; option: string }): string[] {
  let s = newGame(demo.seed);
  const tokens: string[] = [];
  while (!s.status.over) {
    const first = availableDecisions(s)[0];
    const option = first ? (override && override.card === first.id ? override.option : MAIN[first.id]) : undefined;
    tokens.push(first && option ? option : '-');
    s = playTurn(s, first && option ? { decisionId: first.id, optionId: option } : undefined);
  }
  return tokens;
}

const MAIN_LINK = demoTokens().join(',');
const WHATIF_LINK = demoTokens(demo.whatIf).join(',');
const run = (spec: string, at?: string) => replayGame(newGame(demo.seed), spec, at, avail);

describe('replay links', () => {
  it('parses entries, skips and multi-company years', () => {
    expect(parseReplay('')).toEqual([]);
    expect(parseReplay('fastTrack,-,openMaterials')).toEqual([[{ option: 'fastTrack' }], [], [{ option: 'openMaterials' }]]);
    expect(parseReplay('a+cancer:b,')).toEqual([[{ option: 'a' }, { company: 'cancer', option: 'b' }], []]);
    expect(() => parseReplay('cancer:')).toThrow();
    expect(() => parseReplay(':x')).toThrow();
  });

  it('the main demo link plays to the same ending as clicking through (locked demo)', () => {
    const r = run(MAIN_LINK, 'end');
    expect(r.error).toBeUndefined();
    expect(r.state.status.over).toBe(true);
    expect(r.state.status.ending).toBe('abundanceUtopia');
    expect(Math.round(r.state.status.score!.total)).toBeGreaterThanOrEqual(60);
    expect(r.played).toBe(demo.main.length);
  });

  it('lands on a year: at=2032 stops before 2032 is played, with the previous year\'s pop-ups', () => {
    const r = run(MAIN_LINK, '2032');
    expect(r.error).toBeUndefined();
    expect(r.state.year).toBe(2032);
    expect(r.state.status.over).toBe(false);
    expect(r.played).toBe(6);
    expect(r.state.choiceLog.map((c) => c.optionId)).toEqual(demo.main.slice(0, 6).map((m) => m.option));
    // without `at` it stops after the last entry given
    expect(run('fastTrack,openMaterials').state.year).toBe(2028);
  });

  it('is the same game as playing by hand (state equal, deterministic)', () => {
    const a = run(MAIN_LINK, '2030');
    const b = run(MAIN_LINK, '2030');
    expect(a.state).toEqual(b.state);
    let s = newGame(demo.seed);
    for (const m of demo.main.slice(0, 4)) s = playTurn(s, { decisionId: m.card, optionId: m.option });
    expect(a.state).toEqual(s);
  });

  it('the what-if link differs from the main one in 2027 and ends elsewhere', () => {
    expect(WHATIF_LINK.split(',')[1]).toBe(demo.whatIf.option);
    const main = run(MAIN_LINK, 'end');
    const alt = run(WHATIF_LINK, 'end');
    expect(alt.error).toBeUndefined();
    expect(alt.state.status.ending).not.toBe(main.state.status.ending);
    const at2032 = run(WHATIF_LINK, '2032');
    expect(at2032.state.year).toBe(2032);
    expect(at2032.state.activeCityEffects.some((e) => e.kind === 'blackout')).toBe(true); // the blackout is back in the what-if
  });

  it('plays decisions for other companies in the same year, and years with "-" pass without a decision', () => {
    const s0 = newGame(demo.seed);
    const cancerCard = availableDecisions(s0, ALL_DECISIONS, 'cancer')[0];
    const r = run(`fastTrack+cancer:${cancerCard.options[0].id},-`, '2028');
    expect(r.error).toBeUndefined();
    expect(r.state.choiceLog.filter((c) => c.year === 2026).map((c) => c.companyId).sort()).toEqual(['cancer', 'closedai']);
    expect(r.state.choiceLog.filter((c) => c.year === 2027)).toHaveLength(0);
    expect(r.state.year).toBe(2028);
  });

  it('stops with a clear message instead of guessing: unknown option, no card, bad at, bad syntax', () => {
    const bad = run('nonsense');
    expect(bad.played).toBe(0);
    expect(bad.error).toMatch(/2026: "nonsense" is not an option of "datacentre-campus"/);
    expect(run('fastTrack,openMaterials', 'soon').error).toMatch(/not a year/);
    expect(run('cancer:').error).toBeDefined();
    expect(run('ghost:x').error).toMatch(/unknown company "ghost"/);
    // a failure in a later year keeps the years already played
    const late = run('fastTrack,nonsense');
    expect(late.played).toBe(1);
    expect(late.state.year).toBe(2027);
    expect(late.error).toMatch(/^2027:/);
    // no spec = a normal new game
    expect(replayGame(newGame(44), '', null, avail).played).toBe(0);
    expect(replayGame(newGame(44), null, '2030', avail).state.year).toBe(2026);
  });

  it('every replay link written in data/demo.md plays without error and lands as promised', () => {
    const md = readFileSync('data/demo.md', 'utf8');
    const links = [...md.matchAll(/\?seed=44&replay=([^&\s`]+)&at=(\w+)/g)].map((m) => ({ spec: m[1], at: m[2] }));
    expect(links.length).toBeGreaterThanOrEqual(4);
    for (const { spec, at } of links) {
      const r = run(spec, at);
      expect(r.error, `${spec} at=${at}`).toBeUndefined();
      if (at === 'end') expect(r.state.status.over).toBe(true);
      else expect(r.state.year).toBe(Number(at));
    }
    // the two report links end the way the script says
    expect(run(MAIN_LINK, 'end').state.status.ending).toBe('abundanceUtopia');
    expect(md).toContain(`replay=${MAIN_LINK}&at=end`);
    expect(md).toContain(`replay=${WHATIF_LINK}&at=end`);
    expect(run(WHATIF_LINK, 'end').state.status.ending).toBe('slowdown');
  });
});
