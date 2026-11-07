/** Game-loop helpers for src/app (lead). Pure functions; the UI calls these. */
import type { Decision, PlayerChoice, WorldState } from '../contracts';
import { createInitialState, defaultContent, step } from '../sim';
import { rngForTurn } from '../sim/rng';
import { evalCondition } from '../sim/vars';

export const PLAYER_COMPANY = 'novacore';
export const ALL_DECISIONS: Decision[] = defaultContent.decisions;

export function newGame(seed: number): WorldState {
  return createInitialState(seed, PLAYER_COMPANY);
}

/** "2026-2030" -> true when year is inside it. */
export function eraContains(era: string, year: number): boolean {
  const [a, b] = era.split('-').map(Number);
  return Number.isFinite(a) && Number.isFinite(b) && year >= a && year <= b;
}

/** Cards the player can answer now: right era, requirements met, not answered yet. Stable order. */
export function availableDecisions(state: WorldState, decisions: Decision[] = ALL_DECISIONS): Decision[] {
  const answered = new Set(state.choiceLog.filter((c) => c.companyId === state.playerCompanyId).map((c) => c.decisionId));
  return decisions.filter(
    (d) => !answered.has(d.id) && eraContains(d.era, state.year) && (!d.requirements || evalCondition(state, d.requirements)),
  );
}

/** One turn = one year. Pass a choice, or nothing to just let the year pass. */
export function playTurn(state: WorldState, choice?: { decisionId: string; optionId: string }): WorldState {
  const choices: PlayerChoice[] = choice ? [{ ...choice, companyId: state.playerCompanyId }] : [];
  return step(state, choices, rngForTurn(state));
}
