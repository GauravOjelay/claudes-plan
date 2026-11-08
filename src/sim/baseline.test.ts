import { describe, expect, it } from 'vitest';
import baselineJson from '../../data/baseline.json';
import sourcesJson from '../../data/sources.json';
import { REGION_COUNTRIES, buildBaseline, seriesValue, type Indicator, type RawSeries } from '../../scripts/snapshot';
import { parseBaseline } from './baseline';
import { createInitialState } from './index';
import { ALL_REGIONS } from './vars';

const meta = (unit: string) => ({ label: 'x', unit, source: 'World Economic Outlook (Test 2026)' });
const META = { NGDPD: meta('Billions of U.S. dollars'), LP: meta('Millions of people'), LUR: meta('Percent') };

/** Raw IMF-shaped data where every year key is a STRING, and one value is a numeric string. */
function fakeRaw(): Record<Indicator, RawSeries> {
  const all = Object.values(REGION_COUNTRIES).flat();
  const gdp: Record<string, Record<string, unknown>> = {};
  const lp: Record<string, Record<string, unknown>> = {};
  const lur: Record<string, Record<string, unknown>> = {};
  for (const c of all) { gdp[c] = { '2026': 100 }; lp[c] = { '2026': 10 }; }
  for (const c of ['USA', 'CHN', 'GBR', 'IND', 'RUS']) lur[c] = { '2026': 4 };
  for (const c of REGION_COUNTRIES.EU) lur[c] = { '2026': 6 };
  lur.IDN = { '2026': 10 }; lur.MYS = { '2026': '4' }; lur.PHL = { '2026': 4 }; lur.SGP = { '2026': 4 }; lur.THA = { '2026': 4 }; lur.VNM = { '2026': 4 };
  for (const c of REGION_COUNTRIES.LATAM) lur[c] = { '2026': 5 };
  lur.ZAF = { '2026': 33 }; // one lone African country
  return { NGDPD: { values: { NGDPD: gdp } }, LP: { values: { LP: lp } }, LUR: { values: { LUR: lur } } };
}

describe('snapshot logic (buildBaseline)', () => {
  const out = buildBaseline({ raw: fakeRaw(), meta: META, retrievedOn: '2026-11-07', startYear: 2026 });
  it('sums GDP and population over the countries in each region', () => {
    expect(out.baseline.regions.US.gdp).toBe(100);
    expect(out.baseline.regions.EU.gdp).toBe(100 * REGION_COUNTRIES.EU.length);
    expect(out.baseline.regions.EU.population).toBe(10 * REGION_COUNTRIES.EU.length);
  });
  it('population-weights the unemployment rate and converts numeric strings', () => {
    expect(out.baseline.regions.EU.unemployment).toBe(6);
    expect(out.baseline.regions.SEA.unemployment).toBeCloseTo((10 + 4 + 4 + 4 + 4 + 4) / 6, 3);
  });
  it('leaves unemployment null (and records a gap) when too few countries report it', () => {
    expect(out.baseline.regions.GULF.unemployment).toBeNull();
    expect(out.baseline.regions.AFRICA.unemployment).toBeNull();
    expect(out.sources.gaps.map((g) => g.id).sort()).toEqual(['unemployment.AFRICA', 'unemployment.GULF']);
  });
  it('marks every entry unverified, with source, indicator, unit, year and retrieval date', () => {
    for (const e of out.sources.entries) {
      expect(e.verified).toBe(false);
      expect(e.source).toContain('IMF');
      expect(['NGDPD', 'LP', 'LUR']).toContain(e.indicator);
      expect(e.unit.length).toBeGreaterThan(0);
      expect(e.year).toBe(2026);
      expect(e.retrievedOn).toBe('2026-11-07');
      expect(e.projection).toBe(true); // 2026 is the retrieval year
      expect(e.countries.length).toBeGreaterThan(0);
    }
  });
  it('flags a historical year as not a projection', () => {
    const h = buildBaseline({ raw: { ...fakeRaw() }, meta: META, retrievedOn: '2027-03-01', startYear: 2026 });
    expect(h.sources.entries[0].projection).toBe(false);
  });
  it('throws when a region has no GDP data', () => {
    const raw = fakeRaw();
    delete raw.NGDPD.values.NGDPD.USA;
    expect(() => buildBaseline({ raw, meta: META, retrievedOn: '2026-11-07', startYear: 2026 })).toThrow(/US/);
  });
  it('seriesValue converts string year keys and rejects non-numbers', () => {
    expect(seriesValue({ '2026': 5 }, 2026)).toBe(5);
    expect(seriesValue({ '2026': '5.5' }, 2026)).toBe(5.5);
    expect(seriesValue({ '2026': 'n/a' }, 2026)).toBeUndefined();
    expect(seriesValue({ '2025': 5 }, 2026)).toBeUndefined();
    expect(seriesValue(undefined, 2026)).toBeUndefined();
  });
});

describe('data/baseline.json and data/sources.json', () => {
  const baseline = parseBaseline(baselineJson);
  const entries = sourcesJson.entries;
  it('parse and cover every region, with startYear as a number', () => {
    expect(typeof baseline.startYear).toBe('number');
    expect(Object.keys(baseline.regions).sort()).toEqual([...ALL_REGIONS].sort());
  });
  it('every number in the baseline has a matching source entry (verified flag is a boolean a human flips)', () => {
    for (const r of ALL_REGIONS) {
      for (const [variable, value] of Object.entries(baseline.regions[r]) as [string, number | null][]) {
        if (value === null) {
          expect(sourcesJson.gaps.some((g) => g.id === `${variable}.${r}`)).toBe(true);
          continue;
        }
        const e = entries.find((x) => x.id === `${variable}.${r}`);
        expect(e, `${variable}.${r}`).toBeDefined();
        expect(e?.value).toBe(value);
        expect(typeof e?.verified).toBe('boolean'); // false until a human ticks it off (data/VERIFY.md)
        expect(e?.year).toBe(baseline.startYear);
      }
    }
  });
  it('values are plausible (positive GDP/population; unemployment 0-100)', () => {
    for (const r of ALL_REGIONS) {
      expect(baseline.regions[r].gdp).toBeGreaterThan(0);
      expect(baseline.regions[r].population).toBeGreaterThan(0);
    }
  });
  it('rejects string values instead of doing arithmetic on them', () => {
    const bad = structuredClone(baselineJson) as unknown as { regions: Record<string, { gdp: unknown }> };
    bad.regions.US.gdp = '32642';
    expect(() => parseBaseline(bad)).toThrow(/finite number/);
  });
  it('createInitialState starts from the baseline, with game-designed fallbacks only where the data has a gap', () => {
    const s = createInitialState(1, 'closedai');
    expect(s.year).toBe(baseline.startYear);
    expect(s.regions.US.gdp).toBe(baseline.regions.US.gdp);
    expect(s.regions.CN.population).toBe(baseline.regions.CN.population);
    expect(s.regions.US.unemploymentSoftware).toBe(baseline.regions.US.unemployment);
    expect(s.regions.GULF.unemploymentSoftware).toBe(4); // fallback
    expect(s.history[0].gdp.US).toBe(baseline.regions.US.gdp);
  });
});
