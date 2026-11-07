/**
 * Interactive 3D world map, Apple-Maps style: smooth inertial pan / pinch-zoom / rotate / tilt, a 2D-3D tilt
 * toggle and compass, city pins that glide the camera in and open a callout card. Regions are gently extruded
 * by the chosen metric. Lazy-loaded by WorldMap so three.js stays out of the main bundle.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, MapControls, PerformanceMonitor } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { CityInfo, RegionId, WorldState } from '../../contracts';
import { OTHER_LAND, REGION_LABEL_POS, REGION_NAMES, REGION_RINGS, type LonLat } from '../geo';
import { EFFECT_INFO, clamp01, effectsForCity, fmtMoneyBn, fmtPct, fmtPeopleM } from '../util';
import { RAMPS, METRIC_LABEL, rampColor, regionMetric, type MapMetric, type MapOverlay } from '../mapMetrics';
import '../world.css';

// ---------------------------------------------------------------- projection (Web Mercator, like Apple/Google maps)
const SCALE = 1000 / 360; // world units per degree of longitude
const LON0 = 10; // centre the Atlantic-Pacific split nicely
export function project(lon: number, lat: number): { x: number; z: number } {
  const la = THREE.MathUtils.clamp(lat, -78, 82);
  const y = Math.log(Math.tan(Math.PI / 4 + THREE.MathUtils.degToRad(la) / 2));
  return { x: (lon - LON0) * SCALE, z: -THREE.MathUtils.radToDeg(y) * SCALE };
}
/** CityInfo.mapPos uses the 0-1 projection from geo.ts; invert it to lon/lat. */
export function cityLonLat(c: CityInfo): { lon: number; lat: number } {
  return { lon: c.mapPos.x * 360 - 170, lat: 93 - c.mapPos.y * 150 };
}

function ringsToShapes(rings: LonLat[][]): THREE.Shape[] {
  return rings.map((ring) => {
    const s = new THREE.Shape();
    ring.forEach(([lon, lat], i) => {
      const p = project(lon, lat);
      // Shape lives in x/y; we rotate it flat later so y -> -z.
      if (i === 0) s.moveTo(p.x, -p.z);
      else s.lineTo(p.x, -p.z);
    });
    return s;
  });
}

interface Palette { water: string; land: string; landEdge: string; grid: string; label: string; pinRing: string }
const LIGHT: Palette = { water: '#a9d5f2', land: '#f2efe8', landEdge: '#d9d2c4', grid: '#9cc8e6', label: '#4a4a52', pinRing: '#ffffff' };
const DARK: Palette = { water: '#16273d', land: '#3b3f47', landEdge: '#2a2e35', grid: '#1e3350', label: '#d6dbe4', pinRing: '#1c1c1e' };

function stripeTexture(color: string, kind: 'stripes' | 'dots'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  if (kind === 'stripes') {
    g.lineWidth = 14;
    g.strokeStyle = color;
    for (let i = -64; i < 128; i += 32) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); }
  } else {
    for (let y = 8; y < 64; y += 16) for (let x = 8; x < 64; x += 16) { g.beginPath(); g.arc(x + (y % 32 ? 8 : 0), y, 4, 0, Math.PI * 2); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 14, 1 / 14);
  return t;
}

// ---------------------------------------------------------------- camera rig
interface MapApi { flyTo: { x: number; z: number; dist: number } | null; tilt: number | null; north: boolean; zoom: number }
const START = { target: new THREE.Vector3(0, 0, -95), dist: 980, tilt: 0.6 };

