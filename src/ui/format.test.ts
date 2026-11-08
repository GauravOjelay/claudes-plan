import { describe, expect, it } from 'vitest';
import { mockWorldState } from '../contracts/mocks';
import type { WorldState } from '../contracts';
import {
  ENDINGS, formatCompact, scoreGrade, formatGdp, gdpRows, levelHigh, levelLow, relevantHeadlines, THRESHOLDS, weightedRegionAvg,
} from './format';

describe('danger levels', () => {
  it('flags high tension at the plan war threshold (80)', () => {
    expect(levelHigh(79, THRESHOLDS.tension)).toBe('warn');
    expect(levelHigh(80, THRESHOLDS.tension)).toBe('danger');
    expect(levelHigh(10, THRESHOLDS.tension)).toBe('ok');
  });
  it('flags low trust at the plan crackdown threshold (30)', () => {
    expect(levelLow(30, THRESHOLDS.trust)).toBe('danger');
    expect(levelLow(40, THRESHOLDS.trust)).toBe('warn');
    expect(levelLow(60, THRESHOLDS.trust)).toBe('ok');
  });
});

describe('gdpRows', () => {
  it('converts string year keys and sorts by year', () => {
    const history = [
      { year: '2028' as unknown as number, gdp: { US: 3 }, global: {} },
      { year: 2026, gdp: { US: 1, CN: 2 }, global: {} },
      { year: 'oops' as unknown as number, gdp: { US: 9 }, global: {} },
    ];
    const { rows, regions } = gdpRows(history);
    expect(rows.map((r) => r.year)).toEqual([2026, 2028]);
    expect(typeof rows[1].year).toBe('number');
    expect(regions.sort()).toEqual(['CN', 'US']);
  });
});

describe('weightedRegionAvg', () => {
  it('weights by population', () => {
    const s: WorldState = structuredClone(mockWorldState);
    for (const r of Object.values(s.regions)) r.publicTrust = 0;
    s.regions.CN.publicTrust = 100; // CN has most of the mock population
    const total = Object.values(s.regions).reduce((n, r) => n + r.population, 0);
    expect(weightedRegionAvg(s, 'publicTrust')).toBeCloseTo((100 * s.regions.CN.population) / total);
  });
});

describe('formatting', () => {
  it('formats GDP in billions', () => {
    expect(formatGdp(29000)).toBe('$29.0T');
    expect(formatGdp(450)).toBe('$450B');
  });
  it('formats large counts', () => {
    expect(formatCompact(1_000_000)).toBe('1.0M');
    expect(formatCompact(2_500_000_000)).toBe('2.5B');
  });
});

describe('relevantHeadlines', () => {
  it('keeps only this company/city (and untagged world news), newest first', () => {
    const out = relevantHeadlines(
      [
        { year: 2026, text: 'a', city: 'sf' },
        { year: 2027, text: 'b', city: 'beijing' },
        { year: 2027, text: 'c', companyId: 'closedai' },
        { year: 2028, text: 'd' },
      ],
      'closedai',
      'sf',
    );
    expect(out.map((h) => h.text)).toEqual(['d', 'c', 'a']);
  });
});

it('has a title for every ending id', () => {
  for (const e of Object.values(ENDINGS)) expect(e.title.length).toBeGreaterThan(0);
});

describe('scoreGrade', () => {
  it('labels score bands and ignores non-numbers', () => {
    expect(scoreGrade(85)).toBe('A world worth inheriting');
    expect(scoreGrade(50)).toBe('A mixed legacy');
    expect(scoreGrade(5)).toBe('A world in ruins');
    expect(scoreGrade(Number.NaN)).toBe('');
  });
});
