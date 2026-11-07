import type { CityEffect, Company } from '../contracts';
import { ARCHETYPE_COLOR, CompanyLogo } from './CompanyLogo';

/**
 * HQ boardroom scene (master task #9): dusk boardroom, long table, seated executives and one
 * presenter, floor-to-ceiling windows onto the company's home-city skyline.
 * Pure SVG + CSS (no extra dependencies). Every company gets its own look, derived
 * deterministically from its id, archetype and city (no Math.random).
 * Figures are anonymous silhouettes; landmarks are simplified generic shapes.
 */

export type TimeOfDay = 'golden' | 'dusk' | 'night';
export type TableShape = 'rect' | 'oval' | 'boat';

export interface BoardroomLook {
  time: TimeOfDay;
  /** Room palette index into ROOM_PALETTES. */
  palette: number;
  table: TableShape;
  /** Total people in the room, including the presenter (5-7). */
  people: number;
  presenterSide: 'left' | 'right';
  /** How the company sign on the glass is lit. */
  signStyle: 'panel' | 'etched' | 'neon';
}

/** FNV-1a string hash, so looks are stable across renders and machines. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const ARCHETYPE_INDEX: Record<Company['archetype'], number> = {
  frontierLab: 0, chipMaker: 1, researchLab: 2, stateBackedLab: 3,
};

/** Derive a company's room from its id, archetype and home city. */
export function boardroomLook(company: Pick<Company, 'id' | 'archetype' | 'homeCity'>): BoardroomLook {
  const h = hashString(`${company.id}|${company.homeCity}`);
  const a = ARCHETYPE_INDEX[company.archetype] ?? 0;
  // Companies in the same city have different archetypes, so mixing the archetype into the
  // time and table keeps the three HQs of one city visibly different.
  return {
    time: (['golden', 'dusk', 'night'] as const)[(h + a) % 3],
    palette: (h >>> 4) % ROOM_PALETTES.length,
    table: (['rect', 'oval', 'boat'] as const)[((h >>> 8) + a) % 3],
    people: 5 + ((h >>> 12) % 3),
    presenterSide: (h >>> 15) % 2 ? 'right' : 'left',
    signStyle: (['panel', 'etched', 'neon'] as const)[((h >>> 17) + a) % 3],
  };
}

interface Palette { wall: string; floor: string; table: string; tableEdge: string; chair: string; strip: string }
const ROOM_PALETTES: Palette[] = [
  { wall: '#1b1714', floor: '#120f0d', table: '#4a2e1c', tableEdge: '#2b1a10', chair: '#17110d', strip: '#ffe7c2' }, // walnut
  { wall: '#161a21', floor: '#0e1116', table: '#1a1f29', tableEdge: '#0b0d12', chair: '#0c0e13', strip: '#e6f0ff' }, // black glass
  { wall: '#22201e', floor: '#171513', table: '#6f6a63', tableEdge: '#3f3b36', chair: '#2a2622', strip: '#fff4e0' }, // stone
  { wall: '#141c1f', floor: '#0d1315', table: '#2f3d44', tableEdge: '#19242a', chair: '#0f1619', strip: '#dff7ff' }, // slate
];

const SKY: Record<TimeOfDay, { top: string; mid: string; low: string; sun: string; haze: string; city: string; lit: string }> = {
  golden: { top: '#3b3f6e', mid: '#e08a4f', low: '#ffd48a', sun: '#fff1c4', haze: '#ffcf8f', city: '#2a2030', lit: '#ffd98a' },
  dusk: { top: '#2a2550', mid: '#7a4a8c', low: '#f0866c', sun: '#ffc1a0', haze: '#e9a0a8', city: '#0f0b18', lit: '#ffe2a8' },
  night: { top: '#101a3a', mid: '#1c2f62', low: '#33508f', sun: '#e8eeff', haze: '#5a6fa8', city: '#03050c', lit: '#ffe7a0' },
};

// ---------- City skylines ----------
type Shape = { kind: 'rect'; x: number; w: number; h: number } | { kind: 'path'; d: string };
const GROUND = 520; // y of the city's ground line, seen through the window

const b = (x: number, w: number, h: number): Shape => ({ kind: 'rect', x, w, h });
const p = (d: string): Shape => ({ kind: 'path', d });

