/**
 * Landmarks and settings for the 3D city view (task: "3D city looks like its real city").
 * Pure data, no three.js: a landmark is a list of simple primitives (boxes, cylinders, spheres, rings, lathes) that
 * Landmarks3D.tsx bakes into a few merged meshes per landmark, so a whole city adds ~10 draw calls.
 * Shapes are low-poly silhouettes, scaled up so they read from the default camera (1 unit = 2.5 m, the generic
 * downtown towers are 40-155 units). Local space: origin at the base centre, y up, the landmark faces +z.
 * Deterministic: nothing here uses randomness.
 */
import { visualRng } from '../util';

export type V3 = [number, number, number];
export type Quat = [number, number, number, number];
interface Base { c: string; glow?: boolean }
export type Prim =
  | (Base & { t: 'box'; p: V3; s: V3; q?: Quat; ry?: number })
  | (Base & { t: 'cyl'; p: V3; rb: number; rt: number; h: number; seg: number; ry?: number })
  | (Base & { t: 'sphere'; p: V3; r: number; sy?: number })
  | (Base & { t: 'torus'; p: V3; R: number; tube: number; ry?: number }) // ring in the XY plane
  | (Base & { t: 'lathe'; p: V3; pts: [number, number][]; seg: number }); // pts = [radius, y], bottom to top

type Opts = { glow?: boolean; ry?: number };

// ------------------------------------------------------------------ primitive helpers (y0 = base height)
const box = (x: number, y0: number, z: number, w: number, h: number, d: number, c: string, o: Opts = {}): Prim =>
  ({ t: 'box', p: [x, y0 + h / 2, z], s: [w, h, d], c, ...o });
const cyl = (x: number, y0: number, z: number, rb: number, rt: number, h: number, c: string, seg = 14, o: Opts = {}): Prim =>
  ({ t: 'cyl', p: [x, y0 + h / 2, z], rb, rt, h, seg, c, ...o });
/** Square pyramid / tapered square tower: `hw` = half width of the base, `tw` = half width of the top. */
const pyr = (x: number, y0: number, z: number, hw: number, h: number, c: string, tw = 0, o: Opts = {}): Prim =>
  cyl(x, y0, z, hw * Math.SQRT2, tw * Math.SQRT2, h, c, 4, { ry: Math.PI / 4, ...o });
const ball = (x: number, y: number, z: number, r: number, c: string, sy = 1, o: Opts = {}): Prim => ({ t: 'sphere', p: [x, y, z], r, sy, c, ...o });
const ring = (x: number, y: number, z: number, R: number, tube: number, c: string, o: Opts = {}): Prim => ({ t: 'torus', p: [x, y, z], R, tube, c, ...o });
const lathe = (x: number, y0: number, z: number, pts: [number, number][], c: string, seg = 16, o: Opts = {}): Prim => ({ t: 'lathe', p: [x, y0, z], pts, seg, c, ...o });

/** A square-section beam from a to b (cables, lattice legs, spokes). */
export function beam(a: V3, b: V3, t: number, c: string, o: Opts = {}): Prim {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d) || 1e-6;
  const n: V3 = [d[0] / len, d[1] / len, d[2] / len];
  // rotate +Y onto n: axis = Y x n = (nz, 0, -nx)
  const ax = n[2];
  const az = -n[0];
  const sl = Math.hypot(ax, az);
  let q: Quat;
  if (sl < 1e-6) q = n[1] >= 0 ? [0, 0, 0, 1] : [1, 0, 0, 0];
  else {
    const ang = Math.acos(Math.max(-1, Math.min(1, n[1])));
    const s = Math.sin(ang / 2);
    q = [(ax / sl) * s, 0, (az / sl) * s, Math.cos(ang / 2)];
  }
  return { t: 'box', p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [t, len, t], q, c, ...o };
}

// ------------------------------------------------------------------ shared pieces
/** Suspension bridge along x (length 170): two towers, deck, main cables and suspenders. */
function suspension(towerColor: string, deckColor = '#8d8f92', cableColor = towerColor): Prim[] {
  const out: Prim[] = [box(0, 12, 0, 170, 2.4, 10, deckColor)];
  const TOP = 68;
  const cableY = (x: number) => (Math.abs(x) <= 48 ? 20 + (TOP - 20) * (x / 48) ** 2 : TOP - ((Math.abs(x) - 48) / 37) * (TOP - 14));
  for (const sx of [-48, 48]) {
    for (const sz of [-4.5, 4.5]) out.push(box(sx, 0, sz, 3.2, TOP + 2, 3.2, towerColor));
    for (const y of [24, 46, 66]) out.push(box(sx, y, 0, 3, 3, 12.5, towerColor));
  }
  for (const sz of [-4.5, 4.5]) {
    const xs = [-85, -72, -60, -48, ...Array.from({ length: 15 }, (_, i) => -42 + i * 6), 48, 60, 72, 85];
    for (let i = 0; i + 1 < xs.length; i++) out.push(beam([xs[i], cableY(xs[i]), sz], [xs[i + 1], cableY(xs[i + 1]), sz], 0.7, cableColor));
    for (const x of xs) if (Math.abs(x) < 47) out.push(beam([x, cableY(x), sz], [x, 14, sz], 0.3, cableColor));
  }
  return out;
}

/** Ferris wheel in the XY plane (faces +z). */
function wheel(R: number, hub: number, color: string, pods = 16): Prim[] {
  const out: Prim[] = [ring(0, hub, 0, R, 0.7, color), ring(0, hub, 0, R * 0.55, 0.3, color)];
  for (let i = 0; i < pods; i++) {
    const a = (i / pods) * Math.PI * 2;
    out.push(beam([0, hub, 0], [Math.cos(a) * R, hub + Math.sin(a) * R, 0], 0.3, color));
    out.push(box(Math.cos(a) * (R + 1.6), hub + Math.sin(a) * (R + 1.6) - 1.4, 0, 2.6, 2.8, 2.6, '#f7f3ea', { glow: true }));
  }
  out.push(beam([-hub * 0.5, 0, 4], [0, hub, 1], 1.6, color), beam([hub * 0.5, 0, 4], [0, hub, 1], 1.6, color));
  out.push(beam([-hub * 0.5, 0, -4], [0, hub, -1], 1.6, color), beam([hub * 0.5, 0, -4], [0, hub, -1], 1.6, color));
  return out;
}

