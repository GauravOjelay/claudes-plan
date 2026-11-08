/**
 * Interactive 3D GLOBE, Apple-Maps style: real Natural Earth coastlines on a terrain-shaded Earth with an
 * atmosphere glow; smooth inertial rotate + zoom; city pins (hidden behind the horizon) that glide the camera
 * in and open a callout. Live city events pulse on the globe as coloured rings. Lazy-loaded by WorldMap.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { CityEffectKind, CityInfo, RegionId, WorldState } from '../../contracts';
import { REGION_LABEL_POS, REGION_NAMES } from '../geo';
import { METRIC_LABEL, RAMPS, type MapMetric, type MapOverlay } from '../mapMetrics';
import { EFFECT_COLOR, EFFECT_INFO, companiesInCity, effectsForCity, fmtMoneyBn, fmtPct, fmtPeopleM } from '../util';
import { FpsMeter, useFpsVisible } from '../FpsMeter';
import { EventFeed, Toasts } from '../EventFeed';
import { loadEarth, paintEarth, paintOverlay, type EarthData, type EarthTextures } from './earthTexture';
import '../world.css';

const R = 100;

/** lon/lat -> point on the globe (matches three's SphereGeometry UV layout: lon 0 at +x, 90E at -z). */
export function lonLatToVec(lon: number, lat: number, r = R): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}
/** CityInfo.mapPos uses the 0-1 projection from geo.ts; invert it to lon/lat. */
export function cityLonLat(c: CityInfo): { lon: number; lat: number } {
  return { lon: c.mapPos.x * 360 - 170, lat: 93 - c.mapPos.y * 150 };
}

// ---------------------------------------------------------------- earth data (loaded + painted once)
type Earth = { data: EarthData; tex: EarthTextures };
let earthPromise: Promise<Earth> | null = null;
function getEarth() {
  earthPromise ??= loadEarth().then((data) => ({ data, tex: paintEarth(data) }));
  return earthPromise;
}

