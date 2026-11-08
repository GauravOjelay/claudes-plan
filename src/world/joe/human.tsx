/**
 * Low-poly but human-proportioned figures for the Average Joe street.
 * Modelled in METRES (1.75 m tall), then scaled to scene units (1 unit ~ 2.5 m) by the caller.
 * `Human` is fully articulated with a procedural walk cycle; `makeCrowdGeometry` builds a merged,
 * single-pose person for instanced pedestrians.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { JoeJob } from '../../contracts';

export const M = 0.4; // metres -> scene units

const SKIN = ['#f1c9a5', '#d9a77f', '#b77d55', '#8d5a3b', '#5c3a26'];
const HAIR = ['#1f1612', '#3b2618', '#6a4527', '#a07040', '#2a2a2a', '#c9b8a0'];

export interface Outfit {
  jacket: string;
  shirt: string;
  trousers: string;
  shoes: string;
  hood?: boolean;
  cap?: string;
  backpack?: string;
}

const OUTFITS: Record<JoeJob, Outfit> = {
  employed: { jacket: '#27354f', shirt: '#e8ecf2', trousers: '#2c2f36', shoes: '#2a1c14' },
  lostSoftwareJob: { jacket: '#5d636e', shirt: '#3a3f47', trousers: '#2f3b52', shoes: '#d8d8d8', hood: true, backpack: '#2b2f38' },
  lostPhysicalJob: { jacket: '#7a5a3a', shirt: '#c9b38a', trousers: '#3a3a30', shoes: '#4a3524', cap: '#2f4f3a' },
  retraining: { jacket: '#c99a3a', shirt: '#f2efe8', trousers: '#2f3b52', shoes: '#f2f2f2', backpack: '#3b5c8a' },
  onUbi: { jacket: '#3f7a5c', shirt: '#e6e0d4', trousers: '#4a4f5a', shoes: '#e6e6e6' },
};

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function looksFor(name: string, job: JoeJob) {
  const h = hashStr(name);
  return { skin: SKIN[h % SKIN.length], hair: HAIR[(h >>> 5) % HAIR.length], outfit: OUTFITS[job] };
}

const cap = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 12);

/**
 * Articulated figure facing +z. `walk` (0..1) blends from standing to walking; `speed` in m/s sets cadence.
 * `wading` shortens the stride (flood).
 */
