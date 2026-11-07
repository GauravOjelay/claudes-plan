/**
 * One-off data snapshot (plan 7.3): turns the raw IMF DataMapper downloads in data/raw/imf/ into
 *   data/baseline.json  (plain numbers the sim reads)  and  data/sources.json  (full provenance).
 * Usage: ./scripts/fetch-imf.sh && node scripts/snapshot.ts      (Node 22.6+ runs .ts directly)
 * The game never calls the network. Every figure is written with verified:false until a human checks it.
 */
import type { RegionId } from '../src/contracts';

export type Indicator = 'NGDPD' | 'LP' | 'LUR';
/** IMF DataMapper response: values[indicator][countryCode][year-as-STRING] = number */
export interface RawSeries { values: Record<string, Record<string, Record<string, unknown>>> }
export interface IndicatorMeta { label: string; unit: string; source: string }

export interface SourceEntry {
  id: string; // e.g. "gdp.US"
  region: RegionId;
  variable: 'gdp' | 'population' | 'unemployment';
  value: number;
  source: string; // publisher and vintage
  url: string;
  indicator: Indicator;
  unit: string;
  year: number;
  projection: boolean; // true when the year is the retrieval year or later (an IMF projection or estimate)
  retrievedOn: string;
  countries: string[]; // countries that contributed
  countriesRequested: number;
  aggregation: string;
  verified: false; // a human flips this after checking against the original source
  note?: string;
}

const EU = 'AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE';
const GULF = 'SAU ARE QAT KWT BHR OMN';
const AFRICA = 'DZA AGO BEN BWA BFA BDI CPV CMR CAF TCD COM COD COG CIV DJI EGY GNQ ERI SWZ ETH GAB GMB GHA GIN GNB KEN LSO LBR LBY MDG MWI MLI MRT MUS MAR MOZ NAM NER NGA RWA STP SEN SYC SLE SOM ZAF SSD SDN TZA TGO TUN UGA ZMB ZWE';
const LATAM = 'ARG BOL BRA CHL COL CRI CUB DOM ECU SLV GTM HND MEX NIC PAN PRY PER URY VEN HTI JAM TTO GUY SUR BLZ BHS BRB';
const SEA = 'IDN MYS PHL SGP THA VNM BRN KHM LAO MMR TLS';

/** Which IMF country codes make up each game region. Documented here so the grouping is auditable. */
export const REGION_COUNTRIES: Record<RegionId, string[]> = {
  US: ['USA'], CN: ['CHN'], UK: ['GBR'], IN: ['IND'], RU: ['RUS'],
  EU: EU.split(' '), GULF: GULF.split(' '), AFRICA: AFRICA.split(' '), LATAM: LATAM.split(' '), SEA: SEA.split(' '),
};

