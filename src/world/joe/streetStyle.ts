/**
 * How the Average Joe street looks in each country (task #26 step 3, cheap version): building colours and heights,
 * trees, a few props, which side the traffic drives on, sky tint and what people wear. Pure data, no three.js.
 * Everything else about the street (the citizen model, the situations) is shared.
 */
import type { Style } from '../city3d/layout3d';

export type TreeKind = 'leafy' | 'palm' | 'bare' | 'willow';
export type StreetProp = 'lanterns' | 'neon' | 'vending' | 'rickshaw' | 'stalls' | 'snow' | 'flags';

export interface StreetStyle {
  id: string;
  /** Weights for the three street building styles (brick, stone, concrete). */
  mix: [brick: number, stone: number, concrete: number];
  /** Building colour per style (overrides the shared colour). */
  tint: Partial<Record<Style, string>>;
  /** Multiplies building heights. */
  heightScale: number;
  /** Multiplies building widths along the street (narrow = old town). */
  widthScale: number;
  awnings: string[];
  cars: string[];
  /** Traffic keeps to the left (UK, Japan, India, ...). */
  leftHand: boolean;
  tree: TreeKind;
  treeColor: string;
  props: StreetProp[];
  /** Colours for the road and the pavement (multiplied into the textures). */
  asphalt: string;
  paving: string;
  /** Applied to calm situations only (a war or a blackout keeps its own light). */
  sky: { fog: string; sun: string; sunElevDelta: number; turbidity: number };
  /** Clothing colours of the people on the pavement. */
  clothes: string[];
}

const BASE: StreetStyle = {
  id: 'default', mix: [0.45, 0.35, 0.2], tint: {}, heightScale: 1, widthScale: 1,
  awnings: ['#b23a2c', '#2f6f5a', '#c79a3a', '#3b5c8a', '#6b4a8a'],
  cars: ['#d9dde6', '#2e2e34', '#7a8796', '#a83232', '#2f4f7a'],
  leftHand: false, tree: 'leafy', treeColor: '#3f6a2e', props: [],
  asphalt: '#77746f', paving: '#c9c0b2',
  sky: { fog: '#d8d6cf', sun: '#ffe6c2', sunElevDelta: 0, turbidity: 6 },
  clothes: ['#e6e0d4', '#2b2f3a', '#7d5b46', '#4b6584', '#b8433a', '#d8b46a', '#5d7a4a', '#8a6a9a'],
};

const S = (id: string, over: Partial<StreetStyle>): StreetStyle => ({ ...BASE, id, ...over });

const BRIGHT = ['#e0462f', '#f2b01e', '#2aa876', '#2f7fd0', '#d8449a', '#f26f21'];

