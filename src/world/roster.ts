/**
 * PROPOSED extra cities + companies (owner asked for more cities, each with its own companies).
 * The canonical roster lives in src/contracts/cities.ts (owned by the lead); this file is the proposal,
 * already in the same shapes, so the lead can move it there. Until then the world views merge it in
 * (see `allCities` / `findCompany`), so every city shows its OWN HQs.
 *
 * Names are FICTIONAL (DECISIONS.md #1). Stats deliberately mix strong and weaker firms:
 * high trust + high safety, fast-but-reckless, cash-rich-but-distrusted, small-and-struggling.
 * mapPos uses the same projection as geo.ts (mapPosFromLonLat).
 */
import type { CityInfo, Company, CompanyArchetype, RegionId } from '../contracts';
import { CITIES, COMPANY_ROSTER } from '../contracts/cities';
import { mapPosFromLonLat } from './geo';

const v = (money: number, companyValue: number, publicTrust: number, aiCapability: number, safetyLevel: number) => ({
  money, companyValue, publicTrust, aiCapability, safetyLevel,
});

type Row = [id: string, name: string, archetype: CompanyArchetype, vars: Company['vars']];

function city(id: string, name: string, region: RegionId, lon: number, lat: number, rows: Row[]): { city: CityInfo; companies: Company[] } {
  return {
    city: { id, name, region, mapPos: mapPosFromLonLat(lon, lat), companyIds: rows.map((r) => r[0]) },
    companies: rows.map(([cid, cname, archetype, vars]) => ({ id: cid, name: cname, archetype, homeRegion: region, homeCity: id, playable: false, vars })),
  };
}

