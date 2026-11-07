/**
 * SHARED CONTRACTS - owned by the lead (master). Workers must NOT edit this folder.
 * Need a change? Ask in your comms file; the lead updates it and logs it in docs/plan.md section 17.
 *
 * Status: v0.1 - approved by the project owner 2026-11-07 (docs/plan.md 13.4 step 1).
 */

// ---------- Ids ----------
export const POWERS = ['US', 'CN', 'EU', 'UK', 'IN', 'RU', 'GULF'] as const;
export const GROUPED_REGIONS = ['AFRICA', 'LATAM', 'SEA'] as const;
export type PowerId = (typeof POWERS)[number];
export type RegionId = PowerId | (typeof GROUPED_REGIONS)[number];

export const ERAS = ['2026-2030', '2031-2036', '2037-2050', '2051-2075', '2076-2100', '2101-2126'] as const;
export type EraId = (typeof ERAS)[number];

export type CompanyArchetype = 'chipMaker' | 'frontierLab' | 'researchLab' | 'stateBackedLab';
export type ExpertOutlook = 'severeShock' | 'middle' | 'overblown'; // Hinton-style .. Acemoglu-style

// ---------- Variables (docs/plan.md section 3) ----------
/** Per-region numbers. Percent values are 0-100. */
export interface RegionVars {
  gdp: number; // billions USD
  population: number; // millions
  unemploymentSoftware: number; // % of software jobs lost / out of work
  unemploymentPhysical: number; // %
  wealthGap: number; // 0-100 index
  publicTrust: number; // 0-100
  energy: number; // supply minus demand, in game units (negative = shortage)
  waterStress: number; // 0-100
  regulationStrictness: number; // 0-100
}
export type RegionVar = keyof RegionVars;

/** World-wide numbers. */
export interface GlobalVars {
  aiCapability: number; // game scale
  robotCount: number; // units
  geopoliticalTension: number; // 0-100
  co2: number; // ppm
  temperature: number; // deg C above baseline
  seaLevel: number; // cm above baseline
  takeoverRisk: number; // DERIVED by sim, never set by effects
  riskMisuse: number; // 0-100
  riskMalfunction: number; // 0-100
  riskSystemic: number; // 0-100
}
export type GlobalVar = keyof GlobalVars;

export interface CompanyVars {
  money: number;
  companyValue: number;
  publicTrust: number; // 0-100
  aiCapability: number;
  safetyLevel: number; // 0-100
}
export type CompanyVar = keyof CompanyVars;

export interface Company {
  id: string;
  name: string; // FICTIONAL until open decision 1 is resolved
  archetype: CompanyArchetype;
  homeRegion: RegionId;
  homeCity: string;
  playable: boolean;
  vars: CompanyVars;
}

// ---------- Conditions & effects ----------
export type Cmp = '>' | '>=' | '<' | '<=' | '==';

export type VarRef =
  | { scope: 'global'; variable: GlobalVar }
  | { scope: 'company'; variable: CompanyVar }
  | { scope: 'region'; region: RegionId | 'any'; variable: RegionVar };

export type Condition =
  | { kind: 'var'; ref: VarRef; cmp: Cmp; value: number }
  | { kind: 'year'; cmp: Cmp; value: number }
  | { kind: 'choice'; decisionId: string; optionId?: string } // player previously made this choice
  | { kind: 'pathway'; pathwayId: string } // a pathway is unlocked
  | { kind: 'all'; of: Condition[] }
  | { kind: 'any'; of: Condition[] }
  | { kind: 'not'; of: Condition };

export interface Effect {
  target: VarRef;
  op: 'add' | 'mul' | 'set';
  value: number;
  /** Apply after this many years (supports long delays such as climate). Default 0. */
  delayYears?: number;
}

// ---------- Decisions (data/cards.json) ----------
export type Hint = -1 | 0 | 1; // arrow down / neutral / arrow up
export interface ConsequenceHint {
  economy: Hint;
  safety: Hint;
  publicTrust: Hint;
}

