/** Procedural skyline layout for one city. Pure and deterministic per city id. */
import { visualRng } from './util';

export const SCENE_W = 1200;
export const SCENE_H = 600;
export const GROUND_Y = 470; // building bases
export const ROAD_TOP = 482;
export const ROAD_BOTTOM = 540;
export const QUAY_BOTTOM = 560; // harbour water below this

export type BldgKind = 'office' | 'resi' | 'hq' | 'bank' | 'hospital';

export interface Window {
  x: number;
  y: number;
  row: number; // 0 = top floor
  r: number; // 0-1 noise used for lighting
}

export interface Building {
  id: string;
  kind: BldgKind;
  x: number;
  w: number;
  h: number;
  rows: number;
  district: number; // 0-1 noise: blackout spreads through low districts first
  windows: Window[];
  hqSlot?: number;
  roofStyle: 0 | 1 | 2; // flat, antenna, stepped
}

export interface FarBuilding {
  x: number;
  w: number;
  h: number;
}

export interface SceneLayout {
  far: FarBuilding[];
  buildings: Building[];
  hqSlots: { cx: number; w: number; h: number }[];
  bank: Building;
  hospital: Building;
  stars: { x: number; y: number; r: number }[];
}

/** HQ tower slots spread across the free middle of the skyline (between hospital and bank). */
export function hqSlots(count: number): { cx: number; w: number; h: number }[] {
  const n = Math.max(0, Math.min(8, count));
  if (!n) return [];
  const x0 = 190;
  const x1 = 1010;
  const span = (x1 - x0) / n;
  const w = Math.min(96, span - 14);
  const heights = [370, 330, 345, 310, 355, 300, 335, 320];
  return Array.from({ length: n }, (_, i) => ({ cx: x0 + span * (i + 0.5), w, h: heights[i] - (n > 4 ? 30 : 0) }));
}

function makeWindows(x: number, w: number, h: number, rnd: () => number): { windows: Window[]; rows: number } {
  const cols = Math.max(1, Math.floor((w - 10) / 14));
  const rows = Math.max(1, Math.floor((h - 22) / 18));
  const padX = (w - cols * 14 + 6) / 2;
  const windows: Window[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) windows.push({ x: x + padX + c * 14, y: GROUND_Y - h + 14 + r * 18, row: r, r: rnd() });
  return { windows, rows };
}

function building(id: string, kind: BldgKind, x: number, w: number, h: number, rnd: () => number, hqSlot?: number): Building {
  const { windows, rows } = makeWindows(x, w, h, rnd);
  return { id, kind, x, w, h, rows, windows, district: rnd(), hqSlot, roofStyle: Math.floor(rnd() * 3) as 0 | 1 | 2 };
}

export function buildScene(cityId: string, hqCount = 3): SceneLayout {
  const HQ_SLOTS = hqSlots(hqCount);
  const rnd = visualRng(`scene:${cityId}`);

  const far: FarBuilding[] = [];
  for (let x = -10; x < 1210; ) {
    const w = 30 + rnd() * 60;
    far.push({ x, w, h: 70 + rnd() * 170 });
    x += w * (0.6 + rnd() * 0.5);
  }

  const hospital = building('hospital', 'hospital', 40, 124, 170, rnd);
  const bank = building('bank', 'bank', 1030, 116, 140, rnd);
  const reserved: [number, number][] = [
    [hospital.x - 6, hospital.x + hospital.w + 6],
    [bank.x - 6, bank.x + bank.w + 6],
    ...HQ_SLOTS.map((s): [number, number] => [s.cx - s.w / 2 - 6, s.cx + s.w / 2 + 6]),
  ];

  const buildings: Building[] = [];
  let x = 0;
  let n = 0;
  while (x < SCENE_W) {
    const w = 50 + Math.floor(rnd() * 55);
    const clash = reserved.find(([a, b]) => x < b && x + w > a);
    if (clash) {
      // shrink into the gap if there is room, otherwise jump past the reserved slot
      const gap = clash[0] - x;
      if (gap >= 40) {
        buildings.push(building(`b${n++}`, rnd() < 0.6 ? 'office' : 'resi', x, gap - 2, 110 + rnd() * 150, rnd));
      }
      x = clash[1];
      continue;
    }
    const kind: BldgKind = rnd() < 0.6 ? 'office' : 'resi';
    buildings.push(building(`b${n++}`, kind, x, w, (kind === 'office' ? 150 : 100) + rnd() * 140, rnd));
    x += w + 2 + Math.floor(rnd() * 6);
  }

  const hqs = HQ_SLOTS.map((s, i) => building(`hq${i}`, 'hq', s.cx - s.w / 2, s.w, s.h, rnd, i));

  const stars = Array.from({ length: 70 }, () => ({ x: rnd() * SCENE_W, y: rnd() * 260, r: 0.5 + rnd() * 1.2 }));

  return { far, buildings: [...buildings, hospital, bank, ...hqs], hqSlots: HQ_SLOTS, bank, hospital, stars };
}
