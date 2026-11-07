import type { RegionId } from '../contracts';
import { ALL_REGIONS, num } from './vars';

/** Shape of data/baseline.json (made by scripts/snapshot.ts). Plain numbers; provenance is in data/sources.json. */
export interface RegionBaseline {
  gdp: number; // billions USD
  population: number; // millions
  /** % total unemployment rate (the game starts software and physical at this value), or null when the IMF reports none. */
  unemployment: number | null;
}
export interface Baseline {
  startYear: number; // a NUMBER, never a string
  retrievedOn: string;
  regions: Record<RegionId, RegionBaseline>;
}

/** Validate untyped JSON before the sim does any arithmetic on it (plan section 14: convert and validate strings). */
export function parseBaseline(raw: unknown): Baseline {
  const o = raw as { startYear?: unknown; retrievedOn?: unknown; regions?: Record<string, Record<string, unknown>> };
  if (!o || typeof o !== 'object' || !o.regions) throw new Error('baseline.json: missing regions');
  const startYear = num(typeof o.startYear === 'string' ? Number(o.startYear) : o.startYear, 'baseline startYear');
  const regions = {} as Record<RegionId, RegionBaseline>;
  for (const r of ALL_REGIONS) {
    const v = o.regions[r];
    if (!v) throw new Error(`baseline.json: missing region ${r}`);
    const gdp = num(v.gdp, `${r}.gdp`);
    const population = num(v.population, `${r}.population`);
    const unemployment = v.unemployment === null ? null : num(v.unemployment, `${r}.unemployment`);
    if (gdp <= 0 || population <= 0) throw new Error(`baseline.json: ${r} gdp and population must be positive`);
    if (unemployment !== null && (unemployment < 0 || unemployment > 100)) throw new Error(`baseline.json: ${r} unemployment out of range`);
    regions[r] = { gdp, population, unemployment };
  }
  return { startYear, retrievedOn: String(o.retrievedOn ?? ''), regions };
}