export interface DecisionOption {
  id: string;
  label: string;
  effects: Effect[];
  unlocks?: string[]; // pathway ids
  shortTerm: ConsequenceHint;
  longTerm: ConsequenceHint;
}

export interface Decision {
  id: string;
  title: string;
  text: string;
  era: EraId;
  requirements?: Condition;
  options: DecisionOption[];
}

// ---------- Events (data/events.json) ----------
export type CityEffectKind =
  | 'blackout'
  | 'ghostOffices'
  | 'deepfakeProtests'
  | 'gridlock'
  | 'bankRun'
  | 'warBuildup'
  | 'outbreak'
  | 'embargo'
  | 'surveillance'
  | 'solarBoom'
  | 'flooding'
  | 'unrest';

export interface CityEffect {
  city: string; // city id, e.g. "nyc"
  kind: CityEffectKind;
  intensity: number; // 0-1
  sinceYear: number;
}

export interface GameEvent {
  id: string;
  valence: 'positive' | 'negative' | 'neutral';
  trigger: Condition;
  /** Probability per turn once trigger is true, 0-1. */
  chancePerTurn: number;
  effects: Effect[];
  headline: string; // explains what happened and why
  cityEffect?: Omit<CityEffect, 'sinceYear'>;
  popup?: boolean; // show the urgent alert modal
}

// ---------- World state ----------
export interface Headline {
  year: number;
  text: string;
  region?: RegionId;
  city?: string;
  companyId?: string;
}

export interface ChoiceRecord {
  year: number;
  decisionId: string;
  optionId: string;
  companyId: string;
}

export interface EventLogEntry {
  year: number;
  eventId: string;
  headline: string;
}

export type EndingId =
  | 'abundanceUtopia'
  | 'corporateFeudalism'
  | 'immortalOligarchy'
  | 'drownedWorld'
  | 'ww3'
  | 'slowdown'
  | 'aiTakeover'
  | 'bankrupt'
  | 'nationalised'
  | 'extinction'; // conditions TBD: open decision 7

export interface GameStatus {
  over: boolean;
  ending?: EndingId;
  reason?: string;
}

export interface WorldState {
  year: number;
  seed: number;
  outlook: ExpertOutlook;
  global: GlobalVars;
  regions: Record<RegionId, RegionVars>;
  companies: Company[];
  playerCompanyId: string;
  activeCityEffects: CityEffect[];
  unlockedPathways: string[];
  choiceLog: ChoiceRecord[];
  eventLog: EventLogEntry[];
  headlines: Headline[]; // newest last
  /** Yearly history for charts. Key = year as a NUMBER (convert JSON string keys before use). */
  history: { year: number; gdp: Partial<Record<RegionId, number>>; global: Partial<GlobalVars> }[];
  /** Effects scheduled for a future year. */
  pending: { applyYear: number; effect: Effect }[];
  status: GameStatus;
}

// ---------- The heart of the game ----------
export interface Rng {
  /** Float in [0, 1). Deterministic for a given seed. */
  next(): number;
}

export interface PlayerChoice {
  decisionId: string;
  optionId: string;
  companyId: string;
}

/**
 * Pure function. Same inputs -> same output, always. No Math.random(), no Date.now().
 * Implemented by Claude 1 in src/sim/. Called by src/app/. Never mutates `state`.
 */
export type StepFn = (state: WorldState, choices: PlayerChoice[], rng: Rng) => WorldState;

// ---------- Static city list (shared so world + ui + sim agree on ids) ----------
export interface CityInfo {
  id: string;
  name: string;
  region: RegionId;
  /** Position on the world map, 0-1 (x: west->east, y: north->south). */
  mapPos: { x: number; y: number };
  companyIds: string[]; // at least 3 HQs per city (rivals viewable only)
}
