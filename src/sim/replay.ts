/**
 * Replay links (master task #23.4): `/?seed=44&replay=<choices>&at=<year>` opens the game with those choices already
 * played, so the presenter can jump straight to a year (the what-if run, the end report) in one click.
 *
 * `replay` is a comma-separated list with ONE entry per year, starting at the first year (2026):
 *   - `optionId`                  answers the first card ClosedAI (the flagship) can answer that year, the card the HQ shows
 *   - `-`                         no decision that year
 *   - `companyId:optionId`        the same for another company; join several decisions in one year with `+`
 *                                 e.g. `fastTrack+cancer:openIt,openMaterials,-`
 * `at` is the year to land on (the game stops there, before that year is played); `end` plays on to the ending.
 * Without `at` the game stops right after the last entry.
 * Pure and deterministic: it plays the real sim (`step` with `rngForTurn`), so it matches clicking through the app.
 */
import type { Decision, EventLogEntry, PlayerChoice, WorldState } from '../contracts';
import { step } from './index';
import { rngForTurn } from './rng';

export interface ReplayPick { company?: string; option: string }

/** One entry per year; an empty list = no decision that year. Throws on an empty option. */
export function parseReplay(spec: string): ReplayPick[][] {
  const text = spec.trim();
  if (!text) return [];
  return text.split(',').map((entry) => {
    const t = entry.trim();
    if (t === '' || t === '-') return [];
    return t.split('+').map((part) => {
      const i = part.indexOf(':');
      const pick: ReplayPick = i < 0 ? { option: part.trim() } : { company: part.slice(0, i).trim(), option: part.slice(i + 1).trim() };
      if (!pick.option || pick.company === '') throw new Error(`"${part}" is not a choice (use optionId or companyId:optionId)`);
      return pick;
    });
  });
}

export interface ReplayResult {
  state: WorldState;
  /** Years played. 0 = no replay (or it failed at the first year). */
  played: number;
  /** Event pop-ups of the last year played, so the app can show them as it does after "End year". */
  lastEvents: EventLogEntry[];
  /** Why the replay stopped early (bad option, no card, bad `at`). The state is where it stopped. */
  error?: string;
}

export type AvailableFn = (state: WorldState, companyId: string) => Decision[];

export function replayGame(initial: WorldState, spec: string | null | undefined, at: string | null | undefined, available: AvailableFn): ReplayResult {
  const none: ReplayResult = { state: initial, played: 0, lastEvents: [] };
  if (!spec || !spec.trim()) return none;
  let entries: ReplayPick[][];
  try {
    entries = parseReplay(spec);
  } catch (e) {
    return { ...none, error: (e as Error).message };
  }
  let target: number | 'end' | undefined;
  if (at !== null && at !== undefined && at !== '') {
    if (at === 'end') target = 'end';
    else if (/^\d{4}$/.test(at)) target = Number(at);
    else return { ...none, error: `at=${at} is not a year (use a year like 2032, or end)` };
  }

  let state = initial;
  let played = 0;
  let lastEvents: EventLogEntry[] = [];
  const done = () => state.status.over || (typeof target === 'number' && state.year >= target);
  for (let guard = 0; guard < 300 && !done(); guard++) {
    const picks = entries[played] ?? [];
    if (target === undefined && played >= entries.length) break; // no `at`: stop after the last entry
    const choices: PlayerChoice[] = [];
    for (const pick of picks) {
      const companyId = pick.company ?? state.playerCompanyId;
      if (!state.companies.some((c) => c.id === companyId && c.playable)) return { state, played, lastEvents, error: `${state.year}: unknown company "${companyId}"` };
      const first = available(state, companyId)[0];
      if (!first) return { state, played, lastEvents, error: `${state.year}: ${companyId} has no card to answer` };
      if (!first.options.some((o) => o.id === pick.option)) {
        return { state, played, lastEvents, error: `${state.year}: "${pick.option}" is not an option of "${first.id}" (options: ${first.options.map((o) => o.id).join(', ')})` };
      }
      if (choices.some((c) => c.companyId === companyId)) return { state, played, lastEvents, error: `${state.year}: two choices for ${companyId}` };
      choices.push({ decisionId: first.id, optionId: pick.option, companyId });
    }
    const before = state.eventLog.length;
    try {
      state = step(state, choices, rngForTurn(state));
    } catch (e) {
      return { state, played, lastEvents, error: `${state.year}: ${(e as Error).message}` };
    }
    lastEvents = state.eventLog.slice(before).filter((e) => e.popup);
    played++;
  }
  return { state, played, lastEvents };
}
