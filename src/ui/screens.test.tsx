import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CityEffectKind, WorldState } from '../contracts';
import { mockWorldState } from '../contracts/mocks';
import { IntroScreen } from './IntroScreen';
import { ReportCard } from './ReportCard';
import { CITY_EFFECT_LABEL, Skyline } from './Skyline';
import { HQScreen } from './HQScreen';
import { TopBar } from './TopBar';
import { Boardroom, boardroomLook } from './Boardroom';
import { COMPANY_ROSTER } from '../contracts/cities';
import { HelpButton, HowToPlay, HOW_TO_PLAY_STEPS } from './HowToPlay';

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

describe('TopBar', () => {
  const render = (cards: number) => renderToStaticMarkup(
    <TopBar year={2031} screen="city" onNavigate={() => {}} cardsWaiting={cards} onSkipYear={() => {}}>
      <span id="slot">x</span>
    </TopBar>,
  );

  it('shows the year, marks the active tab and renders children', () => {
    const html = render(2);
    expect(html).toContain('2031');
    expect(html).toMatch(/aria-current="page"[^>]*>City</);
    expect((html.match(/aria-current/g) ?? []).length).toBe(1);
    expect(html).toContain('id="slot"');
  });

  it('shows "N cards waiting" plus Skip year, or Next year when none wait', () => {
    expect(render(1)).toMatch(/1<\/span> card waiting/);
    expect(render(3)).toMatch(/3<\/span> cards waiting/);
    expect(render(3)).toContain('Skip year');
    expect(render(0)).toContain('Next year');
    expect(render(0)).not.toContain('waiting');
  });
});

describe('HowToPlay', () => {
  it('has 3 steps and stays under 60 words', () => {
    expect(HOW_TO_PLAY_STEPS).toHaveLength(3);
    const text = renderToStaticMarkup(<HowToPlay onClose={() => {}} />).replace(/<[^>]+>/g, ' ');
    const words = text.split(/\s+/).filter((w) => /\w/.test(w));
    expect(words.length).toBeLessThan(60);
  });

  it('help button has an accessible name', () => {
    expect(renderToStaticMarkup(<HelpButton onClick={() => {}} />)).toContain('aria-label="How to play"');
  });
});

describe('Boardroom', () => {
  it('derives the same look every time (deterministic)', () => {
    const c = COMPANY_ROSTER[0];
    expect(boardroomLook(c)).toEqual(boardroomLook({ ...c }));
  });

  it('gives the three HQs in every city different rooms', () => {
    const byCity = new Map<string, string[]>();
    for (const c of COMPANY_ROSTER) {
      const l = boardroomLook(c);
      const key = `${l.time}/${l.table}/${l.signStyle}/${l.palette}/${l.people}/${l.presenterSide}`;
      byCity.set(c.homeCity, [...(byCity.get(c.homeCity) ?? []), key]);
    }
    for (const [city, keys] of byCity) expect(new Set(keys).size, city).toBe(keys.length);
  });

  it('uses every time of day, table shape and sign style across the roster, with 5-7 people', () => {
    const looks = COMPANY_ROSTER.map(boardroomLook);
    expect(new Set(looks.map((l) => l.time)).size).toBe(3);
    expect(new Set(looks.map((l) => l.table)).size).toBe(3);
    expect(new Set(looks.map((l) => l.signStyle)).size).toBe(3);
    for (const l of looks) expect(l.people).toBeGreaterThanOrEqual(5), expect(l.people).toBeLessThanOrEqual(7);
  });

  it('shows the company logo and name, and draws the right number of people', () => {
    const c = COMPANY_ROSTER.find((x) => x.id === 'meridian')!;
    const html = renderToStaticMarkup(<Boardroom company={c} />);
    expect(html).toContain('Meridian AI');
    expect((html.match(/aria-label="Meridian AI logo"/g) ?? []).length).toBe(3); // sign, screen, table
    expect((html.match(/ui-br-idle/g) ?? []).length).toBe(boardroomLook(c).people - 1);
    expect(html).toContain('ui-br-presenter');
  });

  it('dims the skyline in a blackout', () => {
    const c = COMPANY_ROSTER[0];
    const lit = (h: string) => (h.match(/opacity="0.85"/g) ?? []).length;
    const normal = renderToStaticMarkup(<Boardroom company={c} />);
    const dark = renderToStaticMarkup(<Boardroom company={c} effects={[{ city: c.homeCity, kind: 'blackout', intensity: 1, sinceYear: 2030 }]} />);
    expect(lit(dark)).toBeLessThan(lit(normal) / 3);
  });
});
