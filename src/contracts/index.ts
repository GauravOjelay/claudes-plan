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

export type CompanyArchetype = 'chipMaker' | 'frontierLab' | 'researchLab' | 'stateBackedLab' | 'softwareCompany' | 'financeFirm';
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
  name: string; // parody name of a real firm (owner decision 2026-11-08)
  archetype: CompanyArchetype;
  homeRegion: RegionId;
  homeCity: string;
  playable: boolean; // all true since 2026-11-08: the player controls every company
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

/**
 * Who gets a card (owner request 2026-11-08: cards must fit what each company does and where it is).
 * Omitted = every company. `companyIds` = only these companies. Otherwise EVERY field that is present must match.
 */
export interface DecisionAudience {
  companyIds?: string[];
  archetypes?: CompanyArchetype[];
  regions?: RegionId[];
  cities?: string[];
}

export interface Decision {
  id: string;
  title: string;
  text: string;
  era: EraId;
  requirements?: Condition;
  audience?: DecisionAudience;
  options: DecisionOption[];
}

/** True when `company` should be offered `decision`. Shared by the app, replay and balance code. */
export function decisionFitsCompany(decision: Decision, company: Company): boolean {
  const a = decision.audience;
  if (!a) return true;
  if (a.companyIds) return a.companyIds.includes(company.id);
  if (a.archetypes && !a.archetypes.includes(company.archetype)) return false;
  if (a.regions && !a.regions.includes(company.homeRegion)) return false;
  if (a.cities && !a.cities.includes(company.homeCity)) return false;
  return true;
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
  valence: 'positive' | 'negative' | 'neutral';
  popup: boolean; // copied from GameEvent.popup so the UI needn't look the event up
  city?: string;
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

/** Final score (plan section 2). Computed by the sim when the game ends; each part 0-100. */
export interface Score {
  total: number;
  wellbeing: number; // world wellbeing
  company: number; // the player's company success
  survival: number; // humanity's survival
}

export interface GameStatus {
  over: boolean;
  ending?: EndingId;
  reason?: string;
  score?: Score; // present when over === true
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
  companyIds: string[]; // may be empty: not every city has an AI HQ
}

// ---------- Average Joe (plan 10.5; owner request 2026-11-08) ----------
/** What an average citizen of a city is doing this year. Game-designed, NOT a real-world claim. */
export type JoeJob = 'employed' | 'lostSoftwareJob' | 'lostPhysicalJob' | 'retraining' | 'onUbi';
/** The main thing happening around them; drives the street-level scene. */
export type JoeSituation =
  | 'prosperous'
  | 'normal'
  | 'struggling'
  | 'blackout'
  | 'protests'
  | 'flood'
  | 'war'
  | 'surveillance'
  | 'outbreak';

export interface AverageJoe {
  cityId: string;
  name: string; // fictional, stable per city
  age: number;
  occupation: string; // e.g. "warehouse worker"
  job: JoeJob;
  income: number; // USD per year, game scale
  mood: number; // 0-100
  situation: JoeSituation;
  lines: string[]; // 1-3 short sentences about life this year, caused by the world state
}

/** Implemented by Claude 1 in src/sim (`averageJoe`). Pure and deterministic. The app passes the result to CityView. */
export type AverageJoeFn = (state: WorldState, cityId: string) => AverageJoe;
