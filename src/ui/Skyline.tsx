import type { CityEffect, CityEffectKind } from '../contracts';

/** Short labels for the city effects, used in the caption under the HQ skyline. */
export const CITY_EFFECT_LABEL: Record<CityEffectKind, string> = {
  blackout: 'Blackouts',
  ghostOffices: 'Empty offices',
  deepfakeProtests: 'Deepfake protests',
  gridlock: 'Gridlock',
  bankRun: 'Bank run',
  warBuildup: 'Military build-up',
  outbreak: 'Outbreak',
  embargo: 'Embargo',
  surveillance: 'Surveillance',
  solarBoom: 'Solar boom',
  flooding: 'Flooding',
  unrest: 'Unrest',
};

/** Sky tint per effect (colour-blind-safe Okabe-Ito hues where possible). */
const SKY_TINT: Partial<Record<CityEffectKind, string>> = {
  blackout: '#1b1f2a',
  warBuildup: '#d55e00',
  outbreak: '#009e73',
  embargo: '#7a6a4f',
  surveillance: '#56b4e9',
  solarBoom: '#f0e442',
  bankRun: '#cc79a7',
  unrest: '#d55e00',
  deepfakeProtests: '#cc79a7',
};

interface Building { x: number; w: number; h: number }

/** Fixed pseudo-random sequence so the skyline looks the same every render (no Math.random). */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function layer(seed: number, minH: number, maxH: number, minW: number, maxW: number): Building[] {
  const out: Building[] = [];
  let x = -5;
  let i = 0;
  while (x < 400) {
    const w = minW + hash(seed + i * 3) * (maxW - minW);
    const h = minH + hash(seed + i * 3 + 1) * (maxH - minH);
    out.push({ x, w, h });
    x += w + hash(seed + i * 3 + 2) * 4;
    i++;
  }
  return out;
}

const FAR = layer(1, 25, 55, 14, 26);
const MID = layer(50, 30, 70, 16, 30);
const NEAR = layer(100, 18, 45, 20, 36);

function windows(b: Building, seed: number, litShare: number) {
  const out: { x: number; y: number; on: boolean }[] = [];
  const cols = Math.max(1, Math.floor((b.w - 4) / 5));
  const rows = Math.max(1, Math.floor((b.h - 6) / 6));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = seed + r * 31 + c * 7;
      out.push({ x: b.x + 3 + c * 5, y: 100 - b.h + 4 + r * 6, on: hash(k) < litShare });
    }
  }
  return out;
}

export interface SkylineProps {
  /** Effects active in this city (already filtered to the city). */
  effects: CityEffect[];
}

/**
 * Layered HQ skyline (docs/plan.md 10.3/10.4). Decorative; the active effects are also listed in
 * text by the caller. Each of the 12 CityEffectKinds changes the picture, scaled by its intensity.
 */
