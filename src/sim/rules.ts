import type { ExpertOutlook, WorldState } from '../contracts';
import { ALL_REGIONS, clamp, playerCompany } from './vars';

/** One line of cause and effect (plan section 3). Mutates the cloned `state`. */
export interface Rule {
  id: string;
  apply(state: WorldState): void;
}

/** How hard automation hits, by randomised expert outlook (Hinton-style .. Acemoglu-style). */
export const OUTLOOK_AUTOMATION: Record<ExpertOutlook, number> = { severeShock: 1.5, middle: 1, overblown: 0.5 };

export const TUNING = {
  baseCapabilityGrowth: 2, // AI capability points per year
  blackoutSlowdown: 0.5, // multiplier on growth while the grid is short
  automationPerCapability: 0.05, // software-unemployment points per capability point per year
  robotsForPhysicalJobs: 1e8, // physical automation only starts at this many robots (plan section 3)
  physicalPerBillionRobots: 3, // physical-unemployment points per year at 1bn robots
  blackoutTrustHit: 3, // regional public-trust points lost per year of shortage
  riotTrustBelow: 20, // "very low" public trust
  riotGdpFactor: 0.98,
  riotTension: 1,
} as const;

/** Automation: AI capability raises software unemployment; physical jobs only once robots are plentiful. */
export const automation: Rule = {
  id: 'automation',
  apply(state) {
    const k = TUNING.automationPerCapability * OUTLOOK_AUTOMATION[state.outlook] * state.global.aiCapability;
    const physical = state.global.robotCount >= TUNING.robotsForPhysicalJobs
      ? TUNING.physicalPerBillionRobots * (state.global.robotCount / 1e9)
      : 0;
    for (const r of ALL_REGIONS) {
      const v = state.regions[r];
      v.unemploymentSoftware = clamp(v.unemploymentSoftware + k, 0, 100);
      v.unemploymentPhysical = clamp(v.unemploymentPhysical + physical, 0, 100);
    }
  },
};

/** Energy limit: a short grid means blackouts that lower public trust and slow AI progress. Also applies base growth. */
export const energyLimit: Rule = {
  id: 'energyLimit',
  apply(state) {
    const home = state.regions[playerCompany(state).homeRegion];
    const short = home.energy < 0;
    if (short) home.publicTrust = clamp(home.publicTrust - TUNING.blackoutTrustHit, 0, 100);
    const growth = TUNING.baseCapabilityGrowth * (short ? TUNING.blackoutSlowdown : 1);
    state.global.aiCapability += growth;
    for (const c of state.companies) c.vars.aiCapability += growth;
  },
};

/** Riots: very low public trust lowers GDP and raises geopolitical tension. */
export const riots: Rule = {
  id: 'riots',
  apply(state) {
    for (const r of ALL_REGIONS) {
      const v = state.regions[r];
      if (v.publicTrust < TUNING.riotTrustBelow) {
        v.gdp *= TUNING.riotGdpFactor;
        state.global.geopoliticalTension = clamp(state.global.geopoliticalTension + TUNING.riotTension, 0, 100);
      }
    }
  },
};

export const RULES: Rule[] = [automation, energyLimit, riots];
