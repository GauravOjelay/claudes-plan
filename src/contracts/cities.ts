/**
 * Fixed roster of cities and companies. Owned by the lead.
 * Claude 1: createInitialState() builds WorldState.companies from COMPANY_ROSTER.
 * Claude 2/3: read CITIES for map positions and HQ lists. Every city has 3 HQs; only NovaCore is playable.
 * Names are FICTIONAL (DECISIONS.md #1).
 */
import type { CityInfo, Company } from './index';

const v = (money: number, companyValue: number, publicTrust: number, aiCapability: number, safetyLevel: number) => ({
  money, companyValue, publicTrust, aiCapability, safetyLevel,
});

export const COMPANY_ROSTER: Company[] = [
  // San Francisco
  { id: 'novacore', name: 'NovaCore', archetype: 'frontierLab', homeRegion: 'US', homeCity: 'sf', playable: true, vars: v(500, 100, 60, 10, 60) },
  { id: 'silicara', name: 'Silicara', archetype: 'chipMaker', homeRegion: 'US', homeCity: 'sf', playable: false, vars: v(800, 150, 55, 6, 50) },
  { id: 'helix', name: 'Helix Labs', archetype: 'researchLab', homeRegion: 'US', homeCity: 'sf', playable: false, vars: v(300, 60, 65, 8, 70) },
  // Beijing
  { id: 'dragonmind', name: 'DragonMind', archetype: 'stateBackedLab', homeRegion: 'CN', homeCity: 'beijing', playable: false, vars: v(700, 90, 50, 9, 40) },
  { id: 'jadewave', name: 'JadeWave', archetype: 'frontierLab', homeRegion: 'CN', homeCity: 'beijing', playable: false, vars: v(450, 70, 52, 8, 45) },
  { id: 'orientcore', name: 'OrientCore', archetype: 'chipMaker', homeRegion: 'CN', homeCity: 'beijing', playable: false, vars: v(600, 80, 50, 5, 45) },
  // London
  { id: 'meridian', name: 'Meridian AI', archetype: 'frontierLab', homeRegion: 'UK', homeCity: 'london', playable: false, vars: v(350, 55, 68, 7, 75) },
  { id: 'thamescompute', name: 'Thames Compute', archetype: 'chipMaker', homeRegion: 'UK', homeCity: 'london', playable: false, vars: v(250, 40, 62, 4, 65) },
  { id: 'ardent', name: 'Ardent Labs', archetype: 'researchLab', homeRegion: 'UK', homeCity: 'london', playable: false, vars: v(200, 35, 70, 6, 80) },
];

export const CITIES: CityInfo[] = [
  { id: 'sf', name: 'San Francisco', region: 'US', mapPos: { x: 0.14, y: 0.38 }, companyIds: ['novacore', 'silicara', 'helix'] },
  { id: 'beijing', name: 'Beijing', region: 'CN', mapPos: { x: 0.78, y: 0.34 }, companyIds: ['dragonmind', 'jadewave', 'orientcore'] },
  { id: 'london', name: 'London', region: 'UK', mapPos: { x: 0.48, y: 0.28 }, companyIds: ['meridian', 'thamescompute', 'ardent'] },
];
