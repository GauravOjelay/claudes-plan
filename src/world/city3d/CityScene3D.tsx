/**
 * 3D city view (DECISIONS.md #4). Lazy-loaded by CityView so three.js stays out of the main bundle.
 * Golden-hour aerial city with a smooth fly-around camera. Every CityEffectKind is rendered
 * (shader uniforms for window lighting, scene layers for the rest).
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, MapControls, PerformanceMonitor, Sky } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { CityEffectKind, CityInfo, Company, WorldState } from '../../contracts';
import { ALL_EFFECT_KINDS, ARCHETYPE_LABEL, companiesInCity, effectsForCity, orderHqs } from '../util';
import { Toasts } from '../EventFeed';
import { useSmoothEffects } from '../smoothEffects';
import { FpsMeter, useFpsVisible } from '../FpsMeter';
import { ALL_CITIES } from '../roster';
import { buildCityGeometries, makeBuildingMaterial, makeUniforms, type CityUniforms } from './buildingMaterial';
import { CameraRig, HOME, makeRigApi, type RigAction, type RigApi } from './CameraRig';
import { EffectLayer3D, HospitalMarks, Port, Traffic, softTexture } from './effects3d';
import { BLOCK, buildLayout3D, riverX, type Layout3D, type Style } from './layout3d';
import { Backdrop, Landmarks } from './Landmarks3D';
import { cityScene, reservedLots, type CityScene } from './landmarks';
import '../world.css';

export type TimeOfDay = 'golden' | 'dusk' | 'night';

interface Look {
  sunElev: number; // degrees
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  fog: string;
  night: number;
  exposure: number;
  turbidity: number;
}

const LOOKS: Record<TimeOfDay, Look> = {
  golden: { sunElev: 7, sun: '#ffc68a', sunI: 3.2, hemiSky: '#c9dcff', hemiGround: '#8a6a4a', hemiI: 1.2, fog: '#e2c7a6', night: 0.06, exposure: 0.95, turbidity: 6 },
  dusk: { sunElev: 0.8, sun: '#ff8c55', sunI: 1.3, hemiSky: '#7d86b8', hemiGround: '#4a3530', hemiI: 0.55, fog: '#9c7a7a', night: 0.9, exposure: 0.9, turbidity: 10 },
  night: { sunElev: -8, sun: '#8fa8ff', sunI: 0.25, hemiSky: '#2a3560', hemiGround: '#151520', hemiI: 0.3, fog: '#1a2236', night: 1.6, exposure: 1.1, turbidity: 2 },
};
const SUN_AZ = THREE.MathUtils.degToRad(292); // low sun from the west, lighting the faces the camera sees

function sunDir(elevDeg: number) {
  const e = THREE.MathUtils.degToRad(elevDeg);
  return new THREE.Vector3(Math.cos(e) * Math.sin(SUN_AZ), Math.sin(e), Math.cos(e) * Math.cos(SUN_AZ));
}

// ------------------------------------------------------------------ static city
function Buildings({ layout, uniforms }: { layout: Layout3D; uniforms: CityUniforms }) {
  const meshes = useMemo(() => {
    const geos = buildCityGeometries(layout.buildings);
    return (Object.keys(geos) as Style[]).map((style) => ({ style, geo: geos[style]!, mat: makeBuildingMaterial(style, uniforms) }));
  }, [layout, uniforms]);
  useEffect(() => () => meshes.forEach((m) => { m.geo.dispose(); m.mat.dispose(); }), [meshes]);
  return (
    <group>
      {meshes.map((m) => (
        <mesh key={m.style} geometry={m.geo} material={m.mat} castShadow receiveShadow />
      ))}
    </group>
  );
}

function Instanced({ items, geometry, color, colors, cast = true }: {
  items: { x: number; y: number; z: number; sx: number; sy: number; sz: number }[];
  geometry: THREE.BufferGeometry;
  color?: string;
  colors?: string[];
  cast?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.scale.set(it.sx, it.sy, it.sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (colors) m.setColorAt(i, c.set(colors[i % colors.length]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, colors]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow={cast} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.9} />
    </instancedMesh>
  );
}

/** Is this spot on the land side of the water? The far bank is only built up beside a river (not across a bay, sea or lake). */
function keepOnFarBank(water: CityScene['water'], x: number, z: number): boolean {
  const d = riverX(z) - x; // > 0 = west of the river
  if (d <= 0) return true;
  if (water === 'bay' || water === 'sea') return false;
  if (water === 'lake') return d > 380;
  return true;
}

