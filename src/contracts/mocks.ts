/**
 * MOCK DATA for building screens before the real sim exists. Owned by the lead.
 * Claude 2 and 3: build against these; Claude 1's real step() will produce the same shapes.
 */
import type { CityInfo, Company, Decision, RegionId, RegionVars, WorldState } from './index';

const baseRegion = (gdp: number, population: number): RegionVars => ({
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

export const mockCompanies: Company[] = [
  { id: 'novacore', name: 'NovaCore', archetype: 'frontierLab', homeRegion: 'US', homeCity: 'sf', playable: true,
    vars: { money: 500, companyValue: 100, publicTrust: 60, aiCapability: 10, safetyLevel: 60 } },
  { id: 'silicara', name: 'Silicara', archetype: 'chipMaker', homeRegion: 'US', homeCity: 'sf', playable: false,
    vars: { money: 800, companyValue: 150, publicTrust: 55, aiCapability: 6, safetyLevel: 50 } },
  { id: 'helix', name: 'Helix Labs', archetype: 'researchLab', homeRegion: 'US', homeCity: 'sf', playable: false,
    vars: { money: 300, companyValue: 60, publicTrust: 65, aiCapability: 8, safetyLevel: 70 } },
  { id: 'dragonmind', name: 'DragonMind', archetype: 'stateBackedLab', homeRegion: 'CN', homeCity: 'beijing', playable: false,
    vars: { money: 700, companyValue: 90, publicTrust: 50, aiCapability: 9, safetyLevel: 40 } },
];

export const mockCities: CityInfo[] = [
  { id: 'sf', name: 'San Francisco', region: 'US', mapPos: { x: 0.14, y: 0.38 }, companyIds: ['novacore', 'silicara', 'helix'] },
  { id: 'beijing', name: 'Beijing', region: 'CN', mapPos: { x: 0.78, y: 0.34 }, companyIds: ['dragonmind'] },
];

const regions = Object.fromEntries(
  (['US', 'CN', 'EU', 'UK', 'IN', 'RU', 'GULF', 'AFRICA', 'LATAM', 'SEA'] as RegionId[]).map((r) => [r, baseRegion(1000, 100)]),
) as Record<RegionId, RegionVars>;
regions.US = baseRegion(29000, 340);
regions.CN = baseRegion(19000, 1410);

export const mockWorldState: WorldState = {
  year: 2026,
  seed: 1,
  outlook: 'middle',
  global: {
    aiCapability: 10, robotCount: 1_000_000, geopoliticalTension: 35, co2: 425, temperature: 1.2, seaLevel: 0,
    takeoverRisk: 1, riskMisuse: 20, riskMalfunction: 15, riskSystemic: 10,
  },
  regions,
  companies: mockCompanies,
  playerCompanyId: 'novacore',
  activeCityEffects: [{ city: 'sf', kind: 'blackout', intensity: 0.6, sinceYear: 2026 }],
  unlockedPathways: [],
  choiceLog: [],
  eventLog: [],
  headlines: [{ year: 2026, text: 'Data-centre campus fast-tracked; rolling blackouts hit surrounding districts', city: 'sf' }],
  history: [{ year: 2026, gdp: { US: 29000, CN: 19000 }, global: { geopoliticalTension: 35 } }],
  pending: [],
  status: { over: false },
};

export const mockDecisions: Decision[] = [
  {
    id: 'mock-fossil-power',
    title: 'Cheap power for the new campus',
    text: 'Gas plants can power your data centre next year. Renewables would take three.',
    era: '2026-2030',
    options: [
      { id: 'gas', label: 'Buy cheap fossil power',
        effects: [{ target: { scope: 'company', variable: 'money' }, op: 'add', value: 50 }],
        shortTerm: { economy: 1, safety: 0, publicTrust: -1 }, longTerm: { economy: 0, safety: 0, publicTrust: -1 } },
      { id: 'renewables', label: 'Wait for renewables',
        effects: [{ target: { scope: 'company', variable: 'money' }, op: 'add', value: -30 }],
        shortTerm: { economy: -1, safety: 0, publicTrust: 1 }, longTerm: { economy: 1, safety: 0, publicTrust: 1 } },
    ],
  },
];
