import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import './ui.css';

/** Interface preferences: theme, text size, sound. Per-viewer, kept in localStorage when available. */
export interface UiPrefs {
  theme: 'light' | 'dark';
  textScale: number; // 0.85 - 1.5
  sound: boolean;
}

const KEY = 'ai2126.ui.prefs';
const SCALES = [0.85, 1, 1.15, 1.3, 1.5];

function loadPrefs(): UiPrefs {
  const fallback: UiPrefs = {
    theme: typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    textScale: 1,
    sound: false,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<UiPrefs>;
    const scale = Number(p.textScale);
    return {
      theme: p.theme === 'dark' || p.theme === 'light' ? p.theme : fallback.theme,
      textScale: SCALES.includes(scale) ? scale : 1,
      sound: p.sound === true,
    };
  } catch {
    return fallback;
  }
}

interface Ctx {
  prefs: UiPrefs;
  setPrefs: (p: UiPrefs) => void;
}
const PrefsContext = createContext<Ctx | null>(null);

export function useUiPrefs(): Ctx {
  const ctx = useContext(PrefsContext);
  // Components still work outside <UiRoot>, with defaults.
  return ctx ?? { prefs: { theme: 'light', textScale: 1, sound: false }, setPrefs: () => {} };
}

/**
 * Wrap the app (or any screen from src/ui/) in this. It applies the theme, text size and palette.
 * `initial` overrides the saved prefs (useful for screenshots and tests).
 */
export function UiRoot({ children, initial }: { children: ReactNode; initial?: Partial<UiPrefs> }) {
  const [prefs, setPrefsState] = useState<UiPrefs>(() => ({ ...loadPrefs(), ...initial }));
  const setPrefs = (p: UiPrefs) => {
    setPrefsState(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* storage blocked: prefs last for this session only */
    }
  };
  const value = useMemo(() => ({ prefs, setPrefs }), [prefs]);
  return (
    <PrefsContext.Provider value={value}>
      <div className="ui-root" data-theme={prefs.theme} style={{ ['--ui-scale' as string]: prefs.textScale }}>
        {children}
      </div>
    </PrefsContext.Provider>
  );
}

/** Text size, light/dark and sound toggles. Drop it in any header. */
export function A11yControls() {
  const { prefs, setPrefs } = useUiPrefs();
  const i = SCALES.indexOf(prefs.textScale);
  const step = (d: number) => {
    const next = SCALES[Math.min(SCALES.length - 1, Math.max(0, (i < 0 ? 1 : i) + d))];
    setPrefs({ ...prefs, textScale: next });
  };
  return (
    <div className="ui-a11y" role="group" aria-label="Display settings">
      <button className="ui-btn" onClick={() => step(-1)} aria-label="Smaller text" disabled={i === 0}>A−</button>
      <span className="ui-small ui-muted" aria-live="polite">{Math.round(prefs.textScale * 100)}%</span>
      <button className="ui-btn" onClick={() => step(1)} aria-label="Larger text" disabled={i === SCALES.length - 1}>A+</button>
      <button
        className="ui-btn"
        onClick={() => setPrefs({ ...prefs, theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
        aria-pressed={prefs.theme === 'dark'}
      >
        {prefs.theme === 'dark' ? '☀ Light' : '☾ Dark'}
      </button>
      <button className="ui-btn" onClick={() => setPrefs({ ...prefs, sound: !prefs.sound })} aria-pressed={prefs.sound}>
        Sound {prefs.sound ? 'on' : 'off'}
      </button>
    </div>
  );
}