function MapRig({ api }: { api: MutableRefObject<MapApi> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  useFrame((_, raw) => {
    if (!controls) return;
    const dt = Math.min(raw, 0.05);
    const a = api.current;
    const target = controls.target;
    const off = camera.position.clone().sub(target);
    let dist = off.length();
    const sph = new THREE.Spherical().setFromVector3(off);
    let moved = false;
    if (a.flyTo) {
      const f = 1 - Math.exp(-3.2 * dt);
      target.x += (a.flyTo.x - target.x) * f;
      target.z += (a.flyTo.z - target.z) * f;
      dist += (a.flyTo.dist - dist) * f;
      if (Math.hypot(a.flyTo.x - target.x, a.flyTo.z - target.z) < 0.3 && Math.abs(a.flyTo.dist - dist) < 1) a.flyTo = null;
      moved = true;
    }
    if (a.tilt !== null) {
      const f = 1 - Math.exp(-4 * dt);
      sph.phi += (a.tilt - sph.phi) * f;
      if (Math.abs(a.tilt - sph.phi) < 0.002) a.tilt = null;
      moved = true;
    }
    if (a.north) {
      const f = 1 - Math.exp(-4 * dt);
      sph.theta += (0 - sph.theta) * f;
      if (Math.abs(sph.theta) < 0.002) a.north = false;
      moved = true;
    }
    if (a.zoom !== 1) {
      dist = THREE.MathUtils.clamp(dist * a.zoom, 40, 1600);
      a.zoom = 1;
      moved = true;
    }
    if (!moved) return;
    sph.radius = dist;
    camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(sph));
    controls.update();
  });
  return null;
}

/** Reports the camera heading so the compass needle can rotate. */
function Heading({ onHeading }: { onHeading: (deg: number) => void }) {
  const last = useRef(0);
  useFrame(({ camera }) => {
    const d = new THREE.Vector3();
    camera.getWorldDirection(d);
    const deg = THREE.MathUtils.radToDeg(Math.atan2(d.x, -d.z));
    if (Math.abs(deg - last.current) > 0.5) {
      last.current = deg;
      onHeading(deg);
    }
  });
  return null;
}