export function Human({ name, job, speed = 1.4, wading = false }: { name: string; job: JoeJob; speed?: number; wading?: boolean }) {
  const { skin, hair, outfit } = useMemo(() => looksFor(name, job), [name, job]);
  const hips = useRef<THREE.Group>(null);
  const spine = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const thighL = useRef<THREE.Group>(null);
  const thighR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);

  const geo = useMemo(() => ({
    chest: cap(0.17, 0.3),
    belly: cap(0.15, 0.12),
    pelvis: cap(0.14, 0.12),
    neck: new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10),
    head: new THREE.SphereGeometry(0.11, 24, 18),
    hair: new THREE.SphereGeometry(0.117, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hood: new THREE.SphereGeometry(0.15, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    capTop: new THREE.SphereGeometry(0.12, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    brim: new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16, 1, false, -Math.PI / 2, Math.PI),
    nose: new THREE.SphereGeometry(0.018, 8, 6),
    ear: new THREE.SphereGeometry(0.024, 8, 6),
    upperArm: cap(0.048, 0.22),
    foreArm: cap(0.042, 0.2),
    hand: new THREE.SphereGeometry(0.045, 12, 10),
    thigh: cap(0.074, 0.3),
    shin: cap(0.058, 0.3),
    shoe: new THREE.CapsuleGeometry(0.05, 0.16, 4, 10),
    collar: new THREE.TorusGeometry(0.07, 0.018, 8, 18),
    pack: cap(0.11, 0.16),
  }), []);

  const mat = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 }),
    jacket: new THREE.MeshStandardMaterial({ color: outfit.jacket, roughness: 0.8 }),
    shirt: new THREE.MeshStandardMaterial({ color: outfit.shirt, roughness: 0.7 }),
    trousers: new THREE.MeshStandardMaterial({ color: outfit.trousers, roughness: 0.85 }),
    shoes: new THREE.MeshStandardMaterial({ color: outfit.shoes, roughness: 0.45 }),
    cap: new THREE.MeshStandardMaterial({ color: outfit.cap ?? '#333', roughness: 0.8 }),
    pack: new THREE.MeshStandardMaterial({ color: outfit.backpack ?? '#333', roughness: 0.75 }),
  }), [skin, hair, outfit]);

  useFrame((s) => {
    const cadence = (speed / 1.4) * (wading ? 0.7 : 1);
    const t = s.clock.elapsedTime * Math.PI * 2 * cadence;
    const amp = wading ? 0.28 : 0.42;
    const sinT = Math.sin(t);
    const cosT = Math.cos(t);
    // legs: thigh swing (negative = forward), knee flexes while the leg swings through
    if (thighL.current) thighL.current.rotation.x = -sinT * amp;
    if (thighR.current) thighR.current.rotation.x = sinT * amp;
    if (kneeL.current) kneeL.current.rotation.x = 0.08 + 0.75 * Math.pow(Math.max(0, cosT), 1.6) * (amp / 0.42);
    if (kneeR.current) kneeR.current.rotation.x = 0.08 + 0.75 * Math.pow(Math.max(0, -cosT), 1.6) * (amp / 0.42);
    // arms counter-swing, elbows soft
    if (armL.current) armL.current.rotation.x = sinT * 0.32;
    if (armR.current) armR.current.rotation.x = -sinT * 0.32;
    if (elbowL.current) elbowL.current.rotation.x = -0.25 - 0.25 * Math.max(0, -sinT);
    if (elbowR.current) elbowR.current.rotation.x = -0.25 - 0.25 * Math.max(0, sinT);
    // body: double-frequency bob, slight sway and twist; head stays steady
    if (hips.current) {
      hips.current.position.y = 0.95 + 0.022 * Math.cos(2 * t) - (wading ? 0.02 : 0);
      hips.current.position.x = 0.018 * sinT;
      hips.current.rotation.y = 0.07 * sinT;
    }
    if (spine.current) {
      spine.current.rotation.y = -0.12 * sinT;
      spine.current.rotation.x = 0.04;
    }
    if (head.current) head.current.rotation.y = 0.05 * sinT;
  });

  return (
    <group>
      <group ref={hips} position={[0, 0.95, 0]}>
        <mesh geometry={geo.pelvis} material={mat.trousers} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.85]} castShadow />
        {/* legs */}
        {([[-1, thighL, kneeL], [1, thighR, kneeR]] as const).map(([side, thigh, knee]) => (
          <group key={side} ref={thigh} position={[side * 0.095, -0.02, 0]}>
            <mesh geometry={geo.thigh} material={mat.trousers} position={[0, -0.22, 0]} castShadow />
            <group ref={knee} position={[0, -0.44, 0]}>
              <mesh geometry={geo.shin} material={mat.trousers} position={[0, -0.21, 0]} castShadow />
              <mesh geometry={geo.shoe} material={mat.shoes} position={[0, -0.45, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 1, 0.8]} castShadow />
            </group>
          </group>
        ))}
        {/* torso */}
        <group ref={spine} position={[0, 0.05, 0]}>
          <mesh geometry={geo.belly} material={mat.jacket} position={[0, 0.14, 0]} scale={[1.05, 1, 0.78]} castShadow />
          <mesh geometry={geo.chest} material={mat.jacket} position={[0, 0.36, 0]} scale={[1.18, 1, 0.74]} castShadow />
          {!outfit.hood && <mesh geometry={geo.collar} material={mat.shirt} position={[0, 0.58, 0.01]} rotation={[Math.PI / 2, 0, 0]} />}
          {outfit.backpack && <mesh geometry={geo.pack} material={mat.pack} position={[0, 0.34, -0.17]} scale={[1.2, 1, 0.6]} castShadow />}
          <mesh geometry={geo.neck} material={mat.skin} position={[0, 0.62, 0]} />
          <group ref={head} position={[0, 0.7, 0]}>
            <mesh geometry={geo.head} material={mat.skin} position={[0, 0.1, 0.005]} scale={[0.88, 1.08, 0.98]} castShadow />
            <mesh geometry={geo.nose} material={mat.skin} position={[0, 0.09, 0.105]} />
            <mesh geometry={geo.ear} material={mat.skin} position={[0.095, 0.1, 0]} scale={[0.5, 1, 0.8]} />
            <mesh geometry={geo.ear} material={mat.skin} position={[-0.095, 0.1, 0]} scale={[0.5, 1, 0.8]} />
            {outfit.hood
              ? <mesh geometry={geo.hood} material={mat.jacket} position={[0, 0.09, -0.02]} rotation={[-0.35, 0, 0]} scale={[0.95, 1.05, 1]} castShadow />
              : <mesh geometry={geo.hair} material={mat.hair} position={[0, 0.12, -0.008]} rotation={[-0.25, 0, 0]} scale={[0.9, 1.05, 1]} />}
            {outfit.cap && (
              <group position={[0, 0.15, 0]}>
                <mesh geometry={geo.capTop} material={mat.cap} scale={[0.92, 0.8, 1]} />
                <mesh geometry={geo.brim} material={mat.cap} position={[0, 0, 0.07]} scale={[1, 1, 1.1]} />
              </group>
            )}
          </group>
          {/* arms */}
          {([[-1, armL, elbowL], [1, armR, elbowR]] as const).map(([side, arm, elbow]) => (
            <group key={side} ref={arm} position={[side * 0.215, 0.52, 0]} rotation={[0, 0, side * 0.06]}>
              <mesh geometry={geo.upperArm} material={mat.jacket} position={[0, -0.15, 0]} castShadow />
              <group ref={elbow} position={[0, -0.3, 0]}>
                <mesh geometry={geo.foreArm} material={mat.jacket} position={[0, -0.13, 0]} castShadow />
                <mesh geometry={geo.hand} material={mat.skin} position={[0, -0.29, 0.01]} scale={[0.8, 1.1, 0.6]} />
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

/**
 * Two merged geometries for instanced pedestrians (metres, facing +z, one mid-stride pose):
 * `clothes` takes the per-instance colour, `body` (skin, hair, trousers, shoes) uses vertex colours.
 */
export function makeCrowdGeometry(): { clothes: THREE.BufferGeometry; body: THREE.BufferGeometry } {
  const place = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, sx = 1, sy = 1, sz = 1) => {
    g.scale(sx, sy, sz);
    g.rotateX(rx);
    g.translate(x, y, z);
    return g;
  };
  const tint = (g: THREE.BufferGeometry, hex: string) => {
    const c = new THREE.Color(hex);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  };
  const strip = (g: THREE.BufferGeometry) => {
    g.deleteAttribute('uv');
    return g.index ? g.toNonIndexed() : g;
  };
  const clothes = mergeGeometries([
    place(cap(0.17, 0.3), 0, 1.36, 0, 0, 1.18, 1, 0.74),
    place(cap(0.15, 0.12), 0, 1.14, 0, 0, 1.05, 1, 0.78),
    place(cap(0.048, 0.5), -0.23, 1.22, 0.05, -0.25),
    place(cap(0.048, 0.5), 0.23, 1.22, -0.05, 0.25),
  ].map(strip))!;
  const body = mergeGeometries([
    tint(place(new THREE.SphereGeometry(0.11, 14, 10), 0, 1.75, 0, 0, 0.88, 1.08, 0.98), '#c99a78'),
    tint(place(new THREE.SphereGeometry(0.117, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 1.78, -0.01, -0.25), '#2a1c14'),
    tint(place(cap(0.074, 0.72), -0.095, 0.5, 0.08, -0.22), '#2c3140'),
    tint(place(cap(0.074, 0.72), 0.095, 0.5, -0.08, 0.22), '#2c3140'),
    tint(place(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), -0.095, 0.06, 0.22, Math.PI / 2), '#1b1b1d'),
    tint(place(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), 0.095, 0.06, -0.1, Math.PI / 2), '#1b1b1d'),
  ].map(strip))!;
  clothes.computeVertexNormals();
  body.computeVertexNormals();
  return { clothes, body };
}
