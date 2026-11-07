import { clampPct, type Level } from './format';

/**
 * A 0-100 bar. When `level` is "danger" it flashes red and shakes, and adds a text badge
 * so the warning never relies on colour alone.
 */
export function Bar({ label, value, level = 'ok', suffix = '' }: {
  label: string;
  value: number;
  level?: Level;
  suffix?: string;
}) {
  const pct = clampPct(value);
  return (
    <div className="ui-bar" data-level={level}>
      <div className="ui-bar-head">
        <span>
          {label}{' '}
          {level === 'danger' && <span className="ui-badge ui-badge-danger">DANGER</span>}
          {level === 'warn' && <span className="ui-badge ui-badge-warn">RISING</span>}
        </span>
        <strong>{Math.round(value)}{suffix}</strong>
      </div>
      <div
        className="ui-bar-track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className="ui-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
