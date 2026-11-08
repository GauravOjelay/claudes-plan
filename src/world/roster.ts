/**
 * City list + static company lookup for the world views. The canonical roster is src/contracts/cities.ts
 * (owned by the lead): since 2026-11-08 every company is the player's (no rivals) and many cities have none.
 */
import type { CityInfo, Company } from '../contracts';
import { CITIES, COMPANY_ROSTER } from '../contracts/cities';

/** Every city on the map (cities without companies still show effects and Average Joe). */
export const ALL_CITIES: CityInfo[] = CITIES;

const STATIC_COMPANIES = new Map<string, Company>(COMPANY_ROSTER.map((c) => [c.id, c]));

/** Static reference data for a company id (used when the live state does not carry it yet). */
export function staticCompany(id: string): Company | undefined {
  return STATIC_COMPANIES.get(id);
}
