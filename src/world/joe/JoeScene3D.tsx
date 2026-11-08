/**
 * "Average Joe": street-level THIRD-PERSON view of one citizen walking through their neighbourhood.
 * The street around them reflects `joe.situation` (prosperous, struggling, blackout, protests, flood, war,
 * surveillance, outbreak, normal). Sensitive situations stay abstract and non-graphic.
 * Lazy-loaded by CityView. Units match the city scene (1 unit ~ 2.5 m).
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor, RoundedBox, Sky } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AverageJoe, JoeJob, JoeSituation } from '../../contracts';
import { buildCityGeometries, makeBuildingMaterial, makeUniforms } from '../city3d/buildingMaterial';
import { softTexture } from '../city3d/effects3d';
import type { Bldg3, Style } from '../city3d/layout3d';
import { FpsMeter, useFpsVisible } from '../FpsMeter';
import { visualRng } from '../util';
import { Human, M, makeCrowdGeometry } from './human';
import '../world.css';

const P = 120; // street period (units); the street repeats seamlessly every P
const COPIES = [0, -P, -2 * P, P];
const WALK_X = 3.15; // Joe walks on the right-hand pavement
const SPEED = 0.6; // units per second (~1.5 m/s)

interface Look {
  sunElev: number;
  sun: string;
  sunI: number;
  hemi: number;
  fog: string;
  fogFar: number;
  night: number;
  turbidity: number;
  streetLights: boolean;
  people: number;
}

const LOOKS: Record<JoeSituation, Look> = {
  prosperous: { sunElev: 38, sun: '#fff1d6', sunI: 3, hemi: 1.1, fog: '#cfe2f5', fogFar: 260, night: 0, turbidity: 3, streetLights: false, people: 60 },
  normal: { sunElev: 24, sun: '#ffe6c2', sunI: 2.6, hemi: 0.95, fog: '#d8d6cf', fogFar: 240, night: 0.05, turbidity: 6, streetLights: false, people: 34 },
  struggling: { sunElev: 14, sun: '#d8d2c8', sunI: 1.2, hemi: 0.7, fog: '#a8a6a2', fogFar: 170, night: 0.1, turbidity: 18, streetLights: false, people: 12 },
  blackout: { sunElev: -6, sun: '#8fa8ff', sunI: 0.35, hemi: 0.25, fog: '#141a2a', fogFar: 160, night: 1.4, turbidity: 2, streetLights: false, people: 8 },
  protests: { sunElev: 18, sun: '#ffd9b0', sunI: 2.2, hemi: 0.85, fog: '#cdc3b6', fogFar: 220, night: 0.1, turbidity: 8, streetLights: false, people: 20 },
  flood: { sunElev: 10, sun: '#c9d2dc', sunI: 1.1, hemi: 0.7, fog: '#8e9aa6', fogFar: 160, night: 0.15, turbidity: 20, streetLights: true, people: 4 },
  war: { sunElev: 8, sun: '#e0a070', sunI: 1.3, hemi: 0.55, fog: '#7d6a60', fogFar: 300, night: 0.2, turbidity: 15, streetLights: false, people: 0 },
  surveillance: { sunElev: 4, sun: '#c7d4ff', sunI: 1.4, hemi: 0.6, fog: '#5d6680', fogFar: 200, night: 0.6, turbidity: 6, streetLights: true, people: 16 },
  outbreak: { sunElev: 16, sun: '#e6efe6', sunI: 1.6, hemi: 0.75, fog: '#b5bdb5', fogFar: 190, night: 0.1, turbidity: 14, streetLights: false, people: 6 },
};

// ---------------------------------------------------------------- street layout (one period, pure)
interface Shop { x: number; z: number; w: number; side: 1 | -1; awning: string }
interface StreetLayout { buildings: Bldg3[]; shops: Shop[]; trees: { x: number; z: number }[]; lamps: { x: number; z: number }[]; cars: { x: number; z: number; c: string }[] }

function buildStreet(seed: string): StreetLayout {
  const rnd = visualRng(`street:${seed}`);
  const buildings: Bldg3[] = [];
  const shops: Shop[] = [];
  let id = 0;
  for (const side of [1, -1] as const) {
    let z = 0;
    while (z > -P) {
      const w = 4 + rnd() * 3.5;
      const d = 6 + rnd() * 3;
      const h = 5 + Math.floor(rnd() * 6) * 1.4;
      const x = side * (4.2 + d / 2);
      const r = rnd();
      const style: Style = r < 0.45 ? 'brick' : r < 0.8 ? 'stone' : 'concrete';
      buildings.push({ id: id++, style, kind: rnd() < 0.5 ? 1 : 0, district: rnd(), seed: rnd(), height: h, parts: [{ x, z: z - w / 2, y0: 0, w: d, d: w - 0.25, h }] });
      shops.push({ x: side * 4.2, z: z - w / 2, w: w - 0.6, side, awning: ['#b23a2c', '#2f6f5a', '#c79a3a', '#3b5c8a', '#6b4a8a'][Math.floor(rnd() * 5)] });
      z -= w;
    }
  }
  const trees = Array.from({ length: 10 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * 2.55, z: -i * (P / 10) - 4 }));
  const lamps = Array.from({ length: 10 }, (_, i) => ({ x: (i % 2 ? -1 : 1) * 2.45, z: -i * (P / 10) - 3 }));
  const cars = Array.from({ length: 8 }, (_, i) => ({ x: -1.7, z: -i * (P / 8) - 6 - rnd() * 5, c: ['#d9dde6', '#2e2e34', '#7a8796', '#a83232', '#2f4f7a'][Math.floor(rnd() * 5)] }));
  return { buildings, shops, trees, lamps, cars };
}

// ---------------------------------------------------------------- pieces
function StreetCopy({ street, geos, mats, situation, look, candleTex }: {
  street: StreetLayout; geos: Partial<Record<Style, THREE.BufferGeometry>>; mats: Partial<Record<Style, THREE.Material>>;
  situation: JoeSituation; look: Look; candleTex: THREE.Texture;
}) {
  const shuttered = situation === 'struggling' || situation === 'war';
  return (
    <group>
      {(Object.keys(geos) as Style[]).map((s) => <mesh key={s} geometry={geos[s]} material={mats[s]} castShadow receiveShadow />)}
      <Cornices street={street} />
      {/* shop fronts: glass + awning, or shutters / boards */}
      {street.shops.map((sh, i) => {
        const closed = shuttered && (i % 3 !== 0 || situation === 'war');
        const fx = sh.x + sh.side * 0.06;
        return (
          <group key={i} position={[fx, 0, sh.z]}>
            <mesh position={[0, 1.0, 0]} rotation={[0, sh.side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
              <planeGeometry args={[sh.w, 1.7]} />
              {closed
                ? <meshStandardMaterial color={situation === 'war' ? '#8a6a46' : '#6d7178'} roughness={0.9} side={THREE.DoubleSide} />
                : <meshStandardMaterial color="#1d2a33" emissive={look.night > 0.5 && situation !== 'blackout' ? '#ffcf88' : '#000'} emissiveIntensity={0.6} roughness={0.2} metalness={0.4} side={THREE.DoubleSide} />}
            </mesh>
            {situation === 'war' && [0.6, 1.2].map((y) => (
              <mesh key={y} position={[-sh.side * 0.05, y, 0]} rotation={[0.35, 0, 0]}>
                <boxGeometry args={[0.08, 0.18, sh.w * 0.9]} />
                <meshStandardMaterial color="#a07a4e" />
              </mesh>
            ))}
            {!closed && (
              <mesh position={[-sh.side * 0.55, 2.05, 0]} rotation={[0, 0, sh.side * 0.35]}>
                <boxGeometry args={[1.1, 0.06, sh.w * 0.95]} />
                <meshStandardMaterial color={sh.awning} />
              </mesh>
            )}
          </group>
        );
      })}
      {street.trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.08, 0.1, 1.8, 6]} /><meshStandardMaterial color="#5a4632" /></mesh>
          <mesh position={[0, 2.2, 0]} castShadow><icosahedronGeometry args={[situation === 'prosperous' ? 1.15 : 0.95, 1]} /><meshStandardMaterial color={situation === 'struggling' || situation === 'war' ? '#6b6a48' : '#3f6a2e'} roughness={0.9} /></mesh>
        </group>
      ))}
      {street.lamps.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <mesh position={[0, 1.7, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 3.4, 10]} /><meshStandardMaterial color="#6b717c" metalness={0.5} roughness={0.45} /></mesh>
          <mesh position={[0, 3.4, 0]}><sphereGeometry args={[0.14, 10, 8]} /><meshBasicMaterial color={look.streetLights ? '#ffe2a6' : '#55585e'} toneMapped={false} /></mesh>
        </group>
      ))}
      {street.cars.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <RoundedBox args={[0.74, 0.32, 1.78]} radius={0.08} smoothness={3} position={[0, 0.3, 0]} castShadow>
            <meshStandardMaterial color={c.c} metalness={0.45} roughness={0.35} />
          </RoundedBox>
          <RoundedBox args={[0.66, 0.26, 0.95]} radius={0.09} smoothness={3} position={[0, 0.56, -0.05]} castShadow>
            <meshStandardMaterial color="#9fb4c4" metalness={0.6} roughness={0.08} />
          </RoundedBox>
          {[[-0.36, 0.55], [0.36, 0.55], [-0.36, -0.58], [0.36, -0.58]].map(([wx, wz], k) => (
            <mesh key={k} position={[wx, 0.14, wz]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.14, 0.14, 0.1, 16]} /><meshStandardMaterial color="#1b1b1d" roughness={0.9} /></mesh>
          ))}
        </group>
      ))}
      {/* situation props that live on the street */}
      {situation === 'prosperous' && street.shops.filter((_, i) => i % 3 === 0).map((sh, i) => (
        <group key={`cafe${i}`} position={[sh.x - sh.side * 1.0, 0, sh.z]}>
          {[-0.6, 0.6].map((dz) => (
            <group key={dz} position={[0, 0, dz]}>
              <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.22, 0.22, 0.04, 12]} /><meshStandardMaterial color="#f2efe8" /></mesh>
              <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.03, 0.03, 0.35, 6]} /><meshStandardMaterial color="#444" /></mesh>
              <mesh position={[0, 1.0, 0]}><coneGeometry args={[0.55, 0.3, 8]} /><meshStandardMaterial color={i % 2 ? '#e8b04a' : '#f2efe8'} /></mesh>
              <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.02, 0.02, 0.8, 4]} /><meshStandardMaterial color="#666" /></mesh>
            </group>
          ))}
        </group>
      ))}
      {situation === 'struggling' && street.shops.filter((_, i) => i % 4 === 1).map((sh, i) => (
        <mesh key={`let${i}`} position={[sh.x - sh.side * 0.08, 1.4, sh.z]} rotation={[0, sh.side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <planeGeometry args={[0.9, 0.35]} />
          <meshBasicMaterial color="#e8e1c8" side={THREE.DoubleSide} />
        </mesh>
      ))}
      {situation === 'flood' && street.shops.filter((_, i) => i % 2 === 0).map((sh, i) => (
        <mesh key={`bag${i}`} position={[sh.x - sh.side * 0.35, 0.2, sh.z]}><boxGeometry args={[0.35, 0.4, sh.w * 0.7]} /><meshStandardMaterial color="#b8a27a" roughness={1} /></mesh>
      ))}
      {situation === 'blackout' && <Candles street={street} tex={candleTex} />}
      {situation === 'surveillance' && street.lamps.map((l, i) => <ScanCamera key={`cam${i}`} x={l.x} z={l.z + 3} phase={i} />)}
    </group>
  );
}