const EXTRA = [
  city('nyc', 'New York', 'US', -74.0, 40.7, [
    ['hudsonmind', 'Hudson Mind', 'frontierLab', v(650, 130, 58, 9, 55)], // strong, middling safety
    ['ledgerline', 'Ledgerline', 'researchLab', v(400, 70, 72, 6, 78)], // trusted fintech-AI, careful
    ['brightpath', 'Brightpath Robotics', 'chipMaker', v(120, 25, 40, 4, 30)], // struggling, cuts corners
  ]),
  city('mexicocity', 'Mexico City', 'LATAM', -99.1, 19.4, [
    ['aztecai', 'Tlaloc Systems', 'researchLab', v(160, 30, 66, 4, 70)],
    ['nopalnet', 'NopalNet', 'frontierLab', v(220, 38, 45, 5, 38)],
    ['volcanica', 'Volcánica Chips', 'chipMaker', v(90, 18, 55, 2, 60)],
  ]),
  city('saopaulo', 'São Paulo', 'LATAM', -46.6, -23.5, [
    ['paulista', 'Paulista Labs', 'frontierLab', v(300, 52, 60, 6, 62)],
    ['ipe', 'Ipê Intelligence', 'researchLab', v(140, 26, 74, 4, 82)],
    ['carioca', 'Carioca Compute', 'chipMaker', v(200, 40, 35, 3, 28)],
  ]),
  city('paris', 'Paris', 'EU', 2.35, 48.86, [
    ['lumiere', 'Lumière AI', 'frontierLab', v(420, 85, 64, 8, 72)],
    ['seine', 'Seine Systèmes', 'researchLab', v(180, 32, 70, 5, 80)],
    ['montmartre', 'Montmartre Data', 'chipMaker', v(110, 20, 38, 3, 35)],
  ]),
  city('munich', 'Munich', 'EU', 11.58, 48.14, [
    ['isarwerk', 'Isarwerk', 'chipMaker', v(520, 95, 68, 5, 76)],
    ['alpenkern', 'Alpenkern', 'frontierLab', v(260, 48, 52, 7, 58)],
    ['bavaria', 'Föhn Robotics', 'researchLab', v(95, 17, 42, 3, 45)],
  ]),
  city('moscow', 'Moscow', 'RU', 37.6, 55.75, [
    ['volkhov', 'Volkhov Labs', 'stateBackedLab', v(500, 70, 40, 8, 30)],
    ['sputnikmind', 'Sputnik Mind', 'frontierLab', v(180, 28, 45, 5, 40)],
    ['taiga', 'Taiga Silicon', 'chipMaker', v(140, 22, 50, 3, 55)],
  ]),
  city('dubai', 'Dubai', 'GULF', 55.3, 25.2, [
    ['falconcore', 'Falcon Core', 'stateBackedLab', v(900, 110, 48, 7, 50)], // cash-rich, middling trust
    ['oasis', 'Oasis Compute', 'chipMaker', v(600, 80, 55, 4, 60)],
    ['mirage', 'Mirage Agents', 'frontierLab', v(150, 24, 36, 5, 25)],
  ]),
  city('cairo', 'Cairo', 'AFRICA', 31.24, 30.04, [
    ['nilegrid', 'Nile Grid', 'chipMaker', v(130, 22, 58, 3, 64)],
    ['pharos', 'Pharos AI', 'frontierLab', v(170, 30, 50, 5, 46)],
    ['papyrus', 'Papyrus Labs', 'researchLab', v(70, 12, 72, 2, 80)],
  ]),
  city('lagos', 'Lagos', 'AFRICA', 3.38, 6.52, [
    ['eko', 'Eko Intelligence', 'frontierLab', v(210, 40, 62, 5, 60)],
    ['naija', 'Lagoon Labs', 'researchLab', v(90, 16, 76, 3, 78)],
    ['harmattan', 'Harmattan Hardware', 'chipMaker', v(60, 10, 39, 1, 33)],
  ]),
  city('bangalore', 'Bengaluru', 'IN', 77.59, 12.97, [
    ['gardencity', 'Garden City AI', 'frontierLab', v(380, 68, 61, 7, 63)],
    ['kaveri', 'Kaveri Compute', 'chipMaker', v(250, 45, 57, 4, 58)],
    ['nandi', 'Nandi Agents', 'researchLab', v(80, 14, 44, 4, 34)],
  ]),
  city('singapore', 'Singapore', 'SEA', 103.82, 1.35, [
    ['merlion', 'Merlion Labs', 'frontierLab', v(480, 90, 70, 7, 77)],
    ['straits', 'Straits Silicon', 'chipMaker', v(550, 88, 63, 4, 70)],
    ['monsoon', 'Monsoon Agents', 'researchLab', v(100, 18, 41, 4, 36)],
  ]),
  // Tokyo: there is no Japan/East-Asia region in contracts v0.1 (asked the lead). Provisionally grouped with SEA.
  city('tokyo', 'Tokyo', 'SEA', 139.69, 35.69, [
    ['kitsune', 'Kitsune Robotics', 'chipMaker', v(700, 125, 66, 6, 74)],
    ['sakuragi', 'Sakuragi AI', 'frontierLab', v(450, 82, 59, 8, 61)],
    ['tsunami', 'Raijin Systems', 'researchLab', v(130, 22, 37, 5, 29)],
  ]),
];

export const EXTRA_CITIES: CityInfo[] = EXTRA.map((e) => e.city);
export const EXTRA_COMPANIES: Company[] = EXTRA.flatMap((e) => e.companies);

/** Contract cities + proposed extras (deduped by id, contracts win). */
export const ALL_CITIES: CityInfo[] = [...CITIES, ...EXTRA_CITIES.filter((c) => !CITIES.some((k) => k.id === c.id))];

const STATIC_COMPANIES = new Map<string, Company>([...EXTRA_COMPANIES, ...COMPANY_ROSTER].map((c) => [c.id, c]));

/** Static reference data for a company id (used when the live state does not carry it yet). */
export function staticCompany(id: string): Company | undefined {
  return STATIC_COMPANIES.get(id);
}
