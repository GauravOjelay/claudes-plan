import type { ExpertOutlook, WorldState } from '../contracts';
import { ALL_REGIONS, clamp, companySize, directedCompanies, playerCompany } from './vars';

/** One line of cause and effect (plan section 3). Mutates the cloned `state`. */
export interface Rule {
  id: string;
  apply(state: WorldState): void;
}

/** How hard automation hits, by randomised expert outlook (Hinton-style .. Acemoglu-style). */
export const OUTLOOK_AUTOMATION: Record<ExpertOutlook, number> = { severeShock: 1.5, middle: 1, overblown: 0.5 };

export const TUNING = {
  baseCapabilityGrowth: 4, // AI capability points per year
  blackoutSlowdown: 0.75, // multiplier on growth while the grid is short
  automationPerCapability: 0.05, // software-unemployment points per capability point per year
  robotsForPhysicalJobs: 1e8, // physical automation only starts at this many robots (plan section 3)
  physicalPerBillionRobots: 3, // physical-unemployment points per year at 1bn robots
  blackoutTrustHit: 3, // regional public-trust points lost per year of shortage
  riotTrustBelow: 20, // "very low" public trust
  riotGdpFactor: 0.98,
  riotTension: 1,
  baseGdpGrowth: 0.025, // per year
  gdpPerCapability: 0.0004, // extra growth per global capability point
  gdpUnemploymentDrag: 0.0003, // growth lost per point of average unemployment
  gdpBlackoutDrag: 0.01,
  robotGrowthBase: 1.1, // robots multiply by this each year on their own ...
  robotGrowthPerCapability: 0.006, // ... plus this per capability point (smarter AI builds robots faster)
  raceTensionPerCapability: 0.03, // arms-race pressure: tension points added per capability point per year
  tensionHome: 35, // tension drifts back toward this
  tensionRecovery: 0.04,
  unrestUnemployment: 12, // average unemployment above this (software + physical)/2 causes unrest
  unrestTrustHit: 2, // per year, with no safety net
  unrestWealthGap: 1.5,
  safetyNetFactor: 0.2, // unrest is scaled by this once the 'ubi' pathway is unlocked
  trustRecovery: 0.08, // share of the gap to trustHome closed each year
  trustHome: 60,
  regulationPull: 0.15, // share of the gap to (100 - trust) closed each year
  concentrationPerCapability: 0.01, // wealth-gap points per capability point per year (x outlook)
  monopolyFreeShare: 0.1, // a player who steers up to this share of a region's AI company value causes no extra concentration
  monopolyPerYear: 0.7, // wealth-gap points per year in a region the player fully controls (scaled up from the free share)
  incomeRate: 0.1, // company income per year as a share of company value (x trust/60)
  burnBase: 12,
  burnPerCapability: 0.4,
  valueGrowth: 0.03, // company value growth per year
  valueTrust: 0.001, // extra growth per trust point above 50
  valueBlackout: 0.03,
} as const;

/** Pathway id that stands for a safety net (universal basic income and similar). Unlocked by decision options. */
export const SAFETY_NET = 'ubi';

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
    // World capability is at least as high as the best lab's (a breakthrough anywhere lifts the frontier).
    state.global.aiCapability = Math.max(state.global.aiCapability, ...state.companies.map((c) => c.vars.aiCapability));
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

/** Unrest: high unemployment with no safety net lowers public trust and raises the wealth gap. */
export const unrest: Rule = {
  id: 'unrest',
  apply(state) {
    const scale = state.unlockedPathways.includes(SAFETY_NET) ? TUNING.safetyNetFactor : 1;
    for (const r of ALL_REGIONS) {
      const v = state.regions[r];
      if ((v.unemploymentSoftware + v.unemploymentPhysical) / 2 > TUNING.unrestUnemployment) {
        v.publicTrust = clamp(v.publicTrust - TUNING.unrestTrustHit * scale, 0, 100);
        v.wealthGap = clamp(v.wealthGap + TUNING.unrestWealthGap * scale, 0, 100);
      }
    }
  },
};