/** Simplified, generic landmark silhouettes per city (no logos, no real buildings' detail). */
const LANDMARKS: Record<string, Shape[]> = {
  sf: [p(`M640 ${GROUND} L668 210 L696 ${GROUND} Z`), p(`M960 ${GROUND} V330 H972 V${GROUND} Z M1060 ${GROUND} V330 H1072 V${GROUND} Z M900 420 Q1016 470 1130 420 L1130 426 Q1016 476 900 426 Z`)],
  nyc: [p(`M700 ${GROUND} V230 H740 V200 H752 V150 H756 V200 H768 V230 H808 V${GROUND} Z`), b(860, 60, 260), b(560, 50, 300)],
  london: [p(`M820 ${GROUND} L870 170 L920 ${GROUND} Z`), p(`M560 ${GROUND} V270 H590 V250 L600 225 L610 250 V270 H620 V${GROUND} Z`), p(`M1030 470 m-70 0 a70 70 0 1 0 140 0 a70 70 0 1 0 -140 0 M1030 470 m-62 0 a62 62 0 1 1 124 0 a62 62 0 1 1 -124 0`)],
  paris: [p(`M760 ${GROUND} L800 380 L812 260 L820 190 L828 260 L840 380 L880 ${GROUND} L860 ${GROUND} L820 420 L780 ${GROUND} Z`)],
  tokyo: [p(`M820 ${GROUND} L850 250 L862 180 L874 250 L904 ${GROUND} Z`), b(600, 70, 230), b(980, 80, 260)],
  beijing: [p(`M640 ${GROUND} V300 H760 V${GROUND} H730 V340 H670 V${GROUND} Z`), p(`M900 ${GROUND} V420 H1000 V${GROUND} Z M880 422 L950 395 L1020 422 Z`)],
  dubai: [p(`M800 ${GROUND} L812 300 L818 200 L822 120 L826 200 L832 300 L844 ${GROUND} Z`), b(620, 50, 220), b(980, 60, 200)],
  singapore: [b(720, 40, 230), b(800, 40, 230), b(880, 40, 230), p(`M700 285 H940 L930 300 H710 Z`)],
  moscow: [p(`M720 ${GROUND} V360 H800 V${GROUND} Z M720 360 Q760 300 800 360 Z M755 300 V280 H765 V300 Z`), p(`M860 ${GROUND} V280 L890 230 L920 280 V${GROUND} Z`)],
  munich: [p(`M760 ${GROUND} V320 Q775 280 790 320 V${GROUND} Z M810 ${GROUND} V320 Q825 280 840 320 V${GROUND} Z`), b(1000, 70, 200)],
  saopaulo: [b(560, 60, 220), b(640, 70, 250), b(730, 60, 210), b(810, 80, 270), b(910, 60, 230), b(990, 70, 240)],
  mexicocity: [p(`M300 ${GROUND} L520 330 L560 345 L800 ${GROUND} Z`), b(860, 50, 280), b(940, 60, 200)],
  cairo: [p(`M560 ${GROUND} L680 380 L800 ${GROUND} Z M760 ${GROUND} L850 410 L940 ${GROUND} Z`), b(1000, 40, 170)],
  lagos: [b(640, 60, 240), b(720, 50, 200), b(900, 70, 260)],
  bangalore: [b(620, 70, 180), b(720, 60, 210), b(980, 80, 190), p(`M860 ${GROUND} V440 Q850 400 830 400 Q860 395 864 380 Q868 395 898 400 Q878 400 868 440 V${GROUND} Z`)],
};

/** Generic city blocks, varied per city so even the background rows differ. */
function cityBlocks(city: string, seed: number, minH: number, maxH: number): { x: number; w: number; h: number }[] {
  const out: { x: number; w: number; h: number }[] = [];
  let x = 220;
  let i = 0;
  const h0 = hashString(city) ^ seed;
  while (x < 1400) {
    const r = hashString(`${h0}-${i}`);
    const w = 34 + (r % 50);
    const h = minH + ((r >>> 8) % (maxH - minH));
    out.push({ x, w, h });
    x += w + ((r >>> 16) % 10);
    i++;
  }
  return out;
}

