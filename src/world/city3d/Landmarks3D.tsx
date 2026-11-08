/**
 * Draws the landmarks and the distant backdrop of a city (see landmarks.ts). Each landmark is baked into a few merged
 * meshes (one per colour), so a whole city costs about ten draw calls. Lit parts (`glow`) shine at dusk and night and go
 * dark in a blackout.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildLandmark, drawScale, type Mountain, type Placed, type Prim } from './landmarks';
import { riverX } from './layout3d';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const ONE = new THREE.Vector3(1, 1, 1);

function primGeometry(p: Prim): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  switch (p.t) {
    case 'box': g = new THREE.BoxGeometry(p.s[0], p.s[1], p.s[2]); break;
    case 'cyl': g = new THREE.CylinderGeometry(p.rt, p.rb, p.h, p.seg, 1); break;
    case 'sphere': g = new THREE.SphereGeometry(p.r, 14, 10); if (p.sy && p.sy !== 1) g.scale(1, p.sy, 1); break;
    case 'torus': g = new THREE.TorusGeometry(p.R, p.tube, 6, 28); break;
    case 'lathe': g = new THREE.LatheGeometry(p.pts.map(([r, y]) => new THREE.Vector2(Math.max(0.01, r), y)), p.seg); break;
  }
  const q = 'q' in p && p.q ? tmpQ.set(p.q[0], p.q[1], p.q[2], p.q[3]) : tmpQ.setFromEuler(tmpE.set(0, 'ry' in p ? p.ry ?? 0 : 0, 0));
  tmpM.compose(new THREE.Vector3(p.p[0], p.p[1], p.p[2]), q, ONE);
  g.applyMatrix4(tmpM);
  return g;
}

export interface BakedPart { key: string; color: string; glow: boolean; geo: THREE.BufferGeometry }

/** Merges the primitives of one landmark into one geometry per (colour, glow). */
export function bakeLandmark(prims: Prim[]): BakedPart[] {
  const byKey = new Map<string, { color: string; glow: boolean; geos: THREE.BufferGeometry[] }>();
  for (const p of prims) {
    const key = `${p.c}|${p.glow ? 1 : 0}`;
    const e = byKey.get(key) ?? { color: p.c, glow: !!p.glow, geos: [] };
    e.geos.push(primGeometry(p));
    byKey.set(key, e);
  }
  const out: BakedPart[] = [];
  for (const [key, e] of byKey) {
    const geo = e.geos.length === 1 ? e.geos[0] : mergeGeometries(e.geos, false);
    if (e.geos.length > 1) e.geos.forEach((g) => g.dispose());
    if (geo) out.push({ key, color: e.color, glow: e.glow, geo });
  }
  return out;
}

export interface LandmarksProps {
  placed: Placed[];
  /** 0 (day) .. ~1.6 (night), the scene's window-light level. */
  night: number;
  /** 0..1, lights go dark. */
  blackout: number;
  /** Horizon colour: far landmarks are tinted toward it. */
  fog: string;
}

export function Landmarks({ placed, night, blackout, fog }: LandmarksProps) {
  const baked = useMemo(() => placed.map((p) => ({ p, parts: bakeLandmark(buildLandmark(p.kind)) })), [placed]);
  useEffect(() => () => baked.forEach((b) => b.parts.forEach((q) => q.geo.dispose())), [baked]);
  const glow = Math.min(1.3, night * 0.85) * (1 - 0.92 * Math.min(1, blackout)) + 0.04;
  const fogC = useMemo(() => new THREE.Color(fog), [fog]);
  return (
    <group>
      {baked.map(({ p, parts }, i) => {
        const x = p.onRiver ? riverX(p.z) + p.x : p.x;
        return (
          <group key={`${p.kind}-${i}`} position={[x, 0, p.z]} rotation={[0, p.ry ?? 0, 0]} scale={drawScale(p)}>
            {parts.map((q) => {
              const color = p.far ? new THREE.Color(q.color).lerp(fogC, 0.5) : q.color;
              return (
                <mesh key={q.key} geometry={q.geo} castShadow={!p.far} receiveShadow>
                  <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} side={THREE.DoubleSide} fog={!p.far}
                    emissive={q.glow ? q.color : '#000000'} emissiveIntensity={q.glow ? glow : 0} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/** Far mountains and ridges: simple cones with a snow cap, tinted toward the horizon colour (no fog, they are too far). */
export function Backdrop({ mountains, fog }: { mountains: Mountain[]; fog: string }) {
  const fogC = useMemo(() => new THREE.Color(fog), [fog]);
  return (
    <group>
      {mountains.map((m, i) => {
        const body = new THREE.Color(m.color).lerp(fogC, 0.5);
        const cap = m.cap ? new THREE.Color(m.cap).lerp(fogC, 0.3) : null;
        const capH = m.h * 0.28; // the cap is a slightly wider copy of the top of the cone, so it sits just outside it
        return (
          <group key={i} position={[m.x, 0, m.z]}>
            <mesh position={[0, m.h / 2 - 40, 0]}>
              <coneGeometry args={[m.r, m.h, 20, 1]} />
              <meshBasicMaterial color={body} fog={false} />
            </mesh>
            {cap && (
              <mesh position={[0, m.h - 40 - capH / 2, 0]}>
                <coneGeometry args={[m.r * 0.3, capH, 20, 1]} />
                <meshBasicMaterial color={cap} fog={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
