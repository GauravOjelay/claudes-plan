/** Small frame-rate readout for the 3D views. On by default; `?fps=0` hides it, `?fps` forces it on. */
import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';

export function useFpsVisible(): boolean {
  try {
    const v = new URLSearchParams(window.location.search).get('fps');
    return v !== '0' && v !== 'false';
  } catch {
    return true;
  }
}

/** Lives inside <Canvas>; writes the measured fps into `target` twice a second (no React re-render). */
export function FpsMeter({ target }: { target: RefObject<HTMLElement> }) {
  const acc = useRef({ frames: 0, t0: performance.now() });
  useFrame(() => {
    const a = acc.current;
    a.frames++;
    const now = performance.now();
    if (now - a.t0 >= 500) {
      const fps = Math.round((a.frames * 1000) / (now - a.t0));
      if (target.current) {
        target.current.textContent = String(fps);
        target.current.parentElement?.setAttribute('data-level', fps >= 50 ? 'good' : fps >= 30 ? 'ok' : 'bad');
      }
      a.frames = 0;
      a.t0 = now;
    }
  });
  return null;
}
