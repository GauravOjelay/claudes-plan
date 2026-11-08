import { useEffect, useRef } from 'react';

/** The three steps. Keep the whole overlay under 60 words (master task #7). */
export const HOW_TO_PLAY_STEPS: { title: string; text: string }[] = [
  { title: 'Make your decision', text: 'Open your HQ and pick one option.' },
  { title: 'Look around', text: 'Explore the globe, cities and Average Joe.' },
  { title: 'End the year', text: 'Press End year, then Continue to see what changed.' },
];

/** "How to play" overlay. Closes with the button, Escape or a click outside. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div className="ui-modal ui-howto" role="dialog" aria-modal="true" aria-labelledby="ui-howto-title"
        onClick={(e) => e.stopPropagation()}>
        <h2 id="ui-howto-title">How to play</h2>
        <ol className="ui-howto-steps">
          {HOW_TO_PLAY_STEPS.map((s) => (
            <li key={s.title}><strong>{s.title}.</strong> {s.text}</li>
          ))}
        </ol>
        <div style={{ textAlign: 'right' }}>
          <button ref={btn} className="ui-btn ui-btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

/** Round "?" button that opens the HowToPlay overlay. */
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="ui-btn ui-help-btn" onClick={onClick} aria-label="How to play" title="How to play">?</button>
  );
}
