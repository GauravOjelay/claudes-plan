/**
 * Worker-3 demo harness. Open http://localhost:5173/src/ui/demo/index.html with `npm run dev`.
 * Views: #topbar  #topbar-done  #howto  #intro  #hq  #crisis  #rival  #dash  #danger  #event  #report  (add ?theme=dark&scale=1.3 to test accessibility).
 *
 * Built on mockWorldState plus the real cards/events in data/. The extra history, danger values
 * and score below are ILLUSTRATIVE DEMO NUMBERS ONLY (not real data, never shipped in the game).
 */
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Decision, EventLogEntry, GameEvent, WorldState } from '../../contracts';
import { mockCities, mockWorldState } from '../../contracts/mocks';
import cards from '../../../data/cards.json';
import events from '../../../data/events.json';
import { A11yControls, Dashboard, EventModal, HelpButton, HowToPlay, HQScreen, IntroScreen, ReportCard, TopBar, UiRoot, type GameScreen } from '../index';

// Real cards and events from data/ (owned by worker-1). JSON may be loosely typed, so cast at the edge.
const demoDecisions = cards as unknown as Decision[];
const blackout = (events as unknown as GameEvent[]).find((e) => e.id === 'blackout-belt');

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
    { year: 2026, decisionId: 'datacentre-campus', optionId: 'staged', companyId: 'novacore' },
    { year: 2027, decisionId: 'release-strategy', optionId: 'partnerGov', companyId: 'novacore' },
    { year: 2028, decisionId: 'safety-mechanisms', optionId: 'buildSafeguards', companyId: 'novacore' },
    { year: 2031, decisionId: 'treaty-or-race', optionId: 'treaty', companyId: 'novacore' },
    { year: 2033, decisionId: 'final-oversight', optionId: 'humansInLoop', companyId: 'novacore' },
  ],
  status: {
    over: true, ending: 'slowdown', reason: 'Shared oversight held through 2036.',
    score: { total: 68, wellbeing: 74, company: 52, survival: 81 },
  },
};

/** Many city effects at once in SF, to show the HQ skyline reacting. Demo only. */
const crisis: WorldState = {
  ...base,
  year: 2041,
  activeCityEffects: (['blackout', 'flooding', 'gridlock', 'deepfakeProtests', 'surveillance', 'embargo'] as const)
    .map((kind, i) => ({ city: 'sf', kind, intensity: 0.5 + 0.08 * i, sinceYear: 2040 })),
};
const sunny: WorldState = {
  ...base,
  year: 2045,
  activeCityEffects: [{ city: 'sf', kind: 'solarBoom', intensity: 0.9, sinceYear: 2044 }],
};

/** The event pop-up is driven by an EventLogEntry, exactly as src/app does it. */
const popup: EventLogEntry | undefined = blackout && {
  year: 2026, eventId: blackout.id, headline: blackout.headline, valence: blackout.valence, popup: true, city: 'sf',
};

function Demo() {
  const [view, setView] = useState(() => location.hash.slice(1) || 'hq');
  const [state, setState] = useState<WorldState>(base);
  const [modal, setModal] = useState(view === 'event');
  const [tab, setTab] = useState<GameScreen>('hq');
  const [help, setHelp] = useState(view === 'howto');
  useEffect(() => {
    const on = () => { const v = location.hash.slice(1) || 'hq'; setView(v); setModal(v === 'event'); setHelp(v === 'howto'); };
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
        {['topbar', 'topbar-done', 'howto', 'intro', 'hq', 'crisis', 'sunny', 'rival', 'dash', 'danger', 'event', 'report', 'report-noscore'].map((v) => (
          <a key={v} href={`#${v}`} style={{ color: 'var(--accent)', fontWeight: v === view ? 700 : 400 }}>{v}</a>
        ))}
        <span className="ui-small ui-muted" style={{ marginLeft: 'auto' }}>Demo data, not real figures</span>
      </nav>
      {(view === 'hq' || view === 'event') && (
        <HQScreen state={state} decisions={demoDecisions} onChoose={onChoose} cities={mockCities} />
      )}
      {(view === 'topbar' || view === 'topbar-done' || view === 'howto') && (
        <>
          <TopBar year={state.year} screen={tab} onNavigate={setTab} cardsWaiting={view === 'topbar-done' ? 0 : 3}
            onSkipYear={() => setState((s) => ({ ...s, year: s.year + 1 }))}>
            <HelpButton onClick={() => setHelp(true)} />
            <A11yControls />
          </TopBar>
          {tab === 'dashboard' ? <Dashboard state={state} /> : (
            <div className="ui-panel" style={{ margin: '1rem' }}>Demo: the &quot;{tab}&quot; screen would show here.</div>
          )}
        </>
      )}
      {help && <HowToPlay onClose={() => setHelp(false)} />}
      {view === 'intro' && <IntroScreen onStart={() => (location.hash = 'hq')} />}
      {view === 'crisis' && <HQScreen state={crisis} decisions={demoDecisions} onChoose={onChoose} cities={mockCities} />}
      {view === 'sunny' && <HQScreen state={sunny} decisions={demoDecisions} onChoose={onChoose} cities={mockCities} />}
      {view === 'rival' && <HQScreen state={state} decisions={demoDecisions} onChoose={onChoose} cities={mockCities} companyId="silicara" />}
      {view === 'dash' && <Dashboard state={state} />}
      {view === 'danger' && <Dashboard state={danger} />}
      {view === 'report' && <ReportCard state={ended} decisions={demoDecisions} onRestart={() => (location.hash = 'hq')} />}
      {view === 'report-noscore' && (
        <ReportCard state={{ ...ended, status: { ...ended.status, score: undefined } }} decisions={demoDecisions} />
      )}
      {modal && popup && (
        <EventModal year={popup.year} valence={popup.valence} headline={popup.headline} onClose={() => setModal(false)} />
      )}
    </UiRoot>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
