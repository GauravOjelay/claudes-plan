import { it } from 'vitest';
import type { EndingId } from '../contracts';
import { POLICIES, runBalance } from './balance';

/**
 * Prints how often each ending happens, per simulated player and overall.
 *   BALANCE_REPORT=1 npx vitest run src/sim/balance.report.test.ts        (BALANCE_GAMES=1000 by default, per player)
 * Wanted as `npm run balance` (package.json is the lead's file): "balance": "BALANCE_REPORT=1 vitest run src/sim/balance.report.test.ts"
 */
it.runIf(process.env.BALANCE_REPORT)('prints the balance report', () => {
  const n = Number(process.env.BALANCE_GAMES ?? 1000);
  const combos = [['any', 'flagship'], ['first', 'flagship'], ['first', 'few'], ['first', 'all']] as const;
  for (const [mode, scope] of combos) {
    const r = runBalance(n, POLICIES, 1, mode, scope);
    const endings = Object.keys(r.overall) as EndingId[];
    const pct = (x = 0, d = n): string => `${((100 * x) / d).toFixed(1)}%`;
    const rows: Record<string, Record<string, string>> = {};
    for (const p of POLICIES) rows[p] = Object.fromEntries(endings.map((e) => [e, pct(r.byPolicy[p][e])]));
    rows.ALL = Object.fromEntries(endings.map((e) => [e, pct(r.overall[e], r.games)]));
    const what = mode === 'any' ? "player answers any available card" : 'APP TODAY: the HQ shows only the first available card';
    console.log(`\nBalance report, mode '${mode}', directing: ${scope} (${what}): ${r.games} games, ${n} per player type. 'random' picks randomly.`);
    console.table(rows);
    console.log('Mean final year per ending:', JSON.stringify(r.meanYear));
  }
}, 300000);
