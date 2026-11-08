/**
 * Fixed roster of cities and companies. Owned by the lead.
 * 2026-11-08 (owner decision): NO RIVALS. The player controls EVERY company below (all playable).
 * The 17 owner-named companies are parodies of real firms, placed in the real firm's home country/city.
 * Every other company is made up (task #21): local-sounding names, not parodies of any real firm.
 * `playerCompanyId` in WorldState is the flagship (ClosedAI): default HQ, and the company used where one is needed.
 * Every city has at least one company.
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
  // ---- Made-up companies for the cities that had none (2026-11-08, task #21). Not parodies of real firms. ----
  // beijing
  { id: 'qingheminds', name: 'Qinghe Minds', archetype: 'frontierLab', homeRegion: 'CN', homeCity: 'beijing', playable: true, vars: v(480, 85, 52, 9, 46) },
  { id: 'hutonglogic', name: 'Hutong Logic', archetype: 'softwareCompany', homeRegion: 'CN', homeCity: 'beijing', playable: true, vars: v(260, 48, 58, 5, 56) },
  { id: 'jadegatesilicon', name: 'Jade Gate Silicon', archetype: 'chipMaker', homeRegion: 'CN', homeCity: 'beijing', playable: true, vars: v(420, 75, 55, 5, 58) },
  // paris
  { id: 'ateliercortex', name: 'Atelier Cortex', archetype: 'researchLab', homeRegion: 'EU', homeCity: 'paris', playable: true, vars: v(240, 52, 66, 7, 68) },
  { id: 'sableseine', name: 'Sable & Seine', archetype: 'financeFirm', homeRegion: 'EU', homeCity: 'paris', playable: true, vars: v(520, 80, 60, 3, 68) },
  { id: 'montmartresystems', name: 'Montmartre Systems', archetype: 'softwareCompany', homeRegion: 'EU', homeCity: 'paris', playable: true, vars: v(180, 36, 50, 4, 46) },
  // munich
  { id: 'isarwerk', name: 'Isarwerk AI', archetype: 'chipMaker', homeRegion: 'EU', homeCity: 'munich', playable: true, vars: v(560, 95, 66, 5, 78) },
  { id: 'marienplatzcapital', name: 'Marienplatz Capital', archetype: 'financeFirm', homeRegion: 'EU', homeCity: 'munich', playable: true, vars: v(640, 90, 60, 3, 70) },
  { id: 'nymphenrobotics', name: 'Nymphen Robotics', archetype: 'researchLab', homeRegion: 'EU', homeCity: 'munich', playable: true, vars: v(300, 55, 58, 7, 60) },
  // moscow
  { id: 'arbatlabs', name: 'Arbat Labs', archetype: 'frontierLab', homeRegion: 'RU', homeCity: 'moscow', playable: true, vars: v(380, 60, 46, 8, 40) },
  { id: 'tverskayacloud', name: 'Tverskaya Cloud', archetype: 'softwareCompany', homeRegion: 'RU', homeCity: 'moscow', playable: true, vars: v(220, 40, 44, 5, 48) },
  // dubai
  { id: 'palmhorizon', name: 'Palm Horizon AI', archetype: 'stateBackedLab', homeRegion: 'GULF', homeCity: 'dubai', playable: true, vars: v(950, 115, 48, 9, 46) },
  { id: 'duneledger', name: 'Dune Ledger', archetype: 'financeFirm', homeRegion: 'GULF', homeCity: 'dubai', playable: true, vars: v(560, 80, 52, 3, 58) },
  { id: 'falconsouq', name: 'Falcon Souq', archetype: 'softwareCompany', homeRegion: 'GULF', homeCity: 'dubai', playable: true, vars: v(170, 32, 54, 4, 50) },
  // cairo
  { id: 'papyruspay', name: 'Papyrus Pay', archetype: 'financeFirm', homeRegion: 'AFRICA', homeCity: 'cairo', playable: true, vars: v(120, 22, 58, 3, 60) },
  { id: 'sphinxlogic', name: 'Sphinx Logic', archetype: 'softwareCompany', homeRegion: 'AFRICA', homeCity: 'cairo', playable: true, vars: v(70, 14, 64, 4, 70) },
  { id: 'deltaharvest', name: 'Delta Harvest AI', archetype: 'researchLab', homeRegion: 'AFRICA', homeCity: 'cairo', playable: true, vars: v(60, 12, 68, 4, 72) },
  // lagos
  { id: 'ekoledger', name: 'Eko Ledger', archetype: 'financeFirm', homeRegion: 'AFRICA', homeCity: 'lagos', playable: true, vars: v(140, 30, 62, 4, 64) },
  { id: 'lagoonlabs', name: 'Lagoon Labs', archetype: 'frontierLab', homeRegion: 'AFRICA', homeCity: 'lagos', playable: true, vars: v(100, 20, 60, 5, 58) },
  { id: 'ikoyimobile', name: 'Ikoyi Mobile', archetype: 'softwareCompany', homeRegion: 'AFRICA', homeCity: 'lagos', playable: true, vars: v(190, 38, 46, 4, 42) },
  // bangalore
  { id: 'nammacompute', name: 'Namma Compute', archetype: 'softwareCompany', homeRegion: 'IN', homeCity: 'bangalore', playable: true, vars: v(480, 78, 58, 5, 62) },
  { id: 'silkboardsystems', name: 'Silk Board Systems', archetype: 'softwareCompany', homeRegion: 'IN', homeCity: 'bangalore', playable: true, vars: v(330, 60, 50, 5, 46) },
  { id: 'lalbaghlabs', name: 'Lalbagh Labs', archetype: 'frontierLab', homeRegion: 'IN', homeCity: 'bangalore', playable: true, vars: v(200, 42, 50, 7, 40) },
  // singapore
  { id: 'merlioncapital', name: 'Merlion Capital', archetype: 'financeFirm', homeRegion: 'SEA', homeCity: 'singapore', playable: true, vars: v(650, 95, 70, 3, 78) },
  { id: 'marinaquanta', name: 'Marina Quanta', archetype: 'softwareCompany', homeRegion: 'SEA', homeCity: 'singapore', playable: true, vars: v(420, 76, 54, 6, 54) },
  // tokyo
  { id: 'sakuraservo', name: 'Sakura Servo', archetype: 'chipMaker', homeRegion: 'SEA', homeCity: 'tokyo', playable: true, vars: v(680, 120, 66, 6, 72) },
  { id: 'shinjukucapital', name: 'Shinjuku Capital', archetype: 'financeFirm', homeRegion: 'SEA', homeCity: 'tokyo', playable: true, vars: v(880, 130, 44, 5, 40) },
  { id: 'hoshizorarobotics', name: 'Hoshizora Robotics', archetype: 'frontierLab', homeRegion: 'SEA', homeCity: 'tokyo', playable: true, vars: v(230, 50, 60, 8, 64) },
  // mexicocity
  { id: 'zocalodigital', name: 'Zócalo Digital', archetype: 'softwareCompany', homeRegion: 'LATAM', homeCity: 'mexicocity', playable: true, vars: v(280, 52, 46, 4, 40) },
  { id: 'quetzalcuenta', name: 'Quetzal Cuenta', archetype: 'financeFirm', homeRegion: 'LATAM', homeCity: 'mexicocity', playable: true, vars: v(240, 44, 56, 2, 60) },
  { id: 'maizlabs', name: 'Maíz Labs', archetype: 'researchLab', homeRegion: 'LATAM', homeCity: 'mexicocity', playable: true, vars: v(150, 28, 68, 4, 70) },
  // saopaulo
  { id: 'paulistapay', name: 'Paulista Pay', archetype: 'financeFirm', homeRegion: 'LATAM', homeCity: 'saopaulo', playable: true, vars: v(300, 70, 64, 5, 62) },
  { id: 'ipecloud', name: 'Ipê Cloud', archetype: 'softwareCompany', homeRegion: 'LATAM', homeCity: 'saopaulo', playable: true, vars: v(150, 30, 50, 4, 42) },
  { id: 'avenidacapital', name: 'Avenida Capital', archetype: 'financeFirm', homeRegion: 'LATAM', homeCity: 'saopaulo', playable: true, vars: v(520, 88, 55, 3, 66) },
];

export const CITIES: CityInfo[] = [
  { id: 'sf', name: 'San Francisco', region: 'US', mapPos: { x: 0.14, y: 0.38 }, companyIds: ['closedai', 'cancer', 'pineapple', 'mvidia', 'spacey'] },
  { id: 'beijing', name: 'Beijing', region: 'CN', mapPos: { x: 0.78, y: 0.34 }, companyIds: ['qingheminds', 'hutonglogic', 'jadegatesilicon'] },
  { id: 'london', name: 'London', region: 'UK', mapPos: { x: 0.48, y: 0.28 }, companyIds: ['twelvelabs'] },
  { id: 'nyc', name: 'New York', region: 'US', mapPos: { x: 0.267, y: 0.349 }, companyIds: ['pushingface', 'johnstreet', 'citadelinsecurities', 'bmi', 'silvermansachs', 'goldmanstanley', 'capitoltwo'] },
  { id: 'mexicocity', name: 'Mexico City', region: 'LATAM', mapPos: { x: 0.197, y: 0.491 }, companyIds: ['zocalodigital', 'quetzalcuenta', 'maizlabs'] },
  { id: 'saopaulo', name: 'São Paulo', region: 'LATAM', mapPos: { x: 0.343, y: 0.777 }, companyIds: ['paulistapay', 'ipecloud', 'avenidacapital'] },
  { id: 'paris', name: 'Paris', region: 'EU', mapPos: { x: 0.479, y: 0.294 }, companyIds: ['ateliercortex', 'sableseine', 'montmartresystems'] },
  { id: 'munich', name: 'Munich', region: 'EU', mapPos: { x: 0.504, y: 0.299 }, companyIds: ['isarwerk', 'marienplatzcapital', 'nymphenrobotics'] },
  { id: 'moscow', name: 'Moscow', region: 'RU', mapPos: { x: 0.577, y: 0.248 }, companyIds: ['arbatlabs', 'tverskayacloud'] },
  { id: 'dubai', name: 'Dubai', region: 'GULF', mapPos: { x: 0.626, y: 0.452 }, companyIds: ['palmhorizon', 'duneledger', 'falconsouq'] },
  { id: 'cairo', name: 'Cairo', region: 'AFRICA', mapPos: { x: 0.559, y: 0.42 }, companyIds: ['papyruspay', 'sphinxlogic', 'deltaharvest'] },
  { id: 'lagos', name: 'Lagos', region: 'AFRICA', mapPos: { x: 0.482, y: 0.577 }, companyIds: ['ekoledger', 'lagoonlabs', 'ikoyimobile'] },
  { id: 'bangalore', name: 'Bengaluru', region: 'IN', mapPos: { x: 0.688, y: 0.534 }, companyIds: ['nammacompute', 'silkboardsystems', 'lalbaghlabs'] },
  { id: 'singapore', name: 'Singapore', region: 'SEA', mapPos: { x: 0.761, y: 0.611 }, companyIds: ['merlioncapital', 'marinaquanta'] },
  { id: 'tokyo', name: 'Tokyo', region: 'SEA', mapPos: { x: 0.86, y: 0.382 }, companyIds: ['sakuraservo', 'shinjukucapital', 'hoshizorarobotics'] },
  { id: 'seattle', name: 'Seattle', region: 'US', mapPos: { x: 0.132, y: 0.303 }, companyIds: ['macrohard'] },
  { id: 'austin', name: 'Austin', region: 'US', mapPos: { x: 0.201, y: 0.418 }, companyIds: ['psychic'] },
  { id: 'stockholm', name: 'Stockholm', region: 'EU', mapPos: { x: 0.522, y: 0.224 }, companyIds: ['unlovable'] },
  { id: 'hangzhou', name: 'Hangzhou', region: 'CN', mapPos: { x: 0.806, y: 0.418 }, companyIds: ['shallowseek'] },
];
