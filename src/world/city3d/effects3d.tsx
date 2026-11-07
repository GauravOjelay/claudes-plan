/**
 * 3D renderers for every CityEffectKind, plus the always-on "live" city (traffic, ships).
 * War, outbreak and unrest stay abstract and non-graphic (plan section 15).
 * Window lighting effects (blackout, ghost offices, bank run, solar) live in the building shader.
 */
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityEffectKind } from '../../contracts';
import { visualRng } from '../util';
import { riverX, RIVER_W, type Lane, type Layout3D } from './layout3d';

const tmp = new THREE.Object3D();
const tmpColor = new THREE.Color();

function laneLength(l: Lane) {
  return Math.hypot(l.bx - l.ax, l.bz - l.az);
}

// ---------------------------------------------------------------- traffic
const CAR_COLORS = ['#e8e8e8', '#1d1f24', '#7a8796', '#a83232', '#2f4f7a', '#c9b48a', '#555b63'];

export function Traffic({ layout, gridlock }: { layout: Layout3D; gridlock: number }) {
  const stalled = gridlock > 0;
  const n = stalled ? Math.round(260 + 900 * gridlock) : 220;
  const body = useRef<THREE.InstancedMesh>(null);
  const tails = useRef<THREE.InstancedMesh>(null);
  const tailMat = useRef<THREE.MeshStandardMaterial>(null);
  const cars = useMemo(() => {
    const rnd = visualRng(`cars:${stalled}`);
    const lanes = layout.lanes;
    return Array.from({ length: n }, (_, i) => {
      const lane = lanes[i % lanes.length];
      // gridlock packs cars bumper to bumper; normal traffic spreads them out
      const t = stalled ? ((Math.floor(i / lanes.length) * 3.4) / laneLength(lane) + rnd() * 0.01) % 1 : rnd();
      return { lane, t, speed: 14 + rnd() * 10, color: CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)] };
    });
  }, [layout, n, stalled]);

  const place = () => {
    if (!body.current || !tails.current) return;
    cars.forEach((c, i) => {
      const l = c.lane;
      const x = l.ax + (l.bx - l.ax) * c.t;
      const z = l.az + (l.bz - l.az) * c.t;
      const yaw = Math.atan2(l.bx - l.ax, l.bz - l.az);
      tmp.position.set(x, 0.55, z);
      tmp.rotation.set(0, yaw, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      body.current!.setMatrixAt(i, tmp.matrix);
      tmp.translateZ(-0.95);
      tmp.updateMatrix();
      tails.current!.setMatrixAt(i, tmp.matrix);
    });
    body.current.instanceMatrix.needsUpdate = true;
    tails.current.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    cars.forEach((c, i) => body.current?.setColorAt(i, tmpColor.set(c.color)));
    if (body.current?.instanceColor) body.current.instanceColor.needsUpdate = true;
    place();
  });

  useFrame((s, dt) => {
    if (tailMat.current) tailMat.current.emissiveIntensity = stalled ? (Math.sin(s.clock.elapsedTime * 6) > 0 ? 4 : 0.4) : 1.2;
    if (stalled) return;
    for (const c of cars) c.t = (c.t + (c.speed * Math.min(dt, 0.1)) / laneLength(c.lane)) % 1;
    place();
  });

  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, n]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.85, 0.6, 1.9]} />
        <meshStandardMaterial roughness={0.4} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={tails} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[0.8, 0.18, 0.06]} />
        <meshStandardMaterial ref={tailMat} color="#ff2020" emissive="#ff1010" emissiveIntensity={1.2} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------- people
const PEOPLE_COLORS = ['#e6e0d4', '#2b2f3a', '#7d5b46', '#4b6584', '#b8433a', '#d8b46a', '#6b7b5b'];

