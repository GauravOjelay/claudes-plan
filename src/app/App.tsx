import { useMemo, useState } from 'react';
import type { EventLogEntry, WorldState } from '../contracts';
import { CITIES } from '../contracts/cities';
import { CityView, WorldMap } from '../world';
import { Dashboard, EventModal, HQScreen, NewsTicker, ReportCard, UiRoot, A11yControls } from '../ui';
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
  };

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
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 16px', flexWrap: 'wrap' }}>
        <strong>AI 2126</strong>
        <span>Year {state.year}</span>
        <nav style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setScreen('map')}>World map</button>
          <button onClick={() => setScreen('city')}>City</button>
          <button
            onClick={() => {
              setHqId(undefined);
              setScreen('hq');
            }}
          >
            Your HQ
          </button>
          <button onClick={() => setScreen('dashboard')}>Dashboard</button>
        </nav>
        <button onClick={() => advance()} title="Let a year pass without answering a card">
          {available.length ? `Skip year (${available.length} card${available.length > 1 ? 's' : ''} waiting)` : 'Next year'}
        </button>
        {screen !== 'hq' && ( // the HQ screen has its own copy of these controls
          <span style={{ marginLeft: 'auto' }}>
            <A11yControls />
          </span>
        )}
      </header>

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

      {screen !== 'hq' && <NewsTicker headlines={state.headlines.slice(-8)} />}

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