function Ground({ layout, scene, onDoubleClick }: { layout: Layout3D; scene: CityScene; onDoubleClick: (p: THREE.Vector3) => void }) {
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const tree = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const blocks = useMemo(() => {
    const built = layout.blocks.filter((b) => b.kind === 'built').map((b) => ({ x: b.x, y: 0.15, z: b.z, sx: b.size + 2, sy: 0.3, sz: b.size + 2 }));
    const park = layout.blocks.filter((b) => b.kind === 'park').map((b) => ({ x: b.x, y: 0.12, z: b.z, sx: b.size + 6.5, sy: 0.24, sz: b.size + 6.5 }));
    const plaza = layout.blocks.filter((b) => b.kind === 'plaza').map((b) => ({ x: b.x, y: 0.14, z: b.z, sx: b.size + 2, sy: 0.28, sz: b.size + 2 }));
    return { built, park, plaza };
  }, [layout]);
  const trees = useMemo(() => layout.trees.filter((t) => keepOnFarBank(scene.water, t.x, t.z)).map((t) => ({ x: t.x, y: 2.4 * t.s, z: t.z, sx: 2.2 * t.s, sy: 2.6 * t.s, sz: 2.2 * t.s })), [layout, scene.water]);
  const sprawl = useMemo(() => layout.sprawl.filter((b) => keepOnFarBank(scene.water, b.x, b.z)).map((b) => ({ x: b.x, y: b.h / 2, z: b.z, sx: b.w, sy: b.h, sz: b.d })), [layout, scene.water]);
  const river = useMemo(() => {
    const pts = layout.river;
    const pos: number[] = [];
    const idx: number[] = [];
    // A bay or sea has no far bank; a lake has one a long way off.
    const reach = scene.water === 'bay' || scene.water === 'sea' ? 4000 : scene.water === 'lake' ? 380 : 0;
    pts.forEach((p, i) => {
      pos.push(p.x - p.width / 2 - reach, 0.08, p.z, p.x + p.width / 2, 0.08, p.z);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [layout, scene.water]);
  const hills = useMemo(() => [
    { p: [-1100, -60, -1300], s: [620, 120, 260] }, { p: [-500, -80, -1800], s: [700, 140, 240] },
    { p: [300, -90, -2000], s: [900, 140, 260] }, { p: [-1500, -70, -500], s: [320, 110, 700] },
  ], []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(e.point); }}>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial color={scene.ground} roughness={1} />
      </mesh>
      <mesh geometry={river} receiveShadow>
        <meshStandardMaterial color={scene.waterColor} roughness={scene.water === 'green' ? 1 : 0.25} metalness={scene.water === 'green' ? 0 : 0.3} />
      </mesh>
      <Instanced items={blocks.built} geometry={box} color="#a2968a" cast={false} />
      <Instanced items={blocks.park} geometry={box} color="#56723a" cast={false} />
      <Instanced items={blocks.plaza} geometry={box} color="#c9bda6" cast={false} />
      <Instanced items={trees} geometry={tree} colors={['#3d5a2a', '#4a6a30', '#35502a', '#56763a']} />
      <Instanced items={sprawl} geometry={box} colors={['#b4785a', '#c7b08c', '#d6d0c4', '#9a6a52', '#bfae96']} />
      {scene.hills && hills.map((h, i) => (
        <mesh key={i} position={h.p as [number, number, number]} scale={h.s as [number, number, number]}>
          <sphereGeometry args={[1, 24, 12]} />
          <meshStandardMaterial color="#56603f" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Clouds({ tex }: { tex: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  // Each cloud = a shaded base layer (darker, wider, lower) + bright billowing tops, for a bit of volume.
  const puffs = useMemo(() => {
    const out: { x: number; y: number; z: number; sx: number; sy: number; c: string; o: number }[] = [];
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let c = 0; c < 16; c++) {
      const cx = -1000 + r() * 2000;
      const cz = -1700 + r() * 1300;
      const cy = 250 + r() * 170;
      const size = 0.7 + r() * 0.7;
      for (let i = 0; i < 6; i++) out.push({ x: cx + (r() - 0.5) * 260 * size, y: cy - 8 + r() * 6, z: cz + (r() - 0.5) * 90, sx: (150 + r() * 120) * size, sy: (45 + r() * 25) * size, c: '#cdb9a6', o: 0.55 });
      for (let i = 0; i < 9; i++) {
        const lift = r();
        out.push({ x: cx + (r() - 0.5) * 210 * size, y: cy + 10 + lift * 45 * size, z: cz + (r() - 0.5) * 80 + 5, sx: (70 + r() * 90) * size, sy: (55 + r() * 60) * size, c: lift > 0.5 ? '#fff6ea' : '#f1e3d2', o: 0.8 });
      }
    }
    return out;
  }, []);
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.position.x += dt * 3; // clouds drift
    if (group.current.position.x > 700) group.current.position.x = -700;
  });
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <sprite key={i} position={[p.x, p.y, p.z]} scale={[p.sx, p.sy, 1]}>
          <spriteMaterial map={tex} color={p.c} transparent opacity={p.o} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ HQ markers
function HqMarkers({ layout, companies, waiting, onSelect }: { layout: Layout3D; companies: Company[]; waiting: string[]; onSelect: (id: string) => void }) {
  return (
    <group>
      {layout.hq.map((h, i) => {
        const c = companies[i];
        if (!c) return null;
        const wait = waiting.includes(c.id);
        return (
          <group key={c.id}>
            <mesh position={[h.x, h.top + 0.5, h.z]}>
              <sphereGeometry args={[1.4, 12, 12]} />
              <meshBasicMaterial color={wait ? '#ffd60a' : '#5cc8ff'} toneMapped={false} />
            </mesh>
            <Html position={[h.x, h.top + 8 + (i % 4) * 12, h.z]} center zIndexRange={[30, 0]}>
              <button className={`w3-hq${wait ? ' waiting' : ' mine'}${companies.length > 3 ? ' compact' : ''}`} onClick={() => onSelect(c.id)}
                title={ARCHETYPE_LABEL[c.archetype]} aria-label={`${c.name} headquarters${wait ? ', decision waiting' : ''}`}>
                <span className="w3-hq-name">{c.name}</span>
                {(wait || companies.length <= 3) && <span className="w3-hq-sub">{wait ? 'DECISION WAITING' : ARCHETYPE_LABEL[c.archetype].toUpperCase()}</span>}
                <span className="w3-hq-arrow" aria-hidden>▼</span>
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ------------------------------------------------------------------ scene
function SceneContents({ state, city, onSelectCompany, time, api, waiting }: {
  state: WorldState; city: CityInfo; onSelectCompany: (id: string) => void; time: TimeOfDay; api: MutableRefObject<RigApi>; waiting: string[];
}) {
  const hqCompanies = orderHqs(companiesInCity(state, city), state.playerCompanyId, waiting);
  const cs = useMemo(() => cityScene(city.id), [city.id]);
  const layout = useMemo(
    () => buildLayout3D(city.id, hqCompanies.length, { reserved: reservedLots(cs), greenery: cs.greenery, heightScale: cs.heightScale }),
    [city.id, hqCompanies.length, cs],
  );
  const uniforms = useMemo(makeUniforms, []);
  const smokeTex = useMemo(softTexture, []);
  const fx = useSmoothEffects(effectsForCity(state, city.id));
  const k = (kind: CityEffectKind) => fx.get(kind)?.intensity ?? 0;
  const look = LOOKS[time];
  const sun = useMemo(() => sunDir(look.sunElev), [look.sunElev]);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);


  const war = k('warBuildup');
  const fogColor = useMemo(() => new THREE.Color(look.fog).lerp(new THREE.Color('#9a4a38'), war * 0.6), [look.fog, war]);
  useEffect(() => {
    scene.fog = new THREE.Fog(fogColor, 260, time === 'night' ? 1500 : 1900);
    gl.toneMappingExposure = look.exposure;
  }, [scene, gl, fogColor, look.exposure, time]);

  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime;
    uniforms.uBlackout.value = k('blackout');
    uniforms.uGhost.value = k('ghostOffices');
    uniforms.uSolar.value = k('solarBoom');
    uniforms.uBankDark.value = k('bankRun') > 0.6 ? 1 : 0;
    // blackouts read better a little darker: windows matter more
    uniforms.uNight.value = look.night;
  });

  const active = ALL_EFFECT_KINDS.filter((kind) => fx.has(kind));

  return (
    <>
      <Sky distance={4500} sunPosition={sun.clone().multiplyScalar(1000).toArray()} turbidity={look.turbidity} rayleigh={time === 'night' ? 0.3 : 1.6} mieCoefficient={0.008} mieDirectionalG={0.85} />
      <hemisphereLight args={[look.hemiSky, look.hemiGround, look.hemiI]} />
      <directionalLight
        position={sun.clone().multiplyScalar(600).add(new THREE.Vector3(0, 60, 0)).toArray()}
        color={look.sun}
        intensity={look.sunI}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-420}
        shadow-camera-right={420}
        shadow-camera-top={420}
        shadow-camera-bottom={-420}
        shadow-camera-near={10}
        shadow-camera-far={1600}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
      {time !== 'golden' && <ambientLight intensity={0.15} color="#8090c0" />}
      <Clouds tex={smokeTex} />
      <Ground layout={layout} scene={cs} onDoubleClick={(p) => { api.current.flyTo = new THREE.Vector3(p.x, 20, p.z); api.current.lastInput = performance.now(); }} />
      <Buildings layout={layout} uniforms={uniforms} />
      <Landmarks placed={cs.landmarks} night={look.night} blackout={k('blackout')} fog={look.fog} />
      <Backdrop mountains={cs.backdrop} fog={look.fog} />
      <Traffic layout={layout} gridlock={k('gridlock')} />
      <Port layout={layout} embargo={k('embargo')} ships={cs.water !== 'green'} />
      <HospitalMarks layout={layout} outbreak={k('outbreak')} />
      {active.map((kind) => (
        <EffectLayer3D key={kind} kind={kind} k={fx.get(kind)!.intensity} layout={layout} smokeTex={smokeTex} />
      ))}
      <HqMarkers layout={layout} companies={hqCompanies} waiting={waiting} onSelect={onSelectCompany} />
      {/* plaza fountain so the protest square reads as a square */}
      <mesh position={[layout.plaza.x, 0.6, layout.plaza.z]}>
        <cylinderGeometry args={[3, 3.4, 0.9, 24]} />
        <meshStandardMaterial color="#d8d0c0" />
      </mesh>
      <mesh position={[layout.bank.x, layout.bank.top + 0.6, layout.bank.z]} castShadow>
        <boxGeometry args={[BLOCK - 1, 1.2, BLOCK - 1]} />
        <meshStandardMaterial color="#e2dccb" />
      </mesh>
    </>
  );
}

const HOLD_BUTTONS: { a: RigAction; label: string; title: string }[] = [
  { a: 'fwd', label: '▲', title: 'Fly forward (W)' },
  { a: 'back', label: '▼', title: 'Fly back (S)' },
  { a: 'left', label: '◀', title: 'Slide left (A)' },
  { a: 'right', label: '▶', title: 'Slide right (D)' },
  { a: 'rotL', label: '⟲', title: 'Rotate left (Q)' },
  { a: 'rotR', label: '⟳', title: 'Rotate right (E)' },
  { a: 'zoomIn', label: '+', title: 'Zoom in (+)' },
  { a: 'zoomOut', label: '−', title: 'Zoom out (−)' },
];

export interface CityScene3DProps {
  state: WorldState;
  city: CityInfo;
  onSelectCompany: (companyId: string) => void;
  initialTime?: TimeOfDay;
  /** Shown as a button when the frame rate stays low even at reduced quality. */
  onRequest2D?: () => void;
  /** Companies with a decision still waiting this year. */
  waiting?: string[];
}

export default function CityScene3D({ state, city, onSelectCompany, initialTime = 'golden', onRequest2D, waiting = [] }: CityScene3DProps) {
  // Adaptive quality: drop the pixel ratio when frames stall; offer the 2D view if it is still slow.
  const [dpr, setDpr] = useState(1.5);
  const [slow, setSlow] = useState(false);
  const api = useRef<RigApi>(makeRigApi());
  const wrap = useRef<HTMLDivElement | null>(null);
  const [time, setTime] = useState<TimeOfDay>(initialTime);
  // A blackout is invisible in daylight: drop to dusk automatically, unless the player chose a time themselves.
  const userPickedTime = useRef(false);
  const blackoutOn = (effectsForCity(state, city.id).get('blackout')?.intensity ?? 0) > 0.15;
  useEffect(() => {
    if (blackoutOn && !userPickedTime.current) setTime((t) => (t === 'golden' ? 'dusk' : t));
  }, [blackoutOn]);
  const [help, setHelp] = useState(true);
  const fpsVisible = useFpsVisible();
  const fpsEl = useRef<HTMLSpanElement>(null);
  // Camera pad + shortcut help are hidden until the user scrolls or presses (not on hover), then fade out.
  const [controlsOn, setControlsOn] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const pokeControls = () => {
    setControlsOn(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (!api.current.held.size) setControlsOn(false); }, 2800);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const [bump, setBump] = useState(false);
  const lastYear = useRef(state.year);
  useEffect(() => {
    if (lastYear.current !== state.year) {
      lastYear.current = state.year;
      setBump(true);
      const t = setTimeout(() => setBump(false), 950);
      return () => clearTimeout(t);
    }
  }, [state.year]);
  const hold = (a: RigAction, on: boolean) => {
    if (on) api.current.held.add(a);
    else api.current.held.delete(a);
    api.current.lastInput = performance.now();
    pokeControls();
  };

  return (
    <div className="w3-wrap" ref={wrap} tabIndex={0} data-controls={controlsOn ? 'on' : 'off'}
      onWheel={pokeControls} onPointerDown={pokeControls} onKeyDown={pokeControls} onTouchStart={pokeControls} aria-label={`${city.name} 3D city. Drag to pan, right-drag to rotate, scroll to zoom, W/S to fly forward and back.`}>
      <Canvas
        shadows
        dpr={dpr}
        camera={{ position: HOME.pos.toArray(), fov: 42, near: 1, far: 6000 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerDown={() => { api.current.lastInput = performance.now(); wrap.current?.focus(); }}
      >
        <MapControls makeDefault target={HOME.target.toArray()} enableDamping dampingFactor={0.07} maxPolarAngle={1.45} minDistance={25} maxDistance={1100} zoomSpeed={0.8} panSpeed={1.1} />
        <PerformanceMonitor flipflops={4} onIncline={() => setDpr((d) => Math.min(1.75, d + 0.25))}
          onDecline={() => setDpr((d) => Math.max(0.6, d - 0.3))} onFallback={() => { setDpr(0.6); setSlow(true); }} />
        <CameraRig api={api} container={wrap} />
        {fpsVisible && <FpsMeter target={fpsEl} />}
        <SceneContents state={state} city={city} onSelectCompany={onSelectCompany} time={time} api={api} waiting={waiting} />
      </Canvas>

      <Toasts state={state} cities={ALL_CITIES} cityId={city.id} />
      <div className={`w-year-badge${bump ? ' bump' : ''}`} aria-label={`Year ${state.year}`}><small>YEAR</small>{state.year}</div>
      {fpsVisible && <div className="w-fps"><span ref={fpsEl}>–</span> fps</div>}

      <div className="w3-time" role="group" aria-label="Time of day">
        {(['golden', 'dusk', 'night'] as TimeOfDay[]).map((t) => (
          <button key={t} aria-pressed={time === t} onClick={() => { userPickedTime.current = true; setTime(t); }}>{t === 'golden' ? 'Golden hour' : t === 'dusk' ? 'Dusk' : 'Night'}</button>
        ))}
      </div>

      <div className="w3-pad" aria-label="Camera controls">
        {HOLD_BUTTONS.map((b) => (
          <button key={b.a} className={`w3-pad-${b.a}`} title={b.title} aria-label={b.title}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); hold(b.a, true); }}
            onPointerUp={() => hold(b.a, false)} onPointerCancel={() => hold(b.a, false)} onPointerLeave={() => hold(b.a, false)}>
            {b.label}
          </button>
        ))}
        <button className="w3-pad-reset" title="Reset view" aria-label="Reset view" onClick={() => (api.current.reset = true)}>⌂</button>
      </div>

      {slow && onRequest2D && (
        <div className="w3-slow" role="status">
          3D is running slowly on this device.
          <button onClick={onRequest2D}>Switch to 2D</button>
          <button aria-label="Dismiss" onClick={() => setSlow(false)}>×</button>
        </div>
      )}

      {help && (
        <div className="w3-help">
          Drag to pan · right-drag to rotate/tilt · scroll to zoom · W/S fly · A/D slide · Q/E rotate · double-click to glide there
          <button aria-label="Hide help" onClick={() => setHelp(false)}>×</button>
        </div>
      )}
    </div>
  );
}
