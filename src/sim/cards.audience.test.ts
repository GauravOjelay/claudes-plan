import { describe, expect, it } from 'vitest';
import { COMPANY_ROSTER } from '../contracts/cities';
import { POWERS, GROUPED_REGIONS, decisionFitsCompany } from '../contracts';
import { ALL_DECISIONS, availableDecisions, newGame } from '../app/game';
import { step } from './index';
import { rngForTurn } from './rng';

/** Play the HQ flow for every company (first card each year, first option) and record the card each one saw. */
function decks(seed = 7): Record<string, string[]> {
  let s = newGame(seed);
  const seen: Record<string, string[]> = {};
  const comp = s.companies.filter((c) => c.playable);
  while (!s.status.over) {
    const choices = [];
    for (const c of comp) {
      const card = availableDecisions(s, ALL_DECISIONS, c.id)[0];
      (seen[c.id] ??= []).push(card ? card.id : '-');
      if (card) choices.push({ decisionId: card.id, optionId: card.options[0].id, companyId: c.id });
    }
    s = step(s, choices, rngForTurn(s));
  }
  return seen;
}

describe('company-specific cards (audience)', () => {
  const seen = decks();
  const regions: string[] = [...POWERS, ...GROUPED_REGIONS];

  it('every audience names real companies, archetypes and regions', () => {
    const ids = new Set(COMPANY_ROSTER.map((c) => c.id));
    const archetypes = new Set(COMPANY_ROSTER.map((c) => c.archetype));
    for (const d of ALL_DECISIONS) {
      const a = d.audience;
      for (const id of a?.companyIds ?? []) expect(ids.has(id), `${d.id}: ${id}`).toBe(true);
      for (const x of a?.archetypes ?? []) expect(archetypes.has(x), `${d.id}: ${x}`).toBe(true);
      for (const r of a?.regions ?? []) expect(regions).toContain(r);
      expect(d.options.length, d.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('every archetype and every region has cards of its own, and the famous companies have a personal card', () => {
    for (const arch of new Set(COMPANY_ROSTER.map((c) => c.archetype))) {
      const own = ALL_DECISIONS.filter((d) => d.audience && COMPANY_ROSTER.some((c) => c.archetype === arch && decisionFitsCompany(d, c)) && !COMPANY_ROSTER.every((c) => decisionFitsCompany(d, c)));
      expect(own.length, arch).toBeGreaterThanOrEqual(2);
    }
    for (const id of ['mvidia', 'shallowseek', 'macrohard', 'spacey']) {
      expect(ALL_DECISIONS.some((d) => d.audience?.companyIds?.length === 1 && d.audience.companyIds[0] === id), id).toBe(true);
      expect(seen[id].some((c) => c.startsWith(`${id}-`)), `${id} sees its own card`).toBe(true);
    }
  });

  it('ClosedAI keeps the demo cards in the demo order', () => {
    expect(seen.closedai).toEqual(['datacentre-campus', 'materials-model', 'energy-source', 'response-to-job-losses', 'safety-mechanisms', 'treaty-or-race', 'alignment-scare', 'research-priority', 'robotics-rollout', 'final-oversight', 'lobby-regulation']);
  });

  it('almost every company has a card to answer almost every year', () => {
    const empties = Object.values(seen).map((d) => d.filter((x) => x === '-').length);
    expect(Math.max(...empties)).toBeLessThanOrEqual(5);
    expect(empties.reduce((a, b) => a + b, 0) / empties.length).toBeLessThan(2.5);
  });

  it('neighbours in one city mostly see different cards in the same year', () => {
    const byCity: Record<string, string[]> = {};
    for (const c of COMPANY_ROSTER) (byCity[c.homeCity] ??= []).push(c.id);
    let same = 0;
    let total = 0;
    for (const ids of Object.values(byCity)) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          seen[ids[i]].forEach((card, k) => {
            const other = seen[ids[j]][k];
            if (card === '-' && other === '-') return;
            total++;
            if (card === other) same++;
          });
        }
      }
    }
    expect(same / total).toBeLessThan(0.35);
  });

  it('chip, finance and region cards raise world tension so war stays reachable', () => {
    const raises = (id: string) => ALL_DECISIONS.find((d) => d.id === id)!.options.some((o) => o.effects.some((e) => e.target.scope === 'global' && e.target.variable === 'geopoliticalTension' && e.value >= 4));
    for (const id of ['chip-export-rules', 'mvidia-china-sales', 'state-defence-contract', 'ru-sanctions']) expect(raises(id), id).toBe(true);
  });
});
