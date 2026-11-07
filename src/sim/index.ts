/**
 * Claude 1: the simulation. Pure TypeScript, deterministic, no Math.random() or Date.now().
 * Public API: createInitialState, step, createStep, createRng, rngForTurn.
 *
 * Turn pipeline (plan section 3):
 *   apply choices -> apply scheduled effects -> run rules -> fade city effects
 *   -> check event thresholds -> derive takeoverRisk -> advance year -> record history -> check endings
 */
import { COMPANY_ROSTER } from '../contracts/cities';
import type {
  Decision, ExpertOutlook, GameEvent, PlayerChoice, RegionId, StepFn, WorldState,
} from '../contracts';
import cardsJson from '../../data/cards.json';
import eventsJson from '../../data/events.json';
import { PLACEHOLDER_GLOBAL, PLACEHOLDER_REGIONS } from './defaults';
import { checkEndings, deriveTakeoverRisk } from './endings';
import { RULES } from './rules';
import { createRng, rngForTurn } from './rng';
import { ALL_REGIONS, companyById, evalCondition, num, writeVar } from './vars';

export { createRng, rngForTurn };

export const START_YEAR = 2026;
export const CITY_EFFECT_FADE = 0.1; // intensity lost per year

export interface Content {
  decisions: Decision[];
  events: GameEvent[];
}

/** JSON imports are typed loosely; this is the one place we assert their shape. */
export const defaultContent: Content = {
  decisions: cardsJson as unknown as Decision[],
  events: eventsJson as unknown as GameEvent[],
};

const OUTLOOKS: ExpertOutlook[] = ['severeShock', 'middle', 'overblown'];

/** New game. The seed also picks the randomised expert outlook (plan section 2). */
export function createInitialState(seed: number, playerCompanyId: string): WorldState {
  const s = num(seed, 'seed');
  const player = COMPANY_ROSTER.find((c) => c.id === playerCompanyId);
  if (!player) throw new Error(`Unknown company: ${playerCompanyId}`);
  if (!player.playable) throw new Error(`${player.name} is not playable (only NovaCore is, for now)`);

  const outlook = OUTLOOKS[Math.floor(createRng(s).next() * OUTLOOKS.length)];
  const regions = structuredClone(PLACEHOLDER_REGIONS);
  const global = structuredClone(PLACEHOLDER_GLOBAL);
  const state: WorldState = {
    year: START_YEAR,
    seed: s,
    outlook,
    global,
    regions,
    companies: structuredClone(COMPANY_ROSTER),
    playerCompanyId,
    activeCityEffects: [],
    unlockedPathways: [],
    choiceLog: [],
    eventLog: [],
    headlines: [],
    history: [],
    pending: [],
    status: { over: false },
  };
  state.global.takeoverRisk = deriveTakeoverRisk(state);
  recordHistory(state);
  return state;
}

function recordHistory(state: WorldState): void {
  const gdp: Partial<Record<RegionId, number>> = {};
  for (const r of ALL_REGIONS) gdp[r] = state.regions[r].gdp;
  state.history.push({ year: state.year, gdp, global: { ...state.global } });
}

/** Build a step function over a given content set (tests pass their own; the game uses defaultContent). */
export function createStep(content: Content): StepFn {
  const decisions = new Map(content.decisions.map((d) => [d.id, d]));

  function applyChoices(state: WorldState, choices: PlayerChoice[]): void {
    for (const choice of choices) {
      const company = companyById(state, choice.companyId);
      if (!company.playable) throw new Error(`${company.name} is not playable`);
      const decision = decisions.get(choice.decisionId);
      if (!decision) throw new Error(`Unknown decision: ${choice.decisionId}`);
      const option = decision.options.find((o) => o.id === choice.optionId);
      if (!option) throw new Error(`Unknown option ${choice.optionId} on decision ${choice.decisionId}`);
      if (decision.requirements && !evalCondition(state, decision.requirements)) {
        throw new Error(`Requirements not met for decision ${decision.id}`);
      }
      for (const effect of option.effects) {
        const delay = effect.delayYears === undefined ? 0 : num(effect.delayYears, 'delayYears');
        if (delay > 0) state.pending.push({ applyYear: state.year + delay, effect });
        else writeVar(state, effect.target, effect.op, effect.value, choice.companyId);
      }
      for (const id of option.unlocks ?? []) if (!state.unlockedPathways.includes(id)) state.unlockedPathways.push(id);
      state.choiceLog.push({ year: state.year, decisionId: decision.id, optionId: option.id, companyId: choice.companyId });
    }
  }

  function applyScheduled(state: WorldState): void {
    const due = state.pending.filter((p) => p.applyYear <= state.year);
    state.pending = state.pending.filter((p) => p.applyYear > state.year);
    for (const p of due) writeVar(state, p.effect.target, p.effect.op, p.effect.value);
  }

  function fadeCityEffects(state: WorldState): void {
    for (const e of state.activeCityEffects) e.intensity = Math.round((e.intensity - CITY_EFFECT_FADE) * 1000) / 1000;
    state.activeCityEffects = state.activeCityEffects.filter((e) => e.intensity > 0);
  }

  function fireEvents(state: WorldState, rng: { next(): number }): void {
    for (const event of content.events) {
      if (!evalCondition(state, event.trigger)) continue;
      const ce = event.cityEffect;
      // One live effect per city and kind: don't re-fire an event whose picture is already on screen.
      if (ce && state.activeCityEffects.some((a) => a.city === ce.city && a.kind === ce.kind)) continue;
      if (rng.next() >= num(event.chancePerTurn, 'chancePerTurn')) continue;
      for (const effect of event.effects) {
        const delay = effect.delayYears === undefined ? 0 : num(effect.delayYears, 'delayYears');
        if (delay > 0) state.pending.push({ applyYear: state.year + delay, effect });
        else writeVar(state, effect.target, effect.op, effect.value);
      }
      if (ce) state.activeCityEffects.push({ city: ce.city, kind: ce.kind, intensity: ce.intensity, sinceYear: state.year });
      state.eventLog.push({
        year: state.year, eventId: event.id, headline: event.headline,
        valence: event.valence, popup: event.popup === true, ...(ce ? { city: ce.city } : {}),
      });
      state.headlines.push({ year: state.year, text: event.headline, ...(ce ? { city: ce.city } : {}) });
    }
  }

  return (state, choices, rng) => {
    const next = structuredClone(state); // never mutate the caller's state
    if (next.status.over) return next;
    applyChoices(next, choices);
    applyScheduled(next);
    for (const rule of RULES) rule.apply(next);
    fadeCityEffects(next);
    fireEvents(next, rng);
    next.global.takeoverRisk = deriveTakeoverRisk(next);
    next.year += 1;
    recordHistory(next);
    checkEndings(next);
    return next;
  };
}

/** The game's step function, over data/cards.json and data/events.json. */
export const step: StepFn = createStep(defaultContent);
