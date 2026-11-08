/**
 * Builds the globe's textures in code from Natural Earth coastlines (world-atlas, public domain):
 * no image downloads. Colour = biome by latitude/deserts + fractal noise, shaded by a relief height field
 * (noise + real mountain ranges) so land reads as terrain, not flat paper. Ocean has lighter continental shelves.
 */
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { RegionId, WorldState } from '../../contracts';
import { rampColor, regionMetric, RAMPS, type MapMetric, type MapOverlay } from '../mapMetrics';
import { clamp01 } from '../util';
import { COUNTRY_REGION } from './countryRegions';

type Ring = [number, number][];
export interface Country {
  id: string;
  region?: RegionId;
  polys: Ring[][]; // polygons -> rings
}

export interface EarthData {
  countries: Country[];
  borders: Ring[];
}

export async function loadEarth(): Promise<EarthData> {
  const topo = (await import('world-atlas/countries-50m.json')).default as unknown as Topology<{ countries: GeometryCollection }>;
  const fc = feature(topo, topo.objects.countries);
  const countries: Country[] = fc.features.map((f) => {
    const g = f.geometry;
    const polys: Ring[][] = g.type === 'Polygon' ? [g.coordinates as Ring[]] : g.type === 'MultiPolygon' ? (g.coordinates as Ring[][]) : [];
    const id = String(f.id ?? '');
    return { id, region: COUNTRY_REGION.get(id), polys };
  });
  const b = mesh(topo, topo.objects.countries, (a, c) => a !== c);
  const borders = b.coordinates as Ring[];
  return { countries, borders };
}

// ---------------------------------------------------------------- drawing helpers (equirectangular)
function tracePolygon(ctx: CanvasRenderingContext2D, rings: Ring[], W: number, H: number, dx: number) {
  for (const ring of rings) {
    // unwrap longitudes so rings crossing the antimeridian stay continuous
    const pts: [number, number][] = [];
    let prev = ring[0][0];
    let shift = 0;
    for (const [lon, lat] of ring) {
      if (lon - prev > 180) shift -= 360;
      else if (prev - lon > 180) shift += 360;
      prev = lon;
      pts.push([lon + shift, lat]);
    }
    const lons = pts.map((p) => p[0]);
    const span = Math.max(...lons) - Math.min(...lons);
    if (span > 350) {
      // polar ring (Antarctica): close it through the pole
      const last = pts[pts.length - 1];
      const pole = pts.reduce((s, p) => s + p[1], 0) < 0 ? -90 : 90;
      pts.push([last[0], pole], [pts[0][0], pole]);
    }
    pts.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * W + dx;
      const y = ((90 - lat) / 180) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
}

function fillCountries(ctx: CanvasRenderingContext2D, countries: Country[], W: number, H: number, style: (c: Country) => string | CanvasPattern | null) {
  for (const c of countries) {
    const s = style(c);
    if (!s) continue;
    ctx.fillStyle = s;
    for (const dx of [-W, 0, W]) {
      ctx.beginPath();
      for (const p of c.polys) tracePolygon(ctx, p, W, H, dx);
      ctx.fill('evenodd');
    }
  }
}

function canvas(W: number, H: number) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

// ---------------------------------------------------------------- noise
function hash(x: number, y: number) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, wrap: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = (n: number) => ((n % wrap) + wrap) % wrap;
  const a = hash(w(xi), yi);
  const b = hash(w(xi + 1), yi);
  const c = hash(w(xi), yi + 1);
  const d = hash(w(xi + 1), yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, base: number) {
  let s = 0;
  let amp = 0.5;
  let f = base;
  for (let o = 0; o < 5; o++) {
    s += amp * vnoise(x * f, y * f, Math.round(360 * f));
    amp *= 0.5;
    f *= 2.1;
  }
  return s;
}

// Real mountain ranges as (lon, lat) polylines: [points, width in degrees, strength]
const RANGES: [[number, number][], number, number][] = [
  [[[72, 36], [78, 33], [84, 29], [90, 28], [96, 28]], 2.6, 1],
  [[[78, 35], [88, 35], [98, 35]], 5, 0.55], // Tibetan plateau
  [[[70, 41], [80, 42], [88, 43]], 1.6, 0.5], // Tian Shan
  [[[86, 49], [96, 47]], 1.6, 0.35], // Altai
  [[[-79, 8], [-77, -2], [-76, -12], [-70, -18], [-69, -28], [-71, -40], [-73, -50]], 1.4, 0.95], // Andes
  [[[-150, 62], [-135, 59], [-125, 54], [-116, 48], [-110, 41], [-106, 33]], 2.6, 0.6], // Rockies
  [[[-108, 28], [-102, 22], [-98, 18]], 1.5, 0.4], // Sierra Madre
  [[[-84, 34], [-78, 39], [-72, 44]], 1.4, 0.22], // Appalachians
  [[[6, 45], [10, 46.5], [14, 47]], 1.1, 0.5], // Alps
  [[[40, 43.5], [48, 41]], 1, 0.45], // Caucasus
  [[[45, 36], [51, 32], [56, 28]], 1.5, 0.4], // Zagros
  [[[60, 50], [60, 68]], 1.1, 0.22], // Urals
  [[[-8, 31], [0, 33], [8, 35]], 1.2, 0.35], // Atlas
  [[[38, 12], [38, 7], [36, 0], [35, -8]], 2.2, 0.35], // East African highlands
  [[[6, 60], [12, 64], [17, 68]], 2, 0.3], // Scandinavian
  [[[146, -38], [150, -31], [146, -18]], 1.4, 0.22], // Great Dividing Range
  [[[-45, 64], [-40, 72], [-38, 78]], 6, 0.6], // Greenland ice dome
];

function rangeHeight(lon: number, lat: number) {
  let h = 0;
  for (const [pts, w, s] of RANGES) {
    let best = 1e9;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const t = clamp01(((lon - ax) * dx + (lat - ay) * dy) / (dx * dx + dy * dy || 1));
      const d = Math.hypot(lon - (ax + dx * t), lat - (ay + dy * t));
      if (d < best) best = d;
    }
    h += s * Math.exp(-((best / w) ** 2));
  }
  return h;
}

