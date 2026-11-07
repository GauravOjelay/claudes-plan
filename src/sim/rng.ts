import type { Rng, WorldState } from '../contracts';

/** Coerce any number (or numeric string) to an unsigned 32-bit seed. Throws on junk. */
function toSeed(seed: number | string): number {
  const n = typeof seed === 'string' ? Number(seed) : seed;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`Invalid seed: ${String(seed)}`);
  return Math.floor(n) >>> 0;
}

/** mulberry32: small, fast, deterministic. Same seed -> same sequence, forever. */
export function createRng(seed: number | string): Rng {
  let a = toSeed(seed);
  return {
    next(): number {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/**
 * A stateless way to get the Rng for one turn: derived only from the game seed and the year.
 * The app can call `step(state, choices, rngForTurn(state))` and a saved game replays exactly,
 * with no Rng object to persist between turns.
 */
export function rngForTurn(state: Pick<WorldState, 'seed' | 'year'>): Rng {
  const mixed = Math.imul(toSeed(state.seed) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(toSeed(state.year), 0xc2b2ae35);
  return createRng(mixed >>> 0);
}
