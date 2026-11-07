import type { RegionId, WorldState } from '../contracts';
import { formatCompact } from './format';

const FLAG_NAME: Partial<Record<RegionId, string>> = {
  US: 'United States', CN: 'China', EU: 'EU', UK: 'UK', IN: 'India', RU: 'Russia', GULF: 'Gulf states',
};

interface Row { id: string; name: string; value: number; you: boolean }

function Board({ title, rows }: { title: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <>
      <h3>{title}</h3>
      <ol>
        {rows.map((r, i) => (
          <li key={r.id} className={r.you ? 'you' : undefined}>
            <span className="ui-race-rank">{i + 1}.</span>
            <div>
              <div>{r.name}{r.you && ' (you)'}</div>
              <div className="ui-bar-track">
                <div className="ui-bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.you ? 'var(--c-blue)' : 'var(--c-orange)' }} />
              </div>
            </div>
            <strong style={{ textAlign: 'right' }}>{formatCompact(r.value)}</strong>
          </li>
        ))}
      </ol>
    </>
  );
}

/**
 * Rival AI race tracker (docs/plan.md 10.6): companies ranked by AI capability, and countries ranked
 * by their best home lab (contracts have no per-country capability yet).
 */
export function RaceTracker({ state }: { state: WorldState }) {
  const companies: Row[] = state.companies
    .map((c) => ({ id: c.id, name: c.name, value: c.vars.aiCapability, you: c.id === state.playerCompanyId }))
    .sort((a, b) => b.value - a.value);

  const best = new Map<RegionId, Row>();
  const player = state.companies.find((c) => c.id === state.playerCompanyId);
  for (const c of state.companies) {
    const prev = best.get(c.homeRegion);
    if (!prev || c.vars.aiCapability > prev.value) {
      best.set(c.homeRegion, {
        id: c.homeRegion, name: FLAG_NAME[c.homeRegion] ?? c.homeRegion, value: c.vars.aiCapability,
        you: player?.homeRegion === c.homeRegion,
      });
    }
  }
  const countries = [...best.values()].sort((a, b) => b.value - a.value);

  return (
    <section className="ui-panel ui-race" aria-label="AI race tracker">
      <h2>AI race</h2>
      <Board title="Companies (AI capability)" rows={companies} />
      <div style={{ height: '0.8rem' }} />
      <Board title="Countries (best home lab)" rows={countries} />
    </section>
  );
}
