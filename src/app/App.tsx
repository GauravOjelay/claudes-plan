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
  // After each round the player is shown their home city with a floating Continue button.
  const [recap, setRecap] = useState(false);

  // One decision per year (DECISIONS: option 3). Answering a card does NOT end the year:
  // the choice is held until the player presses "End year" in the top bar, so they can
  // look around the city and globe first.
  const [pending, setPending] = useState<{ decisionId: string; optionId: string } | null>(null);
  const available = useMemo(() => availableDecisions(state), [state]);
  const openCards = pending ? [] : available.slice(0, 1);

  const advance = () => {
    const before = state.eventLog.length;
    const next = playTurn(state, pending ?? undefined);
    setPopups((p) => [...p, ...next.eventLog.slice(before).filter((e) => e.popup)]);
    setPending(null);
    setState(next);
    const home = next.companies.find((c) => c.id === next.playerCompanyId)?.homeCity;
    if (home) setCityId(home);
    setScreen('city');
    setRecap(true);
  };

  const continueGame = () => {
    setRecap(false);
    setHqId(undefined);
    setScreen('hq');
  };

  const restart = () => {
    setState(newGame(seed));
    setPopups([]);
    setPending(null);
    setRecap(false);
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
        cardsWaiting={openCards.length}
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
          decisions={openCards}
          companyId={hqId}
          cities={CITIES}
          onChoose={(decisionId, optionId) => {
            if (hqId && hqId !== state.playerCompanyId) return; // rivals are view-only
            setPending({ decisionId, optionId });
          }}
          onBack={() => setScreen('city')}
        />
      )}
      {screen === 'dashboard' && <Dashboard state={state} />}

      </div>

      {screen !== 'hq' && <NewsTicker headlines={state.headlines.slice(-8)} />}

      </div>

      {recap && (
        <button className="app-continue" onClick={continueGame} autoFocus>
          <span>
            <small>{state.year - 1} is over. Look around your city.</small>
            Continue to {state.year} →
          </span>
        </button>
      )}

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
