import type { Score, WorldState } from '../contracts';
import { ALL_REGIONS, clamp, playerCompany } from './vars';

/** Population-weighted mean of a per-region number. */
function weighted(state: WorldState, f: (r: WorldState['regions'][keyof WorldState['regions']]) => number): number {
  let sum = 0;
  let pop = 0;
  for (const id of ALL_REGIONS) {
    const r = state.regions[id];
    sum += f(r) * r.population;
    pop += r.population;
  }
  return pop > 0 ? sum / pop : 0;
}

/**
 * Takeover risk is DERIVED, never set by an effect (plan section 3):
 * risk = capability (0-100) x (1 - safety) x robot readiness (0 at no robots, 1 at 1 billion).
 * Safety is the mean across companies, so one careless lab raises the world's risk.
 */
export function deriveTakeoverRisk(state: WorldState): number {
  const safety = state.companies.reduce((s, c) => s + c.vars.safetyLevel, 0) / state.companies.length;
  const cap = clamp(state.global.aiCapability, 0, 100) / 100;
  const robots = clamp(state.global.robotCount / 1e9, 0, 1);
  return clamp(100 * cap * (1 - safety / 100) * robots, 0, 100);
}

/**
 * Final score, each part 0-100 (plan section 2). Called when the game ends.
 * - wellbeing: population-weighted mean of (public trust, 100 - average unemployment, 100 - wealth gap).
 * - company: 70% company value (200+ = full marks) + 30% money (1000+ = full marks); bankrupt = 0.
 * - survival: 100 - (60% takeover risk + 40% geopolitical tension).
 * - total: 40% wellbeing + 30% company + 30% survival.
 */
export function computeScore(state: WorldState): Score {
  const trust = weighted(state, (r) => r.publicTrust);
  const jobs = 100 - weighted(state, (r) => (r.unemploymentSoftware + r.unemploymentPhysical) / 2);
  const equality = 100 - weighted(state, (r) => r.wealthGap);
  const wellbeing = clamp((trust + jobs + equality) / 3, 0, 100);

  const me = playerCompany(state).vars;
  const company = me.money < 0 ? 0 : clamp(0.7 * (me.companyValue / 2) + 0.3 * (me.money / 10), 0, 100);

  const survival = clamp(100 - (0.6 * state.global.takeoverRisk + 0.4 * state.global.geopoliticalTension), 0, 100);
  const total = 0.4 * wellbeing + 0.3 * company + 0.3 * survival;
  const r1 = (x: number): number => Math.round(x * 10) / 10;
  return { total: r1(total), wellbeing: r1(wellbeing), company: r1(company), survival: r1(survival) };
}

/**
 * Check whether the game is over. First slice: bankruptcy only. The remaining endings
 * (utopia, feudalism, WW3, slowdown, takeover, ...) are TASKS.md worker-1 step 3.
 */
export function checkEndings(state: WorldState): void {
  if (state.status.over) return;
  const me = playerCompany(state);
  if (me.vars.money < 0 || me.vars.companyValue <= 0) {
    state.status = { over: true, ending: 'bankrupt', reason: `${me.name} ran out of money.` };
    state.status.score = computeScore(state);
  }
}