// ---------------------------------------------------------------- scene
function Regions({ state, metric, overlays, pal, hover, setHover }: {
  state: WorldState; metric: MapMetric; overlays: MapOverlay[]; pal: Palette; hover: RegionId | null; setHover: (r: RegionId | null) => void;
}) {
  const values = regionMetric(state, metric);
  const geos = useMemo(() => {
    const out = {} as Record<RegionId, THREE.ShapeGeometry>;
    for (const r of Object.keys(REGION_RINGS) as RegionId[]) {
      const g = new THREE.ShapeGeometry(ringsToShapes(REGION_RINGS[r]));
      g.rotateX(-Math.PI / 2);
      out[r] = g;
    }
    return out;
  }, []);
  const extruded = useMemo(() => {
    const out = {} as Record<RegionId, THREE.ExtrudeGeometry>;
    for (const r of Object.keys(REGION_RINGS) as RegionId[]) {
      const g = new THREE.ExtrudeGeometry(ringsToShapes(REGION_RINGS[r]), { depth: 1, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      out[r] = g;
    }
    return out;
  }, []);
  const hatch = useMemo(() => stripeTexture('#ff4b3a', 'stripes'), []);
  const dots = useMemo(() => stripeTexture('#2f8fe0', 'dots'), []);
  const energyMats = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame((s) => energyMats.current.forEach((m) => m && (m.opacity = (m.userData.base as number) * (0.65 + 0.35 * Math.sin(s.clock.elapsedTime * 3)))));

  return (
    <group>
      {(Object.keys(REGION_RINGS) as RegionId[]).map((r, i) => {
        const v = values[r];
        const reg = state.regions[r];
        const h = 1.5 + (v ?? 0) * 14; // gentle 3D bars: taller = more of the metric
        const color = v === null ? pal.land : new THREE.Color(pal.land).lerp(new THREE.Color(rampColor(RAMPS[metric], v)), 0.75);
        const isHover = hover === r;
        return (
          <group key={r}>
            <mesh geometry={extruded[r]} scale={[1, h, 1]} castShadow receiveShadow
              onPointerOver={(e) => { e.stopPropagation(); setHover(r); }} onPointerOut={() => setHover(null)}>
              <meshStandardMaterial color={color} roughness={0.85} emissive={isHover ? '#ffffff' : '#000000'} emissiveIntensity={isHover ? 0.18 : 0} />
            </mesh>
            {overlays.includes('energy') && reg && reg.energy < 0 && (
              <mesh geometry={geos[r]} position={[0, h + 0.15, 0]}>
                <meshBasicMaterial ref={(m) => { if (m) { m.userData.base = 0.35 + 0.6 * clamp01(-reg.energy / 20); energyMats.current[i] = m; } }}
                  map={hatch} transparent opacity={0.6} depthWrite={false} />
              </mesh>
            )}
            {overlays.includes('water') && reg && (
              <mesh geometry={geos[r]} position={[0, h + 0.25, 0]}>
                <meshBasicMaterial map={dots} transparent opacity={clamp01(reg.waterStress / 100)} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function OtherLand({ pal }: { pal: Palette }) {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(ringsToShapes(OTHER_LAND), { depth: 1.2, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color={pal.land} roughness={0.95} />
    </mesh>
  );
}

function Graticule({ pal }: { pal: Palette }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let lon = -180; lon <= 180; lon += 20) for (let lat = -75; lat < 80; lat += 5) {
      const a = project(lon, lat);
      const b = project(lon, lat + 5);
      pts.push(a.x, 0.05, a.z, b.x, 0.05, b.z);
    }
    for (let lat = -60; lat <= 80; lat += 20) {
      const a = project(-180, lat);
      const b = project(190, lat);
      pts.push(a.x, 0.05, a.z, b.x, 0.05, b.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={pal.grid} transparent opacity={0.5} />
    </lineSegments>
  );
}

/** A small cluster of towers at each city so zooming in feels like arriving somewhere. */
function CityTowers({ x, z, seed, hot }: { x: number; z: number; seed: number; hot: boolean }) {
  const items = useMemo(() => {
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 26 }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 7;
      return { x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, h: 1 + r() * 9 * (1 - d / 9), w: 0.6 + r() * 0.8 };
    });
  }, [x, z, seed]);
  return (
    <group>
      {items.map((b, i) => (
        <mesh key={i} position={[b.x, 1.5 + b.h / 2, b.z]} castShadow>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color={hot ? '#e8b4a8' : '#dfe3ea'} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function regionTop(state: WorldState, metric: MapMetric, r: RegionId) {
  const v = regionMetric(state, metric)[r];
  return 1.5 + (v ?? 0) * 14;
}

function Scene({ state, cities, metric, overlays, pal, api, selected, onPin, hover, setHover, onHeading }: {
  state: WorldState; cities: CityInfo[]; metric: MapMetric; overlays: MapOverlay[]; pal: Palette; api: MutableRefObject<MapApi>;
  selected: string | null; onPin: (id: string) => void; hover: RegionId | null; setHover: (r: RegionId | null) => void; onHeading: (d: number) => void;
}) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.background = new THREE.Color(pal.water);
    scene.fog = new THREE.Fog(pal.water, 1400, 2600);
  }, [scene, pal]);
  return (
    <>
      <MapControls makeDefault target={START.target.toArray()} enableDamping dampingFactor={0.08} minDistance={40} maxDistance={1600}
        maxPolarAngle={1.2} zoomSpeed={0.9} screenSpacePanning={false} />
      <MapRig api={api} />
      <Heading onHeading={onHeading} />
      <hemisphereLight args={['#ffffff', '#c9d4e2', 1.9]} />
      <directionalLight position={[-300, 600, 400]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-700} shadow-camera-right={700} shadow-camera-top={500} shadow-camera-bottom={-500} shadow-camera-far={2000} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow onPointerOver={() => setHover(null)}>
        <planeGeometry args={[6000, 4000]} />
        <meshBasicMaterial color={pal.water} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[6000, 4000]} />
        <shadowMaterial opacity={0.12} />
      </mesh>
      <Graticule pal={pal} />
      <OtherLand pal={pal} />
      <Regions state={state} metric={metric} overlays={overlays} pal={pal} hover={hover} setHover={setHover} />
      {(Object.keys(REGION_LABEL_POS) as RegionId[]).map((r) => {
        const p = REGION_LABEL_POS[r];
        const pp = project(p.x * 360 - 170, 93 - p.y * 150);
        return (
          <Html key={r} position={[pp.x, regionTop(state, metric, r) + 1, pp.z]} center zIndexRange={[10, 0]} className="wm-label-wrap">
            <div className="wm-label" style={{ color: pal.label }}>{REGION_NAMES[r]}</div>
          </Html>
        );
      })}
      {cities.map((c, i) => {
        const { lon, lat } = cityLonLat(c);
        const p = project(lon, lat);
        const top = regionTop(state, metric, c.region);
        const fx = [...effectsForCity(state, c.id).values()];
        const bad = fx.some((e) => !EFFECT_INFO[e.kind].positive);
        return (
          <group key={c.id}>
            <group position={[0, top - 1.5, 0]}>
              <CityTowers x={p.x} z={p.z} seed={i * 977 + 13} hot={bad} />
            </group>
            <Html position={[p.x, top + 14, p.z]} center zIndexRange={[40, 10]}>
              <button className={`wm-pin${bad ? ' bad' : fx.length ? ' good' : ''}${selected === c.id ? ' sel' : ''}`}
                aria-label={`${c.name}${fx.length ? `, ${fx.length} active event${fx.length > 1 ? 's' : ''}` : ''}`}
                onClick={(e) => { e.stopPropagation(); onPin(c.id); api.current.flyTo = { x: p.x, z: p.z, dist: 300 }; api.current.tilt = 0.8; }}>
                <span className="wm-pin-dot">{bad ? '!' : '●'}</span>
                <span className="wm-pin-name">{c.name}</span>
              </button>
            </Html>
          </group>
        );
      })}
    </>
  );
}

export interface WorldMap3DProps {
  state: WorldState;
  onSelectCity: (cityId: string) => void;
  cities: CityInfo[];
  initialMetric?: MapMetric;
  initialOverlays?: MapOverlay[];
}

export default function WorldMap3D({ state, onSelectCity, cities, initialMetric = 'gdp', initialOverlays = [] }: WorldMap3DProps) {
  const [metric, setMetric] = useState<MapMetric>(initialMetric);
  const [overlays, setOverlays] = useState<MapOverlay[]>(initialOverlays);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<RegionId | null>(null);
  const [heading, setHeading] = useState(0);
  const [flat, setFlat] = useState(false);
  const [dark, setDark] = useState(false);
  const [dpr, setDpr] = useState(1.75);
  const wrap = useRef<HTMLDivElement>(null);
  const api = useRef<MapApi>({ flyTo: null, tilt: null, north: false, zoom: 1 });

  useEffect(() => {
    const el = wrap.current;
    const themed = el?.closest('[data-theme]')?.getAttribute('data-theme');
    setDark(themed ? themed === 'dark' : typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  const pal = dark ? DARK : LIGHT;
  const city = cities.find((c) => c.id === selected) ?? null;
  const toggleOverlay = (o: MapOverlay) => setOverlays((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]));
  const fx = city ? [...effectsForCity(state, city.id).values()] : [];
  const reg = city ? state.regions[city.region] : hover ? state.regions[hover] : null;

  return (
    <div className="wm-wrap" ref={wrap} data-dark={dark}>
      <Canvas flat shadows dpr={dpr} camera={{ fov: 35, near: 1, far: 8000, position: [START.target.x, Math.cos(START.tilt) * START.dist, START.target.z + Math.sin(START.tilt) * START.dist] }}
        onPointerMissed={() => setSelected(null)}>
        <PerformanceMonitor flipflops={4} onIncline={() => setDpr((d) => Math.min(2, d + 0.25))} onDecline={() => setDpr((d) => Math.max(0.75, d - 0.3))} />
        <Scene state={state} cities={cities} metric={metric} overlays={overlays} pal={pal} api={api} selected={selected}
          onPin={setSelected} hover={hover} setHover={setHover} onHeading={setHeading} />
      </Canvas>

      {/* top bar, Apple-style floating glass */}
      <div className="wm-bar">
        <div className="wm-seg" role="group" aria-label="Colour by">
          {(Object.keys(METRIC_LABEL) as MapMetric[]).map((m) => (
            <button key={m} aria-pressed={metric === m} onClick={() => setMetric(m)}>{METRIC_LABEL[m]}</button>
          ))}
        </div>
        <button className="wm-chip" aria-pressed={overlays.includes('energy')} onClick={() => toggleOverlay('energy')}>⚡ Grid stress</button>
        <button className="wm-chip" aria-pressed={overlays.includes('water')} onClick={() => toggleOverlay('water')}>💧 Water stress</button>
        <span className="wm-year">{state.year}</span>
      </div>

      {/* right controls: 2D/3D, compass, zoom */}
      <div className="wm-ctrls">
        <button className="wm-ctrl" aria-label={flat ? 'Switch to 3D' : 'Switch to 2D'} onClick={() => { const f = !flat; setFlat(f); api.current.tilt = f ? 0.001 : 0.9; }}>{flat ? '3D' : '2D'}</button>
        <button className="wm-ctrl wm-compass" aria-label="Reset to north" onClick={() => (api.current.north = true)}>
          <span style={{ transform: `rotate(${-heading}deg)` }}>▲<small>N</small></span>
        </button>
        <div className="wm-zoom">
          <button className="wm-ctrl" aria-label="Zoom in" onClick={() => (api.current.zoom = 0.7)}>+</button>
          <button className="wm-ctrl" aria-label="Zoom out" onClick={() => (api.current.zoom = 1.4)}>−</button>
        </div>
        <button className="wm-ctrl" aria-label="Show whole world" onClick={() => { setSelected(null); api.current.flyTo = { x: START.target.x, z: START.target.z, dist: START.dist }; api.current.tilt = flat ? 0.001 : START.tilt; api.current.north = true; }}>🌐</button>
      </div>

      {/* legend */}
      <div className="wm-legend">
        <span>{METRIC_LABEL[metric]}</span>
        <span className="wm-legend-bar" style={{ background: `linear-gradient(90deg, ${RAMPS[metric].join(',')})` }} />
        <span>{metric === 'gdp' ? 'log scale · taller = more' : metric === 'ai' ? 'best home lab · taller = more' : `world-wide ${Math.round(state.global.geopoliticalTension)}/100`}</span>
      </div>

      {/* callout card (selected city) or hover card (region) */}
      {(city || (hover && reg)) && (
        <div className="wm-card" role="dialog" aria-label={city ? city.name : REGION_NAMES[hover!]}>
          <div className="wm-card-head">
            <div>
              <strong>{city ? city.name : REGION_NAMES[hover!]}</strong>
              {city && <small>{REGION_NAMES[city.region]} · {city.companyIds.length} HQs</small>}
            </div>
            {city && <button className="wm-x" aria-label="Close" onClick={() => setSelected(null)}>×</button>}
          </div>
          {reg && (
            <dl className="w-kv">
              <dt>GDP</dt><dd>{fmtMoneyBn(reg.gdp)}</dd>
              <dt>Population</dt><dd>{fmtPeopleM(reg.population)}</dd>
              <dt>Software jobs lost</dt><dd>{fmtPct(reg.unemploymentSoftware)}</dd>
              <dt>Public trust</dt><dd>{Math.round(reg.publicTrust)}/100</dd>
              <dt>Energy balance</dt><dd style={{ color: reg.energy < 0 ? '#e5484d' : undefined }}>{reg.energy > 0 ? '+' : ''}{Math.round(reg.energy)}</dd>
              <dt>Water stress</dt><dd>{Math.round(reg.waterStress)}/100</dd>
            </dl>
          )}
          {fx.length > 0 && (
            <div className="w-effect-tags">
              {fx.map((e) => <span key={e.kind} className={`w-tag${EFFECT_INFO[e.kind].positive ? ' good' : ''}`}>{EFFECT_INFO[e.kind].icon} {EFFECT_INFO[e.kind].label}</span>)}
            </div>
          )}
          {city && <button className="wm-go" onClick={() => onSelectCity(city.id)}>Open {city.name} →</button>}
        </div>
      )}
    </div>
  );
}
