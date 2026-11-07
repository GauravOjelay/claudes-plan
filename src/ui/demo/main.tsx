/**
 * Worker-3 demo harness. Open http://localhost:5173/src/ui/demo/index.html with `npm run dev`.
 * Views: #hq  #rival  #dash  #danger  #event  #report  (add ?theme=dark&scale=1.3 to test accessibility).
 *
 * Built on mockWorldState / mockDecisions. The extra history and danger values below are
 * ILLUSTRATIVE DEMO NUMBERS ONLY (not real data, never shipped in the game).
 */
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Decision, WorldState } from '../../contracts';
import { mockCities, mockDecisions, mockWorldState } from '../../contracts/mocks';
import { Dashboard, EventModal, HQScreen, ReportCard, UiRoot } from '../index';

const demoDecisions: Decision[] = [
  ...mockDecisions,
  {
    id: 'demo-release', title: 'Release strategy', era: '2026-2030',
    text: 'Your new model is ready. How do you put it into the world?',
    options: [
      { id: 'open', label: 'Open-source it', effects: [],
        shortTerm: { economy: -1, safety: -1, publicTrust: 1 }, longTerm: { economy: 1, safety: -1, publicTrust: 0 } },
      { id: 'closed', label: 'Keep it closed', effects: [],
        shortTerm: { economy: 1, safety: 1, publicTrust: 0 }, longTerm: { economy: 1, safety: 0, publicTrust: -1 } },
      { id: 'gov', label: 'Partner with government', effects: [],
        shortTerm: { economy: 0, safety: 1, publicTrust: -1 }, longTerm: { economy: 0, safety: 1, publicTrust: 0 } },
    ],
  },
];

/** Illustrative growth curve so the chart has lines to draw. Not a forecast. */
function demoHistory(): WorldState['history'] {
  const out: WorldState['history'] = [];
  for (let i = 0; i <= 10; i++) {
    out.push({
      year: 2026 + i,
      gdp: { US: 29000 * 1.025 ** i, CN: 19000 * 1.04 ** i, EU: 19500 * 1.012 ** i, IN: 4000 * 1.065 ** i },
      global: {},
    });
  }
  return out;
}

const base: WorldState = {
  ...mockWorldState,
  history: demoHistory(),
  headlines: [
    ...mockWorldState.headlines,
    { year: 2026, text: 'NovaCore stock jumps 12% after agent launch', companyId: 'novacore' },
    { year: 2026, text: 'San Francisco grid operator warns of summer shortfall', city: 'sf' },
    { year: 2026, text: 'Rival lab in Beijing announces new model', city: 'beijing' },
  ],
};

const danger: WorldState = {
  ...base,
  year: 2034,
  global: { ...base.global, riskMisuse: 82, riskMalfunction: 55, riskSystemic: 74, geopoliticalTension: 86 },
  regions: Object.fromEntries(
    Object.entries(base.regions).map(([k, r]) => [k, { ...r, publicTrust: 24, wealthGap: 78 }]),
  ) as WorldState['regions'],
};

const ended: WorldState = {
  ...base,
  year: 2036,
  choiceLog: [
    { year: 2026, decisionId: 'mock-fossil-power', optionId: 'renewables', companyId: 'novacore' },
    { year: 2027, decisionId: 'demo-release', optionId: 'gov', companyId: 'novacore' },
  ],
  status: { over: true, ending: 'slowdown', reason: 'Shared oversight held through 2036.' },
};

function Demo() {
  const [view, setView] = useState(() => location.hash.slice(1) || 'hq');
  const [state, setState] = useState<WorldState>(base);
  const [modal, setModal] = useState(view === 'event');
  useEffect(() => {
    const on = () => { const v = location.hash.slice(1) || 'hq'; setView(v); setModal(v === 'event'); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const onChoose = (decisionId: string, optionId: string) => {
    // Demo only: log the choice and add a headline. The real game calls step() in src/app/.
    const opt = demoDecisions.find((d) => d.id === decisionId)?.options.find((o) => o.id === optionId);
    setState((s) => ({
      ...s,
      choiceLog: [...s.choiceLog, { year: s.year, decisionId, optionId, companyId: s.playerCompanyId }],
      headlines: [...s.headlines, { year: s.year, text: `NovaCore decides: ${opt?.label ?? optionId}`, companyId: s.playerCompanyId }],
    }));
  };

  const params = new URLSearchParams(location.search);
  const theme = params.get('theme') === 'dark' ? 'dark' : params.get('theme') === 'light' ? 'light' : undefined;
  const scale = Number(params.get('scale')) || undefined;

  return (
    <UiRoot initial={{ ...(theme && { theme }), ...(scale && { textScale: scale }) }}>
      <nav style={{ display: 'flex', gap: 8, padding: '8px 16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
        {['hq', 'rival', 'dash', 'danger', 'event', 'report'].map((v) => (
          <a key={v} href={`#${v}`} style={{ color: 'var(--accent)', fontWeight: v === view ? 700 : 400 }}>{v}</a>
        ))}
        <span className="ui-small ui-muted" style={{ marginLeft: 'auto' }}>Demo data, not real figures</span>
      </nav>
      {(view === 'hq' || view === 'event') && (
        <HQScreen state={state} decisions={demoDecisions} onChoose={onChoose} cities={mockCities} />
      )}
      {view === 'rival' && <HQScreen state={state} decisions={demoDecisions} onChoose={onChoose} cities={mockCities} companyId="silicara" />}
      {view === 'dash' && <Dashboard state={state} />}
      {view === 'danger' && <Dashboard state={danger} />}
      {view === 'report' && <ReportCard state={ended} decisions={demoDecisions} onRestart={() => (location.hash = 'hq')} />}
      {modal && (
        <EventModal year={2026} valence="negative" title="Blackout belt"
          headline="Data-centre campus fast-tracked; rolling blackouts hit surrounding districts"
          onClose={() => setModal(false)} />
      )}
    </UiRoot>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
