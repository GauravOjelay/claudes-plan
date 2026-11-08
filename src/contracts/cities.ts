/**
 * Fixed roster of cities and companies. Owned by the lead.
 * 2026-11-08 (owner decision): NO RIVALS. The player controls EVERY company below (all playable).
 * Names are parodies of real firms, placed in the real firm's home country/city.
 * `playerCompanyId` in WorldState is the flagship (ClosedAI): default HQ, and the company used where one is needed.
 * Cities without companies still exist for the map, city effects and Average Joe.
 */
import type { CityInfo, Company } from './index';

const v = (money: number, companyValue: number, publicTrust: number, aiCapability: number, safetyLevel: number) => ({
  money, companyValue, publicTrust, aiCapability, safetyLevel,
});

export const FLAGSHIP_COMPANY_ID = 'closedai';

export const COMPANY_ROSTER: Company[] = [
  { id: 'closedai', name: 'ClosedAI', archetype: 'frontierLab', homeRegion: 'US', homeCity: 'sf', playable: true, vars: v(500, 100, 60, 10, 60) },
  { id: 'cancer', name: 'Cancer', archetype: 'softwareCompany', homeRegion: 'US', homeCity: 'sf', playable: true, vars: v(150, 45, 62, 6, 58) },
  { id: 'pineapple', name: 'PineApple', archetype: 'chipMaker', homeRegion: 'US', homeCity: 'sf', playable: true, vars: v(900, 160, 70, 6, 70) },
  { id: 'mvidia', name: 'Mvidia', archetype: 'chipMaker', homeRegion: 'US', homeCity: 'sf', playable: true, vars: v(850, 170, 58, 7, 52) },
  { id: 'spacey', name: 'SpaceY', archetype: 'frontierLab', homeRegion: 'US', homeCity: 'sf', playable: true, vars: v(600, 120, 45, 9, 35) },
  { id: 'macrohard', name: 'MacroHard', archetype: 'frontierLab', homeRegion: 'US', homeCity: 'seattle', playable: true, vars: v(800, 150, 60, 9, 62) },
  { id: 'psychic', name: 'Psychic', archetype: 'chipMaker', homeRegion: 'US', homeCity: 'austin', playable: true, vars: v(450, 90, 52, 5, 60) },
  { id: 'pushingface', name: 'PushingFace', archetype: 'researchLab', homeRegion: 'US', homeCity: 'nyc', playable: true, vars: v(120, 30, 74, 6, 66) },
  { id: 'johnstreet', name: 'John Street', archetype: 'financeFirm', homeRegion: 'US', homeCity: 'nyc', playable: true, vars: v(700, 90, 55, 4, 60) },
  { id: 'citadelinsecurities', name: 'Citadel Insecurities', archetype: 'financeFirm', homeRegion: 'US', homeCity: 'nyc', playable: true, vars: v(650, 85, 45, 4, 50) },
  { id: 'bmi', name: 'BMI', archetype: 'researchLab', homeRegion: 'US', homeCity: 'nyc', playable: true, vars: v(400, 70, 64, 5, 72) },
  { id: 'silvermansachs', name: 'Silverman Sachs', archetype: 'financeFirm', homeRegion: 'US', homeCity: 'nyc', playable: true, vars: v(750, 110, 48, 3, 58) },
  { id: 'goldmanstanley', name: 'Goldman Stanley', archetype: 'financeFirm', homeRegion: 'US', homeCity: 'nyc', playable: true, vars: v(700, 100, 50, 3, 58) },
  { id: 'capitoltwo', name: 'Capitol Two', archetype: 'financeFirm', homeRegion: 'US', homeCity: 'nyc', playable: true, vars: v(500, 75, 52, 3, 55) },
  { id: 'twelvelabs', name: 'TwelveLabs', archetype: 'softwareCompany', homeRegion: 'UK', homeCity: 'london', playable: true, vars: v(110, 28, 66, 5, 64) },
  { id: 'unlovable', name: 'Unlovable', archetype: 'softwareCompany', homeRegion: 'EU', homeCity: 'stockholm', playable: true, vars: v(80, 22, 55, 4, 48) },
  { id: 'shallowseek', name: 'ShallowSeek', archetype: 'frontierLab', homeRegion: 'CN', homeCity: 'hangzhou', playable: true, vars: v(300, 60, 50, 9, 38) },
];

export const CITIES: CityInfo[] = [
  { id: 'sf', name: 'San Francisco', region: 'US', mapPos: { x: 0.14, y: 0.38 }, companyIds: ['closedai', 'cancer', 'pineapple', 'mvidia', 'spacey'] },
  { id: 'beijing', name: 'Beijing', region: 'CN', mapPos: { x: 0.78, y: 0.34 }, companyIds: [] },
  { id: 'london', name: 'London', region: 'UK', mapPos: { x: 0.48, y: 0.28 }, companyIds: ['twelvelabs'] },
  { id: 'nyc', name: 'New York', region: 'US', mapPos: { x: 0.267, y: 0.349 }, companyIds: ['pushingface', 'johnstreet', 'citadelinsecurities', 'bmi', 'silvermansachs', 'goldmanstanley', 'capitoltwo'] },
  { id: 'mexicocity', name: 'Mexico City', region: 'LATAM', mapPos: { x: 0.197, y: 0.491 }, companyIds: [] },
  { id: 'saopaulo', name: 'São Paulo', region: 'LATAM', mapPos: { x: 0.343, y: 0.777 }, companyIds: [] },
  { id: 'paris', name: 'Paris', region: 'EU', mapPos: { x: 0.479, y: 0.294 }, companyIds: [] },
  { id: 'munich', name: 'Munich', region: 'EU', mapPos: { x: 0.504, y: 0.299 }, companyIds: [] },
  { id: 'moscow', name: 'Moscow', region: 'RU', mapPos: { x: 0.577, y: 0.248 }, companyIds: [] },
  { id: 'dubai', name: 'Dubai', region: 'GULF', mapPos: { x: 0.626, y: 0.452 }, companyIds: [] },
  { id: 'cairo', name: 'Cairo', region: 'AFRICA', mapPos: { x: 0.559, y: 0.42 }, companyIds: [] },
  { id: 'lagos', name: 'Lagos', region: 'AFRICA', mapPos: { x: 0.482, y: 0.577 }, companyIds: [] },
  { id: 'bangalore', name: 'Bengaluru', region: 'IN', mapPos: { x: 0.688, y: 0.534 }, companyIds: [] },
  { id: 'singapore', name: 'Singapore', region: 'SEA', mapPos: { x: 0.761, y: 0.611 }, companyIds: [] },
  { id: 'tokyo', name: 'Tokyo', region: 'SEA', mapPos: { x: 0.86, y: 0.382 }, companyIds: [] },
  { id: 'seattle', name: 'Seattle', region: 'US', mapPos: { x: 0.132, y: 0.303 }, companyIds: ['macrohard'] },
  { id: 'austin', name: 'Austin', region: 'US', mapPos: { x: 0.201, y: 0.418 }, companyIds: ['psychic'] },
  { id: 'stockholm', name: 'Stockholm', region: 'EU', mapPos: { x: 0.522, y: 0.224 }, companyIds: ['unlovable'] },
  { id: 'hangzhou', name: 'Hangzhou', region: 'CN', mapPos: { x: 0.806, y: 0.418 }, companyIds: ['shallowseek'] },
];