/** Cable-stayed bridge along x: one pylon (or an X-shaped one) and a fan of stays. */
function cableStayed(pylon: 'single' | 'x', pylonColor: string, stayColor: string, deckColor = '#8d8f92'): Prim[] {
  const out: Prim[] = [box(0, 8, 0, 150, 2, 9, deckColor)];
  const H = pylon === 'x' ? 72 : 78;
  if (pylon === 'x') {
    out.push(beam([-9, 0, 0], [9, H, 0], 3.4, pylonColor), beam([9, 0, 0], [-9, H, 0], 3.4, pylonColor), box(0, 40, 0, 3.4, 2, 4, pylonColor));
    out.push(beam([-9, 0, 0], [-9, 8, 0], 3.4, pylonColor), beam([9, 0, 0], [9, 8, 0], 3.4, pylonColor));
  } else {
    out.push(beam([0, 0, 0], [0, H, 0], 4, pylonColor), beam([-1.5, H - 6, 0], [1.5, H + 8, 0], 2.2, pylonColor));
  }
  for (let i = 0; i < 7; i++) {
    const top: V3 = [0, H - 4 - i * 4.5, 0];
    const d = 10 + i * 9.5;
    for (const sx of [-1, 1]) for (const sz of [-3.6, 3.6]) out.push(beam([sx * 1.5, top[1], sz * 0.4], [sx * d, 9, sz], 0.35, stayColor));
  }
  return out;
}

const towerCluster = (seed: string, n: number, hmin: number, hmax: number, glass: string, spread = 17): Prim[] => {
  const r = visualRng(`landmark:${seed}`);
  const out: Prim[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.5;
    const d = i === 0 ? 0 : spread * (0.55 + r() * 0.45);
    const w = 7 + r() * 4;
    const h = hmin + r() * (hmax - hmin);
    out.push(box(Math.cos(a) * d, 0, Math.sin(a) * d, w, h, w * (0.8 + r() * 0.4), glass));
    if (r() < 0.6) out.push(box(Math.cos(a) * d, h, Math.sin(a) * d, w * 0.6, h * 0.12, w * 0.6, glass));
  }
  return out;
};

/** Stone arch bridge along x with `n` arches. */
function archBridge(n: number, stone: string, span = 100): Prim[] {
  const out: Prim[] = [box(0, 9, 0, span, 2.2, 9, stone), box(0, 11.2, -4.4, span, 1.2, 0.8, stone), box(0, 11.2, 4.4, span, 1.2, 0.8, stone)];
  const seg = span / n;
  for (let i = 0; i < n; i++) {
    const x = -span / 2 + seg * (i + 0.5);
    out.push(ring(x, 8 - seg * 0.4, 0, seg * 0.4, 1.4, stone)); // crown just under the deck, the rest below the water
    out.push(box(x - seg / 2, 0, 0, 2.4, 9, 8, stone));
  }
  out.push(box(span / 2, 0, 0, 2.4, 9, 8, stone));
  return out;
}

const GOLD = '#d4af37';
const COPPER = '#6fae8b';
const WARM = '#ffd9a0';

// ------------------------------------------------------------------ the landmarks
export const LANDMARK_KINDS = [
  'goldenGate', 'transamerica', 'empireState', 'oneWorldTrade', 'statueOfLiberty',
  'londonEye', 'shard', 'bigBen', 'towerBridge', 'tokyoTower', 'skytree', 'rainbowBridge',
  'burjKhalifa', 'burjAlArab', 'eiffelTower', 'invalides', 'pontArches',
  'cctv', 'chinaZun', 'palaceHall', 'stBasils', 'spasskaya', 'ostankino', 'moscowCity',
  'frauenkirche', 'olympicTower', 'fourCylinders', 'marinaBay', 'supertrees', 'flyer',
  'vidhanaSoudha', 'techPark', 'cairoTower', 'giza', 'mosque', 'stayedBridge', 'ekoTowers', 'longBridge',
  'torreLatino', 'angel', 'xBridge', 'masp', 'denseTowers', 'spaceNeedle', 'capitol', 'moonlightTower',
  'cityHall', 'gamlaStan', 'leifeng', 'stoneBridge',
] as const;
export type LandmarkKind = (typeof LANDMARK_KINDS)[number];

