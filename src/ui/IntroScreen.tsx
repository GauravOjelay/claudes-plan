import { A11yControls } from './a11y';

export interface IntroScreenProps {
  onStart: () => void;
  /** Show text size / theme controls in the corner. Turn off if the app header already has them. */
  showControls?: boolean;
}

/** Title screen (docs/plan.md 1 and 9.2): title, pitch, speculation note, Start button. */
export function IntroScreen({ onStart, showControls = true }: IntroScreenProps) {
  return (
    <main className="ui-intro" aria-labelledby="ui-intro-title">
      {showControls && <div className="ui-intro-controls"><A11yControls /></div>}
      <div className="ui-intro-body">
        <div className="ui-intro-years" aria-hidden="true">2026 → 2126</div>
        <h1 id="ui-intro-title">AI 2126</h1>
        <p className="ui-intro-pitch">
          Run the world's AI companies from 2026 to 2126 and watch your choices reshape jobs, wealth,
          the climate and the fate of humanity.
        </p>
        <button className="ui-btn ui-btn-primary ui-intro-start" onClick={onStart} autoFocus>
          Start
        </button>
        <p className="ui-intro-note">
          <strong>Note:</strong> future events in this game are speculative. They are based on real
          forecasts where they exist. All companies are fictional.
        </p>
      </div>
    </main>
  );
}
