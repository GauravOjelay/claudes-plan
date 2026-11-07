import type { EndingId, Score, WorldState } from '../contracts';
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

/** Last year of the minimum version (plan 11.1). The game is over once the year passes this. */
export const END_YEAR = 2036;

export const ENDING_THRESHOLDS = {
  ww3Tension: 95, // tension at or above this and the blocs go to war
  nationalisedRegulation: 90, // home-region regulation at or above this and the state takes the company
  takeoverSafety: 20, // plan section 3: takeover needs safety below 20 ...
  takeoverRobots: 1e9, // ... AND more than 1 billion robots
  takeoverRisk: 60, // ... and the derived risk has built up
} as const;

const meanSafety = (state: WorldState): number => state.companies.reduce((s, c) => s + c.vars.safetyLevel, 0) / state.companies.length;

/**
 * How well the final world fits each horizon ending, 0-1. The best fit wins (plan section 3:
 * "picks the best-fitting ending"). Ties go to the first in this list.
 * - abundanceUtopia: low wealth gap, high trust, high safety, low unemployment.
 * - corporateFeudalism: huge wealth gap and a very valuable company.
 * - slowdown: safeguards kept, capability moderate, tension low.
 */
export function endingFit(state: WorldState): { id: EndingId; fit: number }[] {
  const gap = weighted(state, (r) => r.wealthGap) / 100;
  const trust = weighted(state, (r) => r.publicTrust) / 100;
  const jobs = 1 - weighted(state, (r) => (r.unemploymentSoftware + r.unemploymentPhysical) / 2) / 100;
  const safety = meanSafety(state) / 100;
  const cap = clamp(state.global.aiCapability / 100, 0, 1);
  const calm = 1 - state.global.geopoliticalTension / 100;
  const value = clamp(playerCompany(state).vars.companyValue / 300, 0, 1);
  return [
    { id: 'abundanceUtopia', fit: 0.35 * (1 - gap) + 0.25 * trust + 0.2 * safety + 0.2 * jobs },
    { id: 'corporateFeudalism', fit: 0.55 * gap + 0.25 * value + 0.2 * (1 - trust) },
    { id: 'slowdown', fit: 0.4 * safety + 0.4 * (1 - cap) + 0.2 * calm },
  ];
}

/** Threshold endings that can end the game early, in priority order. Returns undefined if none apply. */
function earlyEnding(state: WorldState): { ending: EndingId; reason: string } | undefined {
  const me = playerCompany(state);
  const T = ENDING_THRESHOLDS;
  if (me.vars.money < 0 || me.vars.companyValue <= 0) return { ending: 'bankrupt', reason: `${me.name} ran out of money.` };
  if (state.regions[me.homeRegion].regulationStrictness >= T.nationalisedRegulation) {
    return { ending: 'nationalised', reason: `The government took ${me.name} into public ownership.` };
  }
  if (state.global.geopoliticalTension >= T.ww3Tension) return { ending: 'ww3', reason: 'Rivalry between the blocs spiralled into open war.' };
  if (meanSafety(state) < T.takeoverSafety && state.global.robotCount > T.takeoverRobots && state.global.takeoverRisk >= T.takeoverRisk) {
    return { ending: 'aiTakeover', reason: 'Unchecked AI systems with a vast robot workforce slipped out of human control.' };
  }
  return undefined;
}

/** Check whether the game is over: early threshold endings first, then the best-fitting ending once past END_YEAR. */
export function checkEndings(state: WorldState): void {
  if (state.status.over) return;
  const early = earlyEnding(state);
  if (early) {
    state.status = { over: true, ending: early.ending, reason: early.reason };
  } else if (state.year > END_YEAR) {
    const best = endingFit(state).reduce((a, b) => (b.fit > a.fit ? b : a));
    state.status = { over: true, ending: best.id, reason: `The world of ${END_YEAR} best fits: ${best.id}.` };
  } else {
    return;
  }
  state.status.score = computeScore(state);
}