const BUILDERS: Record<LandmarkKind, () => Prim[]> = {
  // ---- United States
  goldenGate: () => suspension('#c8402a'),
  transamerica: () => [
    box(0, 0, 0, 20, 5, 20, '#d9d4c8'),
    pyr(0, 5, 0, 8.5, 100, '#ece8e0', 1),
    box(-9.5, 25, 0, 3, 34, 7, '#e4dfd4'), box(9.5, 25, 0, 3, 34, 7, '#e4dfd4'),
    cyl(0, 105, 0, 0.8, 0.2, 22, '#c9c9cc', 6),
    ball(0, 105, 0, 1.2, WARM, 1, { glow: true }),
  ],
  empireState: () => [
    box(0, 0, 0, 24, 22, 24, '#d3cbbb'), box(0, 22, 0, 19, 30, 19, '#cfc7b8'), box(0, 52, 0, 15, 26, 15, '#cfc7b8'),
    box(0, 78, 0, 10.5, 40, 10.5, '#d6cebd'), box(0, 118, 0, 7, 14, 7, '#dcd4c3'),
    cyl(0, 132, 0, 2.6, 0.6, 18, '#cfc7b8', 8), cyl(0, 150, 0, 0.35, 0.2, 26, '#9a9a9c', 6),
    box(0, 122, 0, 7.6, 3, 7.6, WARM, { glow: true }), box(0, 74, 0, 11, 2.2, 11, WARM, { glow: true }),
  ],
  oneWorldTrade: () => [
    box(0, 0, 0, 24, 8, 24, '#7f97a8'),
    pyr(0, 8, 0, 11.5, 70, '#8fb2c9', 10.5),
    cyl(0, 78, 0, 14.5, 13, 70, '#9ec0d6', 8, { ry: Math.PI / 8 }),
    cyl(0, 148, 0, 12.5, 1.4, 56, '#a8c8dc', 8, { ry: Math.PI / 8 }),
    cyl(0, 204, 0, 0.8, 0.25, 40, '#d8d8dc', 6), ball(0, 244, 0, 1.4, '#fff1d0', 1, { glow: true }),
  ],
  statueOfLiberty: () => [
    box(0, 0, 0, 14, 4, 14, '#9d958a'), pyr(0, 4, 0, 5.5, 12, '#b5ad9f', 4), box(0, 16, 0, 7, 8, 7, '#b5ad9f'),
    cyl(0, 24, 0, 3.2, 1.4, 14, '#6fa98d', 10), ball(0, 40, 0, 1.6, '#6fa98d'),
    beam([1, 36, 0], [3.2, 50, 0], 1.0, '#6fa98d'), ball(3.2, 51.5, 0, 1.0, WARM, 1, { glow: true }),
    ...[-2, -1, 0, 1, 2].map((i) => beam([0, 41, 0], [i * 1.6, 44.6, 0], 0.5, '#6fa98d')),
  ],
  // ---- United Kingdom
  londonEye: () => wheel(27, 31, '#f4f4f2'),
  shard: () => [
    pyr(0, 0, 0, 12, 100, '#b4d7e6', 1.5),
    pyr(2, 60, -1, 5, 50, '#cfe8f1', 0.4),
    cyl(0, 98, 0, 0.8, 0.2, 26, '#cfe8f1', 6),
    ...[18, 36, 54, 72, 88].map((y) => box(0, y, 0, (24 - y * 0.2) * 0.55, 0.7, (24 - y * 0.2) * 0.55, '#f3fbff', { glow: true })),
  ],
  bigBen: () => [
    box(0, 0, 0, 8.6, 38, 8.6, '#c9a96a'), box(0, 38, 0, 9.4, 8, 9.4, '#b8975a'),
    ...[[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dz]) => ({ ...box(dx * 4.8, 40, dz * 4.8, dz ? 5 : 0.8, 5, dz ? 0.8 : 5, '#fff2c4', { glow: true }) })),
    pyr(0, 46, 0, 5.2, 14, '#5b6b6f', 0.6), cyl(0, 60, 0, 0.5, 0.15, 10, GOLD, 6),
    box(22, 0, 2, 44, 12, 12, '#c9b98e'), box(36, 12, 2, 6, 5, 8, '#a8996e'), pyr(12, 12, 2, 5, 9, '#5b6b6f', 0.5),
  ],
  towerBridge: () => {
    const blue = '#5a8fb5';
    const out: Prim[] = [box(0, 9, 0, 120, 2.4, 9, '#8d8f92'), box(0, 34, 0, 54, 2, 6, blue)];
    for (const sx of [-27, 27]) out.push(box(sx, 0, 0, 9, 46, 8, '#a5987f'), pyr(sx, 46, 0, 5.4, 10, '#4a5c63', 0.4), box(sx - 3.6, 46, 0, 1, 1, 1, '#4a5c63'));
    out.push(beam([-60, 12, 0], [-27, 40, 3], 0.7, blue), beam([60, 12, 0], [27, 40, 3], 0.7, blue), beam([-60, 12, 0], [-27, 40, -3], 0.7, blue), beam([60, 12, 0], [27, 40, -3], 0.7, blue));
    return out;
  },
  // ---- Japan
  tokyoTower: () => {
    const O = '#e8541c';
    const W = '#f4f1ec';
    const out: Prim[] = [];
    const leg = (a: number) => {
      const sx = Math.cos(a);
      const sz = Math.sin(a);
      out.push(beam([sx * 12, 0, sz * 12], [sx * 6.5, 24, sz * 6.5], 1.1, O), beam([sx * 6.5, 24, sz * 6.5], [sx * 3.2, 50, sz * 3.2], 0.9, W), beam([sx * 3.2, 50, sz * 3.2], [sx * 0.8, 84, sz * 0.8], 0.7, O));
    };
    for (let i = 0; i < 4; i++) leg(Math.PI / 4 + (i * Math.PI) / 2);
    out.push(box(0, 22, 0, 13, 2.4, 13, W), box(0, 23.4, 0, 9, 3, 9, '#cfc9bd'), box(0, 48, 0, 7, 2.2, 7, W), box(0, 49, 0, 5, 2.5, 5, '#cfc9bd'));
    for (const y of [8, 15, 34]) {
      const r = 12 - (y / 84) * 10;
      out.push(beam([r, y, r], [-r, y, r], 0.4, O), beam([r, y, -r], [-r, y, -r], 0.4, O), beam([r, y, r], [r, y, -r], 0.4, O), beam([-r, y, r], [-r, y, -r], 0.4, O));
    }
    out.push(cyl(0, 52, 0, 1.0, 0.25, 50, '#f4f1ec', 6), ball(0, 100, 0, 0.9, '#ff6a3a', 1, { glow: true }));
    return out;
  },
  skytree: () => [
    cyl(0, 0, 0, 7, 4.6, 40, '#cfd9e0', 3), cyl(0, 40, 0, 4.6, 3.2, 62, '#d5dde3', 10),
    cyl(0, 80, 0, 7.5, 7.5, 3.2, '#e6eef3', 14, { glow: true }), cyl(0, 100, 0, 6, 6, 2.6, '#e6eef3', 14, { glow: true }),
    cyl(0, 102, 0, 3.2, 0.3, 80, '#d5dde3', 8), ball(0, 148, 0, 0.9, '#b8e4ff', 1, { glow: true }),
  ],
  rainbowBridge: () => suspension('#f1f3f4', '#b9bcbf'),
  // ---- Gulf
  burjKhalifa: () => {
    const out: Prim[] = [];
    const tiers: [number, number, number][] = [[11, 8.6, 46], [8.6, 7, 38], [7, 5.6, 34], [5.6, 4.4, 30], [4.4, 3.3, 26], [3.3, 2.4, 22]];
    let y = 0;
    for (const [rb, rt, h] of tiers) { out.push(cyl(0, y, 0, rb, rt, h, '#b8c7d4', 6)); y += h; }
    out.push(cyl(0, y, 0, 1.1, 0.2, 50, '#d6dde3', 6), ball(0, y + 50, 0, 1, '#fff1d0', 1, { glow: true }));
    for (let i = 0; i < 3; i++) out.push(cyl(Math.cos((i * 2 * Math.PI) / 3) * 11, 0, Math.sin((i * 2 * Math.PI) / 3) * 11, 5, 3.4, 52, '#a9b9c7', 6));
    return out;
  },
  burjAlArab: () => [
    box(0, 0, 0, 6, 62, 22, '#f2f2f0'), box(0, 56, 0, 2.2, 14, 3, '#cdd3d8'),
    ...[10, 20, 30, 40, 50].map((y) => box(0, y, 0, 6.6, 0.6, 22.6, '#e9a96a', { glow: true })),
    beam([-2, 0, -11], [0, 70, 0], 1.2, '#f2f2f0'), box(0, 0, 4, 18, 3, 40, '#d9d3c4'),
  ],
  // ---- France
  eiffelTower: () => {
    const B = '#6b5645';
    const out: Prim[] = [];
    const corners: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (const [sx, sz] of corners) {
      out.push(beam([sx * 17, 0, sz * 17], [sx * 8.5, 24, sz * 8.5], 1.7, B), beam([sx * 8.5, 24, sz * 8.5], [sx * 4.6, 48, sz * 4.6], 1.3, B), beam([sx * 4.6, 48, sz * 4.6], [sx * 1.3, 96, sz * 1.3], 1, B));
    }
    out.push(box(0, 23, 0, 20, 2.4, 20, '#7a6552'), box(0, 47, 0, 11, 2, 11, '#7a6552'), box(0, 93, 0, 5, 3.4, 5, '#7a6552'));
    for (const y of [10, 36]) {
      const r = 17 - (y / 96) * 15.5;
      out.push(beam([r, y, r], [-r, y, r], 0.5, B), beam([r, y, -r], [-r, y, -r], 0.5, B), beam([r, y, r], [r, y, -r], 0.5, B), beam([-r, y, r], [-r, y, -r], 0.5, B));
    }
    out.push(beam([-12, 0, 17], [12, 0, 17], 1.4, B), beam([-12, 0, -17], [12, 0, -17], 1.4, B), cyl(0, 96, 0, 0.9, 0.15, 36, '#8b7763', 6), ball(0, 132, 0, 0.8, WARM, 1, { glow: true }));
    out.push(box(0, 23.6, 0, 20.4, 0.6, 20.4, WARM, { glow: true }));
    return out;
  },
  invalides: () => [
    box(0, 0, 0, 56, 14, 26, '#d8cdb6'), box(0, 14, 0, 18, 4, 18, '#d8cdb6'), cyl(0, 18, 0, 9.5, 9, 12, '#d8cdb6', 16),
    ball(0, 30, 0, 9.5, GOLD, 0.85), cyl(0, 37, 0, 1.6, 0.8, 7, GOLD, 8), cyl(0, 44, 0, 0.5, 0.15, 12, GOLD, 6),
  ],
  pontArches: () => archBridge(3, '#cbbfa8', 110),
  // ---- China
  cctv: () => [
    box(0, 0, 0, 44, 12, 18, '#6f7a86'),
    beam([-16, 0, -2], [-12, 62, 2], 15, '#7d8793'), beam([16, 0, 2], [12, 62, -2], 15, '#7d8793'),
    box(0, 58, 0, 48, 16, 17, '#8793a0'), box(-10, 74, 0, 28, 7, 15, '#7d8793'),
    box(0, 64, 8.6, 46, 1.2, 0.4, WARM, { glow: true }), box(-16, 20, 8.4, 0.8, 36, 0.4, WARM, { glow: true }),
  ],
  chinaZun: () => [
    lathe(0, 0, 0, [[7, 0], [8.4, 18], [9.6, 40], [10.4, 60], [9.2, 82], [7, 100], [6.2, 112], [8.2, 122], [11, 132], [12.4, 142], [12.4, 148], [7, 150], [0.1, 150]], '#9fb3c4', 16),
    cyl(0, 148, 0, 11, 11, 1.6, '#b9c9d6', 16, { glow: true }), cyl(0, 150, 0, 1, 0.2, 18, '#d8dde2', 6),
  ],
  palaceHall: () => [
    box(0, 0, 0, 68, 6, 34, '#d9cfb8'), box(0, 6, 0, 56, 14, 26, '#a8362b'),
    pyr(0, 20, 0, 32, 9, '#d4a02a', 22), pyr(0, 29, 0, 20, 6, '#d4a02a', 6), cyl(0, 35, 0, 1.4, 0.2, 5, GOLD, 6),
    ...[-24, -12, 0, 12, 24].map((x) => cyl(x, 6, 13.5, 0.9, 0.9, 14, '#8b2a22', 8)),
    box(0, 0, 22, 20, 1.5, 12, '#c9bfa6'),
  ],
  // ---- Russia
  stBasils: () => {
    const out: Prim[] = [box(0, 0, 0, 34, 10, 26, '#b9453a'), cyl(0, 10, 0, 5.6, 4.6, 32, '#c0493c', 12), cyl(0, 42, 0, 4.2, 3.4, 10, '#e9d9b0', 12), pyr(0, 52, 0, 3.6, 18, '#3f8f6a', 0.3)];
    const onion = (x: number, z: number, y0: number, r: number, h: number, c: string) => {
      out.push(cyl(x, y0, z, r * 0.7, r * 0.7, h, '#e7d8b8', 10));
      out.push(lathe(x, y0 + h, z, [[0.1, 0], [r * 0.7, 0.4], [r * 1.05, 2.2], [r * 0.95, 5], [r * 0.5, 8.5], [r * 0.12, 11.5]], c, 12));
    };
    [[-11, 0, '#2f7f68'], [11, 0, '#c04a3a'], [0, 9, '#3a68b0'], [0, -9, '#d4af37'], [-9, 8, '#c04a3a'], [9, 8, '#2f7f68']].forEach(([x, z, c], i) => onion(x as number, z as number, 10, 3.4, 9 + (i % 3) * 3, c as string));
    return out;
  },
  spasskaya: () => [
    box(0, 0, 0, 10, 42, 10, '#a93a2f'), box(0, 42, 0, 12, 4, 12, '#b9453a'), box(0, 46, 0, 8, 10, 8, '#e9d9b0', {}),
    pyr(0, 56, 0, 6, 20, '#2f7f68', 0.5), ball(0, 78, 0, 1.4, '#ff3b2a', 1, { glow: true }),
    box(-38, 0, 0, 66, 16, 4, '#a93a2f'), box(46, 0, 0, 62, 16, 4, '#a93a2f'),
    ...Array.from({ length: 12 }, (_, i) => box(-68 + i * 12, 16, 0, 2.4, 2.4, 4.6, '#a93a2f')),
  ],
  ostankino: () => [
    cyl(0, 0, 0, 10, 6, 36, '#d9d5cc', 12), cyl(0, 36, 0, 6, 3.6, 52, '#d9d5cc', 12),
    cyl(0, 62, 0, 6.5, 6.5, 7, '#cfcac0', 12, { glow: true }), cyl(0, 88, 0, 3.6, 1.2, 40, '#d9d5cc', 10), cyl(0, 128, 0, 0.8, 0.2, 30, '#e0e0e4', 6),
  ],
  moscowCity: () => towerCluster('moscow-city', 6, 90, 190, '#9bb4c8', 18),
  // ---- Germany
  frauenkirche: () => {
    const out: Prim[] = [box(0, 0, 0, 24, 26, 46, '#c8a784'), pyr(0, 26, 0, 12, 14, '#b9755a', 1, {})];
    for (const x of [-7.5, 7.5]) {
      out.push(box(x, 0, 20, 11, 40, 11, '#c8a784'), cyl(x, 40, 20, 5, 4.4, 3, '#c8a784', 8));
      out.push(lathe(x, 43, 20, [[0.1, 0], [5.4, 0.2], [6.6, 3], [6.2, 6.5], [3.6, 11], [1.2, 15], [0.2, 18]], COPPER, 14));
    }
    return out;
  },
  olympicTower: () => [
    cyl(0, 0, 0, 5, 3.4, 70, '#d8d6d0', 12), cyl(0, 70, 0, 3.4, 2.8, 14, '#d8d6d0', 12),
    cyl(0, 80, 0, 9, 7, 6, '#cfcdc6', 16, { glow: true }), cyl(0, 86, 0, 5, 3, 8, '#e6e4de', 12), cyl(0, 94, 0, 0.9, 0.2, 28, '#e6e4de', 6),
  ],
  fourCylinders: () => {
    const out: Prim[] = [];
    for (const [x, z] of [[-6.4, -6.4], [6.4, -6.4], [-6.4, 6.4], [6.4, 6.4]]) out.push(cyl(x, 0, z, 6.4, 6.4, 62, '#d2d4d8', 16));
    out.push(box(0, 28, 0, 14, 5, 14, '#b8bcc2'), box(0, 52, 0, 14, 4, 14, '#b8bcc2'), cyl(0, 62, 0, 3, 3, 1, WARM, 8, { glow: true }));
    out.push(cyl(24, 0, 2, 16, 16, 4, '#9a9ea6', 20), cyl(24, 4, 2, 12, 12, 1.2, '#a8acb4', 20));
    return out;
  },
  // ---- Southeast Asia
  marinaBay: () => {
    const out: Prim[] = [];
    for (const [i, x] of [-23, 0, 23].entries()) {
      out.push(beam([x - 4, 0, 0], [x + (i === 1 ? 0 : i === 0 ? 3 : -3), 66, 0], 17, '#b7c3cc'));
      out.push(box(x, 0, 0, 20, 3, 22, '#9aa6af'));
    }
    out.push(box(0, 66, 0, 86, 4, 17, '#d8d4c8'), box(-46, 66, 0, 8, 3, 12, '#d8d4c8'), box(50, 66, 0, 12, 3, 10, '#d8d4c8'));
    out.push(box(0, 62, 0, 74, 3, 14, '#4a90b8', { glow: true }), box(10, 70, 0, 50, 0.8, 6, '#3f8fb0'), box(-8, 70.6, 3, 30, 0.6, 3, '#9fd2e0'));
    return out;
  },
  supertrees: () => {
    const out: Prim[] = [];
    [[-14, 0, 38], [0, -10, 46], [13, 4, 32], [-4, 14, 26], [20, -12, 22]].forEach(([x, z, h], i) => {
      out.push(cyl(x, 0, z, 1.6, 0.9, h, '#6a5a4a', 8));
      out.push(lathe(x, h, z, [[0.1, 1], [8 + (i % 3) * 2, 3.2], [9 + (i % 3) * 2, 4.2], [5, 5], [0.1, 5.4]], i % 2 ? '#c04aa8' : '#7a5ac8', 14, { glow: true }));
      out.push(cyl(x, h - 5, z, 4, 1.4, 5, '#4f7f4a', 8));
    });
    return out;
  },
  flyer: () => wheel(24, 28, '#c7ccd2', 20),
  // ---- India
  vidhanaSoudha: () => {
    const out: Prim[] = [box(0, 0, 0, 78, 17, 34, '#b8a08a'), box(0, 17, 0, 78, 2, 36, '#a68d78'), box(0, 0, 18, 26, 3, 8, '#cbb8a4'), box(0, 17, 17, 26, 5, 6, '#b8a08a')];
    for (let i = 0; i < 9; i++) out.push(cyl(-12 + i * 3, 3, 21, 0.9, 0.9, 14, '#d0bda8', 8));
    out.push(cyl(0, 19, 0, 10, 9, 8, '#b8a08a', 16), ball(0, 28, 0, 9.4, '#9a8470', 0.7), cyl(0, 34, 0, 1.2, 0.5, 8, GOLD, 8), cyl(0, 41, 0, 0.3, 0.1, 6, GOLD, 6));
    for (const [x, z] of [[-34, -13], [34, -13], [-34, 13], [34, 13]]) out.push(box(x, 19, z, 8, 7, 8, '#b8a08a'), ball(x, 26, z, 4, '#9a8470', 0.7));
    return out;
  },
  techPark: () => towerCluster('tech-park', 5, 55, 105, '#8fb6c4', 15),
  // ---- Egypt
  cairoTower: () => [
    box(0, 0, 0, 16, 6, 16, '#bfae8e'),
    lathe(0, 6, 0, [[6.4, 0], [5, 20], [3.6, 46], [3.4, 70], [4.4, 82], [8.2, 92], [8.6, 98], [5.4, 100], [0.1, 100]], '#d9cdb4', 8),
    cyl(0, 98, 0, 3.8, 3.8, 9, '#a9c4cc', 12, { glow: true }), cyl(0, 107, 0, 4.4, 1.2, 2.4, '#c9bfa6', 12), cyl(0, 109, 0, 0.8, 0.2, 14, '#c9bfa6', 6),
  ],
  giza: () => [
    pyr(-34, 0, 0, 32, 40, '#d9b97a', 0.6), pyr(10, 0, 18, 27, 34, '#d3b373', 0.6), pyr(46, 0, 34, 14, 18, '#cfae6e', 0.4),
    box(18, 0, -34, 18, 6, 8, '#c9a968'),
  ],
  mosque: () => {
    const out: Prim[] = [box(0, 0, 0, 34, 10, 30, '#e0d6bd'), cyl(0, 10, 0, 9, 9.4, 5, '#e0d6bd', 14), ball(0, 15, 0, 9.4, '#9db8b0', 0.85), cyl(0, 22, 0, 0.8, 0.2, 7, GOLD, 6)];
    for (const x of [-18, 18, 0]) out.push(ball(x === 0 ? 0 : x * 0.7, 13, x === 0 ? 11 : 9, x === 0 ? 4 : 5.2, '#9db8b0', 0.8));
    for (const x of [-20, 20]) {
      out.push(cyl(x, 0, -10, 1.8, 1.4, 34, '#e0d6bd', 10), cyl(x, 20, -10, 2.8, 2.8, 1.2, '#cfc3a6', 10), cyl(x, 34, -10, 2.2, 2.2, 1.2, '#cfc3a6', 10), pyr(x, 35.2, -10, 1.6, 9, '#9db8b0', 0.2), cyl(x, 44, -10, 0.2, 0.05, 6, GOLD, 4));
    }
    return out;
  },
  // ---- Nigeria / Brazil bridges
  stayedBridge: () => cableStayed('single', '#e9e4da', '#d7d2c8'),
  ekoTowers: () => towerCluster('eko', 5, 70, 150, '#a9c9d6', 16),
  longBridge: () => {
    const out: Prim[] = [box(0, 10, 0, 130, 2.4, 11, '#9a9a9a'), box(0, 12.4, -5.4, 130, 1.2, 0.5, '#bdbdbd'), box(0, 12.4, 5.4, 130, 1.2, 0.5, '#bdbdbd')];
    for (let x = -60; x <= 60; x += 15) out.push(box(x, 0, 0, 2.6, 10, 6, '#8a8a8a'));
    return out;
  },
  // ---- Mexico
  torreLatino: () => [
    box(0, 0, 0, 20, 30, 20, '#bfc6c4'), box(0, 30, 0, 15, 36, 15, '#c8cecc'), box(0, 66, 0, 11, 8, 11, '#a9b1af'), box(0, 74, 0, 7, 8, 7, '#c8cecc'),
    cyl(0, 82, 0, 1.6, 0.3, 36, '#d8d8dc', 8), box(0, 28, 0, 20.6, 1.2, 20.6, WARM, { glow: true }), ball(0, 118, 0, 1, '#ff5a3a', 1, { glow: true }),
  ],
  angel: () => [
    box(0, 0, 0, 14, 3, 14, '#d8d2c4'), box(0, 3, 0, 9, 4, 9, '#cfc8b8'), cyl(0, 7, 0, 2.6, 2.2, 36, '#e2dccd', 10),
    cyl(0, 43, 0, 3.4, 3.4, 1.2, '#cfc8b8', 10), cyl(0, 44, 0, 1.2, 0.6, 5, GOLD, 8),
    beam([0, 49, 0], [-6, 54, 0], 1, GOLD), beam([0, 49, 0], [6, 54, 0], 1, GOLD), ball(0, 49, 0, 1.4, GOLD),
  ],
  xBridge: () => cableStayed('x', '#e4e0d6', '#d8d2c6', '#7f8084'),
  masp: () => [
    box(0, 17, 0, 46, 7, 12, '#c8382c'), box(-17, 0, 0, 3.4, 18, 12, '#c8382c'), box(17, 0, 0, 3.4, 18, 12, '#c8382c'),
    box(0, 0, 0, 40, 0.8, 22, '#d8d2c4'), box(0, 17.5, 6.2, 40, 4, 0.4, '#b3d4e6', { glow: true }),
  ],
  denseTowers: () => towerCluster('dense', 6, 70, 150, '#b4a99a', 17),
  // ---- Pacific Northwest / Texas / Nordics / Zhejiang
  spaceNeedle: () => {
    const out: Prim[] = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const at = (r: number, y: number): V3 => [Math.cos(a) * r, y, Math.sin(a) * r];
      out.push(beam(at(12, 0), at(2.6, 36), 1.2, '#f3f1ec'), beam(at(2.6, 36), at(4.6, 66), 1.1, '#f3f1ec'));
    }
    out.push(cyl(0, 36, 0, 2.2, 2.2, 32, '#e9e6df', 8), cyl(0, 66, 0, 4, 12.4, 2.6, '#f3f1ec', 18), cyl(0, 68.6, 0, 13.2, 12, 5, '#d9e6ec', 18, { glow: true }),
      cyl(0, 73.6, 0, 12, 7, 2.6, '#f3f1ec', 18), cyl(0, 76.2, 0, 6, 4, 4, '#cfdde4', 14, { glow: true }), cyl(0, 80, 0, 4, 0.5, 2, '#f3f1ec', 12), cyl(0, 82, 0, 0.5, 0.15, 14, '#e9e6df', 6));
    return out;
  },
  capitol: () => {
    const out: Prim[] = [box(0, 0, 0, 70, 12, 28, '#c98f82'), box(0, 12, 0, 70, 1.4, 29, '#b97d70'), box(0, 0, 0, 30, 18, 32, '#c98f82'), box(0, 18, 0, 30, 2, 33, '#b97d70'),
      box(0, 0, 18, 26, 3, 8, '#d3a699'), pyr(0, 18, 17, 13, 5, '#c98f82', 12, {})];
    for (let i = 0; i < 6; i++) out.push(cyl(-10 + i * 4, 3, 19, 1, 1, 15, '#d9aea2', 8));
    out.push(cyl(0, 20, 0, 11, 10.6, 12, '#d9aea2', 18), ball(0, 32, 0, 10.6, '#e6d2c8', 0.78), cyl(0, 39, 0, 2.2, 1.6, 6, '#e6d2c8', 10), cyl(0, 45, 0, 1, 0.3, 8, GOLD, 6));
    return out;
  },
  moonlightTower: () => [
    cyl(0, 0, 0, 1.2, 0.5, 58, '#8a8f95', 6), ...[0, 1, 2, 3, 4, 5].map((i) => ball(Math.cos(i * 1.047) * 2.8, 60, Math.sin(i * 1.047) * 2.8, 0.9, '#fff3c4', 1, { glow: true })),
    ring(0, 58, 0, 2.8, 0.25, '#8a8f95', { ry: Math.PI / 2 }),
  ],
  cityHall: () => [
    box(0, 0, 0, 40, 20, 26, '#b7623e'), box(0, 20, 0, 40, 3, 27, '#8f4a30'), box(-12, 0, 0, 10, 38, 10, '#b7623e'), cyl(-12, 38, 0, 4, 4, 14, '#b7623e', 8, {}),
    box(-12, 22, 0, 10.6, 1, 10.6, '#d9a441'), pyr(-12, 52, 0, 4.2, 10, '#6fae8b', 0.3), ball(-12, 63, 0, 1.2, GOLD), box(-12, 51, 0, 4.4, 1.4, 4.4, GOLD, { glow: true }),
    box(16, 0, 14, 16, 12, 12, '#d9a441'),
  ],
  gamlaStan: () => {
    const out: Prim[] = [];
    const cols = ['#d9a441', '#c9783a', '#c05a46', '#d8b878', '#b8643c', '#e0c590'];
    for (let i = 0; i < 9; i++) {
      const x = -36 + i * 9;
      const h = 12 + ((i * 7) % 5) * 3;
      out.push(box(x, 0, 0, 8, h, 12, cols[i % cols.length]), pyr(x, h, 0, 4.4, 4.4, '#7a4a3a', 0.6));
    }
    out.push(box(0, 0, -12, 14, 26, 10, '#d9c9a4'), pyr(0, 26, -12, 6, 34, '#6fae8b', 0.3), ball(0, 62, -12, 1, GOLD));
    out.push(box(-24, 0, -13, 9, 22, 9, '#c9783a'), pyr(-24, 22, -13, 5, 14, '#6fae8b', 0.3));
    return out;
  },
  leifeng: () => {
    const out: Prim[] = [cyl(0, 0, 0, 14, 14, 5, '#c9b99a', 8, {}), cyl(0, 5, 0, 11, 11, 3, '#b8a07c', 8)];
    let y = 8;
    for (let i = 0; i < 5; i++) {
      const r = 9 - i * 1.15;
      out.push(cyl(0, y, 0, r, r - 0.4, 9, '#a8542f', 8), cyl(0, y + 9, 0, r + 3, r - 1, 2.6, '#3a3330', 8), box(0, y + 3, r - 0.2, 2.2, 3.4, 0.5, WARM, { glow: true }));
      y += 11.6;
    }
    out.push(cyl(0, y, 0, 3, 0.8, 5, '#3a3330', 8), cyl(0, y + 5, 0, 0.5, 0.15, 10, GOLD, 6));
    return out;
  },
  stoneBridge: () => archBridge(1, '#cbbfa8', 46),
};

