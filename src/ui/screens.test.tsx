import * as nodeFs from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CityEffectKind, Decision, WorldState } from '../contracts';
import cards from '../../data/cards.json';
import { mockWorldState } from '../contracts/mocks';
import { IntroScreen } from './IntroScreen';
import { ReportCard } from './ReportCard';
import { CITY_EFFECT_LABEL, Skyline } from './Skyline';
import { HQScreen } from './HQScreen';
import { TopBar } from './TopBar';
import { Boardroom, boardroomLook } from './Boardroom';
import { CITY_PHOTO_LAYOUT, CITY_PHOTO_LAYOUT_OVERRIDES, HQ_CITY_PHOTO, HQ_PHOTOS, MIN_FLIPPED_SIGN_X, PhotoBoardroom, cityPhotoFile, hasBuiltInCityPhoto, photoLook, signArea } from './PhotoBoardroom';
import { COMPANY_ROSTER } from '../contracts/cities';
import { RaceTracker } from './RaceTracker';
import { HelpButton, HowToPlay, HOW_TO_PLAY_STEPS } from './HowToPlay';

const ALL_KINDS = Object.keys(CITY_EFFECT_LABEL) as CityEffectKind[];

// The project has no @types/node; these two functions are all the test needs.
const fs = nodeFs as unknown as { readFileSync(path: string): Uint8Array; existsSync(path: string): boolean };

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

  it('asks for the decision while a card waits, then offers End <year>', () => {
    expect(render(1)).toContain('Make your 2031 decision');
    expect(render(3)).toContain('Make your 2031 decision');
    expect(render(3)).toContain('Skip year');
    expect(render(3)).not.toContain('End 2031');
    const done = render(0);
    expect(done).toContain('End 2031');
    expect(done).not.toContain('Skip year');
    expect(done).not.toContain('Next year');
    expect(done).not.toContain('decision');
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
    const c = COMPANY_ROSTER.find((x) => x.id === 'twelvelabs')!;
    const html = renderToStaticMarkup(<Boardroom company={c} />);
    expect(html).toContain('TwelveLabs');
    expect((html.match(/aria-label="TwelveLabs logo"/g) ?? []).length).toBe(3); // sign, screen, table
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

describe('PhotoBoardroom', () => {
  it('has a photo for every city of the roster, and every photo file exists in the manifest', async () => {
    const { readFileSync } = await import('node:fs');
    const manifest = JSON.parse(readFileSync('public/hq/manifest.json', 'utf8')) as { images: Record<string, { file: string }>; cities: Record<string, string> };
    for (const c of COMPANY_ROSTER) expect(HQ_CITY_PHOTO[c.homeCity], c.homeCity).toBeDefined();
    for (const [city, key] of Object.entries(HQ_CITY_PHOTO)) expect(manifest.cities[city], city).toBe(key);
    for (const [key, p] of Object.entries(HQ_PHOTOS)) expect(manifest.images[key].file).toBe(p.file);
  });

  it('is deterministic and gives the companies of one city different framings', () => {
    const byCity = new Map<string, string[]>();
    for (const c of COMPANY_ROSTER) {
      expect(photoLook(c)).toEqual(photoLook({ ...c }));
      const l = photoLook(c);
      byCity.set(c.homeCity, [...(byCity.get(c.homeCity) ?? []), `${l.flip}/${l.zoom}/${l.dx}/${l.dy}/${l.hue}`]);
    }
    for (const [city, keys] of byCity) expect(new Set(keys).size, city).toBe(keys.length);
  });

  it('keeps the sign inside the picture and always clear of the stats panel on the left', () => {
    for (const c of COMPANY_ROSTER) {
      const l = photoLook(c);
      const a = signArea(HQ_PHOTOS[l.photo], l.flip);
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + a.w).toBeLessThanOrEqual(100);
      expect(a.y + a.h).toBeLessThanOrEqual(100);
      expect(a.x, c.id).toBeGreaterThanOrEqual(MIN_FLIPPED_SIGN_X);
    }
  });

  it('tries the city\'s own photo first (boardroom-<cityId>.jpg); the three cities that are mood photos use those', () => {
    const paris = COMPANY_ROSTER.find((x) => x.homeCity === 'paris')!;
    const html = renderToStaticMarkup(<PhotoBoardroom company={paris} />);
    expect(html).toContain('/hq/boardroom-paris.jpg');
    expect(html).toContain('data-photo="paris"');
    expect(html).toContain('data-flip="no"'); // a real skyline is never mirrored
    const tokyo = COMPANY_ROSTER.find((x) => x.homeCity === 'tokyo')!;
    expect(renderToStaticMarkup(<PhotoBoardroom company={tokyo} />)).toContain('/hq/boardroom-tokyo.jpg');
    expect(hasBuiltInCityPhoto('dubai') && hasBuiltInCityPhoto('london') && hasBuiltInCityPhoto('tokyo')).toBe(true);
    expect(hasBuiltInCityPhoto('paris')).toBe(false);
    expect(cityPhotoFile('sao')).toBe('boardroom-sao.jpg');
  });

  it('puts the sign of a city\'s own photo clear of the stats panel, the top-right controls and the news', () => {
    const a = CITY_PHOTO_LAYOUT.logoArea;
    expect(a.x).toBeGreaterThanOrEqual(MIN_FLIPPED_SIGN_X);
    expect(a.x + a.w).toBeLessThanOrEqual(100);
    expect(a.y).toBeGreaterThanOrEqual(14);
    expect(a.y + a.h).toBeLessThanOrEqual(60);
  });

  it('every owner-made city photo has a sign layout that matches the picture and avoids the panel and the controls', () => {
    const jpegSize = (file: string): [number, number] => {
      const b = fs.readFileSync(file);
      const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      for (let i = 2; i < b.length - 9;) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [dv.getUint16(i + 7), dv.getUint16(i + 5)];
        i += 2 + dv.getUint16(i + 2);
      }
      throw new Error(`no size in ${file}`);
    };
    const own = ['sf', 'nyc', 'seattle', 'austin', 'stockholm', 'hangzhou', 'lagos', 'cairo', 'bangalore'];
    for (const city of own) {
      const file = `public/hq/${cityPhotoFile(city)}`;
      expect(fs.existsSync(file), file).toBe(true);
      const o = CITY_PHOTO_LAYOUT_OVERRIDES[city];
      expect(o, city).toBeDefined();
      const [w, h] = jpegSize(file);
      expect(o.aspect!, city).toBeCloseTo(w / h, 2);
      const a = o.logoArea!;
      expect(a.x, city).toBeGreaterThanOrEqual(MIN_FLIPPED_SIGN_X); // stats panel on the left
      expect(a.x + a.w, city).toBeLessThanOrEqual(98); // the picture is cropped a little at the sides
      expect(a.y + a.h, city).toBeLessThanOrEqual(60);
      expect(a.x + a.w <= 66 || a.y >= 20, `${city}: clear of the year / text-size controls (top right)`).toBe(true);
    }
  });

  it('shows the company sign and a table logo on the photo, and darkens in a blackout', () => {
    const c = COMPANY_ROSTER.find((x) => x.id === 'twelvelabs')!;
    const html = renderToStaticMarkup(<PhotoBoardroom company={c} />);
    expect(html).toContain('/hq/boardroom-london.jpg');
    expect(html).toContain('TwelveLabs');
    expect((html.match(/aria-label="TwelveLabs logo"/g) ?? []).length).toBe(2); // sign, table
    expect(html).not.toContain('ui-hqp-blackout');
    const dark = renderToStaticMarkup(<PhotoBoardroom company={c} effects={[{ city: c.homeCity, kind: 'blackout', intensity: 1, sinceYear: 2030 }]} />);
    expect(dark).toContain('ui-hqp-blackout');
  });
});

