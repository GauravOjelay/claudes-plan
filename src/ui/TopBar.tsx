import type { ReactNode } from 'react';

export type GameScreen = 'map' | 'city' | 'hq' | 'dashboard';

export interface TopBarProps {
  year: number;
  /** The screen being shown, highlighted as the active tab. */
  screen: GameScreen;
  onNavigate: (screen: GameScreen) => void;
  /** Decision cards the player can answer this year. */
  cardsWaiting: number;
  /** Let a year pass without answering a card. */
  onSkipYear: () => void;
  /** Extra controls on the right, e.g. <HelpButton/> and <A11yControls/>. */
  children?: ReactNode;
}

const TABS: { id: GameScreen; label: string }[] = [
  { id: 'map', label: 'World map' },
  { id: 'city', label: 'City' },
  { id: 'hq', label: 'Your HQ' },
  { id: 'dashboard', label: 'Dashboard' },
];

/**
 * The game's header: year, screen tabs and the one obvious next step (task #17.2):
 * "Make your <year> decision →" (pulsing) while a card waits, then "End <year> →" once it is answered.
 * "Skip year" stays small. A slot on the right holds extra controls.
 */
export function TopBar({ year, screen, onNavigate, cardsWaiting, onSkipYear, children }: TopBarProps) {
  const n = Math.max(0, Math.floor(Number(cardsWaiting) || 0));
  return (
    <header className="ui-topbar">
      <div className="ui-topbar-brand">
        <span className="ui-topbar-title">AI 2126</span>
        <span className="ui-topbar-year" aria-label={`Year ${year}`}>{year}</span>
      </div>

      <nav className="ui-topbar-tabs" aria-label="Screens">
        {TABS.map((t) => (
          <button key={t.id} className="ui-topbar-tab" aria-current={t.id === screen ? 'page' : undefined}
            onClick={() => onNavigate(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="ui-topbar-actions">
        {n > 0 ? (
          <>
            <button className="ui-topbar-cta ui-topbar-pulse" onClick={() => onNavigate('hq')}
              title={`${n} decision card${n === 1 ? '' : 's'} waiting at your HQ`}>
              Make your {year} decision →
            </button>
            <button className="ui-btn ui-topbar-skip" onClick={onSkipYear} title="Let a year pass without answering a card">
              Skip year
            </button>
          </>
        ) : (
          <button className="ui-topbar-end" onClick={onSkipYear}>End {year} →</button>
        )}
        {children}
      </div>
    </header>
  );
}
