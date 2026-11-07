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

  // --- more cities (moved here from src/world/roster.ts at the owner's request; all fictional) ---
  { id: 'hudsonmind', name: 'Hudson Mind', archetype: 'frontierLab', homeRegion: 'US', homeCity: 'nyc', playable: false, vars: v(650, 130, 58, 9, 55) },
  { id: 'ledgerline', name: 'Ledgerline', archetype: 'researchLab', homeRegion: 'US', homeCity: 'nyc', playable: false, vars: v(400, 70, 72, 6, 78) },
  { id: 'brightpath', name: 'Brightpath Robotics', archetype: 'chipMaker', homeRegion: 'US', homeCity: 'nyc', playable: false, vars: v(120, 25, 40, 4, 30) },
  { id: 'aztecai', name: 'Tlaloc Systems', archetype: 'researchLab', homeRegion: 'LATAM', homeCity: 'mexicocity', playable: false, vars: v(160, 30, 66, 4, 70) },
  { id: 'nopalnet', name: 'NopalNet', archetype: 'frontierLab', homeRegion: 'LATAM', homeCity: 'mexicocity', playable: false, vars: v(220, 38, 45, 5, 38) },
  { id: 'volcanica', name: 'Volcánica Chips', archetype: 'chipMaker', homeRegion: 'LATAM', homeCity: 'mexicocity', playable: false, vars: v(90, 18, 55, 2, 60) },
  { id: 'paulista', name: 'Paulista Labs', archetype: 'frontierLab', homeRegion: 'LATAM', homeCity: 'saopaulo', playable: false, vars: v(300, 52, 60, 6, 62) },
  { id: 'ipe', name: 'Ipê Intelligence', archetype: 'researchLab', homeRegion: 'LATAM', homeCity: 'saopaulo', playable: false, vars: v(140, 26, 74, 4, 82) },
  { id: 'carioca', name: 'Carioca Compute', archetype: 'chipMaker', homeRegion: 'LATAM', homeCity: 'saopaulo', playable: false, vars: v(200, 40, 35, 3, 28) },
  { id: 'lumiere', name: 'Lumière AI', archetype: 'frontierLab', homeRegion: 'EU', homeCity: 'paris', playable: false, vars: v(420, 85, 64, 8, 72) },
  { id: 'seine', name: 'Seine Systèmes', archetype: 'researchLab', homeRegion: 'EU', homeCity: 'paris', playable: false, vars: v(180, 32, 70, 5, 80) },
  { id: 'montmartre', name: 'Montmartre Data', archetype: 'chipMaker', homeRegion: 'EU', homeCity: 'paris', playable: false, vars: v(110, 20, 38, 3, 35) },
  { id: 'isarwerk', name: 'Isarwerk', archetype: 'chipMaker', homeRegion: 'EU', homeCity: 'munich', playable: false, vars: v(520, 95, 68, 5, 76) },
  { id: 'alpenkern', name: 'Alpenkern', archetype: 'frontierLab', homeRegion: 'EU', homeCity: 'munich', playable: false, vars: v(260, 48, 52, 7, 58) },
  { id: 'bavaria', name: 'Föhn Robotics', archetype: 'researchLab', homeRegion: 'EU', homeCity: 'munich', playable: false, vars: v(95, 17, 42, 3, 45) },
  { id: 'volkhov', name: 'Volkhov Labs', archetype: 'stateBackedLab', homeRegion: 'RU', homeCity: 'moscow', playable: false, vars: v(500, 70, 40, 8, 30) },
  { id: 'sputnikmind', name: 'Sputnik Mind', archetype: 'frontierLab', homeRegion: 'RU', homeCity: 'moscow', playable: false, vars: v(180, 28, 45, 5, 40) },
  { id: 'taiga', name: 'Taiga Silicon', archetype: 'chipMaker', homeRegion: 'RU', homeCity: 'moscow', playable: false, vars: v(140, 22, 50, 3, 55) },
  { id: 'falconcore', name: 'Falcon Core', archetype: 'stateBackedLab', homeRegion: 'GULF', homeCity: 'dubai', playable: false, vars: v(900, 110, 48, 7, 50) },
  { id: 'oasis', name: 'Oasis Compute', archetype: 'chipMaker', homeRegion: 'GULF', homeCity: 'dubai', playable: false, vars: v(600, 80, 55, 4, 60) },
  { id: 'mirage', name: 'Mirage Agents', archetype: 'frontierLab', homeRegion: 'GULF', homeCity: 'dubai', playable: false, vars: v(150, 24, 36, 5, 25) },
  { id: 'nilegrid', name: 'Nile Grid', archetype: 'chipMaker', homeRegion: 'AFRICA', homeCity: 'cairo', playable: false, vars: v(130, 22, 58, 3, 64) },
  { id: 'pharos', name: 'Pharos AI', archetype: 'frontierLab', homeRegion: 'AFRICA', homeCity: 'cairo', playable: false, vars: v(170, 30, 50, 5, 46) },
  { id: 'papyrus', name: 'Papyrus Labs', archetype: 'researchLab', homeRegion: 'AFRICA', homeCity: 'cairo', playable: false, vars: v(70, 12, 72, 2, 80) },
  { id: 'eko', name: 'Eko Intelligence', archetype: 'frontierLab', homeRegion: 'AFRICA', homeCity: 'lagos', playable: false, vars: v(210, 40, 62, 5, 60) },
  { id: 'naija', name: 'Lagoon Labs', archetype: 'researchLab', homeRegion: 'AFRICA', homeCity: 'lagos', playable: false, vars: v(90, 16, 76, 3, 78) },
  { id: 'harmattan', name: 'Harmattan Hardware', archetype: 'chipMaker', homeRegion: 'AFRICA', homeCity: 'lagos', playable: false, vars: v(60, 10, 39, 1, 33) },
  { id: 'gardencity', name: 'Garden City AI', archetype: 'frontierLab', homeRegion: 'IN', homeCity: 'bangalore', playable: false, vars: v(380, 68, 61, 7, 63) },
  { id: 'kaveri', name: 'Kaveri Compute', archetype: 'chipMaker', homeRegion: 'IN', homeCity: 'bangalore', playable: false, vars: v(250, 45, 57, 4, 58) },
  { id: 'nandi', name: 'Nandi Agents', archetype: 'researchLab', homeRegion: 'IN', homeCity: 'bangalore', playable: false, vars: v(80, 14, 44, 4, 34) },
  { id: 'merlion', name: 'Merlion Labs', archetype: 'frontierLab', homeRegion: 'SEA', homeCity: 'singapore', playable: false, vars: v(480, 90, 70, 7, 77) },
  { id: 'straits', name: 'Straits Silicon', archetype: 'chipMaker', homeRegion: 'SEA', homeCity: 'singapore', playable: false, vars: v(550, 88, 63, 4, 70) },
  { id: 'monsoon', name: 'Monsoon Agents', archetype: 'researchLab', homeRegion: 'SEA', homeCity: 'singapore', playable: false, vars: v(100, 18, 41, 4, 36) },
  { id: 'kitsune', name: 'Kitsune Robotics', archetype: 'chipMaker', homeRegion: 'SEA', homeCity: 'tokyo', playable: false, vars: v(700, 125, 66, 6, 74) },
  { id: 'sakuragi', name: 'Sakuragi AI', archetype: 'frontierLab', homeRegion: 'SEA', homeCity: 'tokyo', playable: false, vars: v(450, 82, 59, 8, 61) },
  { id: 'tsunami', name: 'Raijin Systems', archetype: 'researchLab', homeRegion: 'SEA', homeCity: 'tokyo', playable: false, vars: v(130, 22, 37, 5, 29) },
];