export function buildLandmark(kind: LandmarkKind): Prim[] {
  return BUILDERS[kind]();
}

/** Axis-aligned bounds of a landmark (local space), for tests and placement. Boxes use their rotated extents roughly. */
export function landmarkBounds(prims: Prim[]): { minY: number; maxY: number; halfX: number; halfZ: number } {
  let minY = Infinity;
  let maxY = -Infinity;
  let halfX = 0;
  let halfZ = 0;
  for (const p of prims) {
    let ex = 0;
    let ey = 0;
    let ez = 0;
    if (p.t === 'box') {
      const r = Math.hypot(...p.s) / 2;
      [ex, ey, ez] = p.q ? [r, r, r] : [p.s[0] / 2, p.s[1] / 2, p.s[2] / 2];
    } else if (p.t === 'cyl') [ex, ey, ez] = [Math.max(p.rb, p.rt), p.h / 2, Math.max(p.rb, p.rt)];
    else if (p.t === 'sphere') [ex, ey, ez] = [p.r, p.r * (p.sy ?? 1), p.r];
    else if (p.t === 'torus') [ex, ey, ez] = [p.R + p.tube, p.R + p.tube, p.tube];
    else {
      const rmax = Math.max(...p.pts.map((q) => q[0]));
      const ys = p.pts.map((q) => q[1]);
      minY = Math.min(minY, p.p[1] + Math.min(...ys));
      maxY = Math.max(maxY, p.p[1] + Math.max(...ys));
      halfX = Math.max(halfX, Math.abs(p.p[0]) + rmax);
      halfZ = Math.max(halfZ, Math.abs(p.p[2]) + rmax);
      continue;
    }
    minY = Math.min(minY, p.p[1] - ey);
    maxY = Math.max(maxY, p.p[1] + ey);
    halfX = Math.max(halfX, Math.abs(p.p[0]) + ex);
    halfZ = Math.max(halfZ, Math.abs(p.p[2]) + ez);
  }
  return { minY, maxY, halfX, halfZ };
}