function windowsFor(blocks: { x: number; w: number; h: number }[], seed: number, litShare: number) {
  const out: { x: number; y: number; flicker: number }[] = [];
  blocks.forEach((bl, bi) => {
    for (let y = GROUND - bl.h + 10; y < GROUND - 8; y += 16) {
      for (let x = bl.x + 6; x < bl.x + bl.w - 8; x += 12) {
        const r = hashString(`${seed}-${bi}-${x}-${y}`);
        if ((r % 1000) / 1000 < litShare) out.push({ x, y, flicker: r % 9 === 0 ? (r >>> 10) % 6 : -1 });
      }
    }
  });
  return out;
}

// ---------- People ----------
function Seated({ x, y, s, color, rim, delay }: { x: number; y: number; s: number; color: string; rim: string; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="ui-br-idle" style={{ animationDelay: `${-delay}s` }}>
        <path d="M-30 0 Q-30 -46 -16 -52 H16 Q30 -46 30 0 Z" fill={color} stroke={rim} strokeWidth="1.5" strokeOpacity="0.5" />
        <circle cy="-66" r="13" fill={color} stroke={rim} strokeWidth="1.5" strokeOpacity="0.5" />
      </g>
      <rect x="-26" y="-40" width="52" height="58" rx="8" fill="#000" opacity="0.35" />
    </g>
  );
}