const DESERTS: [number, number, number, number][] = [
  [-17, 35, 15, 31], [35, 60, 14, 32], [55, 75, 24, 31], [75, 112, 37, 46], [115, 143, -31, -19],
  [-118, -103, 25, 37], [-72, -68, -28, -18], [12, 25, -28, -18], [-72, -65, -50, -38], [52, 62, 36, 45],
];
function desertness(lon: number, lat: number) {
  let d = 0;
  for (const [x0, x1, y0, y1] of DESERTS) {
    const ex = Math.max(x0 - lon, 0, lon - x1);
    const ey = Math.max(y0 - lat, 0, lat - y1);
    d = Math.max(d, Math.exp(-((Math.hypot(ex, ey) / 6.5) ** 2)));
  }
  return d;
}

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const C = {
  tropic: [46, 92, 42] as RGB,
  temperate: [92, 124, 60] as RGB,
  boreal: [58, 86, 52] as RGB,
  tundra: [138, 138, 112] as RGB,
  savanna: [150, 148, 86] as RGB,
  sand: [214, 190, 140] as RGB,
  sand2: [196, 160, 104] as RGB,
  rock: [124, 108, 90] as RGB,
  snow: [244, 246, 250] as RGB,
  deep: [14, 52, 102] as RGB,
  shelf: [44, 118, 172] as RGB,
};

export interface EarthTextures {
  color: HTMLCanvasElement;
  bump: HTMLCanvasElement;
  rough: HTMLCanvasElement;
}