// ------------------------------------------------------------------ per-city scenes
export type WaterKind = 'river' | 'bay' | 'sea' | 'lake' | 'green';

export interface Placed {
  kind: LandmarkKind;
  /** Block-centre position (the layout leaves the blocks within `clear` free); for onRiver this is a dx from the river centre. */
  x: number;
  z: number;
  ry?: number;
  scale?: number;
  /** Clear the city blocks within this radius (units) so the landmark stands on open ground. */
  clear?: number;
  /** Stand on the river centreline at `z` (bridges, boats): x is then an offset from the river centre. */
  onRiver?: boolean;
  /** Far away: drawn without fog but tinted toward the horizon colour. */
  far?: boolean;
}

export interface Mountain { x: number; z: number; r: number; h: number; color: string; cap?: string }

export interface CityScene {
  water: WaterKind;
  waterColor: string;
  ground: string;
  /** The generic green hills behind the city. */
  hills: boolean;
  greenery: number;
  heightScale: number;
  landmarks: Placed[];
  backdrop: Mountain[];
}

const BASE_SCENE: CityScene = { water: 'river', waterColor: '#6d8792', ground: '#5f5b52', hills: true, greenery: 1, heightScale: 1, landmarks: [], backdrop: [] };

const S = (over: Partial<CityScene>): CityScene => ({ ...BASE_SCENE, ...over });
const SNOW = '#f3f5f8';