/** IMF year keys are strings; convert and validate before any arithmetic. Returns undefined when absent or not a finite number. */
export function seriesValue(series: Record<string, unknown> | undefined, year: number): number | undefined {
  if (!series) return undefined;
  for (const [key, raw] of Object.entries(series)) {
    if (Number(key) !== year) continue;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

const round = (x: number, d = 3): number => Math.round(x * 10 ** d) / 10 ** d;
const URL_BASE = 'https://www.imf.org/external/datamapper/api/v1';

export interface BuildInput {
  raw: Record<Indicator, RawSeries>;
  meta: Record<Indicator, IndicatorMeta>;
  retrievedOn: string; // YYYY-MM-DD
  startYear: number;
}

export function buildBaseline(input: BuildInput): {
  baseline: { startYear: number; retrievedOn: string; regions: Record<string, { gdp: number; population: number; unemployment: number | null }> };
  sources: { version: 1; description: string; entries: SourceEntry[]; gaps: { id: string; reason: string }[] };
} {
  const { raw, meta, retrievedOn, startYear } = input;
  const projection = startYear >= Number(retrievedOn.slice(0, 4));
  const entries: SourceEntry[] = [];
  const regions: Record<string, { gdp: number; population: number; unemployment: number | null }> = {};
  const gaps: { id: string; reason: string }[] = [];
  const get = (ind: Indicator, c: string): number | undefined => seriesValue(raw[ind].values[ind]?.[c], startYear);

  for (const [region, countries] of Object.entries(REGION_COUNTRIES) as [RegionId, string[]][]) {
    const common = (variable: SourceEntry['variable'], ind: Indicator, value: number, used: string[], aggregation: string, extra?: string): SourceEntry => {
      const sparse = used.length < countries.length / 2;
      const note = [extra, sparse ? `Only ${used.length} of ${countries.length} countries report this; the figure is dominated by those and may be unrepresentative of the region.` : undefined]
        .filter(Boolean).join(' ');
      return {
      id: `${variable}.${region}`, region, variable, value: round(value), source: `IMF DataMapper, ${meta[ind].source}`,
      url: `${URL_BASE}/${ind}`, indicator: ind, unit: meta[ind].unit, year: startYear, projection, retrievedOn,
      countries: used, countriesRequested: countries.length, aggregation, verified: false, ...(note ? { note } : {}),
      };
    };

    const gdpC = countries.filter((c) => get('NGDPD', c) !== undefined);
    const popC = countries.filter((c) => get('LP', c) !== undefined);
    if (gdpC.length === 0 || popC.length === 0) throw new Error(`No GDP or population data for region ${region}`);
    const gdp = gdpC.reduce((s, c) => s + (get('NGDPD', c) as number), 0);
    const population = popC.reduce((s, c) => s + (get('LP', c) as number), 0);

    // Unemployment: population-weighted mean over the countries that report it (labour force is not in the snapshot).
    const lurC = countries.filter((c) => get('LUR', c) !== undefined && get('LP', c) !== undefined);
    entries.push(common('gdp', 'NGDPD', gdp, gdpC, 'sum'), common('population', 'LP', population, popC, 'sum'));
    let unemployment: number | null = null;
    if (lurC.length < countries.length / 2) {
      // No invented data, and no misleading data: below half coverage the rate is dominated by a few countries,
      // so leave it null and let the sim fall back to a game-designed value.
      gaps.push({ id: `unemployment.${region}`, reason: `Only ${lurC.length} of ${countries.length} countries in ${region} report a ${startYear} unemployment rate in the IMF data, too few to represent the region; the sim uses a game-designed starting value.` });
    } else {
      const weight = lurC.reduce((s, c) => s + (get('LP', c) as number), 0);
      unemployment = round(lurC.reduce((s, c) => s + (get('LUR', c) as number) * (get('LP', c) as number), 0) / weight);
      entries.push(common('unemployment', 'LUR', unemployment, lurC, 'population-weighted mean (LP) over reporting countries',
        'Total unemployment rate. The game starts both software-job and physical-job unemployment at this value (a game assumption; the IMF does not split by job type).'));
    }
    regions[region] = { gdp: round(gdp), population: round(population), unemployment };
  }

  return {
    baseline: { startYear, retrievedOn, regions },
    sources: {
      version: 1,
      description: 'Provenance for every real-world figure in data/baseline.json. All entries are verified:false until a human checks them against the original source (plan 9.3).',
      entries,
      gaps,
    },
  };
}

// ---- CLI ----
async function main(): Promise<void> {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read = (f: string): string => fs.readFileSync(path.resolve(root, f), 'utf8');
  const inds: Indicator[] = ['NGDPD', 'LP', 'LUR'];
  const raw = Object.fromEntries(inds.map((i) => [i, JSON.parse(read(`data/raw/imf/${i}.json`))])) as Record<Indicator, RawSeries>;
  const all = (JSON.parse(read('data/raw/imf/indicators.json')) as { indicators: Record<string, IndicatorMeta> }).indicators;
  const meta = Object.fromEntries(inds.map((i) => [i, { label: all[i].label, unit: all[i].unit, source: all[i].source }])) as Record<Indicator, IndicatorMeta>;
  const retrievedOn = read('data/raw/imf/retrieved.txt').trim();
  const { baseline, sources } = buildBaseline({ raw, meta, retrievedOn, startYear: 2026 });
  fs.writeFileSync(path.resolve(root, 'data/baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`);
  fs.writeFileSync(path.resolve(root, 'data/sources.json'), `${JSON.stringify(sources, null, 2)}\n`);
  console.log(`Wrote data/baseline.json and data/sources.json (${sources.entries.length} entries, retrieved ${retrievedOn})`);
}

if (process.argv[1] && process.argv[1].endsWith('snapshot.ts')) {
  main().catch((e: unknown) => { console.error(e); process.exit(1); });
}
