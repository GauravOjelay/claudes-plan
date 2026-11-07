import type { CityEffect, CityEffectKind, CityInfo, Company, WorldState } from '../contracts';
import { staticCompany } from './roster';

/** Deterministic visual noise (not the sim RNG). Same city id -> same skyline every render. */
export function visualRng(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export const ALL_EFFECT_KINDS: CityEffectKind[] = [
  'blackout', 'ghostOffices', 'deepfakeProtests', 'gridlock', 'bankRun', 'warBuildup',
  'outbreak', 'embargo', 'surveillance', 'solarBoom', 'flooding', 'unrest',
];

export const EFFECT_INFO: Record<CityEffectKind, { label: string; icon: string; positive?: boolean; blurb: string }> = {
  blackout: { label: 'Blackout belt', icon: '⚡', blurb: 'Data-centre demand is browning out whole districts.' },
  ghostOffices: { label: 'Ghost offices', icon: '🏢', blurb: 'Office towers go dark floor by floor as agents replace staff.' },
  deepfakeProtests: { label: 'Deepfake protests', icon: '📺', blurb: 'Fake videos went viral; crowds fill the squares.' },
  gridlock: { label: 'Robotaxi gridlock', icon: '🚗', blurb: 'An unstaged fleet update stalled every autonomous car.' },
  bankRun: { label: 'Rumour bank run', icon: '🏦', blurb: 'An AI-generated rumour put queues outside the banks.' },
  warBuildup: { label: 'Military build-up', icon: '🛡', blurb: 'Tension is rising; convoys gather at the city edge.' },
  outbreak: { label: 'Outbreak', icon: '🏥', blurb: 'Hospitals are under strain.' },
  embargo: { label: 'Chip embargo', icon: '⚓', blurb: 'Export controls have emptied the port.' },
  surveillance: { label: 'Watchful city', icon: '📷', blurb: 'Facial-recognition cameras on every corner.' },
  solarBoom: { label: 'Solar boom', icon: '☀', positive: true, blurb: 'Open materials research put solar on the rooftops.' },
  flooding: { label: 'Flooding', icon: '🌊', blurb: 'Rising water reaches the streets.' },
  unrest: { label: 'Civil unrest', icon: '✊', blurb: 'Barricades and crowds in the streets.' },
};

/** Strongest active effect of each kind for one city. */
export function effectsForCity(state: WorldState, cityId: string): Map<CityEffectKind, CityEffect> {
  const out = new Map<CityEffectKind, CityEffect>();
  for (const e of state.activeCityEffects) {
    if (e.city !== cityId) continue;
    const prev = out.get(e.kind);
    if (!prev || e.intensity > prev.intensity) out.set(e.kind, { ...e, intensity: clamp01(e.intensity) });
  }
  return out;
}

export function companiesInCity(state: WorldState, city: CityInfo): Company[] {
  const byId = new Map(state.companies.map((c) => [c.id, c]));
  // Each city holds references (ids) to its own companies. Live state wins; static roster fills the gaps
  // until the sim (or an API) carries every company.
  const listed = city.companyIds.map((id) => byId.get(id) ?? staticCompany(id)).filter((c): c is Company => !!c);
  // Also include any company whose homeCity points here but the list missed.
  for (const c of state.companies) if (c.homeCity === city.id && !listed.includes(c)) listed.push(c);
  return listed;
}

export function fmtMoneyBn(bn: number): string {
  if (!Number.isFinite(bn)) return '-';
  if (Math.abs(bn) >= 1000) return `$${(bn / 1000).toFixed(1)}tn`;
  return `$${Math.round(bn)}bn`;
}

export function fmtPeopleM(m: number): string {
  if (!Number.isFinite(m)) return '-';
  if (m >= 1000) return `${(m / 1000).toFixed(2)}bn`;
  return `${Math.round(m)}m`;
}

export function fmtPct(n: number): string {
  return Number.isFinite(n) ? `${Math.round(n)}%` : '-';
}
