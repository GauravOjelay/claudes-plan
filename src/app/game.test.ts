import { describe, expect, it } from 'vitest';
import { ALL_DECISIONS, availableDecisions, newGame, playTurn } from './game';

/** First integration milestone (docs/plan.md 13.4): card -> step -> variable changes -> CityEffect appears. */
describe('first milestone loop', () => {
  it('fast-tracking the data-centre campus changes energy and eventually causes a blackout in SF', () => {
    let s = newGame(1);
    const card = availableDecisions(s).find((d) => d.id === 'datacentre-campus');
    expect(card).toBeDefined();
    const energyBefore = s.regions.US.energy;
    s = playTurn(s, { decisionId: 'datacentre-campus', optionId: 'fastTrack' });
    expect(s.regions.US.energy).not.toBe(energyBefore); // a variable changed
    for (let i = 0; i < 6 && !s.status.over; i++) s = playTurn(s);
    expect(s.activeCityEffects.some((e) => e.kind === 'blackout' && e.city === 'sf')).toBe(true);
  });

  it('the staged option never causes the blackout', () => {
    let s = playTurn(newGame(1), { decisionId: 'datacentre-campus', optionId: 'staged' });
    for (let i = 0; i < 8 && !s.status.over; i++) s = playTurn(s);
    expect(s.eventLog.some((e) => e.eventId === 'blackout-belt')).toBe(false);
  });

  it('is deterministic: same seed and choices give an identical game', () => {
    const run = () => {
      let s = newGame(7);
      for (let i = 0; i < 5; i++) {
        const next = availableDecisions(s)[0];
        s = playTurn(s, next ? { decisionId: next.id, optionId: next.options[0].id } : undefined);
      }
      return JSON.stringify(s);
    };
    expect(run()).toBe(run());
  });

  it('a full run reaches an ending by 2036', () => {
    let s = newGame(3);
    let guard = 0;
    while (!s.status.over && guard++ < 30) {
      const next = availableDecisions(s)[0];
      s = playTurn(s, next ? { decisionId: next.id, optionId: next.options[0].id } : undefined);
    }
    expect(s.status.over).toBe(true);
    expect(s.status.ending).toBeDefined();
    expect(s.status.score).toBeDefined();
  });

  it('has the cards', () => expect(ALL_DECISIONS.length).toBeGreaterThanOrEqual(20));
});
