/**
 * Pure helpers for the interface (Claude 3, src/ui/). No React, no DOM: easy to unit test.
 */
import type { CityInfo, EndingId, Headline, RegionId, RegionVar, WorldState } from '../contracts';

// ---------- Danger levels for gauges ----------
export type Level = 'ok' | 'warn' | 'danger';

/**
 * Thresholds. Tension 80 and trust 30 match docs/plan.md section 3 (war chance, regulation crackdown).
 * The AI-risk thresholds are UI-only choices: they colour the bars and never feed the sim.
 */
export const THRESHOLDS = {
  risk: { warn: 50, danger: 70 },
  tension: { warn: 60, danger: 80 },
  trust: { warn: 45, danger: 30 }, // low trust is the dangerous end
} as const;

export function levelHigh(value: number, t: { warn: number; danger: number }): Level {
  if (value >= t.danger) return 'danger';
  if (value >= t.warn) return 'warn';
  return 'ok';
}

export function levelLow(value: number, t: { warn: number; danger: number }): Level {
  if (value <= t.danger) return 'danger';
  if (value <= t.warn) return 'warn';
  return 'ok';
}

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const clampPct = (n: number) => Math.min(100, Math.max(0, n));

// ---------- Aggregates ----------
/** Population-weighted average of a region variable across all regions in the state. */
export function weightedRegionAvg(state: WorldState, variable: RegionVar): number {
  let sum = 0;
  let weight = 0;
  for (const r of Object.values(state.regions)) {
    const w = Number(r.population);
    const v = Number(r[variable]);
    if (!Number.isFinite(w) || !Number.isFinite(v) || w <= 0) continue;
    sum += v * w;
    weight += w;
  }
  return weight > 0 ? sum / weight : 0;
}

// ---------- Number formatting ----------
/** GDP is in billions USD (contracts). 29000 -> "$29.0T". */
export function formatGdp(billions: number): string {
  if (!Number.isFinite(billions)) return '–';
  if (Math.abs(billions) >= 1000) return `$${(billions / 1000).toFixed(1)}T`;
  return `$${Math.round(billions)}B`;
}

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '–';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n * 10) / 10}`;
}

// ---------- History (charts) ----------
export interface GdpRow {
  year: number;
  [region: string]: number;
}

/**
 * Turns state.history into chart rows. Years may arrive as strings from JSON (plan section 14),
 * so convert and validate before use; rows with a bad year are dropped. Output is sorted by year.
 */
export function gdpRows(history: WorldState['history']): { rows: GdpRow[]; regions: RegionId[] } {
  const regions = new Set<RegionId>();
  const rows: GdpRow[] = [];
  for (const h of history) {
    const year = Number(h.year);
    if (!Number.isFinite(year)) continue;
    const row: GdpRow = { year };
    for (const [r, v] of Object.entries(h.gdp ?? {})) {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      row[r] = n;
      regions.add(r as RegionId);
    }
    rows.push(row);
  }
  rows.sort((a, b) => a.year - b.year);
  return { rows, regions: [...regions] };
}

// ---------- Headlines ----------
/** Headlines relevant to one company and its city (plan 10.4: ticker shows only these). Newest first. */
export function relevantHeadlines(headlines: Headline[], companyId: string, cityId: string): Headline[] {
  return headlines
    .filter((h) => h.companyId === companyId || h.city === cityId || (!h.companyId && !h.city && !h.region))
    .slice()
    .reverse();
}

export function cityName(cities: CityInfo[] | undefined, id: string): string {
  return cities?.find((c) => c.id === id)?.name ?? id;
}

// ---------- Endings (plan 6.3 / 6.7) ----------
export const ENDINGS: Record<EndingId, { title: string; blurb: string; tone: 'good' | 'mixed' | 'bad' }> = {
  abundanceUtopia: { title: 'Abundance Utopia', tone: 'good',
    blurb: 'Disease cured, clean energy for all and a small wealth gap. Safety held.' },
  corporateFeudalism: { title: 'Corporate Feudalism', tone: 'bad',
    blurb: 'A few AI companies run everything. GDP is high and inequality is extreme.' },
  immortalOligarchy: { title: 'Immortal Oligarchy', tone: 'bad',
    blurb: 'Huge GDP, a huge wealth gap, and the very rich hold power for decades.' },
  drownedWorld: { title: 'Drowned World', tone: 'bad',
    blurb: 'Fossil-powered growth raised the seas. Coastal cities and peace were lost.' },
  ww3: { title: 'World War III', tone: 'bad',
    blurb: 'Geopolitical tension spiralled out of control.' },
  slowdown: { title: 'The Slowdown', tone: 'good',
    blurb: 'Shared oversight and kept safeguards. Progress was slower but safer.' },
  aiTakeover: { title: 'AI Takeover', tone: 'bad',
    blurb: 'Robots were everywhere, safeguards were gone, and AI took control.' },
  bankrupt: { title: 'Bankrupt', tone: 'bad',
    blurb: 'Your company ran out of money.' },
  nationalised: { title: 'Nationalised', tone: 'mixed',
    blurb: 'The government took your company over.' },
  extinction: { title: 'Extinction', tone: 'bad',
    blurb: 'Humanity did not make it.' },
};
