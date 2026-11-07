import { describe, expect, it } from 'vitest';
import demo from '../../data/demo.json';
import type { WorldState } from '../contracts';
import { availableDecisions, newGame, playTurn } from '../app/game';

/**
 * Locks the demo (data/demo.md, data/demo.json): seed 44 plus the exact options below must keep producing the
 * same story. This uses the app's own availableDecisions/playTurn, so it follows what the HQ screen really shows:
 * the first available card each year. If you retune the sim or reorder data/cards.json and this fails, the demo
 * changed: either restore the numbers or re-run the seed search and rewrite data/demo.md.
 */
const MAIN: Record<string, string> = Object.fromEntries(demo.main.map((m) => [m.card, m.option]));

interface Frame { year: number; shown?: string; picked?: string; after: WorldState }

/** Play the demo. `override` replaces the option for one card (the what-if). Returns one frame per year. */
function play(override?: { card: string; option: string }): Frame[] {
  let s = newGame(demo.seed);
  const frames: Frame[] = [];
  while (!s.status.over) {
    const first = availableDecisions(s)[0]; // what the HQ screen shows
    const option = first ? (override && override.card === first.id ? override.option : MAIN[first.id]) : undefined;
    const year = s.year;
    s = playTurn(s, first && option ? { decisionId: first.id, optionId: option } : undefined);
    frames.push({ year, shown: first?.id, picked: option, after: s });
  }
  return frames;
}

const last = <T,>(xs: T[]): T => xs[xs.length - 1];
const eventsOf = (frames: Frame[]): string[] => last(frames).after.eventLog.map((e) => `${e.year}:${e.eventId}`);
const frameAt = (frames: Frame[], year: number): Frame => frames.find((f) => f.year === year)!;

describe('demo script (seed 44): the good run', () => {
  const frames = play();
  it('shows exactly the scripted card each year, and every year has a card', () => {
    expect(frames.map((f) => [f.year, f.shown, f.picked])).toEqual(demo.main.map((m) => [m.year, m.card, m.option]));
  });
  it('2026: fast-tracking the campus overloads the grid and a blackout hits San Francisco right away', () => {
    const f = frameAt(frames, 2026);
    expect(f.after.eventLog.some((e) => e.year === 2026 && e.eventId === 'blackout-belt' && e.popup && e.city === 'sf')).toBe(true);
    expect(f.after.activeCityEffects.find((e) => e.kind === 'blackout' && e.city === 'sf')?.intensity).toBeGreaterThanOrEqual(0.5);
    expect(f.after.regions.US.energy).toBeLessThan(0);
  });
  it('2028: the open-sourced materials model brings the Breakthrough year, a solar boom in San Francisco', () => {
    const f = frameAt(frames, 2028);
    expect(f.after.eventLog.some((e) => e.year === 2028 && e.eventId === 'breakthrough-year')).toBe(true);
    const fx = f.after.activeCityEffects;
    expect(fx.some((e) => e.kind === 'solarBoom' && e.city === 'sf')).toBe(true);
    expect(fx.find((e) => e.kind === 'blackout')?.intensity ?? 0).toBeLessThan(0.5); // the blackout is on its way out
  });
  it('the blackout fades out by 2031, the grid is healthy, and it never comes back', () => {
    for (const year of [2031, 2032, 2033, 2034, 2035, 2036]) {
      expect(frameAt(frames, year).after.activeCityEffects.some((e) => e.kind === 'blackout')).toBe(false);
    }
    expect(frameAt(frames, 2030).after.regions.US.energy).toBeGreaterThan(0);
    expect(eventsOf(frames).filter((e) => e.endsWith('blackout-belt'))).toEqual(['2026:blackout-belt']);
  });
  it('the positive beats land in order: safety audit 2030, treaty 2032, drug discovery 2033', () => {
    const ev = eventsOf(frames);
    for (const e of ['2030:safety-audit-praised', '2032:treaty-signed', '2033:drug-discovery']) expect(ev).toContain(e);
  });
  it('ends in Abundance Utopia with a healthy company and no bankruptcy scare', () => {
    const end = last(frames).after;
    expect(end.status.ending).toBe('abundanceUtopia');
    expect(end.status.score!.total).toBeGreaterThan(65);
    expect(end.companies[0].vars.money).toBeGreaterThan(60);
    expect(Math.min(...frames.map((f) => f.after.companies[0].vars.money))).toBeGreaterThan(60);
    expect(end.year).toBe(2037);
  });
});

describe('demo script (seed 44): what if the materials model had stayed proprietary?', () => {
  const frames = play({ card: demo.whatIf.card, option: demo.whatIf.option });
  const ev = eventsOf(frames);
  it('there is no Breakthrough year and no solar boom', () => {
    expect(ev.some((e) => e.endsWith('breakthrough-year'))).toBe(false);
    expect(frames.some((f) => f.after.activeCityEffects.some((e) => e.kind === 'solarBoom'))).toBe(false);
  });
  it('the blackout comes BACK years later (second Blackout belt in 2031 or after)', () => {
    const blackouts = ev.filter((e) => e.endsWith('blackout-belt')).map((e) => Number(e.split(':')[0]));
    expect(blackouts.length).toBeGreaterThanOrEqual(2);
    expect(last(blackouts)).toBeGreaterThanOrEqual(2031);
  });
  it('and the world it makes is a different one (Slowdown instead of Utopia, lower trust)', () => {
    const good = last(play()).after;
    const alt = last(frames).after;
    expect(alt.status.ending).toBe('slowdown');
    expect(alt.regions.US.publicTrust).toBeLessThan(good.regions.US.publicTrust - 10);
  });
});
