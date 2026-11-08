import type { ReactNode } from 'react';

export type GameScreen = 'map' | 'city' | 'hq' | 'dashboard';

export interface TopBarProps {
  year: number;
  /** The screen being shown, highlighted as the active tab. */
  screen: GameScreen;
  onNavigate: (screen: GameScreen) => void;
  /** Companies that still have a decision card waiting this year (the player runs every company). */
  cardsWaiting: number;
  /** Decisions already made this year (held until the year is ended). */
  decisionsMade?: number;
  /** Open the next company that still has a card. Defaults to opening the HQ tab. */
  onDecideMore?: () => void;
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
 * "Make your <year> decision →" (pulsing) until the first decision is made. After that "End <year> →" is the
 * prominent button, next to "Decide for more companies (N waiting)" while other companies still have cards.
 * "Skip year" (no decision at all) stays small. A slot on the right holds extra controls.
 */
export function TopBar({ year, screen, onNavigate, cardsWaiting, decisionsMade = 0, onDecideMore, onSkipYear, children }: TopBarProps) {
  const n = Math.max(0, Math.floor(Number(cardsWaiting) || 0));
  const made = Math.max(0, Math.floor(Number(decisionsMade) || 0));
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
        {n > 0 && made === 0 ? (
          <>
            <button className="ui-topbar-cta ui-topbar-pulse" onClick={() => onNavigate('hq')}
              title={`${n} compan${n === 1 ? 'y has' : 'ies have'} a decision waiting`}>
              Make your {year} decision →
            </button>
            <button className="ui-btn ui-topbar-skip" onClick={onSkipYear} title="Let a year pass without making any decision">
              Skip year
            </button>
          </>
        ) : (
          <>
            {n > 0 && (
              <button className="ui-topbar-cta" onClick={onDecideMore ?? (() => onNavigate('hq'))}
                title="Other companies can still decide this year">
                <span className="ui-topbar-count">{n}</span> Decide for more companies →
              </button>
            )}
            <button className="ui-topbar-end" onClick={onSkipYear}>End {year} →</button>
          </>
        )}
        {children}
      </div>
    </header>
  );
}
