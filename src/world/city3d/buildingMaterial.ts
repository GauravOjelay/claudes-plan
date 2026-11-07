/**
 * Building geometry + a MeshStandardMaterial extended with procedural windows.
 * City effects only change uniforms (no geometry rebuild): blackout, ghost offices, bank run, solar roofs.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Bldg3, Box3, Style } from './layout3d';

export interface CityUniforms {
  uBlackout: { value: number };
  uGhost: { value: number };
  uSolar: { value: number };
  uBankDark: { value: number };
  uNight: { value: number };
  uTime: { value: number };
}

export function makeUniforms(): CityUniforms {
  return {
    uBlackout: { value: 0 },
    uGhost: { value: 0 },
    uSolar: { value: 0 },
    uBankDark: { value: 0 },
    uNight: { value: 0.3 },
    uTime: { value: 0 },
  };
}

const STYLE: Record<Style, { color: string; roughness: number; metalness: number; glass: [number, number, number]; glassMix: number }> = {
  brick: { color: '#b3603f', roughness: 0.9, metalness: 0, glass: [0.22, 0.2, 0.2], glassMix: 0.55 },
  stone: { color: '#dcc49c', roughness: 0.85, metalness: 0, glass: [0.3, 0.29, 0.28], glassMix: 0.5 },
  concrete: { color: '#e4e0d6', roughness: 0.8, metalness: 0, glass: [0.32, 0.36, 0.4], glassMix: 0.5 },
  glass: { color: '#c9a777', roughness: 0.3, metalness: 0.25, glass: [0.62, 0.5, 0.34], glassMix: 0.75 },
  hq: { color: '#a9c0cf', roughness: 0.25, metalness: 0.3, glass: [0.45, 0.58, 0.68], glassMix: 0.8 },
};

/** One box with per-vertex building info (aInfo) and world-space facade coords (aWuv). */
function boxGeometry(p: Box3, b: Bldg3): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(p.w, p.h, p.d);
  g.translate(p.x, p.y0 + p.h / 2, p.z);
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const n = pos.count;
  const wuv = new Float32Array(n * 2);
  const info = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = nor.getY(i);
    // u runs along the face; v is height above ground. Roofs use x/z.
    if (ny > 0.5 || ny < -0.5) {
      wuv[i * 2] = x;
      wuv[i * 2 + 1] = z;
    } else {
      wuv[i * 2] = nx > 0.5 ? z : x;
      wuv[i * 2 + 1] = y;
    }
    info[i * 4] = b.district;
    info[i * 4 + 1] = b.kind;
    info[i * 4 + 2] = b.seed;
    info[i * 4 + 3] = b.height;
  }
  g.setAttribute('aWuv', new THREE.BufferAttribute(wuv, 2));
  g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  g.deleteAttribute('uv');
  return g;
}

/** Merge all buildings into one geometry per style (a handful of draw calls for the whole city). */
export function buildCityGeometries(buildings: Bldg3[]): Partial<Record<Style, THREE.BufferGeometry>> {
  const byStyle = new Map<Style, THREE.BufferGeometry[]>();
  for (const b of buildings) {
    // the HQ spire stays plain: skip windows by giving it its own style bucket below
    for (const p of b.parts) {
      const list = byStyle.get(b.style) ?? [];
      list.push(boxGeometry(p, b));
      byStyle.set(b.style, list);
    }
  }
  const out: Partial<Record<Style, THREE.BufferGeometry>> = {};
  for (const [style, list] of byStyle) {
    const merged = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (merged) out[style] = merged;
  }
  return out;
}

const VERT_PRE = /* glsl */ `
attribute vec4 aInfo;
attribute vec2 aWuv;
varying vec4 vInfo;
varying vec2 vWuv;
varying float vRoof;
`;

const FRAG_PRE = /* glsl */ `
uniform float uBlackout;
uniform float uGhost;
uniform float uSolar;
uniform float uBankDark;
uniform float uNight;
uniform float uTime;
uniform vec3 uGlass;
uniform float uGlassMix;
varying vec4 vInfo;
varying vec2 vWuv;
varying float vRoof;
float wHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

const MAP_FRAG = /* glsl */ `
vec2 wCell = vWuv / vec2(1.7, 1.4);
vec2 wF = fract(wCell);
float wWin = (1.0 - vRoof) * step(0.24, wF.x) * step(wF.x, 0.76) * step(0.28, wF.y) * step(wF.y, 0.82) * step(2.0, vWuv.y);
float wH = wHash(floor(wCell) + vInfo.z * 97.0);
float wTone = 0.82 + 0.36 * fract(vInfo.z * 7.13);
vec3 wWall = diffuseColor.rgb * wTone;
vec3 wGlass = uGlass * (0.85 + 0.3 * wH);
diffuseColor.rgb = mix(wWall, wGlass, wWin * uGlassMix);
if (vRoof > 0.5) {
  diffuseColor.rgb = wWall * 0.55;
  // Solar boom: panels spread across a growing share of rooftops.
  if (fract(vInfo.z * 13.37) < uSolar && vInfo.y < 1.5) {
    vec2 g = fract(vWuv / 1.3);
    float panel = step(0.1, g.x) * step(0.12, g.y);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.12, 0.32), panel);
  }
}
`;

const EMIT_FRAG = /* glsl */ `
float wKind = vInfo.y;
float wBase = wKind > 1.5 ? 0.78 : (wKind > 0.5 ? 0.55 : 0.45);
float wLit = step(wH, wBase);
float wFloor = vWuv.y / max(vInfo.w, 1.0);
// Ghost offices: towers go dark from the top floor down.
if (wKind > 0.5 && wKind < 1.5 && wFloor > 1.0 - uGhost) wLit = 0.0;
// Blackout: whole districts lose power. HQ data centres and the hospital keep it; solar partly reverses it.
float wBo = max(0.0, uBlackout - 0.6 * uSolar);
if ((wKind < 1.5 || wKind > 3.5) && vInfo.x < wBo) {
  wLit = wH > 0.92 ? step(0.55, fract(sin(uTime * 9.0 + wH * 61.0) * 43758.5)) : 0.0;
}
if (wKind > 3.5 && uBankDark > 0.5) wLit = 0.0;
vec3 wWarm = wKind > 1.5 && wKind < 2.5 ? vec3(0.75, 0.92, 1.0) : mix(vec3(1.0, 0.76, 0.42), vec3(0.95, 0.95, 0.85), step(0.5, wKind));
totalEmissiveRadiance += wWarm * wWin * wLit * uNight * (0.8 + 0.4 * wH);
`;

export function makeBuildingMaterial(style: Style, uniforms: CityUniforms): THREE.MeshStandardMaterial {
  const s = STYLE[style];
  const mat = new THREE.MeshStandardMaterial({ color: s.color, roughness: s.roughness, metalness: s.metalness });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, {
      uGlass: { value: new THREE.Vector3(...s.glass) },
      uGlassMix: { value: s.glassMix },
    });
    shader.vertexShader = VERT_PRE + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvInfo = aInfo;\nvWuv = aWuv;\nvRoof = step(0.5, normal.y);',
    );
    shader.fragmentShader = FRAG_PRE + shader.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + MAP_FRAG)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + EMIT_FRAG);
  };
  mat.customProgramCacheKey = () => `city-building-${style}`;
  return mat;
}