function Candles({ street, tex }: { street: StreetLayout; tex: THREE.Texture }) {
  const items = useMemo(() => {
    const r = visualRng('candles');
    return street.buildings.flatMap((b) => {
      const p = b.parts[0];
      const face = p.x > 0 ? p.x - p.w / 2 - 0.05 : p.x + p.w / 2 + 0.05;
      return Array.from({ length: 2 }, () => ({ x: face, y: 2.2 + Math.floor(r() * ((p.h - 2.5) / 1.4)) * 1.4 + 0.6, z: p.z + (r() - 0.5) * (p.d - 1), ph: r() * 6 }));
    });
  }, [street]);
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  useFrame((s) => refs.current.forEach((sp, i) => {
    if (!sp) return;
    const f = 0.75 + 0.25 * Math.sin(s.clock.elapsedTime * 9 + items[i].ph) * Math.sin(s.clock.elapsedTime * 3.7 + items[i].ph);
    sp.scale.setScalar(0.55 * f);
  }));
  return (
    <group>
      {items.map((c, i) => (
        <sprite key={i} ref={(r) => (refs.current[i] = r)} position={[c.x, c.y, c.z]}>
          <spriteMaterial map={tex} color="#ffb04a" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

function ScanCamera({ x, z, phase }: { x: number; z: number; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.7 + phase) * 1.1; });
  return (
    <group position={[x, 3.0, z]}>
      <group ref={ref}>
        <mesh position={[0, 0, 0.2]}><boxGeometry args={[0.18, 0.15, 0.4]} /><meshStandardMaterial color="#e0e4ea" /></mesh>
        <mesh position={[0, -1.5, 1.9]} rotation={[-Math.PI / 2 + 0.75, 0, 0]}>
          <coneGeometry args={[1.2, 3.6, 16, 1, true]} />
          <meshBasicMaterial color="#ff3030" transparent opacity={0.13} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Joe: an articulated human (see human.tsx) walking down the pavement. Exposes his position through `pos`. */
function Joe({ name, job, pos, wading }: { name: string; job: JoeJob; pos: React.MutableRefObject<THREE.Vector3>; wading: boolean }) {
  const root = useRef<THREE.Group>(null);
  const speed = wading ? SPEED * 0.55 : SPEED;
  useFrame((_, dt) => {
    const p = pos.current;
    p.z -= speed * Math.min(dt, 0.05);
    root.current?.position.set(p.x, 0.12, p.z);
  });
  return (
    <group ref={root} rotation={[0, Math.PI, 0]} scale={M}>
      <Human name={name} job={job} speed={speed / M} wading={wading} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Other pedestrians: instanced human figures walking both ways around Joe. */
function Pedestrians({ n, joe }: { n: number; joe: React.MutableRefObject<THREE.Vector3> }) {
  const clothes = useRef<THREE.InstancedMesh>(null);
  const body = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(makeCrowdGeometry, []);
  const peds = useMemo(() => {
    const r = visualRng(`peds:${n}`);
    return Array.from({ length: n }, () => ({ side: r() < 0.5 ? 1 : -1, off: r() * 160, speed: 0.45 + r() * 0.25, dir: r() < 0.5 ? 1 : -1, x: 2.75 + r() * 0.8, s: 0.92 + r() * 0.14, c: ['#e6e0d4', '#2b2f3a', '#7d5b46', '#4b6584', '#b8433a', '#d8b46a', '#5d7a4a', '#8a6a9a'][Math.floor(r() * 8)] }));
  }, [n]);
  useLayoutEffect(() => {
    peds.forEach((p, i) => clothes.current?.setColorAt(i, new THREE.Color(p.c)));
    if (clothes.current?.instanceColor) clothes.current.instanceColor.needsUpdate = true;
  }, [peds]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    const jz = joe.current.z;
    peds.forEach((p, i) => {
      const along = (((p.off + t * p.speed * p.dir) % 160) + 160) % 160;
      o.position.set(p.side * p.x, 0.12 + Math.abs(Math.sin(t * 7 * p.speed + p.off)) * 0.012, jz - along + 40);
      o.rotation.set(0, p.dir > 0 ? Math.PI : 0, Math.sin(t * 7 * p.speed + p.off) * 0.03);
      o.scale.setScalar(M * p.s);
      o.updateMatrix();
      clothes.current?.setMatrixAt(i, o.matrix);
      body.current?.setMatrixAt(i, o.matrix);
    });
    if (clothes.current) clothes.current.instanceMatrix.needsUpdate = true;
    if (body.current) body.current.instanceMatrix.needsUpdate = true;
  });
  if (!n) return null;
  return (
    <group>
      <instancedMesh ref={clothes} args={[geo.clothes, undefined, n]} frustumCulled={false} castShadow>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={body} args={[geo.body, undefined, n]} frustumCulled={false} castShadow>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </instancedMesh>
    </group>
  );
}

/** A protest gathering ahead in the road (repeats each street period). */
function ProtestCrowd() {
  const clothes = useRef<THREE.InstancedMesh>(null);
  const body = useRef<THREE.InstancedMesh>(null);
  const signs = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(makeCrowdGeometry, []);
  const people = useMemo(() => {
    const r = visualRng('protest');
    return Array.from({ length: 220 }, () => ({ x: (r() - 0.5) * 4.2, z: -22 - r() * 26, ph: r() * 6, sign: r() < 0.25, rot: (r() - 0.5) * 0.8, c: ['#b8433a', '#e6e0d4', '#4b6584', '#d8b46a', '#2b2f3a'][Math.floor(r() * 5)] }));
  }, []);
  const signCount = people.filter((p) => p.sign).length;
  useLayoutEffect(() => {
    people.forEach((p, i) => clothes.current?.setColorAt(i, new THREE.Color(p.c)));
    if (clothes.current?.instanceColor) clothes.current.instanceColor.needsUpdate = true;
  }, [people]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    let k = 0;
    people.forEach((p, i) => {
      const bob = Math.max(0, Math.sin(t * 4 + p.ph)) * 0.03;
      o.position.set(p.x, bob, p.z);
      o.rotation.set(0, p.rot, 0);
      o.scale.setScalar(M);
      o.updateMatrix();
      clothes.current?.setMatrixAt(i, o.matrix);
      body.current?.setMatrixAt(i, o.matrix);
      if (p.sign) {
        o.position.set(p.x, 0.92 + bob, p.z);
        o.rotation.set(0, p.rot, Math.sin(t * 2 + p.ph) * 0.15);
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        signs.current?.setMatrixAt(k++, o.matrix);
      }
    });
    [clothes, body, signs].forEach((r) => { if (r.current) r.current.instanceMatrix.needsUpdate = true; });
  });
  return (
    <group>
      <instancedMesh ref={clothes} args={[geo.clothes, undefined, people.length]} frustumCulled={false}><meshStandardMaterial roughness={0.8} /></instancedMesh>
      <instancedMesh ref={body} args={[geo.body, undefined, people.length]} frustumCulled={false}><meshStandardMaterial vertexColors roughness={0.7} /></instancedMesh>
      <instancedMesh ref={signs} args={[undefined, undefined, signCount]} frustumCulled={false}>
        <boxGeometry args={[0.36, 0.22, 0.02]} />
        <meshStandardMaterial color="#f4e04d" emissive="#f4e04d" emissiveIntensity={0.15} />
      </instancedMesh>
    </group>
  );
}

/** Distant smoke columns and flashing emergency lights on the horizon (war; abstract, non-graphic). */
function DistantSmoke({ tex, joe }: { tex: THREE.Texture; joe: React.MutableRefObject<THREE.Vector3> }) {
  const group = useRef<THREE.Group>(null);
  const puffs = useRef<(THREE.Sprite | null)[]>([]);
  const light = useRef<THREE.Mesh>(null);
  const cols = [{ x: -40, z: -230 }, { x: 25, z: -260 }, { x: 70, z: -210 }];
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (group.current) group.current.position.z = joe.current.z; // stays on the horizon
    puffs.current.forEach((sp, i) => {
      if (!sp) return;
      const c = cols[i % cols.length];
      const life = ((t * 0.06 + i / 18) % 1);
      sp.position.set(c.x + life * 25, 4 + life * 70, c.z);
      const sz = 10 + life * 40;
      sp.scale.set(sz, sz, 1);
      (sp.material as THREE.SpriteMaterial).opacity = 0.5 * (1 - life);
    });
    if (light.current) (light.current.material as THREE.MeshBasicMaterial).color.set(Math.sin(t * 8) > 0 ? '#ff2a2a' : '#2a5aff');
  });
  return (
    <group ref={group}>
      {Array.from({ length: 18 }, (_, i) => (
        <sprite key={i} ref={(r) => (puffs.current[i] = r)}>
          <spriteMaterial map={tex} color="#5e5650" transparent depthWrite={false} fog={false} />
        </sprite>
      ))}
      <mesh ref={light} position={[1.5, 1.2, -90]}><sphereGeometry args={[0.35, 8, 8]} /><meshBasicMaterial color="#ff2a2a" toneMapped={false} fog={false} /></mesh>
    </group>
  );
}

function Ambulance({ joe }: { joe: React.MutableRefObject<THREE.Vector3> }) {
  const ref = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const cycle = (t * 9) % 260;
    if (ref.current) ref.current.position.set(-1.0, 0, joe.current.z - 120 + cycle);
    if (lamp.current) lamp.current.visible = Math.sin(t * 12) > 0;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.9, 0.95, 2.1]} /><meshStandardMaterial color="#f2f4f7" /></mesh>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.92, 0.18, 0.5]} /><meshStandardMaterial color="#e02020" /></mesh>
      <mesh ref={lamp} position={[0, 1.08, 0.6]}><boxGeometry args={[0.6, 0.12, 0.2]} /><meshBasicMaterial color="#3a7dff" toneMapped={false} /></mesh>
    </group>
  );
}

