import type { GlobalVars, RegionVars } from '../contracts';
import type { RegionBaseline } from './baseline';

/**
 * GAME-DESIGNED starting values (not real data, never shown as fact).
 * Real GDP, population and unemployment come from data/baseline.json (IMF snapshot, data/sources.json).
 * Everything below is an index or scale the game made up, or a value the IMF snapshot does not cover.
 */
export const GAME_DESIGNED_REGION = {
  unemploymentSoftware: 4, // used only where the baseline has no unemployment rate (GULF, AFRICA)
  unemploymentPhysical: 5,
  wealthGap: 50, // 0-100 index
  publicTrust: 60, // 0-100 index
  energy: 5, // supply minus demand, game units
  waterStress: 30, // 0-100 index
  regulationStrictness: 30, // 0-100 index
} as const;

export function regionFromBaseline(b: RegionBaseline): RegionVars {
  const d = GAME_DESIGNED_REGION;
  return {
    gdp: b.gdp,
    population: b.population,
    // The IMF gives one total rate; the game starts both job types there (see data/sources.json note).
    unemploymentSoftware: b.unemployment ?? d.unemploymentSoftware,
    unemploymentPhysical: b.unemployment ?? d.unemploymentPhysical,
    wealthGap: d.wealthGap,
    publicTrust: d.publicTrust,
    energy: d.energy,
    waterStress: d.waterStress,
    regulationStrictness: d.regulationStrictness,
  };
}

/** Game-designed global starting scale. These are not claims about the real world. */
export const GAME_DESIGNED_GLOBAL: GlobalVars = {
  aiCapability: 10,
  robotCount: 1_000_000,
  geopoliticalTension: 35,
  co2: 425,
  temperature: 1.2,
  seaLevel: 0,
  takeoverRisk: 0, // derived on every step
  riskMisuse: 20,
  riskMalfunction: 15,
  riskSystemic: 10,
};
