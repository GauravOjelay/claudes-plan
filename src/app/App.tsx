import { useMemo, useState } from 'react';
import type { EventLogEntry, WorldState } from '../contracts';
import { CITIES } from '../contracts/cities';
import { CityView, WorldMap } from '../world';
import { Dashboard, EventModal, HQScreen, IntroScreen, HelpButton, HowToPlay, NewsTicker, TopBar, ReportCard, UiRoot, A11yControls } from '../ui';
import './app.css';
import { ALL_DECISIONS, availableDecisions, newGame, playTurn } from './game';

type Screen = 'map' | 'city' | 'hq' | 'dashboard';

function seedFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const n = Number(raw);
  return raw !== null && Number.isFinite(n) ? n : 1;
}

export function App() {
  const [seed] = useState(seedFromUrl);
  const [state, setState] = useState<WorldState>(() => newGame(seed));
  const [screen, setScreen] = useState<Screen>('map');
  const [cityId, setCityId] = useState('sf');
  const [hqId, setHqId] = useState<string | undefined>(undefined);
  const [popups, setPopups] = useState<EventLogEntry[]>([]);
  const [started, setStarted] = useState(false);
  const [help, setHelp] = useState(false);

  const available = useMemo(() => availableDecisions(state), [state]);

  const advance = (choice?: { decisionId: string; optionId: string }) => {
    const before = state.eventLog.length;
    const next = playTurn(state, choice);
    setPopups((p) => [...p, ...next.eventLog.slice(before).filter((e) => e.popup)]);
    setState(next);
  };

  const restart = () => {
    setState(newGame(seed));
    setPopups([]);
    setScreen('map');
    setStarted(false);
  };

  if (!started) {
    return (
      <UiRoot>
        <IntroScreen onStart={() => {
            setStarted(true);
            setHelp(true);
          }} />
      </UiRoot>
    );
  }

  if (state.status.over) {
    return (
      <UiRoot>
        <ReportCard state={state} decisions={ALL_DECISIONS} onRestart={restart} />
      </UiRoot>
    );
  }

  const popup = popups[0];

  return (
    <UiRoot>
      <div className="app-shell">
      <TopBar
        year={state.year}
        screen={screen}
        cardsWaiting={available.length}
        onSkipYear={() => advance()}
        onNavigate={(next) => {
          if (next === 'hq') setHqId(undefined);
          setScreen(next);
        }}
      >
        <HelpButton onClick={() => setHelp(true)} />
        {screen !== 'hq' && <A11yControls />}
      </TopBar>

      <div className={`app-screen${screen === 'map' ? ' is-map' : ''}`}>

      {screen === 'map' && (
        <WorldMap
          state={state}
          onSelectCity={(id) => {
            setCityId(id);
            setScreen('city');
          }}
        />
      )}
      {screen === 'city' && (
        <CityView
          state={state}
          cityId={cityId}
          decisions={ALL_DECISIONS}
          onSelectCompany={(id) => {
            setHqId(id);
            setScreen('hq');
          }}
          onBack={() => setScreen('map')}
        />
      )}
      {screen === 'hq' && (
        <HQScreen
          state={state}
          decisions={available}
          companyId={hqId}
          cities={CITIES}
          onChoose={(decisionId, optionId) => {
            if (hqId && hqId !== state.playerCompanyId) return; // rivals are view-only
            advance({ decisionId, optionId });
          }}
          onBack={() => setScreen('city')}
        />
      )}
      {screen === 'dashboard' && <Dashboard state={state} />}

      </div>

      {screen !== 'hq' && <NewsTicker headlines={state.headlines.slice(-8)} />}

      </div>

      {help && <HowToPlay onClose={() => setHelp(false)} />}

      {popup && (
        <EventModal
          headline={popup.headline}
          year={popup.year}
          valence={popup.valence}
          onClose={() => setPopups((p) => p.slice(1))}
        />
      )}
    </UiRoot>
  );
}
