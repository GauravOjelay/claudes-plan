import { useEffect, useRef } from 'react';
import { useUiPrefs } from './a11y';

export type Valence = 'positive' | 'negative' | 'neutral';

/** Short synthesized alert tone (Web Audio, no asset files). Only plays when the player turned sound on. */
function playTone(valence: Valence) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = valence === 'positive' ? [523, 659, 784] : valence === 'negative' ? [330, 247] : [440];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = valence === 'negative' ? 'sawtooth' : 'sine';
      osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio unavailable: stay silent */
  }
}

/**
 * Urgent alert for major events and breakthroughs (docs/plan.md 10.6).
 * Pass the fields of an EventLogEntry with popup: true (headline, year, valence).
 * Shakes the screen for negative events (skipped when the user prefers reduced motion).
 */
export function EventModal({ headline, year, valence = 'neutral', onClose }: {
  headline: string;
  year: number;
  valence?: Valence;
  onClose: () => void;
}) {
  const { prefs } = useUiPrefs();
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btn.current?.focus();
    if (prefs.sound) playTone(valence);
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.querySelector('.ui-root') ?? document.body;
    if (valence === 'negative' && !reduce) {
      root.classList.add('ui-screen-shake');
      const t = setTimeout(() => root.classList.remove('ui-screen-shake'), 600);
      return () => { clearTimeout(t); root.classList.remove('ui-screen-shake'); };
    }
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const kicker = valence === 'positive' ? '★ Breakthrough' : valence === 'negative' ? '⚠ Alert' : 'News';
  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div className="ui-modal" data-valence={valence} role="alertdialog" aria-modal="true"
        aria-labelledby="ui-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-kicker" style={{ color: valence === 'negative' ? 'var(--danger)' : valence === 'positive' ? 'var(--ok)' : 'var(--accent)' }}>
          {kicker} · {year}
        </div>
        <h2 id="ui-modal-title">{headline}</h2>
        <div style={{ textAlign: 'right' }}>
          <button ref={btn} className="ui-btn ui-btn-primary" onClick={onClose}>Continue</button>
        </div>
      </div>
    </div>
  );
}