export function Skyline({ effects }: SkylineProps) {
  const of = (k: CityEffectKind) => {
    const e = effects.find((x) => x.kind === k);
    const v = Number(e?.intensity);
    return e ? (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5) : 0;
  };
  const blackout = of('blackout');
  const ghost = of('ghostOffices');
  const litShare = Math.max(0.03, 0.55 * (1 - blackout) * (1 - 0.8 * ghost));

  const tints = effects
    .map((e) => ({ color: SKY_TINT[e.kind], i: of(e.kind) }))
    .filter((t): t is { color: string; i: number } => !!t.color);
  const flood = of('flooding');
  const grid = of('gridlock');
  const crowd = Math.max(of('deepfakeProtests'), of('unrest'));
  const solar = of('solarBoom');
  const spy = of('surveillance');
  const war = of('warBuildup');
  const outbreak = of('outbreak');
  const embargo = of('embargo');
  const bankRun = of('bankRun');

  return (
    <svg className="ui-skyline" viewBox="0 0 400 112" preserveAspectRatio="xMidYMax slice" aria-hidden="true"
      data-effects={effects.map((e) => e.kind).join(' ')}>
      <defs>
        <linearGradient id="ui-sky-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
        {/* Tints fade in from the top so there is no hard edge where the SVG starts. */}
        <linearGradient id="ui-tint-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="ui-tint-mask"><rect x="0" y="0" width="400" height="140" fill="url(#ui-tint-fade)" /></mask>
      </defs>

      {/* Sky: base glow plus one tint per effect */}
      <rect x="0" y="0" width="400" height="100" fill="url(#ui-sky-fade)" />
      <g mask="url(#ui-tint-mask)">
        {tints.map((t, i) => (
          <rect key={i} x="0" y="0" width="400" height="140" fill={t.color} opacity={0.15 + 0.3 * t.i} />
        ))}
      </g>

      {/* Sun, brighter with the solar boom; hidden in a blackout */}
      {blackout < 0.5 && (
        <circle cx="330" cy="28" r={9 + 6 * solar} fill={solar ? '#f0e442' : 'currentColor'} opacity={0.25 + 0.5 * solar} />
      )}

      {/* Military build-up: searchlight beams */}
      {war > 0 && [70, 250].map((x) => (
        <polygon key={x} points={`${x},100 ${x - 30},0 ${x - 18},0`} fill="#fff" opacity={0.08 + 0.15 * war} />
      ))}

      {/* Far layer */}
      <g opacity="0.12" fill="currentColor">
        {FAR.map((b, i) => <rect key={i} x={b.x} y={100 - b.h} width={b.w} height={b.h} />)}
      </g>

      {/* Mid layer, then its windows (kept brighter than the walls) */}
      <g opacity="0.25" fill="currentColor">
        {MID.map((b, i) => <rect key={i} x={b.x} y={100 - b.h} width={b.w} height={b.h} />)}
      </g>
      <g>
        {MID.map((b, i) => windows(b, i * 101, litShare).map((w, j) => (
          <rect key={`${i}-${j}`} x={w.x} y={w.y} width="2.4" height="3" fill={w.on ? '#ffe9a8' : '#000'} opacity={w.on ? 0.8 : 0.12} />
        )))}
      </g>

      {/* Solar panels on mid-layer roofs */}
      {solar > 0 && MID.filter((_, i) => hash(i + 500) < 0.3 + 0.6 * solar).map((b, i) => (
        <rect key={i} x={b.x + 2} y={100 - b.h - 2} width={b.w - 4} height="2" fill="#0072b2" />
      ))}

      {/* Near layer, darkest */}
      <g fill="currentColor" opacity="0.35">
        {NEAR.map((b, i) => <rect key={i} x={b.x} y={100 - b.h} width={b.w} height={b.h} />)}
      </g>

      {/* Street */}
      <rect x="0" y="100" width="400" height="40" fill="currentColor" opacity="0.15" />

      {/* Outbreak: closed signs on the near layer */}
      {outbreak > 0 && NEAR.filter((_, i) => i % 3 === 0).map((b, i) => (
        <rect key={i} x={b.x + b.w / 2 - 3} y={100 - b.h + 5} width="6" height="6" fill="#009e73" opacity={0.5 + 0.5 * outbreak} />
      ))}

      {/* Embargo: shipping containers stacked at the docks */}
      {embargo > 0 && Array.from({ length: Math.round(3 + 6 * embargo) }, (_, i) => (
        <rect key={i} x={8 + (i % 5) * 9} y={103.5 - Math.floor(i / 5) * 5} width="8" height="4.5" fill={['#e69f00', '#d55e00', '#0072b2'][i % 3]} />
      ))}

      {/* Surveillance drones */}
      {spy > 0 && Array.from({ length: Math.round(2 + 6 * spy) }, (_, i) => (
        <g key={i} className="ui-drone" transform={`translate(${30 + hash(i + 900) * 340} ${10 + hash(i + 950) * 25})`}>
          <rect x="-4" y="-0.8" width="8" height="1.6" fill="currentColor" opacity="0.8" />
          <circle r="1.2" fill="#d55e00" />
          <polygon points="0,1 -5,14 5,14" fill="#d55e00" opacity="0.12" />
        </g>
      ))}

      {/* Bank run: a queue outside the bank */}
      {bankRun > 0 && Array.from({ length: Math.round(4 + 10 * bankRun) }, (_, i) => (
        <rect key={i} x={380 - i * 3} y="101" width="2" height="6" rx="1" fill="currentColor" opacity="0.8" />
      ))}

      {/* Protests / unrest: crowd with signs */}
      {crowd > 0 && Array.from({ length: Math.round(6 + 18 * crowd) }, (_, i) => {
        const x = 120 + i * 4 + hash(i + 300) * 2;
        return (
          <g key={i} fill="currentColor" opacity="0.85">
            <rect x={x} y="101" width="2.2" height="7" rx="1.1" />
            {i % 3 === 0 && <rect x={x - 2} y="95" width="6.5" height="4" fill="#cc79a7" />}
          </g>
        );
      })}

      {/* Gridlock: a line of red tail lights */}
      {grid > 0 && Array.from({ length: Math.round(10 + 30 * grid) }, (_, i) => (
        <circle key={i} cx={5 + i * (390 / (10 + 30 * grid))} cy="110" r="1.3" fill="#d55e00" />
      ))}

      {/* Flooding: water rising over the street */}
      {flood > 0 && (
        <rect className="ui-flood" x="0" y={104 - 14 * flood} width="400" height={40} fill="#0072b2" opacity="0.5" />
      )}
    </svg>
  );
}