/** Heavy-ish (one pass over ~2M pixels); call once and cache. */
export function paintEarth(earth: EarthData, W = 2048, H = 1024): EarthTextures {
  // land mask
  const maskC = canvas(W, H);
  const m = maskC.getContext('2d')!;
  m.fillStyle = '#000';
  m.fillRect(0, 0, W, H);
  fillCountries(m, earth.countries, W, H, () => '#fff');
  const mask = m.getImageData(0, 0, W, H).data;

  // ocean: deep water with smooth, lighter continental shelves (a blurred copy of the coastline)
  const oceanC = canvas(W, H);
  const o = oceanC.getContext('2d')!;
  o.fillStyle = `rgb(${C.deep.join(',')})`;
  o.fillRect(0, 0, W, H);
  const tintC = canvas(W, H);
  const t = tintC.getContext('2d')!;
  t.drawImage(maskC, 0, 0);
  t.globalCompositeOperation = 'multiply';
  t.fillStyle = `rgb(${C.shelf.join(',')})`;
  t.fillRect(0, 0, W, H);
  o.globalCompositeOperation = 'lighter';
  for (const [blur, alpha] of [[26, 0.55], [10, 0.6], [3, 0.5]] as const) {
    o.filter = `blur(${blur}px)`;
    o.globalAlpha = alpha;
    o.drawImage(tintC, 0, 0);
  }
  o.filter = 'none';
  o.globalAlpha = 1;
  o.globalCompositeOperation = 'source-over';
  const ocean = o.getImageData(0, 0, W, H).data;

  // height field at half resolution
  const HW = W / 2;
  const HH = H / 2;
  const height = new Float32Array(HW * HH);
  for (let y = 0; y < HH; y++) {
    const lat = 90 - ((y + 0.5) / HH) * 180;
    for (let x = 0; x < HW; x++) {
      const lon = ((x + 0.5) / HW) * 360 - 180;
      const land = mask[((y * 2) * W + x * 2) * 4] / 255;
      const n = fbm(x / HW, y / HH * 0.5, 12);
      height[y * HW + x] = land * (0.12 * n + rangeHeight(lon, lat) * (0.7 + 0.6 * n));
    }
  }
  // soften the height field (removes blocky relief when zoomed in)
  {
    const tmpC = canvas(HW, HH);
    const tc = tmpC.getContext('2d')!;
    const ti = tc.createImageData(HW, HH);
    for (let i = 0; i < HW * HH; i++) {
      const v = Math.round(clamp01(height[i]) * 255);
      ti.data[i * 4] = ti.data[i * 4 + 1] = ti.data[i * 4 + 2] = v;
      ti.data[i * 4 + 3] = 255;
    }
    tc.putImageData(ti, 0, 0);
    const blurC = canvas(HW, HH);
    const bl = blurC.getContext('2d')!;
    bl.filter = 'blur(1.4px)';
    bl.drawImage(tmpC, 0, 0);
    const bd = bl.getImageData(0, 0, HW, HH).data;
    for (let i = 0; i < HW * HH; i++) height[i] = bd[i * 4] / 255;
  }
  const hAtI = (x: number, y: number) => height[Math.min(HH - 1, Math.max(0, y)) * HW + (((x % HW) + HW) % HW)];
  // bilinear sample in half-res coordinates
  const hAt = (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const a = hAtI(x0, y0) + (hAtI(x0 + 1, y0) - hAtI(x0, y0)) * fx;
    const b = hAtI(x0, y0 + 1) + (hAtI(x0 + 1, y0 + 1) - hAtI(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };

  const colorC = canvas(W, H);
  const cc = colorC.getContext('2d')!;
  const img = cc.createImageData(W, H);
  const bumpC = canvas(HW, HH);
  const bc = bumpC.getContext('2d')!;
  const bimg = bc.createImageData(HW, HH);
  const roughC = canvas(W / 4, H / 4);
  const rc = roughC.getContext('2d')!;
  const rimg = rc.createImageData(W / 4, H / 4);

  for (let y = 0; y < H; y++) {
    const lat = 90 - ((y + 0.5) / H) * 180;
    const alat = Math.abs(lat);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const lon = ((x + 0.5) / W) * 360 - 180;
      const land = mask[i] / 255;
      const n = fbm(x / W, (y / H) * 0.5, 24);
      let col: RGB;
      if (land > 0.5) {
        // biome by latitude
        if (alat < 10) col = mix(C.tropic, C.savanna, clamp01((alat - 6) / 6) * 0.4);
        else if (alat < 20) col = mix(C.tropic, C.savanna, clamp01((alat - 8) / 10));
        else if (alat < 45) col = mix(C.savanna, C.temperate, clamp01((alat - 20) / 12));
        else if (alat < 60) col = mix(C.temperate, C.boreal, clamp01((alat - 45) / 12));
        else col = mix(C.boreal, C.tundra, clamp01((alat - 60) / 10));
        col = mix(col, mix(C.sand, C.sand2, n), desertness(lon, lat));
        col = mix(col, [col[0] * 0.8, col[1] * 0.85, col[2] * 0.8], n);
        // relief: rock then snow with height
        const hx = x / 2;
        const hy = y / 2;
        const h = hAt(hx, hy);
        col = mix(col, C.rock, clamp01((h - 0.35) * 1.6));
        col = mix(col, C.snow, clamp01((h - 0.85) * 2.5));
        // ice caps
        if (lat < -60 || (lat > 60 && lon > -75 && lon < -12) || lat > 79) col = mix(C.snow, [214, 224, 236], n * 0.6);
        // hillshade (light from the north-west)
        const gx = (hAt(hx + 1.5, hy) - hAt(hx - 1.5, hy)) * 0.66;
        const gy = (hAt(hx, hy + 1.5) - hAt(hx, hy - 1.5)) * 0.66;
        const shade = Math.min(1.12, Math.max(0.72, 0.95 + (-gx + gy) * 1.3));
        col = [col[0] * shade, col[1] * shade, col[2] * shade];
      } else {
        col = [Math.min(255, ocean[i]), Math.min(255, ocean[i + 1]), Math.min(255, ocean[i + 2])];
        col = mix(col, [col[0] * 0.9, col[1] * 0.95, col[2]], n * 0.6);
        if (lat < -66 || lat > 80) col = mix(col, [200, 214, 228], 0.5); // sea ice tint
      }
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  }
  cc.putImageData(img, 0, 0);

  // borders on top
  cc.strokeStyle = 'rgba(255,255,255,0.24)';
  cc.lineWidth = 0.6;
  for (const dx of [-W, 0, W]) {
    cc.beginPath();
    for (const line of earth.borders) {
      line.forEach(([lon, lat], i) => {
        const px = ((lon + 180) / 360) * W + dx;
        const py = ((90 - lat) / 180) * H;
        if (i === 0) cc.moveTo(px, py);
        else cc.lineTo(px, py);
      });
    }
    cc.stroke();
  }

  for (let i = 0; i < HW * HH; i++) {
    const v = Math.round(clamp01(height[i]) * 255);
    bimg.data[i * 4] = bimg.data[i * 4 + 1] = bimg.data[i * 4 + 2] = v;
    bimg.data[i * 4 + 3] = 255;
  }
  bc.putImageData(bimg, 0, 0);

  for (let y = 0; y < H / 4; y++)
    for (let x = 0; x < W / 4; x++) {
      const i = (y * (W / 4) + x) * 4;
      const land = mask[((y * 4) * W + x * 4) * 4] / 255;
      const r = land > 0.5 ? 245 : 205; // water slightly glossy, no harsh glare
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = r;
      rimg.data[i + 3] = 255;
    }
  rc.putImageData(rimg, 0, 0);

  return { color: colorC, bump: bumpC, rough: roughC };
}

// ---------------------------------------------------------------- data overlay (metric tint + resource overlays)
function pattern(ctx: CanvasRenderingContext2D, kind: 'stripes' | 'dots', color: string): CanvasPattern {
  const p = canvas(16, 16);
  const g = p.getContext('2d')!;
  g.strokeStyle = g.fillStyle = color;
  if (kind === 'stripes') {
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(-4, 20);
    g.lineTo(20, -4);
    g.stroke();
  } else {
    g.beginPath();
    g.arc(8, 8, 2.4, 0, Math.PI * 2);
    g.fill();
  }
  return ctx.createPattern(p, 'repeat')!;
}

export function paintOverlay(target: HTMLCanvasElement, earth: EarthData, state: WorldState, metric: MapMetric | 'none', overlays: MapOverlay[], hover: RegionId | null) {
  const W = target.width;
  const H = target.height;
  const ctx = target.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  const values = metric === 'none' ? null : regionMetric(state, metric);
  if (values) {
    ctx.globalAlpha = 0.55;
    fillCountries(ctx, earth.countries, W, H, (c) => (c.region && values[c.region] !== null ? rampColor(RAMPS[metric as MapMetric], values[c.region] ?? 0) : null));
  }
  ctx.globalAlpha = 1;
  if (hover) {
    ctx.globalAlpha = 0.3;
    fillCountries(ctx, earth.countries, W, H, (c) => (c.region === hover ? '#ffffff' : null));
    ctx.globalAlpha = 1;
  }
  if (overlays.includes('energy')) {
    const pat = pattern(ctx, 'stripes', 'rgba(255,70,50,0.9)');
    fillCountries(ctx, earth.countries, W, H, (c) => {
      const r = c.region ? state.regions[c.region] : null;
      return r && r.energy < 0 ? pat : null;
    });
  }
  if (overlays.includes('water')) {
    for (const c of earth.countries) {
      const r = c.region ? state.regions[c.region] : null;
      if (!r) continue;
      ctx.globalAlpha = clamp01(r.waterStress / 100);
      fillCountries(ctx, [c], W, H, () => pattern(ctx, 'dots', '#7fd3ff'));
    }
    ctx.globalAlpha = 1;
  }
}
