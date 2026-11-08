import { useMemo, useState } from 'react';
import type { EventLogEntry, PlayerChoice, WorldState } from '../contracts';
import { CITIES } from '../contracts/cities';
import { CityView, WorldMap } from '../world';
import { Dashboard, EventModal, HQScreen, IntroScreen, HelpButton, HowToPlay, NewsTicker, TopBar, ReportCard, UiRoot, A11yControls } from '../ui';
import './app.css';
import { averageJoe } from '../sim';
import { ALL_DECISIONS, availableDecisions, newGame, playYear } from './game';

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

  // The player controls EVERY company. Each company can make one decision per year (its next card).
  // Choices are held until the player presses "End <year>" in the top bar, so they can look around first.
  const [pending, setPending] = useState<Record<string, PlayerChoice>>({});
  const [lastCompany, setLastCompany] = useState<string | undefined>(undefined);
  const playable = useMemo(() => state.companies.filter((c) => c.playable), [state]);
  const openCardsFor = (companyId: string) =>
    pending[companyId] ? [] : availableDecisions(state, ALL_DECISIONS, companyId).slice(0, 1);
  const hqCompany = hqId ?? state.playerCompanyId;
  const openCards = openCardsFor(hqCompany);
  const companiesWaiting = playable.filter((c) => openCardsFor(c.id).length > 0).length;

  // Open the HQ of the next company that still has a card (used by the top bar's "Decide for more companies").
  const decideMore = () => {
    const next = playable.find((c) => openCardsFor(c.id).length > 0);
    if (!next) return;
    setHqId(next.id);
    setScreen('hq');
  };

  const advance = () => {
    const before = state.eventLog.length;
    const next = playYear(state, Object.values(pending));
    setPopups((p) => [...p, ...next.eventLog.slice(before).filter((e) => e.popup)]);
    setPending({});
    setState(next);
    const focus = lastCompany ?? next.playerCompanyId;
    const home = next.companies.find((c) => c.id === focus)?.homeCity;
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
    setPending({});
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
        cardsWaiting={companiesWaiting}
        decisionsMade={Object.keys(pending).length}
        onDecideMore={decideMore}
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
          joe={averageJoe(state, cityId)}
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
            const company = state.companies.find((c) => c.id === hqCompany);
            if (!company?.playable) return;
            setPending((p) => ({ ...p, [hqCompany]: { decisionId, optionId, companyId: hqCompany } }));
            setLastCompany(hqCompany);
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