function useEarth() {
  const [earth, setEarth] = useState<Earth | null>(null);
  useEffect(() => {
    let live = true;
    // let the first frame (plain globe) paint before the heavier texture work
    const t = setTimeout(() => getEarth().then((e) => live && setEarth(e)), 30);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, []);
  return earth;
}

// ---------------------------------------------------------------- globe pieces
function EarthMesh({ earth, overlay, version }: { earth: Earth | null; overlay: HTMLCanvasElement; version: number }) {
  const tex = useMemo(() => {
    if (!earth) return null;
    const color = new THREE.CanvasTexture(earth.tex.color);
    color.colorSpace = THREE.SRGBColorSpace;
    color.anisotropy = 8;
    const bump = new THREE.CanvasTexture(earth.tex.bump);
    const rough = new THREE.CanvasTexture(earth.tex.rough);
    return { color, bump, rough };
  }, [earth]);
  const overlayTex = useMemo(() => {
    const t = new THREE.CanvasTexture(overlay);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [overlay]);
  useEffect(() => {
    overlayTex.needsUpdate = true;
  }, [overlayTex, version]);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[R, 192, 128]} />
        {tex ? (
          <meshStandardMaterial key="tex" map={tex.color} bumpMap={tex.bump} bumpScale={2.5} roughnessMap={tex.rough} roughness={1} metalness={0} />
        ) : (
          <meshStandardMaterial key="plain" color="#1c4f86" roughness={0.6} />
        )}
      </mesh>
      {earth && (
        <mesh>
          <sphereGeometry args={[R * 1.0015, 128, 96]} />
          <meshBasicMaterial map={overlayTex} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

const ATMO_VERT = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const atmoFrag = (strength: number, power: number) => /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
uniform vec3 uColor;
void main() {
  float rim = 1.0 - abs(dot(vNormal, vView));
  gl_FragColor = vec4(uColor, pow(rim, ${power.toFixed(1)}) * ${strength.toFixed(2)});
}`;

function Atmosphere() {
  const outer = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: ATMO_VERT, fragmentShader: atmoFrag(0.75, 4.5), uniforms: { uColor: { value: new THREE.Color('#5aa8ff') } }, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  const inner = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: ATMO_VERT, fragmentShader: atmoFrag(0.22, 6.0), uniforms: { uColor: { value: new THREE.Color('#a6d4ff') } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  return (
    <group>
      <mesh material={outer}><sphereGeometry args={[R * 1.07, 96, 64]} /></mesh>
      <mesh material={inner}><sphereGeometry args={[R * 1.004, 96, 64]} /></mesh>
    </group>
  );
}

function Stars() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    let s = 99;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2500; i++) {
      const v = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(2500 + r() * 800);
      pts.push(v.x, v.y, v.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={2.2} sizeAttenuation={false} color="#dfe8ff" transparent opacity={0.8} />
    </points>
  );
}

/** Light that follows the camera so the side you look at is always in daylight (like Apple's globe). */
function CameraLight() {
  const ref = useRef<THREE.DirectionalLight>(null);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const p = camera.position.clone();
    const up = camera.up.clone().multiplyScalar(p.length() * 0.6);
    const left = new THREE.Vector3().crossVectors(camera.up, p).normalize().multiplyScalar(p.length() * 0.5);
    ref.current.position.copy(p).add(up).add(left);
  });
  return <directionalLight ref={ref} intensity={2.1} color="#fff6ea" />;
}

/** Small cluster of towers standing on the globe at a city (visible when zoomed in). */
function CityTowers({ dir, seed, hot }: { dir: THREE.Vector3; seed: number; hot: boolean }) {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), [dir]);
  const items = useMemo(() => {
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 22 }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 1.4;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, h: 0.15 + r() * 1.3 * (1 - d / 1.6), w: 0.12 + r() * 0.14 };
    });
  }, [seed]);
  return (
    <group position={dir.clone().normalize().multiplyScalar(R)} quaternion={q}>
      {items.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color={hot ? '#f0c0b4' : '#eef1f6'} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Pulsing rings on the globe for each active effect at a city: colour = effect, size/brightness = intensity. */
function EventRings({ dir, effects }: { dir: THREE.Vector3; effects: { kind: CityEffectKind; intensity: number }[] }) {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize()), [dir]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      const e = effects[i];
      if (!m || !e) return;
      const ph = (t * 0.55 + i * 0.37) % 1;
      m.scale.setScalar((1.4 + i * 0.7) * (0.6 + ph * 1.2) * (0.6 + e.intensity * 0.8));
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * (0.35 + 0.55 * e.intensity);
    });
  });
  return (
    <group position={dir.clone().normalize().multiplyScalar(R * 1.003)} quaternion={q}>
      {effects.map((e, i) => (
        <mesh key={e.kind} ref={(m) => (refs.current[i] = m)}>
          <ringGeometry args={[0.8, 1, 48]} />
          <meshBasicMaterial color={EFFECT_COLOR[e.kind]} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- camera
interface GlobeApi { flyTo: THREE.Vector3 | null; flyDist: number; zoom: number; lastInput: number }

interface Ctl {
  update: () => void;
  rotateSpeed: number;
  autoRotate: boolean;
  addEventListener: (t: string, f: () => void) => void;
  removeEventListener: (t: string, f: () => void) => void;
}

function GlobeRig({ api }: { api: MutableRefObject<GlobeApi> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as Ctl | null;
  useEffect(() => {
    if (!controls) return;
    const touch = () => {
      api.current.lastInput = performance.now();
      api.current.flyTo = null;
    };
    controls.addEventListener('start', touch);
    return () => controls.removeEventListener('start', touch);
  }, [controls, api]);
  useFrame((_, raw) => {
    if (!controls) return;
    const dt = Math.min(raw, 0.05);
    const a = api.current;
    let dist = camera.position.length();
    // slower rotation when close, like a real map
    controls.rotateSpeed = THREE.MathUtils.clamp((dist - R) / (R * 2.2), 0.05, 0.7);
    controls.autoRotate = performance.now() - a.lastInput > 12000 && !a.flyTo;
    if (a.flyTo) {
      const f = 1 - Math.exp(-2.6 * dt);
      const dir = camera.position.clone().normalize().lerp(a.flyTo.clone().normalize(), f).normalize();
      dist += (a.flyDist - dist) * f;
      camera.position.copy(dir.multiplyScalar(dist));
      if (camera.position.clone().normalize().angleTo(a.flyTo) < 0.002 && Math.abs(dist - a.flyDist) < 0.5) a.flyTo = null;
    }
    if (a.zoom !== 1) {
      // zoom by altitude above the surface so it feels the same far out and close in
      camera.position.setLength(THREE.MathUtils.clamp(R + (dist - R) * a.zoom, R * 1.3, R * 4));
      a.zoom = 1;
      a.lastInput = performance.now();
    }
    controls.update();
  });
  return null;
}

// ---------------------------------------------------------------- pins (DOM), hidden behind the horizon
function Pins({ state, cities, selected, onPin }: { state: WorldState; cities: CityInfo[]; selected: string | null; onPin: (c: CityInfo, dir: THREE.Vector3) => void }) {
  const els = useRef<Map<string, HTMLElement>>(new Map());
  const dirs = useMemo(() => new Map(cities.map((c) => { const { lon, lat } = cityLonLat(c); return [c.id, lonLatToVec(lon, lat, 1)] as const; })), [cities]);
  useFrame(({ camera }) => {
    const cam = camera.position.clone().normalize();
    const dist = camera.position.length();
    for (const [id, el] of els.current) {
      const d = dirs.get(id);
      if (!d) continue;
      const facing = d.dot(cam);
      const vis = facing > 0.18;
      el.style.opacity = vis ? String(Math.min(1, (facing - 0.18) * 6)) : '0';
      el.style.pointerEvents = vis ? 'auto' : 'none';
      el.classList.toggle('far', dist > R * 2.6);
    }
  });
  return (
    <group>
      {cities.map((c) => {
        const dir = dirs.get(c.id)!;
        const fx = [...effectsForCity(state, c.id).values()];
        const bad = fx.some((e) => !EFFECT_INFO[e.kind].positive);
        return (
          <Html key={c.id} position={dir.clone().multiplyScalar(R * 1.01).toArray()} center zIndexRange={[40, 10]}>
            <button ref={(el) => { if (el) els.current.set(c.id, el); else els.current.delete(c.id); }}
              className={`wm-pin${bad ? ' bad' : fx.length ? ' good' : ''}${selected === c.id ? ' sel' : ''}`}
              aria-label={`${c.name}${fx.length ? `, ${fx.length} active event${fx.length > 1 ? 's' : ''}` : ''}`}
              onClick={(e) => { e.stopPropagation(); onPin(c, dir); }}>
              <span className="wm-pin-dot">{fx.length ? EFFECT_INFO[fx[fx.length - 1].kind].icon : ''}</span>
              <span className="wm-pin-name">{c.name}</span>
            </button>
          </Html>
        );
      })}
    </group>
  );
}

function RegionLabels() {
  const els = useRef<Map<string, HTMLElement>>(new Map());
  const items = useMemo(() => (Object.keys(REGION_LABEL_POS) as RegionId[]).map((r) => {
    const p = REGION_LABEL_POS[r];
    return { r, dir: lonLatToVec(p.x * 360 - 170, 93 - p.y * 150, 1) };
  }), []);
  useFrame(({ camera }) => {
    const cam = camera.position.clone().normalize();
    const dist = camera.position.length();
    for (const it of items) {
      const el = els.current.get(it.r);
      if (!el) continue;
      const f = it.dir.dot(cam);
      el.style.opacity = f > 0.3 && dist < R * 3.4 ? String(Math.min(0.9, (f - 0.3) * 4)) : '0';
    }
  });
  return (
    <group>
      {items.map((it) => (
        <Html key={it.r} position={it.dir.clone().multiplyScalar(R * 1.01).toArray()} center zIndexRange={[5, 0]} className="wm-label-wrap">
          <div ref={(el) => { if (el) els.current.set(it.r, el); }} className="wm-label wm-label-globe">{REGION_NAMES[it.r]}</div>
        </Html>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- component
export interface WorldMap3DProps {
  state: WorldState;
  onSelectCity: (cityId: string) => void;
  cities: CityInfo[];
  initialMetric?: MapMetric;
  initialOverlays?: MapOverlay[];
  /** Opens the player's HQ (decision cards). Falls back to opening the player's home city. */
  onOpenHQ?: (companyId: string) => void;
}

type Tint = MapMetric | 'none';
const START_DIR = lonLatToVec(10, 22, 1);
const START_DIST = R * 3.1;

export default function WorldMap3D({ state, onSelectCity, cities, initialMetric, initialOverlays = [], onOpenHQ }: WorldMap3DProps) {
  const [tint, setTint] = useState<Tint>(initialMetric ?? 'none'); // real-looking terrain by default
  const [overlays, setOverlays] = useState<MapOverlay[]>(initialOverlays);
  const [selected, setSelected] = useState<string | null>(null);
  const [dpr, setDpr] = useState(1.75);
  const api = useRef<GlobeApi>({ flyTo: null, flyDist: R * 1.6, zoom: 1, lastInput: 0 });
  const earth = useEarth();
  const fpsVisible = useFpsVisible();
  const fpsEl = useRef<HTMLSpanElement>(null);

  // data overlay canvas (metric tint + resource layers), repainted when its inputs change
  const overlayCanvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 1024;
    return c;
  }, []);
  const [overlayVersion, setOverlayVersion] = useState(0);
  const stateKey =
    Object.values(state.regions).map((r) => `${Math.round(r.gdp)}:${Math.round(r.energy)}:${Math.round(r.waterStress)}`).join() +
    state.global.geopoliticalTension +
    state.companies.map((c) => c.vars.aiCapability).join();
  const overlayKey = overlays.join();
  useEffect(() => {
    if (!earth) return;
    paintOverlay(overlayCanvas, earth.data, state, tint, overlays, null);
    setOverlayVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earth, tint, overlayKey, stateKey]);

  const city = cities.find((c) => c.id === selected) ?? null;
  const toggleOverlay = (o: MapOverlay) => setOverlays((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]));
  const fx = city ? [...effectsForCity(state, city.id).values()] : [];
  const reg = city ? state.regions[city.region] : null;
  const player = state.companies.find((c) => c.id === state.playerCompanyId);
  const playerHome = player ? cities.find((c) => c.id === player.homeCity) : undefined;
  const hqs = city ? companiesInCity(state, city) : [];
  const openHQ = () => {
    if (!player) return;
    if (onOpenHQ) onOpenHQ(player.id);
    else if (playerHome) onSelectCity(playerHome.id);
  };
  const flyToCity = (id: string) => {
    const c = cities.find((k) => k.id === id);
    if (!c) return;
    const { lon, lat } = cityLonLat(c);
    setSelected(id);
    api.current.flyTo = lonLatToVec(lon, lat, 1);
    api.current.flyDist = R * 1.6;
    api.current.lastInput = performance.now();
  };
  const flyHome = () => {
    setSelected(null);
    api.current.flyTo = START_DIR.clone();
    api.current.flyDist = START_DIST;
  };

  return (
    <div className="wm-wrap wm-globe">
      <Canvas dpr={dpr} camera={{ fov: 38, near: 0.5, far: 8000, position: START_DIR.clone().multiplyScalar(START_DIST).toArray() }}
        onPointerMissed={() => setSelected(null)} gl={{ antialias: true }}>
        <color attach="background" args={['#04060c']} />
        <PerformanceMonitor flipflops={4} onIncline={() => setDpr((d) => Math.min(2, d + 0.25))} onDecline={() => setDpr((d) => Math.max(0.75, d - 0.3))} />
        <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.06} minDistance={R * 1.3} maxDistance={R * 4} zoomSpeed={0.7} autoRotateSpeed={0.25} />
        <GlobeRig api={api} />
        {fpsVisible && <FpsMeter target={fpsEl} />}
        <ambientLight intensity={0.55} />
        <CameraLight />
        <Stars />
        <EarthMesh earth={earth} overlay={overlayCanvas} version={overlayVersion} />
        <Atmosphere />
        {cities.map((c, i) => {
          const { lon, lat } = cityLonLat(c);
          const dir = lonLatToVec(lon, lat, 1);
          const cfx = [...effectsForCity(state, c.id).values()];
          return (
            <group key={c.id}>
              <CityTowers dir={dir} seed={i * 977 + 13} hot={cfx.some((e) => !EFFECT_INFO[e.kind].positive)} />
              {cfx.length > 0 && <EventRings dir={dir} effects={cfx.map((e) => ({ kind: e.kind, intensity: e.intensity }))} />}
            </group>
          );
        })}
        <RegionLabels />
        <Pins state={state} cities={cities} selected={selected}
          onPin={(c) => flyToCity(c.id)} />
      </Canvas>

      <Toasts state={state} cities={cities} />
      {!city && (
        <div className="wm-feed">
          <EventFeed state={state} cities={cities} onPick={flyToCity} title="Happening now" />
        </div>
      )}

      {!earth && <div className="wm-loading-chip">Loading coastlines…</div>}

      <div className="wm-bar">
        <div className="wm-seg" role="group" aria-label="Colour by">
          <button aria-pressed={tint === 'none'} onClick={() => setTint('none')}>Terrain</button>
          {(Object.keys(METRIC_LABEL) as MapMetric[]).map((m) => (
            <button key={m} aria-pressed={tint === m} onClick={() => setTint(m)}>{METRIC_LABEL[m]}</button>
          ))}
        </div>
        <button className="wm-chip" aria-pressed={overlays.includes('energy')} onClick={() => toggleOverlay('energy')}>⚡ Grid stress</button>
        <button className="wm-chip" aria-pressed={overlays.includes('water')} onClick={() => toggleOverlay('water')}>💧 Water stress</button>
      </div>

      <div className="w-year-badge" aria-label={`Year ${state.year}`}><small>YEAR</small>{state.year}</div>

      <div className="wm-ctrls">
        <div className="wm-zoom">
          <button className="wm-ctrl" aria-label="Zoom in" onClick={() => (api.current.zoom = 0.6)}>+</button>
          <button className="wm-ctrl" aria-label="Zoom out" onClick={() => (api.current.zoom = 1.6)}>−</button>
        </div>
        <button className="wm-ctrl" aria-label="Show whole globe" onClick={flyHome}>🌐</button>
      </div>

      {fpsVisible && <div className="w-fps"><span ref={fpsEl}>–</span> fps</div>}

      {tint !== 'none' && (
        <div className="wm-legend">
          <span>{METRIC_LABEL[tint]}</span>
          <span className="wm-legend-bar" style={{ background: `linear-gradient(90deg, ${RAMPS[tint].join(',')})` }} />
          <span>{tint === 'gdp' ? 'log scale' : tint === 'ai' ? 'best home lab' : `world-wide ${Math.round(state.global.geopoliticalTension)}/100`}</span>
        </div>
      )}

      {player && !city && (
        <button className="w-cta wm-cta" onClick={openHQ}>
          <span className="w-cta-kicker">Your move</span>
          Make a decision at {player.name} HQ →
        </button>
      )}

      {city && (
        <div className="wm-card" role="dialog" aria-label={city.name}>
          <div className="wm-card-head">
            <div>
              <strong>{city.name}</strong>
              <small>{REGION_NAMES[city.region]} · {hqs.map((h) => h.name).join(', ')}</small>
            </div>
            <button className="wm-x" aria-label="Close" onClick={() => setSelected(null)}>×</button>
          </div>
          {reg && (
            <dl className="w-kv">
              <dt>GDP</dt><dd>{fmtMoneyBn(reg.gdp)}</dd>
              <dt>Population</dt><dd>{fmtPeopleM(reg.population)}</dd>
              <dt>Software jobs lost</dt><dd>{fmtPct(reg.unemploymentSoftware)}</dd>
              <dt>Public trust</dt><dd>{Math.round(reg.publicTrust)}/100</dd>
              <dt>Energy balance</dt><dd style={{ color: reg.energy < 0 ? '#e5484d' : undefined }}>{reg.energy > 0 ? '+' : ''}{Math.round(reg.energy)}</dd>
            </dl>
          )}
          {fx.length > 0 && (
            <div className="w-effect-tags">
              {fx.map((e) => <span key={e.kind} className={`w-tag${EFFECT_INFO[e.kind].positive ? ' good' : ''}`}>{EFFECT_INFO[e.kind].icon} {EFFECT_INFO[e.kind].label}</span>)}
            </div>
          )}
          <button className="wm-go" onClick={() => onSelectCity(city.id)}>Open {city.name} →</button>
          {player && player.homeCity === city.id && (
            <button className="w-cta" onClick={openHQ}>Make a decision at {player.name} HQ →</button>
          )}
        </div>
      )}
    </div>
  );
}
