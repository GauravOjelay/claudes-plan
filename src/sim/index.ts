/**
 * Claude 1: the simulation. Pure TypeScript, deterministic, no Math.random() or Date.now().
 * Public API: createInitialState, step, createStep, createRng, rngForTurn.
 *
 * Turn pipeline (plan section 3):
 *   apply choices -> apply scheduled effects -> run rules -> update city effects (src/sim/cityEffects.ts)
 *   -> check event thresholds -> derive takeoverRisk -> advance year -> record history -> check endings
 */
import { COMPANY_ROSTER } from '../contracts/cities';
import type {
  Decision, ExpertOutlook, GameEvent, PlayerChoice, RegionId, StepFn, WorldState,
} from '../contracts';
import cardsJson from '../../data/cards.json';
import eventsJson from '../../data/events.json';
import baselineJson from '../../data/baseline.json';
import { parseBaseline } from './baseline';
import { GAME_DESIGNED_GLOBAL, regionFromBaseline } from './defaults';
import { peaksFromEvents, startIntensity, updateCityEffects } from './cityEffects';
import { checkEndings, deriveTakeoverRisk } from './endings';
import { RULES } from './rules';
import { createRng, rngForTurn } from './rng';
import { ALL_REGIONS, companyById, evalCondition, num, writeVar } from './vars';

export { createRng, rngForTurn };
export { averageJoe } from './averageJoe';

/** Real starting numbers from the IMF snapshot (data/baseline.json), validated on load. */
const baseline = parseBaseline(baselineJson);

export const START_YEAR = baseline.startYear;
export const EVENT_COOLDOWN = 3; // an event cannot fire again within this many years of its last firing

/** A contract GameEvent plus a sim-only flag: `once` events fire at most once per game. */
export type SimEvent = GameEvent & { once?: boolean };

export interface Content {
  decisions: Decision[];
  events: SimEvent[];
}

/** JSON imports are typed loosely; this is the one place we assert their shape. */
export const defaultContent: Content = {
  decisions: cardsJson as unknown as Decision[],
  events: eventsJson as unknown as SimEvent[],
};

const OUTLOOKS: ExpertOutlook[] = ['severeShock', 'middle', 'overblown'];

/** New game. The seed also picks the randomised expert outlook (plan section 2). */
export function createInitialState(seed: number, playerCompanyId: string): WorldState {
  const s = num(seed, 'seed');
  const player = COMPANY_ROSTER.find((c) => c.id === playerCompanyId);
  if (!player) throw new Error(`Unknown company: ${playerCompanyId}`);
  if (!player.playable) throw new Error(`${player.name} is not playable (only ClosedAI is, for now)`);

  const outlook = OUTLOOKS[Math.floor(createRng(s).next() * OUTLOOKS.length)];
  const regions = Object.fromEntries(ALL_REGIONS.map((r) => [r, regionFromBaseline(baseline.regions[r])])) as WorldState['regions'];
  const global = structuredClone(GAME_DESIGNED_GLOBAL);
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

  const peaks = peaksFromEvents(content.events);

  function fireEvents(state: WorldState, rng: { next(): number }): void {
    for (const event of content.events) {
      if (event.once && state.eventLog.some((e) => e.eventId === event.id)) continue;
      if (!evalCondition(state, event.trigger)) continue;
      if (state.eventLog.some((e) => e.eventId === event.id && state.year - e.year < EVENT_COOLDOWN)) continue;
      const ce = event.cityEffect;
      // One live effect per city and kind: don't re-fire an event whose picture is already on screen.
      if (ce && state.activeCityEffects.some((a) => a.city === ce.city && a.kind === ce.kind)) continue;
      if (rng.next() >= num(event.chancePerTurn, 'chancePerTurn')) continue;
      for (const effect of event.effects) {
        const delay = effect.delayYears === undefined ? 0 : num(effect.delayYears, 'delayYears');
        if (delay > 0) state.pending.push({ applyYear: state.year + delay, effect });
        else writeVar(state, effect.target, effect.op, effect.value);
      }
      if (ce) state.activeCityEffects.push({ city: ce.city, kind: ce.kind, intensity: startIntensity(ce.kind, ce.intensity), sinceYear: state.year });
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
    updateCityEffects(next, peaks);
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
