/**
 * Procedural 3D city layout. Pure and deterministic per city id (no three.js imports here, so it is testable).
 * Units: 1 unit ~ 2.5 m. x = east, z = south (towards the default camera), y = up.
 */
import { visualRng } from '../util';

export type Style = 'brick' | 'stone' | 'concrete' | 'glass' | 'hq';
/** Must match the shader in buildingMaterial.ts: 0 resi, 1 office, 2 hq, 3 hospital, 4 bank. */
export type Kind3D = 0 | 1 | 2 | 3 | 4;

export interface Box3 {
  x: number; // centre
  z: number;
  y0: number; // base height
  w: number; // x size
  d: number; // z size
  h: number;
}

export interface Bldg3 {
  id: number;
  parts: Box3[]; // stacked boxes (setbacks); first part is the base
  style: Style;
  kind: Kind3D;
  district: number; // 0-1, blackouts spread through low values first
  seed: number; // 0-1
  height: number; // total
  hqSlot?: number;
}

export interface Tree {
  x: number;
  z: number;
  s: number;
}

export interface Lane {
  // a straight road segment cars drive along
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

export interface Layout3D {
  buildings: Bldg3[];
  sprawl: Box3[]; // cheap low-detail buildings out to the horizon
  blocks: { x: number; z: number; size: number; kind: 'built' | 'park' | 'plaza' }[];
  trees: Tree[];
  river: { z: number; x: number; width: number }[]; // centreline samples
  lanes: Lane[];
  hq: { x: number; z: number; top: number }[];
  bank: { x: number; z: number; top: number; door: { x: number; z: number } };
  hospital: { x: number; z: number; top: number };
  plaza: { x: number; z: number; size: number };
  park: { x: number; z: number; r: number };
  port: { x: number; z0: number; z1: number }; // quay on the river's east bank
  downtown: { x: number; z: number };
  extent: { x0: number; x1: number; z0: number; z1: number };
}

export const PITCH = 30; // block + street
export const BLOCK = 23;
export const FLOOR = 1.4;

export function riverX(z: number): number {
  return -235 + 38 * Math.sin(z / 140) + 14 * Math.sin(z / 47);
}
export const RIVER_W = 70;

/** Downtown block centres for HQ towers, tallest first. A city uses the first `hqCount`. */
const HQ_SPOTS: [number, number, number][] = [
  [10, -130, 155], [-110, -70, 132], [130, -60, 124], [-50, -200, 118], [90, -210, 112], [-160, -160, 104], [190, -150, 100], [-20, -30, 96],
];
export const MAX_HQS = HQ_SPOTS.length;

export function buildLayout3D(cityId: string, hqCount = 3): Layout3D {
  const rnd = visualRng(`city3d:${cityId}`);
  const downtown = { x: 10, z: -80 };
  const extent = { x0: -180, x1: 330, z0: -390, z1: 240 };
  const park = { x: -40, z: 150, r: 62 };

  const buildings: Bldg3[] = [];
  const blocks: Layout3D['blocks'] = [];
  const trees: Tree[] = [];
  let id = 0;

  const blockCenter = (x: number, z: number) => ({
    x: Math.round(x / PITCH) * PITCH,
    z: Math.round(z / PITCH) * PITCH,
  });
  const spots = HQ_SPOTS.slice(0, Math.max(0, Math.min(MAX_HQS, hqCount)));
  const hqCenters = spots.map(([x, z]) => blockCenter(x, z));
  const bankC = blockCenter(70, 30);
  const hospC = blockCenter(-110, 60);
  const plazaC = blockCenter(-10, 0);
  const same = (a: { x: number; z: number }, x: number, z: number) => a.x === x && a.z === z;

  const pushBldg = (b: Omit<Bldg3, 'id' | 'height'>) => {
    const top = Math.max(...b.parts.map((p) => p.y0 + p.h));
    buildings.push({ ...b, id: id++, height: top });
  };

  const district = (x: number, z: number) => {
    // smooth-ish districts: blackouts eat whole neighbourhoods, not random windows
    const cx = Math.floor((x + 400) / 120);
    const cz = Math.floor((z + 400) / 120);
    const r = visualRng(`d:${cityId}:${cx}:${cz}`);
    return r();
  };

  for (let bx = Math.ceil(extent.x0 / PITCH) * PITCH; bx <= extent.x1; bx += PITCH) {
    for (let bz = Math.ceil(extent.z0 / PITCH) * PITCH; bz <= extent.z1; bz += PITCH) {
      if (bx - BLOCK / 2 < riverX(bz) + RIVER_W / 2 + 22) continue; // river + quay
      const dPark = Math.hypot(bx - park.x, bz - park.z);
      if (dPark < park.r) {
        blocks.push({ x: bx, z: bz, size: BLOCK, kind: 'park' });
        for (let i = 0; i < 26; i++) trees.push({ x: bx + (rnd() - 0.5) * BLOCK, z: bz + (rnd() - 0.5) * BLOCK, s: 0.8 + rnd() * 0.8 });
        continue;
      }
      if (same(plazaC, bx, bz)) {
        blocks.push({ x: bx, z: bz, size: BLOCK, kind: 'plaza' });
        for (let i = 0; i < 8; i++) trees.push({ x: bx + (i % 2 ? 10 : -10), z: bz - 9 + Math.floor(i / 2) * 6, s: 0.7 });
        continue;
      }
      blocks.push({ x: bx, z: bz, size: BLOCK, kind: 'built' });
      const dist = Math.hypot(bx - downtown.x, (bz - downtown.z) * 1.15);
      const f = Math.exp(-((dist / 105) ** 2));
      const dis = district(bx, bz);

      const hqSlot = hqCenters.findIndex((c) => same(c, bx, bz));
      if (hqSlot >= 0) {
        const H = spots[hqSlot][2];
        const w = 15;
        pushBldg({
          style: 'hq', kind: 2, district: dis, seed: rnd(), hqSlot,
          parts: [
            { x: bx, z: bz, y0: 0, w: BLOCK - 2, d: BLOCK - 2, h: 14 },
            { x: bx, z: bz, y0: 14, w, d: w, h: H * 0.62 },
            { x: bx, z: bz, y0: 14 + H * 0.62, w: w * 0.8, d: w * 0.8, h: H * 0.26 },
            { x: bx, z: bz, y0: 14 + H * 0.88, w: w * 0.55, d: w * 0.55, h: H * 0.12 },
            { x: bx, z: bz, y0: 14 + H, w: 0.8, d: 0.8, h: 22 },
          ],
        });
        continue;
      }
      if (same(bankC, bx, bz)) {
        pushBldg({ style: 'stone', kind: 4, district: dis, seed: rnd(), parts: [{ x: bx, z: bz, y0: 0, w: BLOCK - 3, d: BLOCK - 3, h: 16 }] });
        continue;
      }
      if (same(hospC, bx, bz)) {
        pushBldg({
          style: 'concrete', kind: 3, district: dis, seed: rnd(),
          parts: [{ x: bx, z: bz, y0: 0, w: BLOCK - 2, d: BLOCK - 4, h: 14 }, { x: bx - 3, z: bz, y0: 14, w: 12, d: 12, h: 16 }],
        });
        continue;
      }

      // Downtown towers: one per block, with setbacks.
      if (rnd() < f * 0.75) {
        const H = 40 + rnd() * 100 * f + rnd() * 25;
        const w = 9 + rnd() * 7;
        const d = 9 + rnd() * 7;
        const glass = rnd() < 0.7;
        const parts: Box3[] = [{ x: bx, z: bz, y0: 0, w: BLOCK - 3, d: BLOCK - 3, h: 6 + rnd() * 10 }];
        const p1 = H * (0.55 + rnd() * 0.25);
        parts.push({ x: bx, z: bz, y0: parts[0].h, w, d, h: p1 });
        if (rnd() < 0.7) parts.push({ x: bx, z: bz, y0: parts[0].h + p1, w: w * 0.78, d: d * 0.78, h: H - p1 });
        pushBldg({ style: glass ? 'glass' : rnd() < 0.5 ? 'stone' : 'brick', kind: 1, district: dis, seed: rnd(), parts });
        continue;
      }

      // Mid-rise: 1-4 lots per block.
      const split = rnd() < 0.25 ? 1 : 2;
      const lot = BLOCK / split;
      for (let i = 0; i < split; i++)
        for (let j = 0; j < split; j++) {
          if (rnd() < 0.08) {
            trees.push({ x: bx - BLOCK / 2 + lot * (i + 0.5), z: bz - BLOCK / 2 + lot * (j + 0.5), s: 1 });
            continue;
          }
          const h = 5 + rnd() * 14 + f * rnd() * 55 + (rnd() < 0.06 ? 25 : 0);
          const r = rnd();
          const style: Style = r < 0.42 ? 'brick' : r < 0.72 ? 'stone' : r < 0.92 ? 'concrete' : 'glass';
          const inset = 0.6 + rnd() * 1.2;
          pushBldg({
            style, kind: h > 28 || rnd() < 0.35 ? 1 : 0, district: dis, seed: rnd(),
            parts: [{ x: bx - BLOCK / 2 + lot * (i + 0.5), z: bz - BLOCK / 2 + lot * (j + 0.5), y0: 0, w: lot - inset * 2, d: lot - inset * 2, h }],
          });
        }
      // street trees
      if (rnd() < 0.5) for (let t = 0; t < 4; t++) trees.push({ x: bx - BLOCK / 2 - 2.5, z: bz - BLOCK / 2 + t * 7, s: 0.6 });
    }
  }

  // Low-detail sprawl out to the horizon (east, north and south), plus the far bank of the river.
  const sprawl: Box3[] = [];
  for (let i = 0; i < 5200; i++) {
    const x = -900 + rnd() * 2000;
    const z = -1300 + rnd() * 1700;
    const inCity = x > extent.x0 - 10 && x < extent.x1 + 10 && z > extent.z0 - 10 && z < extent.z1 + 10;
    const rx = riverX(z);
    if (inCity || Math.abs(x - rx) < RIVER_W / 2 + 6) continue;
    if (x < rx && rnd() < 0.55) continue; // greener on the far bank
    const s = 6 + rnd() * 10;
    sprawl.push({ x, z, y0: 0, w: s, d: s * (0.7 + rnd() * 0.6), h: 3 + rnd() * 10 + (rnd() < 0.03 ? 30 : 0) });
  }
  for (let i = 0; i < 900; i++) {
    const z = -1300 + rnd() * 1800;
    const x = riverX(z) - RIVER_W / 2 - 10 - rnd() * 260;
    trees.push({ x, z, s: 1 + rnd() * 1.4 });
  }

  const river: Layout3D['river'] = [];
  for (let z = -1500; z <= 900; z += 12) river.push({ z, x: riverX(z), width: RIVER_W });

  // Avenues for traffic: every third street, both directions.
  const lanes: Lane[] = [];
  for (let x = Math.ceil(extent.x0 / PITCH) * PITCH; x <= extent.x1; x += PITCH * 3) {
    const sx = x + PITCH / 2;
    lanes.push({ ax: sx - 1.3, az: extent.z1, bx: sx - 1.3, bz: extent.z0 });
    lanes.push({ ax: sx + 1.3, az: extent.z0, bx: sx + 1.3, bz: extent.z1 });
  }
  for (let z = Math.ceil(extent.z0 / PITCH) * PITCH; z <= extent.z1; z += PITCH * 3) {
    const sz = z + PITCH / 2;
    const x0 = riverX(sz) + RIVER_W / 2 + 8;
    lanes.push({ ax: x0, az: sz - 1.3, bx: extent.x1, bz: sz - 1.3 });
    lanes.push({ ax: extent.x1, az: sz + 1.3, bx: x0, bz: sz + 1.3 });
  }

  const hqB = buildings.filter((b) => b.kind === 2).sort((a, b) => (a.hqSlot ?? 0) - (b.hqSlot ?? 0));
  const bankB = buildings.find((b) => b.kind === 4)!;
  const hospB = buildings.find((b) => b.kind === 3)!;
  const portZ = -150;

  return {
    buildings,
    sprawl,
    blocks,
    trees,
    river,
    lanes,
    hq: hqB.map((b) => ({ x: b.parts[0].x, z: b.parts[0].z, top: b.height })),
    bank: { x: bankB.parts[0].x, z: bankB.parts[0].z, top: bankB.height, door: { x: bankB.parts[0].x, z: bankB.parts[0].z + BLOCK / 2 + 1 } },
    hospital: { x: hospB.parts[0].x, z: hospB.parts[0].z, top: hospB.height },
    plaza: { x: plazaC.x, z: plazaC.z, size: BLOCK },
    park,
    port: { x: riverX(portZ) + RIVER_W / 2 + 10, z0: portZ - 70, z1: portZ + 70 },
    downtown,
    extent,
  };
}