function Presenter({ x, y, s, color, rim, facing }: { x: number; y: number; s: number; color: string; rim: string; facing: 1 | -1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s * facing} ${s})`}>
      <g className="ui-br-presenter">
        <path d="M-9 0 L-7 -70 H7 L9 0 H3 L0 -52 L-3 0 Z" fill={color} />
        <path d="M-18 -70 Q-20 -120 -10 -128 H10 Q20 -120 18 -70 Z" fill={color} stroke={rim} strokeWidth="1.5" strokeOpacity="0.6" />
        <circle cy="-142" r="12" fill={color} stroke={rim} strokeWidth="1.5" strokeOpacity="0.6" />
        <path className="ui-br-arm" d="M14 -122 L44 -104 L48 -110 L18 -128 Z" fill={color} />
      </g>
    </g>
  );
}

export interface BoardroomProps {
  company: Company;
  /** Active effects in the company's home city (already filtered). */
  effects?: CityEffect[];
}

/** Decorative background; the HQ screen shows the same facts in text. */
export function Boardroom({ company, effects = [] }: BoardroomProps) {
  const look = boardroomLook(company);
  const pal = ROOM_PALETTES[look.palette];
  const sky = SKY[look.time];
  const accent = ARCHETYPE_COLOR[company.archetype];
  const level = (k: CityEffect['kind']) => {
    const e = effects.find((x) => x.kind === k);
    const v = Number(e?.intensity);
    return e ? (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5) : 0;
  };
  const blackout = level('blackout');
  const unrest = Math.max(level('unrest'), level('deepfakeProtests'));
  const id = `br-${company.id}`; // unique gradient ids per company

  const far = cityBlocks(company.homeCity, 1, 60, 170);
  const near = cityBlocks(company.homeCity, 2, 90, 260);
  const litShare = (look.time === 'golden' ? 0.25 : 0.5) * (1 - 0.9 * blackout);
  const lit = windowsFor(near, 7, litShare);
  const landmarks = LANDMARKS[company.homeCity] ?? LANDMARKS.sf;

  // Window wall: mullions between y=70 and y=560.
  const mullions = [240, 470, 700, 930, 1160, 1390];

  // Table geometry (vanishing toward the window).
  const tableTop =
    look.table === 'oval' ? <ellipse cx="800" cy="770" rx="520" ry="150" />
      : look.table === 'boat' ? <path d="M800 610 L1090 650 L1300 760 L1090 880 L800 910 L510 880 L300 760 L510 650 Z" />
        : <path d="M560 615 H1040 L1360 905 H240 Z" />;

  // Seats along both long sides, far to near (perspective scale grows toward the viewer).
  const seats = [
    { x: 600, y: 640, s: 0.75 }, { x: 1000, y: 640, s: 0.75 },
    { x: 470, y: 720, s: 0.95 }, { x: 1130, y: 720, s: 0.95 },
    { x: 360, y: 810, s: 1.15 }, { x: 1240, y: 810, s: 1.15 },
  ];
  const seated = seats.slice(0, look.people - 1);
  const presenterX = look.presenterSide === 'right' ? 1100 : 500;
  const screenX = look.presenterSide === 'right' ? 1080 : 400;

  return (
    <svg className="ui-boardroom" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      data-time={look.time} data-table={look.table} data-people={look.people} data-city={company.homeCity}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="0.6" stopColor={sky.mid} />
          <stop offset="1" stopColor={sky.low} />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.wall} />
          <stop offset="1" stopColor={pal.floor} />
        </linearGradient>
        <linearGradient id={`${id}-glare`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor={sky.sun} stopOpacity="0.95" />
          <stop offset="1" stopColor={sky.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-tablesheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.low} stopOpacity="0.45" />
          <stop offset="1" stopColor={sky.low} stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`${id}-glass`}><rect x="0" y="70" width="1600" height="490" /></clipPath>
      </defs>

      {/* ---- Outside: sky, sun/moon, clouds, city ---- */}
      <g clipPath={`url(#${id}-glass)`}>
        <rect x="0" y="0" width="1600" height="600" fill={`url(#${id}-sky)`} />
        {look.time === 'night' ? (
          <>
            {Array.from({ length: 40 }, (_, i) => {
              const r = hashString(`${company.id}-star-${i}`);
              return <circle key={i} className={i % 5 === 0 ? 'ui-br-twinkle' : undefined} cx={r % 1600} cy={80 + ((r >>> 11) % 220)} r={((r >>> 20) % 3) * 0.5 + 0.8} fill="#fff" opacity="0.7" />;
            })}
            <circle cx={look.presenterSide === 'right' ? 420 : 1180} cy="200" r="26" fill={sky.sun} opacity="0.9" />
          </>
        ) : (
          <circle cx={look.presenterSide === 'right' ? 460 : 1140} cy={look.time === 'golden' ? 430 : 470} r="160" fill={`url(#${id}-sun)`} />
        )}
        <g className="ui-br-clouds" opacity={look.time === 'night' ? 0.25 : 0.55}>
          {[0, 1, 2, 3].map((i) => {
            const r = hashString(`${company.id}-cloud-${i}`);
            return <ellipse key={i} cx={(r % 1500) + 50} cy={120 + ((r >>> 9) % 150)} rx={140 + ((r >>> 3) % 120)} ry={14 + ((r >>> 14) % 12)} fill={sky.haze} />;
          })}
        </g>

        {/* Unrest: smoky orange glow over part of the city */}
        {unrest > 0 && (
          <g opacity={0.3 + 0.5 * unrest}>
            <ellipse cx="1050" cy={GROUND - 40} rx="260" ry="90" fill="#d55e00" opacity="0.5" />
            <ellipse className="ui-br-smoke" cx="1000" cy={GROUND - 200} rx="40" ry="120" fill="#2b2b2b" opacity="0.45" />
          </g>
        )}

        <g fill={sky.city} opacity="0.55">
          {far.map((bl, i) => <rect key={i} x={bl.x} y={GROUND - bl.h} width={bl.w} height={bl.h} />)}
        </g>
        <g fill={sky.city}>
          {landmarks.map((s, i) => s.kind === 'rect'
            ? <rect key={i} x={s.x} y={GROUND - s.h} width={s.w} height={s.h} />
            : <path key={i} d={s.d} fillRule="evenodd" />)}
        </g>
        <g fill={sky.city} style={blackout > 0.5 ? { filter: 'brightness(0.6)' } : undefined}>
          {near.map((bl, i) => <rect key={i} x={bl.x} y={GROUND - bl.h * 0.6} width={bl.w} height={bl.h * 0.6} />)}
        </g>
        <g>
          {lit.filter((w) => w.y > GROUND - 160).map((w, i) => (
            <rect key={i} className={w.flicker >= 0 && blackout < 0.5 ? `ui-br-flicker ui-br-f${w.flicker}` : undefined}
              x={w.x} y={w.y} width="5" height="7" fill={sky.lit} opacity="0.85" />
          ))}
        </g>
        {/* Blackout: the city outside goes dark */}
        {blackout > 0 && <rect x="0" y="0" width="1600" height="600" fill="#05070d" opacity={0.15 + 0.45 * blackout} />}

        {/* Reflections on the glass */}
        <polygon points="120,70 260,70 60,560 -80,560" fill={`url(#${id}-glare)`} className="ui-br-glare" />
        <polygon points="900,70 980,70 820,560 740,560" fill={`url(#${id}-glare)`} className="ui-br-glare" style={{ animationDelay: '-4s' }} />
        <rect className="ui-br-sweep" x="-300" y="70" width="220" height="490" fill={`url(#${id}-glare)`} />
      </g>

      {/* ---- Window frame ---- */}
      <rect x="0" y="0" width="1600" height="72" fill={pal.wall} />
      <g fill={pal.wall}>
        {mullions.map((x) => <rect key={x} x={x - 7} y="70" width="14" height="490" />)}
        <rect x="0" y="548" width="1600" height="14" />
      </g>

      {/* ---- Ceiling light strips ---- */}
      <g filter={`url(#${id}-glow)`}>
        {[220, 600, 1000, 1380].map((x, i) => (
          <rect key={x} className="ui-br-strip" style={{ animationDelay: `${-i * 1.3}s` }} x={x - 110} y="26" width="220" height="7" rx="3.5" fill={pal.strip} />
        ))}
        <rect x="0" y="66" width="1600" height="3" fill={accent} opacity="0.85" />
      </g>

      {/* ---- Company sign on the glass ---- */}
      <g className="ui-br-sign" transform="translate(800 78)" filter={`url(#${id}-glow)`} data-sign={look.signStyle}>
        {look.signStyle === 'panel' && <rect x="-170" y="-8" width="340" height="96" rx="14" fill="#000" opacity="0.5" />}
        {look.signStyle === 'neon' && <rect x="-170" y="-8" width="340" height="96" rx="48" fill="#000" opacity="0.35" stroke={accent} strokeWidth="4" />}
        {look.signStyle === 'etched' && <rect x="-170" y="-8" width="340" height="96" rx="4" fill="#fff" opacity="0.08" stroke="#fff" strokeOpacity="0.35" />}
        <g transform="translate(-155 2) scale(1.2)"><CompanyLogo company={company} size={64} /></g>
        <text x="-70" y="54" fontSize="34" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif"
          textLength={company.name.length > 12 ? 225 : undefined} lengthAdjust="spacingAndGlyphs">{company.name}</text>
      </g>

      {/* ---- Floor ---- */}
      <rect x="0" y="562" width="1600" height="338" fill={`url(#${id}-floor)`} />
      <ellipse cx="800" cy="575" rx="700" ry="18" fill={sky.low} opacity="0.12" />

      {/* ---- Presenter screen ---- */}
      <g transform={`translate(${screenX} 450)`}>
        <rect x="56" y="150" width="8" height="120" fill={pal.tableEdge} />
        <rect x="0" y="0" width="120" height="150" rx="6" fill="#0b0d12" stroke={accent} strokeWidth="3" />
        <rect x="6" y="6" width="108" height="138" rx="4" fill={accent} opacity="0.18" />
        <g transform="translate(28 20)"><CompanyLogo company={company} size={64} /></g>
        <rect x="18" y="100" width="84" height="6" rx="3" fill="#fff" opacity="0.6" />
        <rect x="18" y="114" width="60" height="6" rx="3" fill="#fff" opacity="0.4" />
      </g>

      {/* ---- People behind/along the table ---- */}
      {seated.map((s, i) => (
        <Seated key={i} x={s.x} y={s.y} s={s.s} color={pal.chair} rim={sky.low} delay={i * 0.7} />
      ))}
      <Presenter x={presenterX} y={750} s={1.25} color={pal.chair} rim={sky.low} facing={look.presenterSide === 'right' ? -1 : 1} />

      {/* ---- Table ---- */}
      <g fill={pal.table} stroke={pal.tableEdge} strokeWidth="10">{tableTop}</g>
      <g fill={`url(#${id}-tablesheen)`} opacity="0.8">{tableTop}</g>
      {/* Logo mark on the table */}
      <g transform="translate(776 690) scale(0.75)" opacity="0.9"><CompanyLogo company={company} size={64} /></g>
    </svg>
  );
}
