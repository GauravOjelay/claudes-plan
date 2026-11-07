/**
 * Automated balance runs (plan 15.1): play many games with simulated players and count the endings.
 * The harness mirrors the app's rules: one card per year, only cards from the current era whose
 * requirements are met and that have not been answered yet.
 */
import type { Decision, DecisionOption, EndingId, WorldState } from '../contracts';
import { createInitialState, createRng, defaultContent, rngForTurn, step } from './index';
import { evalCondition } from './vars';

export type PolicyName = 'random' | 'cautious' | 'reckless' | 'profit' | 'generous' | 'spender' | 'villain';
export const POLICIES: PolicyName[] = ['random', 'cautious', 'reckless', 'profit', 'generous', 'spender', 'villain'];

const eraContains = (era: string, year: number): boolean => {
  const [a, b] = era.split('-').map(Number);
  return year >= a && year <= b;
};

function available(state: WorldState, decisions: Decision[]): Decision[] {
  const answered = new Set(state.choiceLog.map((c) => c.decisionId));
  return decisions.filter((d) => !answered.has(d.id) && eraContains(d.era, state.year) && (!d.requirements || evalCondition(state, d.requirements)));
}

const hints = (o: DecisionOption): { economy: number; safety: number; trust: number } => ({
  economy: o.shortTerm.economy + o.longTerm.economy,
  safety: o.shortTerm.safety + o.longTerm.safety,
  trust: o.shortTerm.publicTrust + o.longTerm.publicTrust,
});

/** Sum of an option's effects times per-variable weights, for players who read what an option actually does. */
function byEffects(o: DecisionOption, weights: Record<string, number>): number {
  return o.effects.reduce((sum, e) => {
    const key = `${e.target.scope}.${e.target.variable}`;
    return sum + (weights[key] ?? 0) * (e.op === 'mul' ? (e.value - 1) * 100 : e.value);
  }, 0);
}

/** Score an option for a biased player. Random policy scores everything equally (handled by the caller). */
function appeal(policy: PolicyName, o: DecisionOption): number {
  const h = hints(o);
  switch (policy) {
    case 'cautious': return 2 * h.safety + h.trust;
    case 'generous': // wants a fair, trusting, safe world, whatever it costs
      return h.trust + h.safety + byEffects(o, { 'region.wealthGap': -0.3, 'region.publicTrust': 0.2, 'region.unemploymentSoftware': -0.3, 'company.safetyLevel': 0.1 });
    case 'reckless': return 2 * h.economy - 2 * h.safety;
    case 'profit': return 2 * h.economy - h.trust;
    case 'spender': // always picks the most expensive option
      return h.safety + h.trust + byEffects(o, { 'company.money': -0.1 });
    case 'villain': return -2 * h.trust - h.safety + h.economy; // wants the public to hate it
    default: return 0;
  }
}

export interface GameResult {
  final: WorldState;
  ending: EndingId;
  year: number;
  score: number;
  choices: number;
}

/**
 * How the simulated player meets cards:
 * - 'first' mirrors the app today: the HQ screen shows only the FIRST available card, in data order, and the player
 *   picks an option. So the order of data/cards.json is part of the game, and the same ~11 cards come up every game.
 * - 'any' (default) lets the player answer whichever available card they like, which is what a card-picker or several
 *   cards per year would allow (plan 6.8: "several decisions per year"). All balance tests use this mode.
 */
export type CardMode = 'first' | 'any';

/** Play one whole game with a simulated player. The player's own choices use their own rng (not the sim's). */
export function playGame(seed: number, policy: PolicyName, mode: CardMode = 'any', decisions: Decision[] = defaultContent.decisions): GameResult {
  const player = createRng(seed * 7919 + 13);
  let state = createInitialState(seed, 'novacore');
  let guard = 0;
  while (!state.status.over && guard++ < 50) {
    const cards = available(state, decisions);
    let choice: { decisionId: string; optionId: string; companyId: string } | undefined;
    if (cards.length > 0) {
      // A random player answers a random card. A player with a style answers the card where their style matters most.
      const scoreCard = (c: Decision) => c.options.map((o) => ({ o, s: appeal(policy, o) + player.next() * (policy === 'random' ? 1 : 0.5) })).sort((a, b) => b.s - a.s);
      const ranked = cards.map((c) => ({ c, opts: scoreCard(c) }));
      const pickedCard = mode === 'first'
        ? ranked[0]
        : policy === 'random'
        ? ranked[Math.floor(player.next() * ranked.length)]
        : ranked.sort((a, b) => b.opts[0].s - a.opts[0].s)[0];
      choice = { decisionId: pickedCard.c.id, optionId: pickedCard.opts[0].o.id, companyId: 'novacore' };
    }
    state = step(state, choice ? [choice] : [], rngForTurn(state));
  }
  return { final: state, ending: state.status.ending as EndingId, year: state.year, score: state.status.score?.total ?? 0, choices: state.choiceLog.length };
}

export interface BalanceReport {
  games: number;
  byPolicy: Record<PolicyName, Partial<Record<EndingId, number>>>;
  overall: Partial<Record<EndingId, number>>;
  /** Mean final year per ending, to see how early threshold endings arrive. */
  meanYear: Partial<Record<EndingId, number>>;
}

export function runBalance(gamesPerPolicy: number, policies: PolicyName[] = POLICIES, firstSeed = 1, mode: CardMode = 'any'): BalanceReport {
  const byPolicy = {} as BalanceReport['byPolicy'];
  const overall: BalanceReport['overall'] = {};
  const yearSum: Partial<Record<EndingId, number>> = {};
  for (const p of policies) {
    byPolicy[p] = {};
    for (let i = 0; i < gamesPerPolicy; i++) {
      const r = playGame(firstSeed + i, p, mode);
      byPolicy[p][r.ending] = (byPolicy[p][r.ending] ?? 0) + 1;
      overall[r.ending] = (overall[r.ending] ?? 0) + 1;
      yearSum[r.ending] = (yearSum[r.ending] ?? 0) + r.year;
    }
  }
  const meanYear: BalanceReport['meanYear'] = {};
  for (const e of Object.keys(overall) as EndingId[]) meanYear[e] = Math.round(((yearSum[e] ?? 0) / (overall[e] ?? 1)) * 10) / 10;
  return { games: gamesPerPolicy * policies.length, byPolicy, overall, meanYear };
}
