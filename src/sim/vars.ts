import type { Company, Condition, Effect, GlobalVar, RegionId, RegionVar, VarRef, WorldState } from '../contracts';
import { POWERS } from '../contracts';

export const ALL_REGIONS = Object.freeze([...POWERS, 'AFRICA', 'LATAM', 'SEA'] as RegionId[]);

/** Throws unless `x` is a finite number. Guards against JSON strings leaking into arithmetic. */
export function num(x: unknown, what: string): number {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`Expected a finite number for ${what}, got ${JSON.stringify(x)}`);
  return x;
}

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

const REGION_PERCENT: RegionVar[] = ['unemploymentSoftware', 'unemploymentPhysical', 'wealthGap', 'publicTrust', 'waterStress', 'regulationStrictness'];
const GLOBAL_PERCENT: GlobalVar[] = ['geopoliticalTension', 'takeoverRisk', 'riskMisuse', 'riskMalfunction', 'riskSystemic'];

/** Allowed [min, max] for a variable. Anything not listed is only floored at 0 (or unbounded where noted). */
function bounds(ref: VarRef): [number, number] {
  const inf = Number.POSITIVE_INFINITY;
  if (ref.scope === 'region') {
    if (REGION_PERCENT.includes(ref.variable)) return [0, 100];
    if (ref.variable === 'energy') return [-inf, inf]; // negative = shortage
    return [0, inf];
  }
  if (ref.scope === 'global') {
    if (GLOBAL_PERCENT.includes(ref.variable)) return [0, 100];
    if (ref.variable === 'temperature') return [-inf, inf];
    return [0, inf];
  }
  if (ref.variable === 'publicTrust' || ref.variable === 'safetyLevel') return [0, 100];
  if (ref.variable === 'money') return [-inf, inf]; // negative money = bankrupt
  return [0, inf];
}

export function companyById(state: WorldState, id: string): Company {
  const c = state.companies.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown company: ${id}`);
  return c;
}

export const playerCompany = (state: WorldState): Company => companyById(state, state.playerCompanyId);

/** Current value(s) of a variable. A region of 'any' returns every region's value. */
export function readVar(state: WorldState, ref: VarRef): number[] {
  if (ref.scope === 'global') return [state.global[ref.variable]];
  if (ref.scope === 'company') return [playerCompany(state).vars[ref.variable]];
  if (ref.region === 'any') return ALL_REGIONS.map((r) => state.regions[r][ref.variable]);
  return [state.regions[ref.region][ref.variable]];
}

/**
 * Write a variable (mutates `state`; callers pass a clone). Value is clamped to the variable's range.
 * Effects on region 'any' hit the home region of the acting company. Company-scope effects hit `companyId`.
 */
export function writeVar(state: WorldState, ref: VarRef, op: Effect['op'], value: number, companyId = state.playerCompanyId): void {
  const v = num(value, 'effect value');
  const [lo, hi] = bounds(ref);
  const combine = (cur: number): number => clamp(op === 'add' ? cur + v : op === 'mul' ? cur * v : v, lo, hi);
  if (ref.scope === 'global') {
    state.global[ref.variable] = combine(state.global[ref.variable]);
  } else if (ref.scope === 'company') {
    const c = companyById(state, companyId);
    c.vars[ref.variable] = combine(c.vars[ref.variable]);
  } else {
    const region: RegionId = ref.region === 'any' ? companyById(state, companyId).homeRegion : ref.region;
    state.regions[region][ref.variable] = combine(state.regions[region][ref.variable]);
  }
}

const compare = (a: number, cmp: '>' | '>=' | '<' | '<=' | '==', b: number): boolean =>
  cmp === '>' ? a > b : cmp === '>=' ? a >= b : cmp === '<' ? a < b : cmp === '<=' ? a <= b : a === b;

export function evalCondition(state: WorldState, cond: Condition): boolean {
  switch (cond.kind) {
    case 'var':
      return readVar(state, cond.ref).some((x) => compare(x, cond.cmp, num(cond.value, 'condition value')));
    case 'year':
      return compare(state.year, cond.cmp, num(cond.value, 'condition year'));
    case 'choice':
      return state.choiceLog.some((c) => c.decisionId === cond.decisionId && (cond.optionId === undefined || c.optionId === cond.optionId));
    case 'pathway':
      return state.unlockedPathways.includes(cond.pathwayId);
    case 'all':
      return cond.of.every((c) => evalCondition(state, c));
    case 'any':
      return cond.of.some((c) => evalCondition(state, c));
    case 'not':
      return !evalCondition(state, cond.of);
  }
}