function Drones({ joe }: { joe: React.MutableRefObject<THREE.Vector3> }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    ref.current?.children.forEach((c, i) => c.position.set(Math.sin(t * 0.4 + i) * 4, 9 + Math.sin(t * 1.3 + i) * 0.5, joe.current.z - 10 - i * 14 + Math.cos(t * 0.3 + i) * 3));
  });
  return (
    <group ref={ref}>
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i}>
          <mesh><boxGeometry args={[0.9, 0.12, 0.9]} /><meshStandardMaterial color="#2a2d33" /></mesh>
          <mesh position={[0, -0.12, 0]}><sphereGeometry args={[0.1, 8, 8]} /><meshBasicMaterial color="#ff2020" toneMapped={false} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- scene
function JoeWorld({ joe, situation }: { joe: AverageJoe; situation: JoeSituation }) {
  const look = LOOKS[situation];
  const street = useMemo(() => buildStreet(joe.cityId), [joe.cityId]);
  const uniforms = useMemo(makeUniforms, []);
  const geos = useMemo(() => buildCityGeometries(street.buildings), [street]);
  const mats = useMemo(() => Object.fromEntries((Object.keys(geos) as Style[]).map((s) => [s, makeBuildingMaterial(s, uniforms)])) as Partial<Record<Style, THREE.Material>>, [geos, uniforms]);
  const soft = useMemo(softTexture, []);
  const tex = useMemo(groundTextures, []);
  const pos = useRef(new THREE.Vector3(WALK_X, 0, -10));
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const last = useRef(pos.current.clone());

  useEffect(() => {
    scene.fog = new THREE.Fog(look.fog, 20, look.fogFar);
    gl.toneMappingExposure = situation === 'blackout' ? 1.2 : 1;
  }, [scene, gl, look, situation]);

  useEffect(() => {
    // windows: blackout kills them, otherwise a lived-in mix
    uniforms.uBlackout.value = situation === 'blackout' ? 1 : 0;
    uniforms.uGhost.value = situation === 'struggling' ? 0.4 : 0;
    uniforms.uNight.value = look.night;
  }, [uniforms, situation, look]);

  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime;
    const p = pos.current;
    // seamless loop: the street repeats every P
    if (p.z < -P - 10) {
      p.z += P;
      camera.position.z += P;
      if (controls) controls.target.z += P;
      last.current.z += P;
    }
    // camera follows Joe, keeping the user's chosen angle
    const d = p.clone().sub(last.current);
    camera.position.add(d);
    if (controls) {
      controls.target.set(p.x - 0.12, 0.62, p.z - 1.2);
      controls.update();
    }
    last.current.copy(p);
  });

  const sunDir = useMemo(() => {
    const e = THREE.MathUtils.degToRad(look.sunElev);
    return new THREE.Vector3(Math.cos(e) * -0.6, Math.sin(e), Math.cos(e) * -0.8).normalize();
  }, [look.sunElev]);

  return (
    <>
      <Sky distance={4500} sunPosition={sunDir.clone().multiplyScalar(1000).toArray()} turbidity={look.turbidity} rayleigh={situation === 'blackout' ? 0.2 : 1.4} mieCoefficient={0.01} />
      <hemisphereLight args={['#dfe8ff', '#6b5a48', look.hemi]} />
      <directionalLight position={[-20, 12, 30]} intensity={look.sunI * 0.25} color="#cfe0ff" />
      <directionalLight position={sunDir.clone().multiplyScalar(60).toArray()} intensity={look.sunI} color={look.sun} castShadow shadow-radius={4}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-far={200} shadow-bias={-0.0005} />
      {situation === 'blackout' && <ambientLight intensity={0.12} color="#8fa0ff" />}
      <FollowLight pos={pos} sunDir={sunDir} />
      {/* ground: road + pavements, long enough for all copies */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -P]} receiveShadow><planeGeometry args={[400, P * 8]} /><meshStandardMaterial map={tex.asphalt} color="#77746f" roughness={0.95} /></mesh>
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh position={[s * 3.2, 0.06, -P]} receiveShadow><boxGeometry args={[2.0, 0.12, P * 8]} /><meshStandardMaterial map={tex.paving} color="#c9c0b2" roughness={0.9} /></mesh>
          <mesh position={[s * 2.22, 0.065, -P]} receiveShadow castShadow><boxGeometry args={[0.1, 0.13, P * 8]} /><meshStandardMaterial color="#b9b3a8" roughness={0.8} /></mesh>
        </group>
      ))}
      {Array.from({ length: 40 }, (_, i) => <mesh key={i} position={[0, 0.01, 60 - i * 12]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.12, 4]} /><meshBasicMaterial color="#c8b25a" /></mesh>)}
      <PeriodicStreet pos={pos}>
        <StreetCopy street={street} geos={geos} mats={mats} situation={situation} look={look} candleTex={soft} />
        {situation === 'protests' && <ProtestCrowd />}
      </PeriodicStreet>
      <Joe name={joe.name} job={joe.job} pos={pos} wading={situation === 'flood'} />
      <Pedestrians n={look.people} joe={pos} />
      {situation === 'flood' && <FloodWater />}
      {situation === 'war' && <DistantSmoke tex={soft} joe={pos} />}
      {situation === 'outbreak' && <Ambulance joe={pos} />}
      {situation === 'surveillance' && <Drones joe={pos} />}
    </>
  );
}