/** Landmarks stand on block lots near the water (x = -180 / -120 are the columns next to the river). */
export const CITY_SCENES: Record<string, CityScene> = {
  sf: S({
    water: 'bay', waterColor: '#5c8296', ground: '#6a6a58',
    landmarks: [
      { kind: 'goldenGate', x: 0, z: -190, onRiver: true, scale: 0.8 },
      { kind: 'transamerica', x: -180, z: -60, clear: 18, scale: 1.1 },
    ],
  }),
  nyc: S({
    water: 'bay', waterColor: '#506f84', ground: '#5c5a56',
    landmarks: [
      { kind: 'empireState', x: -180, z: -120, clear: 20 },
      { kind: 'oneWorldTrade', x: -180, z: -180, clear: 18, scale: 0.8 },
      { kind: 'statueOfLiberty', x: -30, z: -20, onRiver: true, scale: 1.2 },
    ],
  }),
  london: S({
    water: 'river', waterColor: '#6c7e86',
    landmarks: [
      { kind: 'londonEye', x: 40, z: -50, onRiver: true, ry: Math.PI / 2 },
      { kind: 'towerBridge', x: 0, z: -200, onRiver: true, scale: 0.62 },
      { kind: 'shard', x: -180, z: -150, clear: 16, scale: 1.1 },
      { kind: 'bigBen', x: -180, z: 0, clear: 22, scale: 1.4 },
    ],
  }),
  paris: S({
    water: 'river', waterColor: '#7a8b8f', ground: '#6b665c',
    landmarks: [
      { kind: 'eiffelTower', x: -180, z: -90, clear: 24 },
      { kind: 'invalides', x: -120, z: -120, clear: 20 },
      { kind: 'pontArches', x: 0, z: -20, onRiver: true, scale: 0.9 },
    ],
  }),
  munich: S({
    water: 'river', waterColor: '#6f9a9a', ground: '#66705a', greenery: 1.4,
    landmarks: [
      { kind: 'frauenkirche', x: -180, z: -90, clear: 24, scale: 1.5 },
      { kind: 'olympicTower', x: -120, z: -180, clear: 12, scale: 1.2 },
      { kind: 'fourCylinders', x: -180, z: -30, clear: 18 },
    ],
    backdrop: [-1500, -900, -300, 300, 900].map((x, i) => ({ x, z: -1700 - (i % 2) * 150, r: 520, h: 300 + (i % 3) * 70, color: '#7f8ca6', cap: SNOW })),
  }),
  moscow: S({
    water: 'river', waterColor: '#53697a', ground: '#aeb3b8',
    landmarks: [
      { kind: 'stBasils', x: -180, z: -90, clear: 26, scale: 2.4 },
      { kind: 'spasskaya', x: -180, z: -20, clear: 14, scale: 1.4, ry: Math.PI / 2 },
      { kind: 'ostankino', x: -120, z: -180, clear: 12, scale: 1.4 },
      { kind: 'moscowCity', x: 150, z: -210, clear: 24 },
    ],
  }),
  beijing: S({
    water: 'river', waterColor: '#7a8d8a', ground: '#9a9588', greenery: 0.8,
    landmarks: [
      { kind: 'cctv', x: -180, z: -100, clear: 28, scale: 1.2 },
      { kind: 'chinaZun', x: -120, z: -180, clear: 12, scale: 1.3 },
      { kind: 'palaceHall', x: -180, z: -30, clear: 28 },
    ],
  }),
  tokyo: S({
    water: 'bay', waterColor: '#4a6f86',
    landmarks: [
      { kind: 'tokyoTower', x: -180, z: -100, clear: 16, scale: 1.2 },
      { kind: 'skytree', x: -120, z: -180, clear: 12, scale: 1.1 },
      { kind: 'rainbowBridge', x: 0, z: -30, onRiver: true, scale: 0.8 },
    ],
    backdrop: [{ x: -250, z: -1450, r: 800, h: 270, color: '#8794ae', cap: SNOW }],
  }),
  singapore: S({
    water: 'bay', waterColor: '#3f7f8f', ground: '#5f6a4a', greenery: 1.6,
    landmarks: [
      { kind: 'marinaBay', x: -180, z: -100, clear: 28, scale: 1.2 },
      { kind: 'supertrees', x: -120, z: -180, clear: 22, scale: 1.2 },
      { kind: 'flyer', x: 36, z: -30, onRiver: true, ry: Math.PI / 2 },
    ],
  }),
  dubai: S({
    water: 'sea', waterColor: '#3e8fa6', ground: '#c2a878', hills: false, greenery: 0.3, heightScale: 1.1,
    landmarks: [
      { kind: 'burjKhalifa', x: -180, z: -100, clear: 20 },
      { kind: 'burjAlArab', x: -90, z: -30, onRiver: true },
      { kind: 'ekoTowers', x: -120, z: -180, clear: 22 },
    ],
  }),
  cairo: S({
    water: 'river', waterColor: '#6d8a82', ground: '#b9a57e', hills: false, greenery: 0.5,
    landmarks: [
      { kind: 'cairoTower', x: -180, z: -60, clear: 14, scale: 1.5 },
      { kind: 'mosque', x: -120, z: -120, clear: 22, scale: 1.3 },
      { kind: 'giza', x: -380, z: -1150, scale: 3.4, far: true },
    ],
  }),
  lagos: S({
    water: 'bay', waterColor: '#5b8a86', ground: '#a29a72', greenery: 1.3, heightScale: 0.9,
    landmarks: [
      { kind: 'stayedBridge', x: 0, z: -130, onRiver: true, scale: 0.8 },
      { kind: 'ekoTowers', x: -180, z: -60, clear: 24 },
      { kind: 'longBridge', x: 0, z: -230, onRiver: true, scale: 0.9 },
    ],
  }),
  bangalore: S({
    water: 'lake', waterColor: '#6a8f7a', ground: '#6d7a52', greenery: 2.4,
    landmarks: [
      { kind: 'vidhanaSoudha', x: -180, z: -90, clear: 34, scale: 1.1 },
      { kind: 'techPark', x: 120, z: -210, clear: 22 },
    ],
  }),
  mexicocity: S({
    water: 'green', waterColor: '#5e7a45', ground: '#7a7260', greenery: 1.5,
    landmarks: [
      { kind: 'torreLatino', x: -180, z: -90, clear: 16, scale: 1.4 },
      { kind: 'angel', x: -120, z: -120, clear: 14, scale: 1.4 },
    ],
    backdrop: [{ x: 250, z: -1250, r: 400, h: 230, color: '#6f7b8d', cap: SNOW }],
  }),
  saopaulo: S({
    water: 'river', waterColor: '#6f7f75', ground: '#7d7a72', greenery: 0.6, heightScale: 1.5,
    landmarks: [
      { kind: 'xBridge', x: 0, z: -130, onRiver: true, scale: 0.9 },
      { kind: 'denseTowers', x: -180, z: -60, clear: 22 },
      { kind: 'masp', x: -120, z: -120, clear: 20, scale: 1.2 },
    ],
  }),
  seattle: S({
    water: 'bay', waterColor: '#4d7185', ground: '#5d6a52', greenery: 1.5,
    landmarks: [{ kind: 'spaceNeedle', x: -180, z: -90, clear: 14, scale: 1.5 }],
    backdrop: [{ x: -150, z: -1350, r: 480, h: 280, color: '#7c8ea8', cap: SNOW }],
  }),
  austin: S({
    water: 'lake', waterColor: '#5e8f98', ground: '#a09468', greenery: 0.9,
    landmarks: [
      { kind: 'capitol', x: -120, z: -180, clear: 26, scale: 0.8 },
      { kind: 'moonlightTower', x: -180, z: -30, clear: 8, scale: 1.2 },
      { kind: 'moonlightTower', x: 60, z: -150, clear: 8, scale: 1.2 },
    ],
  }),
  stockholm: S({
    water: 'bay', waterColor: '#4f7894', ground: '#7d8a7c', greenery: 1.2,
    landmarks: [
      { kind: 'cityHall', x: -180, z: -60, clear: 24, scale: 1.5 },
      { kind: 'gamlaStan', x: -180, z: -150, clear: 22 },
    ],
  }),
  hangzhou: S({
    water: 'lake', waterColor: '#6d9a8a', ground: '#66784f', greenery: 1.9, heightScale: 1.1,
    landmarks: [
      { kind: 'leifeng', x: -180, z: -100, clear: 20, scale: 2 },
      { kind: 'stoneBridge', x: 0, z: -30, onRiver: true, scale: 1.2 },
    ],
    backdrop: [-600, 100, 800].map((x, i) => ({ x, z: -950 - i * 120, r: 480, h: 150 + i * 30, color: '#5f7a56' })),
  }),
};

export function cityScene(cityId: string): CityScene {
  return CITY_SCENES[cityId] ?? BASE_SCENE;
}

/** Landmarks on a lot are drawn this much bigger than their `scale`, so they read from the default camera. */
export const LOT_BOOST = 1.3;

/** Blocks the layout must keep free for the landmarks of this city. */
export function reservedLots(scene: CityScene): { x: number; z: number; r: number }[] {
  return scene.landmarks.filter((l) => !l.onRiver && (l.clear ?? 0) > 0).map((l) => ({ x: l.x, z: l.z, r: l.clear! * LOT_BOOST }));
}

/** The scale a landmark is drawn at. */
export function drawScale(l: Placed): number {
  return (l.scale ?? 1) * (l.onRiver || l.far ? 1 : LOT_BOOST);
}
