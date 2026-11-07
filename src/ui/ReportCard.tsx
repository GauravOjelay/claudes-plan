import { useState } from 'react';
import type { Decision, Score, WorldState } from '../contracts';
import { A11yControls } from './a11y';
import { clampPct, ENDINGS, formatCompact, formatGdp, scoreGrade, weightedRegionAvg } from './format';

export interface ReportCardProps {
  state: WorldState;
  /** Card data, so key decisions show their titles instead of ids. Optional. */
  decisions?: Decision[];
  /** How many choices to list. */
  maxDecisions?: number;
  onRestart?: () => void;
  /** Show text size / theme controls in the corner. Turn off if the app header already has them. */
  showControls?: boolean;
}

/**
 * Real-world debrief (docs/plan.md 9.2). General context only: no real figures are quoted here
 * (plan 9.3), just what each source forecasts and a link to it, next to the game's own number.
 */
const DEBRIEF: { source: string; topic: string; url: string; yours: (s: WorldState) => string }[] = [
  {
    source: 'IPCC Sixth Assessment Report',
    topic: 'Warming and sea-level rise to 2100 under different emission paths.',
    url: 'https://www.ipcc.ch/report/ar6/syr/',
    yours: (s) => `Your game: +${fmt1(s.global.temperature)} °C, sea level +${Math.round(Number(s.global.seaLevel) || 0)} cm`,
  },
  {
    source: 'IEA, Energy and AI',
    topic: 'How much electricity data centres and AI may use in the coming years.',
    url: 'https://www.iea.org/reports/energy-and-ai',
    yours: (s) => {
      const short = Object.values(s.regions).filter((r) => Number(r.energy) < 0).length;
      return `Your game: ${short} of ${Object.keys(s.regions).length} regions short of power`;
    },
  },
  {
    source: 'UN World Population Prospects',
    topic: 'World and country population projections to 2100.',
    url: 'https://population.un.org/wpp/',
    // population is in millions (contracts RegionVars)
    yours: (s) => `Your game: ${formatCompact(Object.values(s.regions).reduce((t, r) => t + (Number(r.population) || 0), 0) * 1e6)} people in the game's regions`,
  },
];

function fmt1(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(1) : '?';
}

const SCORE_PARTS: { key: keyof Omit<Score, 'total'>; label: string; hint: string }[] = [
  { key: 'wellbeing', label: 'World wellbeing', hint: 'trust, jobs, fair shares' },
  { key: 'company', label: 'Your company', hint: 'value and money' },
  { key: 'survival', label: "Humanity's survival", hint: 'low takeover risk and tension' },
];

/** Big ring showing the 0-100 total. */
function ScoreRing({ total }: { total: number }) {
  const pct = clampPct(total);
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ui-score-ring" viewBox="0 0 120 120" role="img" aria-label={`Score ${Math.round(pct)} out of 100`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="62" textAnchor="middle" fontSize="36" fontWeight="800" fill="#fff">{Math.round(pct)}</text>
      <text x="60" y="84" textAnchor="middle" fontSize="12" fill="#fff" opacity="0.85">/ 100</text>
    </svg>
  );
}

/** End-of-game "Your 2126" report card (docs/plan.md 10.6). Uses state.status.ending. */
export function ReportCard({ state, decisions = [], maxDecisions = 10, onRestart, showControls = true }: ReportCardProps) {
  const [copied, setCopied] = useState(false);
  const ending = state.status.ending ? ENDINGS[state.status.ending] : undefined;
  const company = state.companies.find((c) => c.id === state.playerCompanyId);
  // Set by the sim when the game ends (contracts GameStatus.score); may be missing.
  const raw = state.status.score;
  const score = raw && Number.isFinite(Number(raw.total)) ? raw : undefined;

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
    score ? `Score ${Math.round(score.total)}/100 (wellbeing ${Math.round(score.wellbeing)}, company ${Math.round(score.company)}, survival ${Math.round(score.survival)})` : '',
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
      {showControls && <div className="ui-report-controls"><A11yControls /></div>}
      <header className="ui-report-hero" data-tone={ending?.tone ?? 'mixed'}>
        <div style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '0.85em' }}>Your {state.year}</div>
        <h1>{ending?.title ?? 'The story isn\'t over'}</h1>
        <p className="ui-report-blurb">{ending?.blurb ?? 'No ending has been reached yet.'}</p>
        {state.status.reason && <p style={{ margin: '0.4rem 0 0', opacity: 0.9 }}>{state.status.reason}</p>}

        {score ? (
          <div className="ui-score">
            <div className="ui-score-main">
              <ScoreRing total={score.total} />
              <div className="ui-score-grade">{scoreGrade(score.total)}</div>
            </div>
            <div className="ui-score-parts">
              {SCORE_PARTS.map((p) => {
                const v = clampPct(Number(score[p.key]) || 0);
                return (
                  <div key={p.key}>
                    <div className="ui-score-part-head">
                      <span>{p.label}<span className="ui-score-hint">{p.hint}</span></span>
                      <strong>{Math.round(v)}</strong>
                    </div>
                    <div className="ui-score-track" role="meter" aria-label={p.label} aria-valuemin={0}
                      aria-valuemax={100} aria-valuenow={Math.round(v)}>
                      <div style={{ width: `${v}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="ui-score-missing">Score not available for this run.</p>
        )}
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

      <section className="ui-panel ui-debrief" aria-labelledby="ui-debrief-title">
        <h2 id="ui-debrief-title">How this compares to real forecasts</h2>
        <p className="ui-small ui-muted">
          General context, not a verdict on your run. The game simplifies a lot; these are the real
          sources it draws on.
        </p>
        <ul>
          {DEBRIEF.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noopener noreferrer">{d.source}</a>
              <span className="ui-muted"> - {d.topic}</span>
              <div className="ui-small">{d.yours(state)}</div>
            </li>
          ))}
        </ul>
      </section>

      <div className="ui-report-actions">
        <button className="ui-btn ui-btn-primary" onClick={copy}>{copied ? 'Copied!' : 'Copy summary to share'}</button>
        {onRestart && <button className="ui-btn" onClick={onRestart}>Play again</button>}
      </div>
    </article>
  );
}
