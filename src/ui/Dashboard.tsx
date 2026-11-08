import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RegionId, WorldState } from '../contracts';
import { A11yControls } from './a11y';
import { Bar } from './Bar';
import {
  clampPct, formatCompact, formatGdp, gdpRows, levelHigh, levelLow, THRESHOLDS, weightedRegionAvg,
} from './format';
import { RaceTracker } from './RaceTracker';

/** Okabe-Ito order, plus dash patterns so lines differ by more than colour. */
const SERIES: { color: string; dash?: string }[] = [
  { color: '#0072b2' }, { color: '#d55e00', dash: '6 3' }, { color: '#009e73', dash: '2 3' },
  { color: '#e69f00', dash: '8 3 2 3' }, { color: '#cc79a7' }, { color: '#56b4e9', dash: '6 3' },
  { color: '#8a7d00', dash: '2 3' }, { color: '#555555', dash: '8 3 2 3' },
];

const REGION_NAME: Record<RegionId, string> = {
  US: 'United States', CN: 'China', EU: 'EU', UK: 'UK', IN: 'India', RU: 'Russia', GULF: 'Gulf states',
  AFRICA: 'Africa', LATAM: 'Latin America', SEA: 'South-East Asia',
};

export function GdpChart({ history }: { history: WorldState['history'] }) {
  const { rows, regions } = gdpRows(history);
  if (rows.length === 0) return <p className="ui-muted">No history yet.</p>;
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false}
            stroke="var(--muted)" tick={{ fill: 'var(--muted)' }} />
          <YAxis tickFormatter={(v: number) => formatGdp(v)} width={64} stroke="var(--muted)" tick={{ fill: 'var(--muted)' }} />
          <Tooltip
            formatter={(v: number, name: string) => [formatGdp(v), name]}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <Legend formatter={(value: string) => <span style={{ color: 'var(--text)' }}>{value}</span>} />
          {regions.map((r, i) => (
            <Line key={r} dataKey={r} name={REGION_NAME[r] ?? r} type="monotone"
              stroke={SERIES[i % SERIES.length].color} strokeDasharray={SERIES[i % SERIES.length].dash}
              strokeWidth={2.5} dot={rows.length < 12} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Split gauge: share of AI gains captured by companies vs ordinary people (from the wealth gap index). */
export function WealthGapGauge({ wealthGap }: { wealthGap: number }) {
  const elite = clampPct(wealthGap);
  const people = 100 - elite;
  return (
    <div>
      <div className="ui-split" role="img"
        aria-label={`AI companies and executives ${Math.round(elite)}%, ordinary people ${Math.round(people)}%`}>
        <div style={{ flexBasis: `${elite}%`, background: 'var(--c-orange)' }}>{elite >= 15 ? `${Math.round(elite)}%` : ''}</div>
        <div style={{ flexBasis: `${people}%`, background: 'var(--c-sky)', justifyContent: 'flex-end' }}>
          {people >= 15 ? `${Math.round(people)}%` : ''}
        </div>
      </div>
      <div className="ui-split-legend">
        <span><span aria-hidden="true" style={{ color: 'var(--c-orange)' }}>■</span> AI companies &amp; executives</span>
        <span>Ordinary people <span aria-hidden="true" style={{ color: 'var(--c-sky)' }}>■</span></span>
      </div>
      <p className="ui-small ui-muted" style={{ marginBottom: 0 }}>
        Wealth gap index {Math.round(elite)} / 100 (population-weighted across regions).
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-tile">
      <div className="ui-tile-label">{label}</div>
      <div className="ui-tile-value">{value}</div>
    </div>
  );
}

/**
 * Stats dashboard (docs/plan.md 4 and 10.5). Reads WorldState only.
 * `showControls` is off by default: the app header already has the display controls.
 */
export function Dashboard({ state, showControls = false }: { state: WorldState; showControls?: boolean }) {
  const g = state.global;
  const trust = weightedRegionAvg(state, 'publicTrust');
  const gap = weightedRegionAvg(state, 'wealthGap');
  const unempSw = weightedRegionAvg(state, 'unemploymentSoftware');
  const unempPhys = weightedRegionAvg(state, 'unemploymentPhysical');
  const worldGdp = Object.values(state.regions).reduce((s, r) => s + (Number(r.gdp) || 0), 0);

  return (
    <div className="ui-dash">
      <header className="ui-dash-wide" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>World dashboard · {state.year}</h1>
        {showControls && <div style={{ marginLeft: 'auto' }}><A11yControls /></div>}
      </header>

      <section className="ui-panel ui-dash-wide" aria-label="Headline numbers">
        <div className="ui-tiles">
          <Tile label="World GDP" value={formatGdp(worldGdp)} />
          <Tile label="Software jobs lost" value={`${unempSw.toFixed(1)}%`} />
          <Tile label="Physical jobs lost" value={`${unempPhys.toFixed(1)}%`} />
          <Tile label="AI capability" value={formatCompact(g.aiCapability)} />
          <Tile label="Robots deployed" value={formatCompact(g.robotCount)} />
          <Tile label="Takeover risk" value={`${Math.round(g.takeoverRisk)}`} />
        </div>
      </section>

      <section className="ui-panel ui-dash-wide" aria-label="GDP per country">
        <h2>GDP per country</h2>
        <GdpChart history={state.history} />
      </section>

      <section className="ui-panel" aria-label="Risk gauges">
        <h2>AI risk</h2>
        <Bar label="Misuse" value={g.riskMisuse} level={levelHigh(g.riskMisuse, THRESHOLDS.risk)} />
        <Bar label="Malfunction" value={g.riskMalfunction} level={levelHigh(g.riskMalfunction, THRESHOLDS.risk)} />
        <Bar label="Systemic" value={g.riskSystemic} level={levelHigh(g.riskSystemic, THRESHOLDS.risk)} />
        <h2 style={{ marginTop: '1.2rem' }}>World mood</h2>
        <Bar label="Geopolitical tension" value={g.geopoliticalTension}
          level={levelHigh(g.geopoliticalTension, THRESHOLDS.tension)} />
        <Bar label="Public trust in AI" value={trust} level={levelLow(trust, THRESHOLDS.trust)} />
      </section>

      <section className="ui-panel" aria-label="Wealth gap">
        <h2>Who gets the gains?</h2>
        <WealthGapGauge wealthGap={gap} />
      </section>

      <RaceTracker state={state} />
    </div>
  );
}