describe('TopBar with several companies', () => {
  const bar = (waiting: number, made: number) => renderToStaticMarkup(
    <TopBar year={2027} screen="hq" onNavigate={() => {}} cardsWaiting={waiting} decisionsMade={made} onSkipYear={() => {}} />,
  );

  it('before any decision: Make your decision + small Skip year, no End button', () => {
    const html = bar(17, 0);
    expect(html).toContain('Make your 2027 decision');
    expect(html).toContain('Skip year');
    expect(html).not.toContain('End 2027');
  });

  it('after a decision with other companies waiting: both "Decide for more companies" (with the count) and End <year>', () => {
    const html = bar(16, 1);
    expect(html).toMatch(/16<\/span> Decide for more companies/);
    expect(html).toContain('End 2027');
    expect(html).not.toContain('Skip year');
    expect(html).not.toContain('Make your');
  });

  it('when nobody is waiting: only End <year>', () => {
    const html = bar(0, 3);
    expect(html).toContain('End 2027');
    expect(html).not.toContain('Decide for more');
  });
});

describe('every company is the player\'s (no rivals)', () => {
  const state: WorldState = {
    ...mockWorldState,
    companies: COMPANY_ROSTER.map((c) => ({ ...c })),
    choiceLog: [
      { year: 2026, decisionId: 'datacentre-campus', optionId: 'staged', companyId: 'closedai' },
      { year: 2026, decisionId: 'datacentre-campus', optionId: 'fastTrack', companyId: 'mvidia' },
    ],
    status: { over: true, ending: 'slowdown', reason: 'x', score: { total: 60, wellbeing: 60, company: 60, survival: 60 } },
  };
  const text = (html: string) => html.replace(/<[^>]+>/g, ' ');

  it('has no rival / view-only / "your company" wording on any screen', () => {
    const pages = [
      renderToStaticMarkup(<HQScreen state={state} decisions={[]} onChoose={() => {}} companyId="mvidia" />),
      renderToStaticMarkup(<ReportCard state={state} />),
      renderToStaticMarkup(<RaceTracker state={state} />),
      renderToStaticMarkup(<HowToPlay onClose={() => {}} />),
    ];
    for (const html of pages) expect(text(html)).not.toMatch(/rival|view only|view-only|your company\b|\(you\)/i);
  });

  it('lets any company HQ take decisions', () => {
    const d = (cards as unknown as Decision[])[0];
    const html = renderToStaticMarkup(<HQScreen state={{ ...state, status: { over: false } }} decisions={[d]} onChoose={() => {}} companyId="cancer" />);
    expect(html).toContain(d.title);
  });

  it('report card lists the decisions of ALL companies with the company name', () => {
    const html = text(renderToStaticMarkup(<ReportCard state={state} />));
    expect(html).toContain('ClosedAI');
    expect(html).toContain('Mvidia');
  });
});
