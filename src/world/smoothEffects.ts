/**
 * Eases city-effect intensities toward their targets so the 3D scenes change smoothly when a new year
 * (or a new event) arrives: floods rise, protests swell and fade, blackouts spread, instead of popping.
 * Displayed values are quantised to 0.05 so instanced layers aren't rebuilt every frame.
 */
import { useEffect, useRef, useState } from 'react';
import type { CityEffect, CityEffectKind } from '../contracts';

export const SMOOTH_RATE = 0.35; // intensity units per second (0 -> 1 in about 3 s)
const STEP = 0.05;

/** One easing step (pure, exported for tests). */
export function easeToward(raw: number, want: number, dt: number, rate = SMOOTH_RATE): number {
  const d = want - raw;
  return raw + Math.sign(d) * Math.min(Math.abs(d), rate * dt);
}

export function useSmoothEffects(target: Map<CityEffectKind, CityEffect>): Map<CityEffectKind, CityEffect> {
  const raw = useRef(new Map<CityEffectKind, number>());
  const shown = useRef(new Map<CityEffectKind, CityEffect>());
  const meta = useRef(new Map<CityEffectKind, CityEffect>());
  const targetRef = useRef(target);
  targetRef.current = target;
  const [, force] = useState(0);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = targetRef.current;
      let changed = false;
      for (const [k, e] of t) meta.current.set(k, e);
      const kinds = new Set<CityEffectKind>([...t.keys(), ...raw.current.keys()]);
      for (const k of kinds) {
        const want = t.get(k)?.intensity ?? 0;
        const next = easeToward(raw.current.get(k) ?? 0, want, dt);
        if (next <= 0 && want <= 0) {
          raw.current.delete(k);
          if (shown.current.delete(k)) changed = true;
          continue;
        }
        raw.current.set(k, next);
        const q = Math.max(STEP, Math.round(next / STEP) * STEP);
        const cur = shown.current.get(k);
        if (!cur || Math.abs(cur.intensity - q) > 1e-6) {
          shown.current.set(k, { ...(meta.current.get(k) as CityEffect), intensity: q });
          changed = true;
        }
      }
      if (changed) force((x) => x + 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return shown.current;
}
