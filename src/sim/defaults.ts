import type { GlobalVars, RegionId, RegionVars } from '../contracts';

/**
 * PLACEHOLDER starting numbers (game-designed, NOT real data, NOT to be shown as fact).
 * Real GDP / population / unemployment come from data/baseline.json once the IMF snapshot exists
 * (TASKS.md worker-1 step 5); createInitialState will read that file and these constants go away.
 * The US and CN GDP/population match the lead's mocks so screens built on mocks look the same.
 */
const region = (gdp: number, population: number): RegionVars => ({
  gdp,
  population,
  unemploymentSoftware: 4,
  unemploymentPhysical: 5,
  wealthGap: 50,
  publicTrust: 60,
  energy: 5,
  waterStress: 30,
  regulationStrictness: 30,
});

export const PLACEHOLDER_REGIONS: Record<RegionId, RegionVars> = {
  US: region(29000, 340),
  CN: region(19000, 1410),
  EU: region(1000, 100),
  UK: region(1000, 100),
  IN: region(1000, 100),
  RU: region(1000, 100),
  GULF: region(1000, 100),
  AFRICA: region(1000, 100),
  LATAM: region(1000, 100),
  SEA: region(1000, 100),
};

export const PLACEHOLDER_GLOBAL: GlobalVars = {
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
