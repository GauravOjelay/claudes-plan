import type { Company, Condition, Effect, GlobalVar, RegionId, RegionVar, VarRef, WorldState } from '../contracts';
import { POWERS } from '../contracts';
import { COMPANY_ROSTER, FLAGSHIP_COMPANY_ID } from '../contracts/cities';

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

/** Every company the player can run (all of them, since the no-rivals decision of 2026-11-08). */
export const playableCompanies = (state: WorldState): Company[] => state.companies.filter((c) => c.playable);

/**
 * The companies the player is actively steering: the flagship plus every company that has had a decision.
 * Safety, takeover risk and the horizon endings are judged on this group. With only the flagship it is the old
 * single-company game exactly (so the demo script is unchanged).
 */
export function directedCompanies(state: WorldState): Company[] {
  const ids = new Set<string>([state.playerCompanyId, ...state.choiceLog.map((c) => c.companyId)]);
  return state.companies.filter((c) => c.playable && ids.has(c.id));
}

/** Money and value figures in cards are written for the flagship (value 100). Other companies scale by their size. */
const FLAGSHIP_VALUE = COMPANY_ROSTER.find((c) => c.id === FLAGSHIP_COMPANY_ID)?.vars.companyValue ?? 100;
export function companySize(companyId: string): number {
  const c = COMPANY_ROSTER.find((x) => x.id === companyId);
  return c ? c.vars.companyValue / FLAGSHIP_VALUE : 1;
}

/**
 * Apply one effect. `companyId` names the acting company for company-scope effects (and for region 'any').
 * Without one, a company-scope effect hits every playable company (events happen to the whole player group).
 * Absolute money / company-value changes are scaled by company size, so a 150-money start-up does not pay a 500-money lab's bill.
 */
export function applyEffect(state: WorldState, effect: Effect, companyId?: string, weight = 1): void {
  num(effect.value, 'effect value'); // JSON strings must never reach the arithmetic below
  if (effect.target.scope === 'company' && companyId === undefined) {
    for (const c of playableCompanies(state)) applyEffect(state, effect, c.id);
    return;
  }
  const id = companyId ?? state.playerCompanyId;
  const t = effect.target;
  if (t.scope === 'company') {
    const sized = effect.op === 'add' && (t.variable === 'money' || t.variable === 'companyValue');
    writeVar(state, t, effect.op, sized ? effect.value * companySize(id) : effect.value, id);
    return;
  }
  // World-scale effects are damped by `weight` (see groupWeight): many companies deciding the same thing overlap.
  const value = effect.op === 'add' ? effect.value * weight : effect.op === 'mul' ? Math.pow(effect.value, weight) : effect.value;
  writeVar(state, t, effect.op, value, id);
}

/**
 * The player may decide for 1 to 17 companies in a year. Each company's effect on the WORLD (regions, global variables)
 * is scaled by n^-groupDamping, where n is the number of companies the player directs. One company = full effect (the old
 * single-company game, and the demo, are unchanged); n companies together swing the world n^(1-damping) times as hard.
 */
export const GROUP_DAMPING = 0.75;
export const groupWeight = (directed: number): number => Math.pow(Math.max(1, directed), -GROUP_DAMPING);

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
