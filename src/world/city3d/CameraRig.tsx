/**
 * Smooth "aerial street view" camera: drag to pan along the ground, right-drag to rotate/tilt, wheel to zoom
 * (MapControls with damping), plus keyboard / on-screen hold buttons to fly forward/back, strafe, rotate, zoom,
 * double-click to glide to a spot, and a slow cinematic drift when idle.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

export type RigAction = 'fwd' | 'back' | 'left' | 'right' | 'rotL' | 'rotR' | 'zoomIn' | 'zoomOut' | 'up' | 'down';

export interface RigApi {
  held: Set<RigAction>;
  flyTo: THREE.Vector3 | null;
  reset: boolean;
  lastInput: number;
}

export function makeRigApi(): RigApi {
  return { held: new Set(), flyTo: null, reset: false, lastInput: 0 };
}

const KEYS: Record<string, RigAction> = {
  KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyQ: 'rotL', KeyE: 'rotR', Equal: 'zoomIn', NumpadAdd: 'zoomIn', Minus: 'zoomOut', NumpadSubtract: 'zoomOut', KeyR: 'up', KeyF: 'down',
};

export const HOME = { pos: new THREE.Vector3(150, 175, 560), target: new THREE.Vector3(0, 30, -110) };

interface Controls {
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (t: string, f: () => void) => void;
  removeEventListener: (t: string, f: () => void) => void;
}

export function CameraRig({ api, container }: { api: MutableRefObject<RigApi>; container: MutableRefObject<HTMLElement | null> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const vel = useRef(new THREE.Vector3());

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const down = (e: KeyboardEvent) => {
      const a = KEYS[e.code];
      if (!a) return;
      e.preventDefault();
      api.current.held.add(a);
      api.current.lastInput = performance.now();
    };
    const up = (e: KeyboardEvent) => {
      const a = KEYS[e.code];
      if (a) api.current.held.delete(a);
    };
    const blur = () => api.current.held.clear();
    el.addEventListener('keydown', down);
    el.addEventListener('keyup', up);
    el.addEventListener('blur', blur);
    return () => {
      el.removeEventListener('keydown', down);
      el.removeEventListener('keyup', up);
      el.removeEventListener('blur', blur);
    };
  }, [api, container]);

  useEffect(() => {
    if (!controls) return;
    const touch = () => (api.current.lastInput = performance.now());
    controls.addEventListener('start', touch);
    return () => controls.removeEventListener('start', touch);
  }, [controls, api]);

  useFrame((_, rawDt) => {
    if (!controls) return;
    const dt = Math.min(rawDt, 0.05);
    const a = api.current;
    const target = controls.target;
    const offset = camera.position.clone().sub(target);
    const dist = offset.length();
    const h = a.held;
    if (h.size) a.lastInput = performance.now();

    if (a.reset) {
      a.reset = false;
      a.flyTo = null;
      a.held.clear();
      vel.current.set(0, 0, 0);
      (a as RigApi & { homeAnim?: number }).homeAnim = 1;
    }
    const homing = (a as RigApi & { homeAnim?: number }).homeAnim;
    if (homing) {
      const f = 1 - Math.exp(-3 * dt);
      target.lerp(HOME.target, f);
      camera.position.lerp(HOME.pos, f);
      if (camera.position.distanceTo(HOME.pos) < 1) (a as RigApi & { homeAnim?: number }).homeAnim = 0;
      controls.update();
      return;
    }

    // forward = view direction flattened onto the ground
    const fwd = target.clone().sub(camera.position).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
    const want = new THREE.Vector3();
    if (h.has('fwd')) want.add(fwd);
    if (h.has('back')) want.sub(fwd);
    if (h.has('right')) want.add(right);
    if (h.has('left')) want.sub(right);
    const speed = THREE.MathUtils.clamp(dist * 0.9, 40, 650);
    want.multiplyScalar(speed);
    vel.current.lerp(want, 1 - Math.exp(-5 * dt));
    const step = vel.current.clone().multiplyScalar(dt);

    if (a.flyTo) {
      const f = 1 - Math.exp(-2.5 * dt);
      const d = a.flyTo.clone().sub(target).multiplyScalar(f);
      step.add(d);
      if (a.flyTo.distanceTo(target) < 0.5) a.flyTo = null;
    }
    target.add(step);
    target.x = THREE.MathUtils.clamp(target.x, -1100, 1100);
    target.z = THREE.MathUtils.clamp(target.z, -1300, 700);

    let rot = 0;
    if (h.has('rotL')) rot += 0.9 * dt;
    if (h.has('rotR')) rot -= 0.9 * dt;
    const idle = performance.now() - a.lastInput > 12000 && !a.flyTo;
    if (idle) rot += 0.025 * dt; // slow cinematic drift
    if (rot) offset.applyAxisAngle(camera.up, rot);

    let zoom = 1;
    if (h.has('zoomIn')) zoom *= Math.exp(-1.3 * dt);
    if (h.has('zoomOut')) zoom *= Math.exp(1.3 * dt);
    if (zoom !== 1) {
      const nd = THREE.MathUtils.clamp(dist * zoom, 25, 1100);
      offset.setLength(nd);
    }
    if (h.has('up')) offset.y = Math.min(offset.y + 60 * dt, 900);
    if (h.has('down')) offset.y = Math.max(offset.y - 60 * dt, 6);

    camera.position.copy(target).add(offset);
    if (camera.position.y < 4) camera.position.y = 4;
    controls.update();
  });

  return null;
}