export function Crowd({ x, z, w, d, n, seed, bob = 1 }: { x: number; z: number; w: number; d: number; n: number; seed: string; bob?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const people = useMemo(() => {
    const rnd = visualRng(seed);
    return Array.from({ length: n }, () => ({ x: x + (rnd() - 0.5) * w, z: z + (rnd() - 0.5) * d, p: rnd() * 6, c: PEOPLE_COLORS[Math.floor(rnd() * PEOPLE_COLORS.length)] }));
  }, [x, z, w, d, n, seed]);
  useLayoutEffect(() => {
    people.forEach((p, i) => ref.current?.setColorAt(i, tmpColor.set(p.c)));
    if (ref.current?.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [people]);
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime;
    people.forEach((p, i) => {
      tmp.position.set(p.x + Math.sin(t * 0.7 + p.p) * 0.3 * bob, 0.55 + Math.max(0, Math.sin(t * 5 + p.p)) * 0.12 * bob, p.z + Math.cos(t * 0.5 + p.p) * 0.3 * bob);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      ref.current!.setMatrixAt(i, tmp.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <cylinderGeometry args={[0.22, 0.26, 0.75, 6]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

function Signs({ x, z, w, d, n, seed }: { x: number; z: number; w: number; d: number; n: number; seed: string }) {
  const rnd = visualRng(seed);
  const items = Array.from({ length: n }, () => ({ x: x + (rnd() - 0.5) * w, z: z + (rnd() - 0.5) * d, c: ['#f4e04d', '#ffffff', '#ff8a65'][Math.floor(rnd() * 3)] }));
  return (
    <group>
      {items.map((s, i) => (
        <mesh key={i} position={[s.x, 1.6, s.z]}>
          <boxGeometry args={[0.9, 0.55, 0.05]} />
          <meshStandardMaterial color={s.c} emissive={s.c} emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- textures made in code (no network)
function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function softTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
}

// ---------------------------------------------------------------- deepfake screens
function FakeScreen({ position, phase }: { position: [number, number, number]; phase: number }) {
  const tex = useMemo(
    () =>
      canvasTexture(256, 160, (c) => {
        c.fillStyle = '#0b0f1c';
        c.fillRect(0, 0, 256, 160);
        c.fillStyle = '#c0b2d8';
        c.beginPath();
        c.arc(128, 62, 30, 0, Math.PI * 2);
        c.fill();
        c.fillRect(88, 96, 80, 64);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        for (let y = 0; y < 160; y += 4) c.fillRect(0, y, 256, 2);
        c.fillStyle = '#e02020';
        c.fillRect(10, 10, 54, 24);
        c.fillStyle = '#fff';
        c.font = 'bold 18px sans-serif';
        c.fillText('LIVE', 16, 29);
        c.fillStyle = '#ff4fa0';
        c.font = 'bold 22px sans-serif';
        c.fillText('REAL?', 180, 148);
        c.strokeStyle = '#ff4fa0';
        c.lineWidth = 6;
        c.strokeRect(3, 3, 250, 154);
      }),
    [],
  );
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime + phase;
    const glitch = Math.sin(t * 13) > 0.93 ? 0.6 : 0;
    ref.current.position.set(position[0] + glitch, position[1] + Math.sin(t * 0.8) * 0.8, position[2]);
  });
  return (
    <group ref={ref} position={position}>
      <Billboard>
        <mesh>
          <planeGeometry args={[16, 10]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

// ---------------------------------------------------------------- smoke (unrest)
function SmokeColumn({ x, z, scale, phase, tex }: { x: number; z: number; scale: number; phase: number; tex: THREE.Texture }) {
  const puffs = 7;
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime + phase;
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const life = ((t * 0.18 + i / puffs) % 1 + 1) % 1;
      sp.position.set(x + life * 10, 2 + life * 45 * scale, z + life * 3);
      const sz = (4 + life * 18) * scale;
      sp.scale.set(sz, sz, 1);
      (sp.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - life);
    });
  });
  return (
    <group>
      {Array.from({ length: puffs }, (_, i) => (
        <sprite key={i} ref={(r) => (refs.current[i] = r)}>
          <spriteMaterial map={tex} color="#77706a" transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- searchlights (war build-up)
function Searchlight({ x, z, phase }: { x: number; z: number; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.elapsedTime * 0.35 + phase;
    ref.current.rotation.set(0.35 * Math.sin(t), 0, 0.35 * Math.cos(t * 1.3));
  });
  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <mesh position={[0, 90, 0]}>
          <coneGeometry args={[14, 180, 24, 1, true]} />
          <meshBasicMaterial color="#fff6c8" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- drones + cameras (surveillance)
function Drones({ n, layout }: { n: number; layout: Layout3D }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<THREE.InstancedMesh>(null);
  const ds = useMemo(() => {
    const rnd = visualRng('drones');
    return Array.from({ length: n }, () => ({ cx: layout.downtown.x + (rnd() - 0.5) * 300, cz: layout.downtown.z + (rnd() - 0.2) * 300, r: 20 + rnd() * 50, h: 35 + rnd() * 50, p: rnd() * 6, s: 0.2 + rnd() * 0.3 }));
  }, [n, layout]);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    ds.forEach((d, i) => {
      tmp.position.set(d.cx + Math.cos(t * d.s + d.p) * d.r, d.h + Math.sin(t * 2 + d.p), d.cz + Math.sin(t * d.s * 1.3 + d.p) * d.r);
      tmp.rotation.set(0, t * d.s, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      ref.current?.setMatrixAt(i, tmp.matrix);
      tmp.position.y -= 0.5;
      const on = Math.sin(t * 5 + d.p) > 0;
      tmp.scale.setScalar(on ? 1 : 0.01);
      tmp.updateMatrix();
      lights.current?.setMatrixAt(i, tmp.matrix);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    if (lights.current) lights.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[2.2, 0.35, 2.2]} />
        <meshStandardMaterial color="#2a2d33" metalness={0.5} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshBasicMaterial color="#ff2020" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function CameraPole({ x, z, phase }: { x: number; z: number; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.6 + phase) * 1.2;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 8, 6]} />
        <meshStandardMaterial color="#5a6070" />
      </mesh>
      <group ref={ref} position={[0, 8, 0]}>
        <mesh position={[0, 0, 0.5]}>
          <boxGeometry args={[0.5, 0.4, 1]} />
          <meshStandardMaterial color="#e0e4ea" />
        </mesh>
        <mesh position={[0, -3.5, 5.5]} rotation={[-Math.PI / 2 + 0.6, 0, 0]}>
          <coneGeometry args={[3.5, 10, 16, 1, true]} />
          <meshBasicMaterial color="#ff3030" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- port + ships (embargo)
export function Port({ layout, embargo }: { layout: Layout3D; embargo: number }) {
  const { port } = layout;
  const ship = useRef<THREE.Group>(null);
  const ship2 = useRef<THREE.Group>(null);
  const containers = useMemo(() => {
    const rnd = visualRng('containers');
    const count = Math.round(40 + 160 * embargo); // goods pile up when nothing can ship
    return Array.from({ length: count }, (_, i) => ({
      x: port.x + 4 + (i % 4) * 2.7,
      z: port.z0 + 20 + (Math.floor(i / 4) % 22) * 5.5,
      y: 0.9 + Math.floor(i / 88) * 1.8,
      c: ['#a83a2c', '#2f5d8a', '#c79a3a', '#3f6b4a', '#7b7f86'][Math.floor(rnd() * 5)],
    }));
  }, [port, embargo]);
  const cRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    containers.forEach((c, i) => {
      tmp.position.set(c.x, c.y, c.z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      cRef.current?.setMatrixAt(i, tmp.matrix);
      cRef.current?.setColorAt(i, tmpColor.set(c.c));
    });
    if (cRef.current) {
      cRef.current.instanceMatrix.needsUpdate = true;
      if (cRef.current.instanceColor) cRef.current.instanceColor.needsUpdate = true;
    }
  }, [containers]);
  useFrame((s) => {
    const held = embargo > 0;
    const place = (g: THREE.Group | null, speed: number, offset: number, dir: number) => {
      if (!g) return;
      if (held) {
        const z = port.z0 + 40 + offset * 0.3;
        g.position.set(riverX(z) + 12, 0, z);
        g.rotation.y = 0;
        return;
      }
      const span = 1600;
      const z = (((s.clock.elapsedTime * speed + offset) % span) + span) % span - 1100;
      const zz = dir > 0 ? z : -z - 300;
      g.position.set(riverX(zz) + dir * 10, 0, zz);
      g.rotation.y = dir > 0 ? 0 : Math.PI;
    };
    place(ship.current, 9, 0, 1);
    place(ship2.current, 7, 500, -1);
  });
  return (
    <group>
      {/* quay */}
      <mesh position={[port.x + 6, 0.3, (port.z0 + port.z1) / 2]} receiveShadow>
        <boxGeometry args={[20, 0.6, port.z1 - port.z0]} />
        <meshStandardMaterial color="#8d8478" roughness={0.95} />
      </mesh>
      {/* gantry cranes */}
      {[0, 1, 2].map((i) => {
        const z = port.z0 + 30 + i * 40;
        return (
          <group key={i} position={[port.x, 0, z]}>
            {[-3, 3].map((dz) => (
              <group key={dz}>
                <mesh position={[-2, 12, dz]} castShadow><boxGeometry args={[0.8, 24, 0.8]} /><meshStandardMaterial color="#c4552d" /></mesh>
                <mesh position={[8, 12, dz]} castShadow><boxGeometry args={[0.8, 24, 0.8]} /><meshStandardMaterial color="#c4552d" /></mesh>
              </group>
            ))}
            <mesh position={[-6, 24.5, 0]} castShadow><boxGeometry args={[34, 1.2, 7]} /><meshStandardMaterial color="#c4552d" /></mesh>
            {embargo > 0 && (
              <mesh position={[-6, 26, 0]}><sphereGeometry args={[0.5, 8, 8]} /><meshBasicMaterial color="#ff2020" toneMapped={false} /></mesh>
            )}
          </group>
        );
      })}
      <instancedMesh ref={cRef} args={[undefined, undefined, containers.length]} castShadow key={containers.length}>
        <boxGeometry args={[2.4, 1.7, 5]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      {[ship, ship2].map((r, i) => (
        <group key={i} ref={r}>
          <mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[7, 2.6, 34]} /><meshStandardMaterial color={i ? '#2f3542' : '#5a2a2a'} /></mesh>
          <mesh position={[0, 3.3, -11]} castShadow><boxGeometry args={[5.5, 3, 6]} /><meshStandardMaterial color="#e8e6e0" /></mesh>
          {Array.from({ length: 6 }, (_, k) => (
            <mesh key={k} position={[(k % 2 ? 1.3 : -1.3), 3.3, -2 + Math.floor(k / 2) * 5]}><boxGeometry args={[2.4, 1.6, 4.6]} /><meshStandardMaterial color={['#a83a2c', '#2f5d8a', '#c79a3a'][k % 3]} /></mesh>
          ))}
        </group>
      ))}
      {embargo > 0 && (
        <group>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[port.x + 14, 0.8, port.z0 + 6 + i * 2.2]}>
              <boxGeometry args={[0.5, 0.5, 2]} />
              <meshStandardMaterial color={i % 2 ? '#e8e8e8' : '#c42b2b'} />
            </mesh>
          ))}
          <Html position={[port.x, 34, port.z0 + 60]} center className="w3-tag-wrap">
            <div className="w3-tag">⚓ Export controls · ships held in port</div>
          </Html>
        </group>
      )}
    </group>
  );
}

// ---------------------------------------------------------------- hospital cross, tents, ambulances (outbreak)
export function HospitalMarks({ layout, outbreak }: { layout: Layout3D; outbreak: number }) {
  const { hospital } = layout;
  const crossMat = useRef<THREE.MeshStandardMaterial>(null);
  const amb = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (crossMat.current) crossMat.current.emissiveIntensity = outbreak > 0 ? 1 + Math.max(0, Math.sin(t * 4)) * 3 : 0.4;
    amb.current?.children.forEach((c, i) => {
      const life = ((t * 0.05 + i / 6) % 1) * 2 - 1;
      c.position.set(hospital.x + 15 + 0.0, 0, hospital.z + life * 90);
      c.rotation.y = 0;
      const light = c.children[1] as THREE.Mesh;
      if (light) light.visible = Math.sin(t * 10 + i) > 0;
    });
  });
  const ambCount = Math.round(2 + 6 * outbreak);
  const tents = outbreak > 0.3 ? Math.round(4 + 14 * outbreak) : 0;
  return (
    <group>
      <group position={[hospital.x - 3, hospital.top + 0.2, hospital.z]}>
        <mesh position={[0, 0.3, 0]}><boxGeometry args={[7, 0.5, 2.2]} /><meshStandardMaterial ref={crossMat} color="#e02020" emissive="#ff2020" emissiveIntensity={0.4} /></mesh>
        <mesh position={[0, 0.3, 0]}><boxGeometry args={[2.2, 0.5, 7]} /><meshStandardMaterial color="#e02020" emissive="#ff2020" emissiveIntensity={0.4} /></mesh>
      </group>
      {outbreak > 0 && (
        <group ref={amb}>
          {Array.from({ length: ambCount }, (_, i) => (
            <group key={i}>
              <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.1, 1.2, 2.6]} /><meshStandardMaterial color="#f2f4f7" /></mesh>
              <mesh position={[0, 1.55, 0.6]}><boxGeometry args={[0.8, 0.2, 0.3]} /><meshBasicMaterial color="#3a7dff" toneMapped={false} /></mesh>
            </group>
          ))}
        </group>
      )}
      {Array.from({ length: tents }, (_, i) => (
        <mesh key={i} position={[hospital.x + 40 + (i % 6) * 5, 1.2, hospital.z - 10 + Math.floor(i / 6) * 6]} castShadow>
          <coneGeometry args={[2, 2.4, 4]} />
          <meshStandardMaterial color="#eef2f4" />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- flooding
function Flood({ k }: { k: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) ref.current.position.y = 0.4 + k * 11 + Math.sin(s.clock.elapsedTime * 0.8) * 0.15;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3000, 3000]} />
      <meshStandardMaterial color="#6f9fb8" emissive="#1d4a66" emissiveIntensity={0.55} transparent opacity={0.86} roughness={0.15} metalness={0.3} />
    </mesh>
  );
}

// ---------------------------------------------------------------- convoy (war build-up), abstract
function Convoy({ layout, k }: { layout: Layout3D; k: number }) {
  const n = Math.round(10 + 50 * k);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    for (let i = 0; i < n; i++) {
      tmp.position.set(layout.extent.x1 + 40 + (i % 3) * 4, 1.1, layout.extent.z0 + 30 + Math.floor(i / 3) * 6);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      ref.current?.setMatrixAt(i, tmp.matrix);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [n, layout]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow key={n}>
      <boxGeometry args={[2.2, 2, 4.8]} />
      <meshStandardMaterial color="#4c5a3a" roughness={0.9} />
    </instancedMesh>
  );
}

function Barricades({ x, z, n }: { x: number; z: number; n: number }) {
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[x - n * 2 + i * 4.5, 0, z]}>
          <mesh position={[0, 0.7, 0]}><boxGeometry args={[3.6, 0.5, 0.3]} /><meshStandardMaterial color={i % 2 ? '#e8a530' : '#1d1d1d'} /></mesh>
          <mesh position={[-1.5, 0.35, 0]}><boxGeometry args={[0.2, 0.7, 0.2]} /><meshStandardMaterial color="#777" /></mesh>
          <mesh position={[1.5, 0.35, 0]}><boxGeometry args={[0.2, 0.7, 0.2]} /><meshStandardMaterial color="#777" /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- dispatcher
export function EffectLayer3D({ kind, k, layout, smokeTex }: { kind: CityEffectKind; k: number; layout: Layout3D; smokeTex: THREE.Texture }) {
  const { plaza, bank, downtown, extent } = layout;
  switch (kind) {
    case 'deepfakeProtests':
      return (
        <group>
          <Crowd x={plaza.x} z={plaza.z} w={plaza.size} d={plaza.size} n={Math.round(150 + 650 * k)} seed="protest" />
          <Signs x={plaza.x} z={plaza.z} w={plaza.size} d={plaza.size} n={Math.round(10 + 40 * k)} seed="protest-signs" />
          {[[-30, 55, 10], [25, 62, 0], [0, 75, -40]].slice(0, Math.round(1 + 2 * k)).map((p, i) => (
            <FakeScreen key={i} position={[plaza.x + p[0], p[1], plaza.z + p[2]]} phase={i * 2.1} />
          ))}
        </group>
      );
    case 'bankRun': {
      const n = Math.round(30 + 200 * k);
      return (
        <group>
          {Array.from({ length: Math.ceil(n / 40) }, (_, row) => (
            <Crowd key={row} x={bank.door.x - 22} z={bank.door.z + 1 + row * 1.2} w={44} d={0.6} n={Math.min(40, n - row * 40)} seed={`queue${row}`} bob={0.2} />
          ))}
          {k > 0.6 && (
            <Html position={[bank.x, bank.top + 8, bank.z]} center className="w3-tag-wrap"><div className="w3-tag bad">🏦 Bank closed</div></Html>
          )}
        </group>
      );
    }
    case 'warBuildup':
      return (
        <group>
          {Array.from({ length: Math.round(2 + 4 * k) }, (_, i) => (
            <Searchlight key={i} x={extent.x0 + 60 + i * 90} z={extent.z0 + 40 + (i % 2) * 120} phase={i * 1.7} />
          ))}
          <Convoy layout={layout} k={k} />
        </group>
      );
    case 'surveillance':
      return (
        <group>
          <Drones n={Math.round(6 + 30 * k)} layout={layout} />
          {Array.from({ length: Math.round(6 + 20 * k) }, (_, i) => {
            const lane = layout.lanes[(i * 3) % layout.lanes.length];
            const t = ((i * 0.37) % 1) * 0.8 + 0.1;
            return <CameraPole key={i} x={lane.ax + (lane.bx - lane.ax) * t + 4} z={lane.az + (lane.bz - lane.az) * t + 4} phase={i} />;
          })}
          {k > 0.4 && <Crowd x={layout.park.x} z={layout.park.z - 20} w={30} d={20} n={Math.round(40 + 120 * k)} seed="park-protest" />}
        </group>
      );
    case 'flooding':
      return <Flood k={k} />;
    case 'unrest':
      return (
        <group>
          {Array.from({ length: Math.round(2 + 6 * k) }, (_, i) => {
            const r = visualRng(`smoke${i}`);
            return <SmokeColumn key={i} x={downtown.x + (r() - 0.5) * 260} z={downtown.z + 40 + (r() - 0.5) * 220} scale={0.7 + k * 0.8} phase={i * 1.9} tex={smokeTex} />;
          })}
          <Crowd x={plaza.x + 45} z={plaza.z + 15} w={40} d={10} n={Math.round(80 + 400 * k)} seed="unrest" />
          <Barricades x={plaza.x + 45} z={plaza.z + 24} n={Math.round(2 + 6 * k)} />
        </group>
      );
    case 'outbreak': // HospitalMarks handles it
    case 'embargo': // Port handles it
    case 'gridlock': // Traffic handles it
    case 'blackout': // shader
    case 'ghostOffices': // shader
    case 'solarBoom': // shader
      return null;
  }
}

export const HANDLED_3D: Record<CityEffectKind, string> = {
  blackout: 'shader', ghostOffices: 'shader', solarBoom: 'shader', bankRun: 'shader+layer',
  gridlock: 'Traffic', embargo: 'Port', outbreak: 'HospitalMarks',
  deepfakeProtests: 'layer', warBuildup: 'layer+fog', surveillance: 'layer', flooding: 'layer', unrest: 'layer',
};

export { RIVER_W };
