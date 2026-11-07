/** Shared map colouring (used by the 2D SVG map and the 3D map). */
import type { RegionId, WorldState } from '../contracts';
import { clamp01 } from './util';

export type MapMetric = 'gdp' | 'ai' | 'tension';
export type MapOverlay = 'energy' | 'water';

// Colour-blind-safe sequential ramps (viridis / plasma / inferno samples).
export const RAMPS: Record<MapMetric, string[]> = {
  gdp: ['#3b2a5c', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  ai: ['#2a1c6b', '#7e03a8', '#cc4778', '#f89540', '#f0f921'],
  tension: ['#2a1a3a', '#57106e', '#bc3754', '#f98e09', '#fcffa4'],
};

export const METRIC_LABEL: Record<MapMetric, string> = { gdp: 'GDP', ai: 'AI capability', tension: 'Tension' };

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rampColor(ramp: string[], t: number): string {
  const x = clamp01(t) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** 0-1 value per region for the chosen metric, or null when there is no data. */
export function regionMetric(state: WorldState, metric: MapMetric): Record<RegionId, number | null> {
  const ids = Object.keys(state.regions) as RegionId[];
  const out = {} as Record<RegionId, number | null>;
  if (metric === 'gdp') {
    // Log scale so the US and a grouped region are both readable.
    const lo = Math.log10(300);
    const hi = Math.log10(40000);
    for (const r of ids) {
      const g = state.regions[r].gdp;
      out[r] = g > 0 ? (Math.log10(g) - lo) / (hi - lo) : 0;
    }
  } else if (metric === 'ai') {
    // No per-region capability in contracts v0.1: use the strongest lab headquartered there.
    const max = Math.max(1e-9, ...state.companies.map((c) => c.vars.aiCapability));
    for (const r of ids) {
      const caps = state.companies.filter((c) => c.homeRegion === r).map((c) => c.vars.aiCapability);
      out[r] = caps.length ? Math.max(...caps) / max : null;
    }
  } else {
    // Tension is a single global number in v0.1, so every region shares it.
    const t = state.global.geopoliticalTension / 100;
    for (const r of ids) out[r] = t;
  }
  return out;
}

