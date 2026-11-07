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
  const r = runBalance(n);
  const endings = Object.keys(r.overall) as EndingId[];
  const pct = (x = 0, d = n): string => `${((100 * x) / d).toFixed(1)}%`;
  const rows: Record<string, Record<string, string>> = {};
  for (const p of POLICIES) rows[p] = Object.fromEntries(endings.map((e) => [e, pct(r.byPolicy[p][e])]));
  rows.ALL = Object.fromEntries(endings.map((e) => [e, pct(r.overall[e], r.games)]));
  console.log(`\nBalance report: ${r.games} games (${n} per player type). The 'random' row is a player choosing randomly.`);
  console.table(rows);
  console.log('Mean final year per ending:', JSON.stringify(r.meanYear));
}, 300000);
