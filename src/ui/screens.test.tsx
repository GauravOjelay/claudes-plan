import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CityEffectKind, WorldState } from '../contracts';
import { mockWorldState } from '../contracts/mocks';
import { IntroScreen } from './IntroScreen';
import { ReportCard } from './ReportCard';
import { CITY_EFFECT_LABEL, Skyline } from './Skyline';
import { HQScreen } from './HQScreen';

const ALL_KINDS = Object.keys(CITY_EFFECT_LABEL) as CityEffectKind[];

describe('IntroScreen', () => {
  it('shows the title, pitch, speculation note and a Start button', () => {
    const html = renderToStaticMarkup(<IntroScreen onStart={() => {}} />);
    expect(html).toContain('AI 2126');
    expect(html).toContain('2026 to 2126');
    expect(html).toContain('speculative');
    expect(html).toMatch(/<button[^>]*>\s*Start\s*<\/button>/);
  });
});

describe('ReportCard debrief', () => {
  it('links to IPCC, IEA and UN WPP and says it is general context', () => {
    const html = renderToStaticMarkup(<ReportCard state={mockWorldState} />);
    expect(html).toContain('How this compares to real forecasts');
    expect(html).toContain('not a verdict');
    expect(html).toContain('https://www.ipcc.ch/');
    expect(html).toContain('https://www.iea.org/');
    expect(html).toContain('https://population.un.org/wpp/');
  });

  it('copes with string numbers from JSON', () => {
    const s = { ...mockWorldState, global: { ...mockWorldState.global, temperature: '1.5' as unknown as number } };
    expect(renderToStaticMarkup(<ReportCard state={s} />)).toContain('+1.5 °C');
  });
});

describe('Skyline', () => {
  const plain = renderToStaticMarkup(<Skyline effects={[]} />);

  it('has a label for all 12 city effect kinds', () => {
    expect(ALL_KINDS).toHaveLength(12);
  });

  it.each(ALL_KINDS)('changes the picture for %s', (kind) => {
    const html = renderToStaticMarkup(<Skyline effects={[{ city: 'sf', kind, intensity: 0.8, sinceYear: 2030 }]} />);
    expect(html).not.toEqual(plain);
  });

  it('turns most windows off in a full blackout', () => {
    const lit = (h: string) => (h.match(/#ffe9a8/g) ?? []).length;
    const dark = renderToStaticMarkup(<Skyline effects={[{ city: 'sf', kind: 'blackout', intensity: 1, sinceYear: 2030 }]} />);
    expect(lit(dark)).toBeLessThan(lit(plain) / 4);
  });
});

describe('HQScreen city effects', () => {
  it('lists only effects in the company home city', () => {
    const state: WorldState = {
      ...mockWorldState,
      activeCityEffects: [
        { city: 'sf', kind: 'flooding', intensity: 0.5, sinceYear: 2030 },
        { city: 'beijing', kind: 'embargo', intensity: 0.5, sinceYear: 2030 },
      ],
    };
    const html = renderToStaticMarkup(<HQScreen state={state} decisions={[]} onChoose={() => {}} />);
    expect(html).toContain('Flooding');
    expect(html).not.toContain('Embargo');
  });
});