/** Renders its children once per street period so the street looks endless. */
function PeriodicStreet({ children }: { pos: React.MutableRefObject<THREE.Vector3>; children: React.ReactNode }) {
  return <>{COPIES.map((z) => <group key={z} position={[0, 0, z]}>{children}</group>)}</>;
}

/** Keeps the shadow camera centred on Joe so shadows stay crisp as he walks. */
function FollowLight({ pos, sunDir }: { pos: React.MutableRefObject<THREE.Vector3>; sunDir: THREE.Vector3 }) {
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    scene.traverse((o) => {
      const l = o as THREE.DirectionalLight;
      if (l.isDirectionalLight && l.castShadow) {
        l.position.copy(pos.current).add(sunDir.clone().multiplyScalar(60));
        l.target.position.copy(pos.current);
        l.target.updateMatrixWorld();
      }
    });
  });
  return null;
}

function FloodWater() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => { if (ref.current) ref.current.position.y = 0.28 + Math.sin(s.clock.elapsedTime * 0.9) * 0.03; });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.28, -P]}>
      <planeGeometry args={[400, P * 8]} />
      <meshStandardMaterial color="#6f8f9c" emissive="#1d3a46" emissiveIntensity={0.35} transparent opacity={0.85} roughness={0.1} metalness={0.35} />
    </mesh>
  );
}

