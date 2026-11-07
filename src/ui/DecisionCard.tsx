import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ConsequenceHint, Decision, Hint } from '../contracts';

// ---------- Consequence icons ----------
const ICONS: Record<keyof ConsequenceHint, { label: string; path: JSX.Element }> = {
  economy: {
    label: 'Economy',
    path: <path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
  },
  safety: {
    label: 'Safety',
    path: <path d="M12 2 L20 5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5 Z" fill="currentColor" />,
  },
  publicTrust: {
    label: 'Public trust',
    path: <path d="M12 21 C5 15.5 2 12 2 8 A5 5 0 0 1 12 6 A5 5 0 0 1 22 8 C22 12 19 15.5 12 21 Z" fill="currentColor" />,
  },
};
const ARROW: Record<Hint, string> = { 1: '▲', 0: '●', [-1]: '▼' } as Record<Hint, string>;
const WORD: Record<Hint, string> = { 1: 'up', 0: 'no change', [-1]: 'down' } as Record<Hint, string>;

function HintIcon({ kind, dir }: { kind: keyof ConsequenceHint; dir: Hint }) {
  const icon = ICONS[kind];
  return (
    <span className="ui-hint" data-dir={dir} title={`${icon.label}: ${WORD[dir]}`} aria-label={`${icon.label} ${WORD[dir]}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{icon.path}</svg>
      <span aria-hidden="true">{ARROW[dir]}</span>
    </span>
  );
}

function HintRow({ label, hint }: { label: string; hint: ConsequenceHint }) {
  return (
    <div className="ui-hint-line">
      <span>{label}</span>
      <HintIcon kind="economy" dir={hint.economy} />
      <HintIcon kind="safety" dir={hint.safety} />
      <HintIcon kind="publicTrust" dir={hint.publicTrust} />
    </div>
  );
}

export function HintLegend() {
  return (
    <div className="ui-hint-legend" aria-hidden="true">
      {(Object.keys(ICONS) as (keyof ConsequenceHint)[]).map((k) => (
        <span key={k} className="ui-hint" data-dir={0}>
          <svg viewBox="0 0 24 24">{ICONS[k].path}</svg> {ICONS[k].label}
        </span>
      ))}
    </div>
  );
}

// ---------- The card ----------
const SWIPE_PX = 110;

/**
 * Reigns-style decision card. Two options: drag/swipe left for the first, right for the second,
 * or press the arrow keys, or click. Any other number of options: click only.
 */
export function DecisionCard({ decision, onChoose, disabled = false }: {
  decision: Decision;
  onChoose: (decisionId: string, optionId: string) => void;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const two = decision.options.length === 2;

  const choose = (i: number) => {
    const opt = decision.options[i];
    if (!opt || disabled) return;
    onChoose(decision.id, opt.id);
  };

  const onDown = (e: ReactPointerEvent) => {
    if (!two || disabled || (e.target as HTMLElement).closest('button')) return;
    startX.current = e.clientX;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (startX.current !== null) setDx(e.clientX - startX.current);
  };
  const onUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    if (dx <= -SWIPE_PX) choose(0);
    else if (dx >= SWIPE_PX) choose(1);
    setDx(0);
  };

  const lean = dx <= -SWIPE_PX / 2 ? 0 : dx >= SWIPE_PX / 2 ? 1 : -1;

  return (
    <div className="ui-card-stage">
      <article
        className={`ui-card${dragging ? ' dragging' : ''}`}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 20}deg)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        tabIndex={0}
        aria-label={`Decision: ${decision.title}`}
        onKeyDown={(e) => {
          if (!two) return;
          if (e.key === 'ArrowLeft') choose(0);
          if (e.key === 'ArrowRight') choose(1);
        }}
      >
        <div className="ui-card-era">Era {decision.era}</div>
        <h3>{decision.title}</h3>
        <p>{decision.text}</p>
        <div className={`ui-options${two ? ' two' : ''}`}>
          {decision.options.map((o, i) => (
            <button key={o.id} className={`ui-option${lean === i ? ' leaning' : ''}`} onClick={() => choose(i)} disabled={disabled}>
              <span className="ui-option-label">
                {two && (i === 0 ? '◀ ' : '')}{o.label}{two && i === 1 ? ' ▶' : ''}
              </span>
              <span className="ui-hints">
                <HintRow label="Now" hint={o.shortTerm} />
                <HintRow label="Later" hint={o.longTerm} />
              </span>
            </button>
          ))}
        </div>
        {two && <div className="ui-swipe-hint">Swipe the card, use ← → keys, or click an option</div>}
      </article>
    </div>
  );
}