export const STREET_STYLES: Record<string, StreetStyle> = {
  // ---- United States: glass and brick, broad streets, leafy trees
  sf: S('sf', { mix: [0.35, 0.25, 0.4], heightScale: 1.2, tint: { stone: '#e6d6c0', concrete: '#e9e5dc' }, sky: { fog: '#e4dccd', sun: '#ffd9a8', sunElevDelta: -6, turbidity: 5 } }),
  nyc: S('nyc', { mix: [0.55, 0.15, 0.3], heightScale: 1.55, tint: { brick: '#a5573b' }, sky: { fog: '#cfd3d8', sun: '#ffe2bd', sunElevDelta: -4, turbidity: 8 }, props: ['flags'] }),
  seattle: S('seattle', { mix: [0.35, 0.2, 0.45], heightScale: 1.1, treeColor: '#2f5a2c', sky: { fog: '#b9c3c8', sun: '#e8ecf2', sunElevDelta: -2, turbidity: 12 } }),
  austin: S('austin', { mix: [0.3, 0.5, 0.2], heightScale: 0.85, tint: { stone: '#e6c9a0', brick: '#c26a4a' }, tree: 'leafy', treeColor: '#5a7a38', sky: { fog: '#e8d9bd', sun: '#ffe0a8', sunElevDelta: 6, turbidity: 4 } }),
  // ---- UK and Europe: old brick and stone, narrow frontages, left-hand traffic in London
  london: S('london', { mix: [0.7, 0.25, 0.05], leftHand: true, heightScale: 0.95, widthScale: 0.8, tint: { brick: '#8f5a48', stone: '#d2c5aa' }, awnings: ['#1f3a5f', '#8a2f2f', '#2f5a3a', '#202020', '#c9a43a'], cars: ['#a22828', '#202428', '#d9dde6', '#2f3f5a', '#7a8796'], sky: { fog: '#c3c5c6', sun: '#f2e8d8', sunElevDelta: -6, turbidity: 12 }, treeColor: '#4a6a36' }),
  paris: S('paris', { mix: [0.05, 0.9, 0.05], heightScale: 1.0, widthScale: 0.75, tint: { stone: '#e8dcc2' }, awnings: ['#2f3f5a', '#8a2f3a', '#2f5a4a', '#202020'], sky: { fog: '#dcd9d2', sun: '#ffe9cc', sunElevDelta: -2, turbidity: 8 }, treeColor: '#6a8a45' }),
  munich: S('munich', { mix: [0.1, 0.8, 0.1], heightScale: 0.9, widthScale: 0.85, tint: { stone: '#e8d4b0' }, awnings: ['#2f6fa8', '#d8d8d0', '#b23a2c', '#e0b030'], sky: { fog: '#d9dee4', sun: '#fff0d4', sunElevDelta: 2, turbidity: 3 } }),
  stockholm: S('stockholm', { mix: [0.1, 0.8, 0.1], heightScale: 0.9, widthScale: 0.9, tint: { stone: '#d9a441' }, awnings: ['#d9a441', '#c9783a', '#c05a46', '#3b5c8a'], sky: { fog: '#d5dde6', sun: '#fff4e0', sunElevDelta: -8, turbidity: 3 }, treeColor: '#6a8a45' }),
  moscow: S('moscow', { mix: [0.2, 0.55, 0.25], heightScale: 1.1, widthScale: 1.3, tint: { stone: '#d9d0bf', brick: '#a8584a' }, tree: 'bare', treeColor: '#8a8a88', props: ['snow'], asphalt: '#8e9298', paving: '#e6eaee', sky: { fog: '#c7ccd2', sun: '#e8f0ff', sunElevDelta: -10, turbidity: 6 }, clothes: ['#2b2f3a', '#6b2f3a', '#3a4a5a', '#c9c9c9', '#4a3a2f'] }),
  // ---- East Asia: dense concrete and neon, lanterns, left-hand traffic in Tokyo
  tokyo: S('tokyo', { mix: [0.05, 0.1, 0.85], leftHand: true, heightScale: 1.25, widthScale: 0.7, tint: { concrete: '#d2d6dc' }, props: ['neon', 'vending'], awnings: ['#e0462f', '#f2b01e', '#2f7fd0', '#d8449a', '#2aa876'], cars: ['#f0f0f0', '#2a2a2e', '#c9ced6', '#7a8796', '#e8e0c8'], treeColor: '#4a7a3a', sky: { fog: '#cfd6e2', sun: '#fff0d8', sunElevDelta: -4, turbidity: 7 }, clothes: ['#2b2f3a', '#e6e0d4', '#4b6584', '#b8433a', '#c9c9c9'] }),
  beijing: S('beijing', { mix: [0.35, 0.3, 0.35], heightScale: 1.1, widthScale: 1.15, tint: { brick: '#9a8f86', stone: '#d2c4a8' }, props: ['lanterns'], awnings: ['#c1272d', '#d4a02a', '#2f5a3a', '#8a2f2f'], treeColor: '#6a7a3a', sky: { fog: '#cfc5b4', sun: '#f2dcb8', sunElevDelta: -2, turbidity: 16 } }),
  hangzhou: S('hangzhou', { mix: [0.2, 0.5, 0.3], heightScale: 0.95, widthScale: 1.0, tint: { stone: '#e4dccb' }, tree: 'willow', treeColor: '#7aa25a', props: ['lanterns'], awnings: ['#c1272d', '#d4a02a', '#2f6f5a'], sky: { fog: '#cdd6d3', sun: '#eef0e8', sunElevDelta: -4, turbidity: 10 } }),
  singapore: S('singapore', { mix: [0.05, 0.25, 0.7], leftHand: true, heightScale: 1.35, tree: 'palm', treeColor: '#3f8a3a', tint: { concrete: '#e8ece8' }, awnings: BRIGHT, sky: { fog: '#d6e4ea', sun: '#fff2d0', sunElevDelta: 6, turbidity: 5 } }),
  // ---- Gulf and Africa: sand colours, palms, markets
  dubai: S('dubai', { mix: [0.0, 0.6, 0.4], heightScale: 1.4, tree: 'palm', treeColor: '#4a8a3a', tint: { stone: '#e0c590', concrete: '#e8d8b4', brick: '#d2a870' }, asphalt: '#7d7870', paving: '#e2d4b4', awnings: ['#d8c9a0', '#2f6f8a', '#8a6a2f'], cars: ['#f2f2ee', '#e8e0c8', '#1f1f22', '#c9ced6', '#d8b46a'], sky: { fog: '#e9d9b8', sun: '#ffe0a0', sunElevDelta: 10, turbidity: 9 }, clothes: ['#f2efe8', '#2b2f3a', '#e8e0c8', '#c9a46a'] }),
  cairo: S('cairo', { mix: [0.25, 0.65, 0.1], heightScale: 0.8, widthScale: 0.9, tree: 'palm', treeColor: '#5a8a3a', tint: { stone: '#d9b07a', brick: '#c08a5a' }, props: ['stalls'], awnings: BRIGHT, asphalt: '#7d7870', paving: '#d8c8a8', sky: { fog: '#e6d5b4', sun: '#ffd9a0', sunElevDelta: 8, turbidity: 12 }, clothes: ['#e8e0c8', '#2f5a8a', '#b8433a', '#d8b46a', '#5d7a4a'] }),
  lagos: S('lagos', { mix: [0.4, 0.2, 0.4], heightScale: 0.75, tree: 'palm', treeColor: '#3f7a30', tint: { brick: '#d97a4a', concrete: '#e8d4a8', stone: '#e0b070' }, props: ['stalls'], awnings: BRIGHT, sky: { fog: '#e6d2b0', sun: '#ffd09a', sunElevDelta: 4, turbidity: 12 }, clothes: ['#e0462f', '#f2b01e', '#2aa876', '#2f7fd0', '#d8449a', '#ffffff'] }),
  // ---- India and Latin America
  bangalore: S('bangalore', { mix: [0.25, 0.45, 0.3], leftHand: true, heightScale: 0.9, treeColor: '#2f7a30', tint: { stone: '#e8d8b8', concrete: '#e2d8c8' }, props: ['rickshaw', 'stalls'], awnings: BRIGHT, cars: ['#f2f2ee', '#c9ced6', '#2a2a2e', '#d8c040'], sky: { fog: '#dcdccc', sun: '#ffe6b8', sunElevDelta: 2, turbidity: 10 }, clothes: ['#e0462f', '#2f7fd0', '#f2b01e', '#2aa876', '#d8449a', '#e6e0d4'] }),
  mexicocity: S('mexicocity', { mix: [0.35, 0.4, 0.25], heightScale: 0.9, tree: 'leafy', treeColor: '#4a7a35', tint: { brick: '#e08a5a', stone: '#e8c860', concrete: '#e6a8a0' }, awnings: BRIGHT, props: ['flags'], sky: { fog: '#e0d8c8', sun: '#ffe2b0', sunElevDelta: 4, turbidity: 8 } }),
  saopaulo: S('saopaulo', { mix: [0.1, 0.2, 0.7], heightScale: 1.5, treeColor: '#3f7a30', tint: { concrete: '#cfcac0', brick: '#a8604a' }, sky: { fog: '#cfcfcf', sun: '#f2e4cc', sunElevDelta: -4, turbidity: 12 } }),
};

export function streetStyle(cityId: string): StreetStyle {
  return STREET_STYLES[cityId] ?? BASE;
}

/** Deterministic pick from the weights, for building styles. */
export function pickStyle(mix: StreetStyle['mix'], r: number): 'brick' | 'stone' | 'concrete' {
  const total = mix[0] + mix[1] + mix[2];
  const x = r * total;
  return x < mix[0] ? 'brick' : x < mix[0] + mix[1] ? 'stone' : 'concrete';
}