/** AI gains concentrate at the top: the wealth gap creeps up with capability (stronger in a severe-shock outlook). */
export const concentration: Rule = {
  id: 'concentration',
  apply(state) {
    const k = TUNING.concentrationPerCapability * OUTLOOK_AUTOMATION[state.outlook] * state.global.aiCapability;
    // The more of a region's AI company value the player steers (flagship + every company with a decision), the more
    // wealth pools at the top there: running the whole industry is the road to Corporate Feudalism.
    const mine = directedCompanies(state);
    for (const r of ALL_REGIONS) {
      const all = state.companies.filter((c) => c.playable && c.homeRegion === r);
      const total = all.reduce((t, c) => t + c.vars.companyValue, 0);
      const owned = mine.filter((c) => c.homeRegion === r).reduce((t, c) => t + c.vars.companyValue, 0);
      const share = total > 0 ? owned / total : 0;
      const monopoly = TUNING.monopolyPerYear * clamp((share - TUNING.monopolyFreeShare) / (1 - TUNING.monopolyFreeShare), 0, 1);
      state.regions[r].wealthGap = clamp(state.regions[r].wealthGap + k + monopoly, 0, 100);
    }
  },
};

/** Growth: GDP grows with AI capability, and is dragged down by unemployment and blackouts. */
export const gdpGrowth: Rule = {
  id: 'gdpGrowth',
  apply(state) {
    for (const r of ALL_REGIONS) {
      const v = state.regions[r];
      const unemployment = (v.unemploymentSoftware + v.unemploymentPhysical) / 2;
      const g = TUNING.baseGdpGrowth + TUNING.gdpPerCapability * state.global.aiCapability
        - TUNING.gdpUnemploymentDrag * unemployment - (v.energy < 0 ? TUNING.gdpBlackoutDrag : 0);
      v.gdp *= 1 + clamp(g, -0.1, 0.2);
    }
  },
};

/** Robots multiply every year; decisions can speed this up. Physical automation and takeover gate on this number. */
export const robotGrowth: Rule = {
  id: 'robotGrowth',
  apply(state) {
    state.global.robotCount *= TUNING.robotGrowthBase + TUNING.robotGrowthPerCapability * state.global.aiCapability;
  },
};

/** Arms race: the more capable AI gets, the more the blocs strain against each other. */
export const raceTension: Rule = {
  id: 'raceTension',
  apply(state) {
    const g = state.global;
    g.geopoliticalTension = clamp(g.geopoliticalTension + TUNING.raceTensionPerCapability * g.aiCapability, 0, 100);
  },
};

/** Tension drifts back toward its home value, so only sustained provocation keeps it high. */
export const tensionDrift: Rule = {
  id: 'tensionDrift',
  apply(state) {
    const g = state.global;
    g.geopoliticalTension = clamp(g.geopoliticalTension + (TUNING.tensionHome - g.geopoliticalTension) * TUNING.tensionRecovery, 0, 100);
  },
};

/** Trust recovers slowly (a delay: early scandals still matter later); trust pushes regulation up. */
export const trustAndRegulation: Rule = {
  id: 'trustAndRegulation',
  apply(state) {
    for (const r of ALL_REGIONS) {
      const v = state.regions[r];
      v.publicTrust = clamp(v.publicTrust + (TUNING.trustHome - v.publicTrust) * TUNING.trustRecovery, 0, 100);
      v.regulationStrictness = clamp(v.regulationStrictness + ((100 - v.publicTrust) - v.regulationStrictness) * TUNING.regulationPull, 0, 100);
    }
  },
};

/** The player's company: income from products, burn from research, investors reward growth and trust. */
export const companyEconomy: Rule = {
  id: 'companyEconomy',
  apply(state) {
    // Every company the player runs has its own books. Costs scale with size (the flagship, value 100, is the reference).
    for (const c of state.companies) {
      if (!c.playable) continue;
      const me = c.vars;
      const size = companySize(c.id);
      const short = state.regions[c.homeRegion].energy < 0;
      me.money += TUNING.incomeRate * me.companyValue * (me.publicTrust / 60) - (TUNING.burnBase + TUNING.burnPerCapability * me.aiCapability) * size;
      const growth = TUNING.valueGrowth + TUNING.valueTrust * (me.publicTrust - 50) - (short ? TUNING.valueBlackout : 0);
      me.companyValue = Math.max(0, me.companyValue * (1 + growth));
      // Company trust follows the home region's trust, with a lag.
      const home = state.regions[c.homeRegion].publicTrust;
      me.publicTrust = clamp(me.publicTrust + (home - me.publicTrust) * 0.3, 0, 100);
      // One headline the first time a company runs dry (a single bankruptcy is news, not the end of the game).
      const text = `${c.name} runs out of money`;
      if (me.money < 0 && !state.headlines.some((h) => h.text === text)) {
        state.headlines.push({ year: state.year, text, companyId: c.id, city: c.homeCity });
      }
    }
  },
};

export const RULES: Rule[] = [
  automation, concentration, energyLimit, unrest, riots, gdpGrowth, robotGrowth, raceTension, tensionDrift, trustAndRegulation, companyEconomy,
];