// ---------------------------------------------------------------- component
const JOB_LABEL: Record<JoeJob, string> = {
  employed: 'Employed', lostSoftwareJob: 'Lost a software job', lostPhysicalJob: 'Lost a physical job', retraining: 'Retraining', onUbi: 'On universal basic income',
};
export const SITUATION_LABEL: Record<JoeSituation, string> = {
  prosperous: 'Prosperous', normal: 'Normal', struggling: 'Struggling', blackout: 'Blackout', protests: 'Protests', flood: 'Flood', war: 'Conflict nearby', surveillance: 'Under surveillance', outbreak: 'Outbreak',
};

export default function JoeScene3D({ joe }: { joe: AverageJoe }) {
  const [dpr, setDpr] = useState(1.5);
  const fpsVisible = useFpsVisible();
  const fpsEl = useRef<HTMLSpanElement>(null);
  const mood = Math.max(0, Math.min(100, joe.mood));
  const moodColor = mood >= 60 ? '#4fd18b' : mood >= 35 ? '#ffb547' : '#ff6b5b';
  return (
    <div className="w3-wrap joe-wrap">
      <Canvas shadows dpr={dpr} camera={{ position: [WALK_X - 0.3, 0.95, -10 + 1.7], fov: 50, near: 0.05, far: 1200 }}>
        <PerformanceMonitor flipflops={4} onIncline={() => setDpr((d) => Math.min(1.75, d + 0.25))} onDecline={() => setDpr((d) => Math.max(0.6, d - 0.3))} />
        <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={0.8} maxDistance={7} minPolarAngle={0.6} maxPolarAngle={1.52} rotateSpeed={0.6} />
        {fpsVisible && <FpsMeter target={fpsEl} />}
        <JoeWorld joe={joe} situation={joe.situation} />
      </Canvas>
      <div className="joe-situation">{SITUATION_LABEL[joe.situation]}</div>
      <section className="joe-card" aria-label={`Average Joe: ${joe.name}`}>
        <header>
          <strong>{joe.name}</strong>
          <span>{joe.age} · {joe.occupation}</span>
        </header>
        <dl>
          <dt>Job</dt><dd>{JOB_LABEL[joe.job]}</dd>
          <dt>Income</dt><dd>${Math.round(joe.income).toLocaleString()} / yr</dd>
          <dt>Mood</dt>
          <dd className="joe-mood" aria-label={`Mood ${Math.round(mood)} of 100`}><i style={{ width: `${mood}%`, background: moodColor }} /></dd>
        </dl>
        {joe.lines.length > 0 && <ul>{joe.lines.slice(0, 3).map((l, i) => <li key={i}>“{l}”</li>)}</ul>}
      </section>
      {fpsVisible && <div className="w-fps"><span ref={fpsEl}>–</span> fps</div>}
      <div className="joe-hint">Drag to look around</div>
    </div>
  );
}

