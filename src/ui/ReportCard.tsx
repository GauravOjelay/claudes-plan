import { useState } from 'react';
import type { Decision, WorldState } from '../contracts';
import { ENDINGS, formatCompact, formatGdp, weightedRegionAvg } from './format';

export interface ReportCardProps {
  state: WorldState;
  /** Card data, so key decisions show their titles instead of ids. Optional. */
  decisions?: Decision[];
  /** How many choices to list. */
  maxDecisions?: number;
  onRestart?: () => void;
}

/** End-of-game "Your 2126" report card (docs/plan.md 10.6). Uses state.status.ending. */
export function ReportCard({ state, decisions = [], maxDecisions = 6, onRestart }: ReportCardProps) {
  const [copied, setCopied] = useState(false);
  const ending = state.status.ending ? ENDINGS[state.status.ending] : undefined;
  const company = state.companies.find((c) => c.id === state.playerCompanyId);

  const choices = state.choiceLog
    .filter((c) => c.companyId === state.playerCompanyId)
    .slice(0, maxDecisions)
    .map((c) => {
      const d = decisions.find((x) => x.id === c.decisionId);
      const o = d?.options.find((x) => x.id === c.optionId);
      return { year: c.year, title: d?.title ?? c.decisionId, option: o?.label ?? c.optionId };
    });

  const worldGdp = Object.values(state.regions).reduce((s, r) => s + (Number(r.gdp) || 0), 0);
  const stats: [string, string][] = [
    ['World GDP', formatGdp(worldGdp)],
    ['Wealth gap', `${Math.round(weightedRegionAvg(state, 'wealthGap'))} / 100`],
    ['Public trust in AI', `${Math.round(weightedRegionAvg(state, 'publicTrust'))} / 100`],
    ['Geopolitical tension', `${Math.round(state.global.geopoliticalTension)} / 100`],
    ['AI capability', formatCompact(state.global.aiCapability)],
    ['Robots', formatCompact(state.global.robotCount)],
  ];

  const shareText = [
    `My ${state.year} in AI 2126: ${ending?.title ?? 'Unfinished'}`,
    company ? `I ran ${company.name}.` : '',
    ...choices.map((c) => `${c.year}: ${c.title} - ${c.option}`),
    `Seed ${state.seed}`,
  ].filter(Boolean).join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="ui-report" aria-label="Your 2126 report card">
      <header className="ui-report-hero" data-tone={ending?.tone ?? 'mixed'}>
        <div style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.85em' }}>Your {state.year}</div>
        <h1>{ending?.title ?? 'The story isn\'t over'}</h1>
        <p style={{ margin: 0 }}>{ending?.blurb ?? 'No ending has been reached yet.'}</p>
        {state.status.reason && <p style={{ marginBottom: 0, opacity: 0.9 }}>{state.status.reason}</p>}
      </header>

      <section className="ui-panel" style={{ marginBottom: '1rem' }}>
        <h2>Key decisions{company ? ` at ${company.name}` : ''}</h2>
        {choices.length === 0 ? (
          <p className="ui-muted">No decisions recorded.</p>
        ) : (
          <ol>
            {choices.map((c, i) => (
              <li key={i}><strong>{c.year}:</strong> {c.title} → <em>{c.option}</em></li>
            ))}
          </ol>
        )}
      </section>

      <section className="ui-panel">
        <h2>The world you made</h2>
        <div className="ui-tiles">
          {stats.map(([k, v]) => (
            <div className="ui-tile" key={k}>
              <div className="ui-tile-label">{k}</div>
              <div className="ui-tile-value">{v}</div>
            </div>
          ))}
        </div>
        <p className="ui-small ui-muted" style={{ marginBottom: 0 }}>
          Future events in this game are speculative, based on real forecasts where they exist.
        </p>
      </section>

      <div className="ui-report-actions">
        <button className="ui-btn ui-btn-primary" onClick={copy}>{copied ? 'Copied!' : 'Copy summary to share'}</button>
        {onRestart && <button className="ui-btn" onClick={onRestart}>Play again</button>}
      </div>
    </article>
  );
}