export const CITIES: CityInfo[] = [
  { id: 'sf', name: 'San Francisco', region: 'US', mapPos: { x: 0.14, y: 0.38 }, companyIds: ['novacore', 'silicara', 'helix'] },
  { id: 'beijing', name: 'Beijing', region: 'CN', mapPos: { x: 0.78, y: 0.34 }, companyIds: ['dragonmind', 'jadewave', 'orientcore'] },
  { id: 'london', name: 'London', region: 'UK', mapPos: { x: 0.48, y: 0.28 }, companyIds: ['meridian', 'thamescompute', 'ardent'] },
  // --- more cities ---
  { id: 'nyc', name: 'New York', region: 'US', mapPos: { x: 0.267, y: 0.349 }, companyIds: ['hudsonmind', 'ledgerline', 'brightpath'] },
  { id: 'mexicocity', name: 'Mexico City', region: 'LATAM', mapPos: { x: 0.197, y: 0.491 }, companyIds: ['aztecai', 'nopalnet', 'volcanica'] },
  { id: 'saopaulo', name: 'São Paulo', region: 'LATAM', mapPos: { x: 0.343, y: 0.777 }, companyIds: ['paulista', 'ipe', 'carioca'] },
  { id: 'paris', name: 'Paris', region: 'EU', mapPos: { x: 0.479, y: 0.294 }, companyIds: ['lumiere', 'seine', 'montmartre'] },
  { id: 'munich', name: 'Munich', region: 'EU', mapPos: { x: 0.504, y: 0.299 }, companyIds: ['isarwerk', 'alpenkern', 'bavaria'] },
  { id: 'moscow', name: 'Moscow', region: 'RU', mapPos: { x: 0.577, y: 0.248 }, companyIds: ['volkhov', 'sputnikmind', 'taiga'] },
  { id: 'dubai', name: 'Dubai', region: 'GULF', mapPos: { x: 0.626, y: 0.452 }, companyIds: ['falconcore', 'oasis', 'mirage'] },
  { id: 'cairo', name: 'Cairo', region: 'AFRICA', mapPos: { x: 0.559, y: 0.42 }, companyIds: ['nilegrid', 'pharos', 'papyrus'] },
  { id: 'lagos', name: 'Lagos', region: 'AFRICA', mapPos: { x: 0.482, y: 0.577 }, companyIds: ['eko', 'naija', 'harmattan'] },
  { id: 'bangalore', name: 'Bengaluru', region: 'IN', mapPos: { x: 0.688, y: 0.534 }, companyIds: ['gardencity', 'kaveri', 'nandi'] },
  { id: 'singapore', name: 'Singapore', region: 'SEA', mapPos: { x: 0.761, y: 0.611 }, companyIds: ['merlion', 'straits', 'monsoon'] },
  { id: 'tokyo', name: 'Tokyo', region: 'SEA', mapPos: { x: 0.86, y: 0.382 }, companyIds: ['kitsune', 'sakuragi', 'tsunami'] },
];