/** Stone cornices, a string course and a shop-front fascia on every building: breaks up the plain boxes. */
function Cornices({ street }: { street: StreetLayout }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => street.buildings.flatMap((b) => {
    const p = b.parts[0];
    return [
      { x: p.x, y: p.h + 0.12, z: p.z, w: p.w + 0.35, h: 0.24, d: p.d + 0.1 },
      { x: p.x, y: p.h - 0.35, z: p.z, w: p.w + 0.16, h: 0.1, d: p.d + 0.04 },
      { x: p.x, y: 2.15, z: p.z, w: p.w + 0.12, h: 0.12, d: p.d + 0.02 },
    ];
  }), [street]);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.scale.set(it.w, it.h, it.d);
      o.updateMatrix();
      ref.current?.setMatrixAt(i, o.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#d8cfbf" roughness={0.85} />
    </instancedMesh>
  );
}

/** Asphalt and paving-slab textures drawn in code (no downloads). */
function groundTextures() {
  const make = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rx: number, ry: number) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d')!);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const r = visualRng('ground');
  const asphalt = make(256, 256, (g) => {
    g.fillStyle = '#8a8782';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) {
      const v = 110 + Math.floor(r() * 70);
      g.fillStyle = `rgb(${v},${v - 2},${v - 5})`;
      g.fillRect(r() * 256, r() * 256, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    g.strokeStyle = 'rgba(40,40,40,0.25)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(r() * 256, r() * 256);
      g.bezierCurveTo(r() * 256, r() * 256, r() * 256, r() * 256, r() * 256, r() * 256);
      g.stroke();
    }
  }, 160, 480);
  const paving = make(128, 128, (g) => {
    g.fillStyle = '#e2dbcf';
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const v = 210 + Math.floor(r() * 30);
      g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.08})`;
      g.fillRect(r() * 128, r() * 128, 2, 2);
    }
  }, 1.2, 380);
  return { asphalt, paving };
}
