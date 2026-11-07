import { it } from 'vitest';
import { runBalance } from './balance';

// Prints the ending distribution. Run: BALANCE_REPORT=1 npx vitest run src/sim/balance.report.test.ts
it.runIf(process.env.BALANCE_REPORT)('prints the balance report', () => {
  const n = Number(process.env.BALANCE_GAMES ?? 1000);
  const r = runBalance(n);
  console.log(JSON.stringify(r, null, 1));
}, 120000);
