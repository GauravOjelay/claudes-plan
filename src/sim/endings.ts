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
 * Safety is the PLAYER company's safety level: it is the lab the player controls (rivals' safeguards are static for now).
 */
export function deriveTakeoverRisk(state: WorldState): number {
  const safety = playerCompany(state).vars.safetyLevel;
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
  nationalisedRegulation: 80, // home-region regulation at or above this and the state takes the company
  takeoverSafety: 20, // plan section 3: takeover needs safety below 20 ...
  takeoverRobots: 1e9, // ... AND more than 1 billion robots
  takeoverRisk: 40, // ... and the derived risk has built up (capability stays under ~60 by 2036, so this is below 60)
} as const;

const playerSafety = (state: WorldState): number => playerCompany(state).vars.safetyLevel;

/** Linear ramp: 0 at or below `lo`, 1 at or above `hi`. */
const ramp = (x: number, lo: number, hi: number): number => clamp((x - lo) / (hi - lo), 0, 1);
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * How well the final world fits each horizon ending, 0-1. The best fit wins (plan section 3:
 * "picks the best-fitting ending"). Ties go to the first in this list. Each indicator is a 0-1 ramp
 * over the range the game actually reaches, so the endings occupy different corners of the world:
 * - abundanceUtopia: low wealth gap, high trust, high safety and capable AI to make the abundance (jobs are not required: a safety net can carry them).
 * - corporateFeudalism: huge wealth gap, a very valuable company, low trust, capable AI.
 * - slowdown: safeguards kept, AI held back (counted twice), tension low.
 */
export function endingFit(state: WorldState): { id: EndingId; fit: number }[] {
  // The player's decisions act mainly on their home region, so the ending reads half home region, half world.
  const home = state.regions[playerCompany(state).homeRegion];
  const wGap = 0.5 * home.wealthGap + 0.5 * weighted(state, (r) => r.wealthGap);
  const wTrust = 0.5 * home.publicTrust + 0.5 * weighted(state, (r) => r.publicTrust);
  const gap = ramp(wGap, 45, 75); // inequality, for feudalism
  const fair = 1 - ramp(wGap, 35, 60); // equality, for utopia (a stricter bar)
  const trust = ramp(wTrust, 30, 80);
  const goodTrust = ramp(wTrust, 40, 75);
  const safety = ramp(playerSafety(state), 30, 80);
  const goodSafety = ramp(playerSafety(state), 40, 85);
  const cap = ramp(state.global.aiCapability, 30, 75);
  const capUtopia = ramp(state.global.aiCapability, 25, 60); // abundance needs capable AI, but not the extreme
  const calm = ramp(100 - state.global.geopoliticalTension, 40, 90);
  const value = ramp(playerCompany(state).vars.companyValue, 100, 300);
  // The weakest ingredient gates each ending, so a world that is only middling at everything fits none of them well.
  const gate = (xs: number[]): number => 0.4 + 0.6 * Math.min(...xs);
  return [
    { id: 'abundanceUtopia', fit: mean([fair, goodTrust, goodSafety, capUtopia]) * gate([fair, goodTrust, goodSafety]) },
    { id: 'corporateFeudalism', fit: mean([gap, value, 1 - trust, cap]) * gate([gap, value]) },
    { id: 'slowdown', fit: mean([safety, 1 - cap, 1 - cap, calm]) * gate([safety, 1 - cap]) },
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
  if (playerSafety(state) < T.takeoverSafety && state.global.robotCount > T.takeoverRobots && state.global.takeoverRisk >= T.takeoverRisk) {
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
