import { describe, expect, it } from 'vitest';
import type { EndingId, WorldState } from '../contracts';
import { createInitialState, defaultContent, rngForTurn, step } from './index';
import { evalCondition } from './vars';

/**
 * The demo path (plan 11.3): the same seed with two different sets of choices must end in a different world.
 * A scripted player answers, each year, the first card in `plan` that is available, with the listed option.
 */
type Plan = [decisionId: string, optionId: string][];

const SENSIBLE: Plan = [
  ['safety-mechanisms', 'buildSafeguards'],
  ['response-to-job-losses', 'backUbi'],
  ['compute-race', 'shareCompute'],
  ['release-strategy', 'partnerGov'],
  ['content-policy', 'tighten'],
  ['alignment-scare', 'pauseAndFix'],
  ['treaty-or-race', 'treaty'],
  ['final-oversight', 'humansInLoop'],
  ['cyber-defence', 'aiDefence'],
  ['robot-ownership', 'dividend'],
  ['robotics-rollout', 'softwareOnly'],
  ['lobby-regulation', 'acceptRules'],
];

const RECKLESS: Plan = [
  ['safety-mechanisms', 'skipSafety'],
  ['compute-race', 'hoardChips'],
  ['release-strategy', 'openSource'],
  ['job-automation', 'sellAgents'],
  ['marketing-claims', 'hype'],
  ['agi-announcement', 'announce'],
  ['robotics-rollout', 'massRobots'],
  ['final-oversight', 'handControl'],
  ['treaty-or-race', 'race'],
  ['alignment-scare', 'ignoreWarning'],
  ['cyber-defence', 'offence'],
  ['model-security', 'skipSecurity'],
];

function playPlan(seed: number, plan: Plan): WorldState {
  let s = createInitialState(seed, 'novacore');
  while (!s.status.over) {
    const answered = new Set(s.choiceLog.map((c) => c.decisionId));
    const next = plan.find(([id]) => {
      const d = defaultContent.decisions.find((x) => x.id === id);
      if (!d || answered.has(id)) return false;
      const [a, b] = d.era.split('-').map(Number);
      return s.year >= a && s.year <= b && (!d.requirements || evalCondition(s, d.requirements));
    });
    s = step(s, next ? [{ decisionId: next[0], optionId: next[1], companyId: 'novacore' }] : [], rngForTurn(s));
  }
  return s;
}

const GOOD: EndingId[] = ['abundanceUtopia', 'slowdown'];
const BAD: EndingId[] = ['ww3', 'aiTakeover', 'nationalised'];

describe('demo path: same seed, different choices, different world', () => {
  it('seed 1: safety first, UBI and the treaty lead to a good ending', () => {
    const s = playPlan(1, SENSIBLE);
    expect(GOOD).toContain(s.status.ending);
  });
  it('seed 1: skipping safety and hoarding chips leads to a bad ending', () => {
    const s = playPlan(1, RECKLESS);
    expect(BAD).toContain(s.status.ending);
  });
  it('the two paths really differ in the numbers, not just the label', () => {
    const good = playPlan(1, SENSIBLE);
    const bad = playPlan(1, RECKLESS);
    expect(good.status.score!.survival).toBeGreaterThan(bad.status.score!.survival);
    expect(good.global.geopoliticalTension).toBeLessThan(bad.global.geopoliticalTension);
    expect(good.companies[0].vars.safetyLevel).toBeGreaterThan(bad.companies[0].vars.safetyLevel);
  });
  it('holds across seeds: sensible is never bad, reckless is never good (seeds 1-30)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      expect(BAD, `sensible seed ${seed}`).not.toContain(playPlan(seed, SENSIBLE).status.ending);
      expect(GOOD, `reckless seed ${seed}`).not.toContain(playPlan(seed, RECKLESS).status.ending);
    }
  });
  it('is deterministic', () => {
    expect(playPlan(3, SENSIBLE)).toEqual(playPlan(3, SENSIBLE));
  });
});
