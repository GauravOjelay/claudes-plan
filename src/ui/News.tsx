import { useState } from 'react';
import type { Headline } from '../contracts';

const key = (h: Headline) => `${h.year}|${h.text}`;

/** Headline pop-ups for the right side of the HQ screen. Shows the newest `max`; each can be dismissed. */
export function NewsPopups({ headlines, max = 3 }: { headlines: Headline[]; max?: number }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const shown = headlines.filter((h) => !dismissed.has(key(h))).slice(0, max);
  return (
    <section className="ui-popups" aria-label="Latest news" aria-live="polite">
      <h3 style={{ margin: 0 }}>Breaking</h3>
      {shown.length === 0 && <p className="ui-muted ui-small">No news for this company yet.</p>}
      {shown.map((h) => (
        <div className="ui-popup" key={key(h)}>
          <p>
            <span className="ui-muted ui-small">{h.year} · </span>
            {h.text}
          </p>
          <button className="ui-x" aria-label="Dismiss headline" onClick={() => setDismissed(new Set(dismissed).add(key(h)))}>
            ×
          </button>
        </div>
      ))}
    </section>
  );
}

/** Scrolling ticker. Pauses on hover. Headlines are passed in already filtered (see relevantHeadlines). */
export function NewsTicker({ headlines, label = 'NEWS' }: { headlines: Headline[]; label?: string }) {
  const items = headlines.length ? headlines : [{ year: 0, text: 'No headlines yet' }];
  const chars = items.reduce((n, h) => n + h.text.length, 0);
  return (
    <div className="ui-ticker" role="marquee" aria-label="News ticker">
      <span className="ui-ticker-label">{label}</span>
      <div className="ui-ticker-viewport">
        <div className="ui-ticker-track" style={{ ['--ticker-duration' as string]: `${Math.max(15, chars / 6)}s` }}>
          {/* Two copies so the loop is seamless (track scrolls by half its width). */}
          {[0, 1].flatMap((copy) =>
            items.map((h) => (
              <span key={`${copy}|${key(h)}`} aria-hidden={copy === 1 || undefined}>
                {h.year ? `${h.year}: ` : ''}{h.text}
              </span>
            )),
          )}
        </div>
      </div>
    </div>
  );
}
