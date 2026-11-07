/**
 * One renderer per CityEffectKind. Each takes the scene layout and an intensity 0-1 and returns SVG.
 * Sensitive kinds (war, outbreak, unrest) are kept abstract and non-graphic (plan section 15).
 */
import type { ReactNode } from 'react';
import type { CityEffectKind } from '../contracts';
import { GROUND_Y, QUAY_BOTTOM, ROAD_BOTTOM, ROAD_TOP, SCENE_H, SCENE_W, type SceneLayout } from './scene';
import { visualRng } from './util';

type Draw = (layout: SceneLayout, k: number, seed: string) => ReactNode;

/** Layers: 'sky' draws behind the buildings, 'street' in front of them, 'top' over everything. */
export interface EffectRenderer {
  sky?: Draw;
  street?: Draw;
  top?: Draw;
}

const count = (k: number, min: number, max: number) => Math.round(min + (max - min) * k);

function Person({ x, y, color = '#c9d3e8', sign, raise }: { x: number; y: number; color?: string; sign?: string; raise?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y - 15} r={3.2} fill={color} />
      <rect x={x - 3.2} y={y - 11.5} width={6.4} height={11.5} rx={2} fill={color} />
      {raise && <line x1={x + 3} y1={y - 10} x2={x + 6} y2={y - 20} stroke={color} strokeWidth={2} strokeLinecap="round" />}
      {sign && (
        <g className="w-sway">
          <line x1={x + 4} y1={y - 8} x2={x + 4} y2={y - 26} stroke="#8a7a5a" strokeWidth={1.5} />
          <rect x={x - 6} y={y - 36} width={20} height={11} fill={sign} stroke="#222" strokeWidth={0.5} />
        </g>
      )}
    </g>
  );
}

function Crowd({ x0, x1, n, seed, signs = 0, raise = 0, colors }: { x0: number; x1: number; n: number; seed: string; signs?: number; raise?: number; colors: string[] }) {
  const rnd = visualRng(seed);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + rnd() * (x1 - x0);
        const y = GROUND_Y + 4 + rnd() * 12;
        const r = rnd();
        return (
          <Person key={i} x={x} y={y} color={colors[Math.floor(rnd() * colors.length)]}
            sign={r < signs ? ['#f4e04d', '#ffffff', '#ff8a65'][i % 3] : undefined} raise={r > 1 - raise} />
        );
      })}
    </g>
  );
}

function Car({ x, y, color, brake }: { x: number; y: number; color: string; brake?: boolean }) {
  return (
    <g>
      <rect x={x} y={y - 9} width={30} height={10} rx={3} fill={color} />
      <rect x={x + 6} y={y - 15} width={17} height={7} rx={2} fill={color} opacity={0.85} />
      <rect x={x + 8} y={y - 14} width={13} height={5} rx={1} fill="#9fd4ff" opacity={0.5} />
      <circle cx={x + 7} cy={y + 1} r={3} fill="#111" />
      <circle cx={x + 23} cy={y + 1} r={3} fill="#111" />
      {brake && <rect className="w-blink" x={x - 1} y={y - 7} width={3} height={3} fill="#ff2a2a" />}
    </g>
  );
}

function Smoke({ x, y, delay, scale = 1 }: { x: number; y: number; delay: number; scale?: number }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <circle key={i} className="w-rise" cx={x} cy={y} r={10 * scale} fill="#6b6f7a" opacity={0.6}
          style={{ animationDelay: `${delay + i * 1.3}s`, transformBox: 'fill-box', transformOrigin: 'center' }} />
      ))}
    </g>
  );
}

export const EFFECT_RENDERERS: Record<CityEffectKind, EffectRenderer> = {
  // Windows going dark is handled in the building layer (lighting.ts); here: grid stress visuals.
  blackout: {
    sky: (_l, k) => (
      <rect x={0} y={0} width={SCENE_W} height={GROUND_Y} fill="#000" opacity={0.25 * k} />
    ),
    street: (_l, k, seed) => {
      const rnd = visualRng(seed);
      const pylons = count(k, 2, 5);
      return (
        <g>
          {/* failing street lights */}
          {Array.from({ length: 12 }, (_, i) => {
            const x = 40 + i * 100 + rnd() * 30;
            const out = rnd() < k;
            return (
              <g key={i}>
                <line x1={x} y1={GROUND_Y + 12} x2={x} y2={GROUND_Y - 30} stroke="#3a4560" strokeWidth={2} />
                <circle className={out ? 'w-flicker' : undefined} cx={x} cy={GROUND_Y - 31} r={3.5} fill={out ? '#3b3b2a' : '#ffe9a8'}
                  style={{ animationDelay: `${rnd() * 3}s` }} />
              </g>
            );
          })}
          {/* overloaded substation sign */}
          {Array.from({ length: pylons }, (_, i) => (
            <g key={`p${i}`} transform={`translate(${200 + i * 210}, ${GROUND_Y - 6})`}>
              <rect x={-11} y={-14} width={22} height={14} rx={2} fill="#2a2f3d" stroke="#ffb547" strokeWidth={1} />
              <text className="w-blink" x={0} y={-3} fontSize={11} textAnchor="middle" fill="#ffb547" style={{ animationDelay: `${i * 0.3}s` }}>⚡</text>
            </g>
          ))}
        </g>
      );
    },
    top: (_l, k) => (
      <g>
        <rect x={SCENE_W - 290} y={14} width={276} height={30} rx={6} fill="rgba(20,10,0,0.75)" stroke="#ffb547" />
        <text x={SCENE_W - 152} y={34} textAnchor="middle" fontSize={13} fill="#ffb547" fontWeight={700}>
          ROLLING BLACKOUTS · {Math.round(k * 100)}% OF GRID
        </text>
      </g>
    ),
  },

  // Towers dark floor by floor (lighting.ts); here: vacancy banners and a closed food truck.
  ghostOffices: {
    street: (l, k) => {
      const offices = l.buildings.filter((b) => b.kind === 'office').sort((a, b) => a.district - b.district);
      const banners = offices.slice(0, count(k, 1, Math.min(7, offices.length)));
      return (
        <g>
          {banners.map((b) => (
            <g key={b.id}>
              <rect x={b.x + b.w / 2 - 22} y={GROUND_Y - b.h * 0.55} width={44} height={14} fill="#e8e1c8" stroke="#555" strokeWidth={0.5} />
              <text x={b.x + b.w / 2} y={GROUND_Y - b.h * 0.55 + 10.5} fontSize={8} textAnchor="middle" fill="#a8261c" fontWeight={700}>TO LET</text>
            </g>
          ))}
          <g transform={`translate(${470}, ${GROUND_Y + 2})`} opacity={0.9}>
            <rect x={0} y={-22} width={46} height={22} rx={3} fill="#6e6a5e" />
            <rect x={6} y={-18} width={24} height={10} fill="#3a3a38" />
            <text x={18} y={-10} fontSize={6} textAnchor="middle" fill="#ddd">CLOSED</text>
          </g>
        </g>
      );
    },
  },

  deepfakeProtests: {
    sky: (_l, k) => {
      const screens = count(k, 1, 3);
      const xs = [430, 760, 180];
      return (
        <g>
          {xs.slice(0, screens).map((x, i) => (
            <g key={i} className="w-glitch" style={{ animationDelay: `${i * 0.7}s` }}>
              <rect x={x - 60} y={70 + i * 26} width={120} height={70} rx={4} fill="#0a0f1c" stroke="#ff4fa0" strokeWidth={2} />
              <circle cx={x} cy={98 + i * 26} r={14} fill="#c0b2d8" opacity={0.85} />
              <rect x={x - 18} y={112 + i * 26} width={36} height={22} rx={8} fill="#c0b2d8" opacity={0.85} />
              <rect x={x - 60} y={70 + i * 26} width={120} height={70} fill="url(#w-scanlines)" />
              <rect x={x - 56} y={74 + i * 26} width={28} height={11} fill="#e02020" />
              <text x={x - 42} y={82.5 + i * 26} fontSize={8} textAnchor="middle" fill="#fff" fontWeight={700}>LIVE</text>
              <text x={x + 30} y={134 + i * 26} fontSize={9} textAnchor="middle" fill="#ff4fa0" fontWeight={700}>REAL?</text>
            </g>
          ))}
        </g>
      );
    },
    street: (_l, k, seed) => (
      <Crowd x0={380} x1={820} n={count(k, 10, 70)} seed={seed} signs={0.35} raise={0.15} colors={['#c9d3e8', '#f2b8a0', '#9fb6e0', '#e6d39a']} />
    ),
  },

  gridlock: {
    street: (_l, k, seed) => {
      const rnd = visualRng(seed);
      const colors = ['#d9dde6', '#5a6b8c', '#c43b3b', '#2e2e34', '#e0b84a'];
      const perLane = count(k, 5, 36);
      return (
        <g>
          <rect x={0} y={ROAD_TOP} width={SCENE_W} height={ROAD_BOTTOM - ROAD_TOP} fill="#ff2a2a" opacity={0.08 + 0.18 * k} />
          {[ROAD_TOP + 22, ROAD_TOP + 50].map((y, lane) => (
            <g key={lane}>
              {Array.from({ length: perLane }, (_, i) => (
                <Car key={i} x={(i * SCENE_W) / perLane + rnd() * 6 - 10} y={y} color={colors[Math.floor(rnd() * colors.length)]} brake />
              ))}
            </g>
          ))}
        </g>
      );
    },
    top: () => (
      <g>
        <rect x={14} y={14} width={230} height={30} rx={6} fill="rgba(40,0,0,0.75)" stroke="#ff4040" />
        <text className="w-blink" x={129} y={34} textAnchor="middle" fontSize={13} fill="#ff6060" fontWeight={700}>FLEET UPDATE FAILED</text>
      </g>
    ),
  },

  bankRun: {
    street: (l, k, seed) => {
      const rnd = visualRng(seed);
      const n = count(k, 6, 42);
      const door = l.bank.x + l.bank.w / 2;
      return (
        <g>
          {Array.from({ length: n }, (_, i) => {
            const row = i % 2;
            const x = door - 10 - Math.floor(i / 2) * 9 - rnd() * 3;
            return <Person key={i} x={x} y={GROUND_Y + 6 + row * 8} color={['#c9d3e8', '#e6d39a', '#9fb6e0'][i % 3]} />;
          })}
          {k > 0.5 && (
            <g>
              <rect x={door - 30} y={GROUND_Y - l.bank.h - 24} width={60} height={14} rx={2} fill="#2a0d0d" stroke="#ff6b5b" />
              <text x={door} y={GROUND_Y - l.bank.h - 13.5} fontSize={9} textAnchor="middle" fill="#ff6b5b" fontWeight={700}>CLOSED</text>
            </g>
          )}
        </g>
      );
    },
  },

  // Abstract: haze, searchlights and a convoy at the horizon. No weapons or violence shown.
  warBuildup: {
    sky: (_l, k) => {
      const lights = count(k, 1, 4);
      return (
        <g>
          <rect x={0} y={0} width={SCENE_W} height={GROUND_Y} fill="url(#w-war-haze)" opacity={0.3 + 0.6 * k} />
          {Array.from({ length: lights }, (_, i) => {
            const x = 150 + i * 280;
            return (
              <g key={i} className="w-sweep" style={{ transformOrigin: `${x}px ${GROUND_Y}px`, animationDelay: `${i * 0.9}s` }}>
                <polygon points={`${x - 4},${GROUND_Y} ${x + 4},${GROUND_Y} ${x + 60},40 ${x - 60},40`} fill="#fff6c8" opacity={0.09} />
              </g>
            );
          })}
        </g>
      );
    },
    street: (_l, k) => {
      const n = count(k, 3, 16);
      return (
        <g>
          {Array.from({ length: n }, (_, i) => {
            const x = SCENE_W - 20 - i * 34;
            return (
              <g key={i} transform={`translate(${x}, ${ROAD_BOTTOM - 4})`}>
                <rect x={-28} y={-16} width={20} height={14} rx={2} fill="#4c5a3a" />
                <rect x={-10} y={-11} width={9} height={9} rx={1.5} fill="#5c6b47" />
                <circle cx={-22} cy={-1} r={3} fill="#1a1a1a" />
                <circle cx={-6} cy={-1} r={3} fill="#1a1a1a" />
              </g>
            );
          })}
          {k > 0.4 && (
            <g>
              {Array.from({ length: 6 }, (_, i) => (
                <rect key={i} x={80 + i * 14} y={ROAD_TOP + 4} width={12} height={8} fill={i % 2 ? '#d9d9d9' : '#c43b3b'} />
              ))}
            </g>
          )}
        </g>
      );
    },
  },

  // Hospital strain shown through ambulances, field tents and a pulsing sign. Non-graphic.
  outbreak: {
    sky: (_l, k) => <rect x={0} y={0} width={SCENE_W} height={GROUND_Y} fill="#3dff9a" opacity={0.04 + 0.06 * k} />,
    street: (l, k) => {
      const amb = count(k, 1, 6);
      const tents = k > 0.35 ? count(k, 1, 5) : 0;
      const hx = l.hospital.x + l.hospital.w / 2;
      return (
        <g>
          <g className="w-blink">
            <circle cx={hx} cy={GROUND_Y - l.hospital.h - 22} r={18} fill="#ff3b3b" opacity={0.25} />
          </g>
          {Array.from({ length: tents }, (_, i) => (
            <g key={`t${i}`} transform={`translate(${hx + 80 + i * 32}, ${GROUND_Y + 10})`}>
              <polygon points="-13,0 13,0 0,-16" fill="#e8eef2" stroke="#9fb0bd" />
              <rect x={-2.5} y={-12} width={5} height={2} fill="#e02020" />
              <rect x={-1} y={-13.5} width={2} height={5} fill="#e02020" />
            </g>
          ))}
          {Array.from({ length: amb }, (_, i) => {
            const x = 30 + i * 70;
            const y = ROAD_TOP + (i % 2 ? 50 : 22);
            return (
              <g key={`a${i}`}>
                <rect x={x} y={y - 14} width={40} height={15} rx={2} fill="#f2f4f7" />
                <rect x={x + 30} y={y - 11} width={9} height={6} fill="#8fc9ff" />
                <rect x={x + 10} y={y - 10} width={10} height={3} fill="#e02020" />
                <rect x={x + 13.5} y={y - 13} width={3} height={9} fill="#e02020" />
                <rect className="w-blink" x={x + 4} y={y - 18} width={8} height={4} fill="#3a7dff" style={{ animationDelay: `${i * 0.25}s` }} />
                <circle cx={x + 8} cy={y + 1} r={3} fill="#111" />
                <circle cx={x + 32} cy={y + 1} r={3} fill="#111" />
              </g>
            );
          })}
        </g>
      );
    },
  },

  embargo: {
    street: (l, k) => {
      const shutters = l.buildings.filter((b) => b.kind !== 'hq' && b.kind !== 'hospital').sort((a, b) => a.district - b.district);
      const closed = shutters.slice(0, count(k, 2, Math.min(12, shutters.length)));
      return (
        <g>
          {closed.map((b) => (
            <g key={b.id}>
              <rect x={b.x + 4} y={GROUND_Y - 16} width={Math.min(36, b.w - 8)} height={16} fill="#5d626e" />
              {[3, 7, 11].map((d) => (
                <line key={d} x1={b.x + 4} y1={GROUND_Y - 16 + d} x2={b.x + 4 + Math.min(36, b.w - 8)} y2={GROUND_Y - 16 + d} stroke="#454954" />
              ))}
            </g>
          ))}
          {/* idle port on the quay: low cranes and stacked containers, ship at anchor */}
          {[0, 1].map((i) => {
            const x = 760 + i * 120;
            const base = QUAY_BOTTOM;
            return (
              <g key={i} opacity={0.95}>
                <rect x={x} y={base - 62} width={5} height={62} fill="#a07a3c" />
                <rect x={x + 44} y={base - 62} width={5} height={62} fill="#a07a3c" />
                <rect x={x - 24} y={base - 68} width={96} height={7} fill="#c49548" />
                <line x1={x + 16} y1={base - 61} x2={x + 16} y2={base - 36} stroke="#222" />
                <rect x={x + 9} y={base - 36} width={14} height={6} fill="#5f6f7f" />
              </g>
            );
          })}
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={`c${i}`} x={1000 + (i % 4) * 30} y={QUAY_BOTTOM - 12 - Math.floor(i / 4) * 11} width={28} height={10}
              fill={['#5f6f7f', '#6b5b5b', '#5b6b5b', '#6a6a52'][i % 4]} opacity={0.85} />
          ))}
          <g transform={`translate(${SCENE_W - 340}, ${QUAY_BOTTOM + 22})`}>
            <polygon points="0,0 200,0 185,16 15,16" fill="#2f3542" />
            <rect x={140} y={-14} width={30} height={14} fill="#3b4250" />
            <text x={100} y={11} textAnchor="middle" fontSize={8} fill="#ff9a8a" fontWeight={700}>HELD IN PORT</text>
          </g>
          <g>
            <rect x={SCENE_W - 300} y={QUAY_BOTTOM - 8} width={120} height={6} fill="#d9d9d9" />
            {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={SCENE_W - 300 + i * 24} y={QUAY_BOTTOM - 8} width={12} height={6} fill="#c43b3b" />)}
          </g>
        </g>
      );
    },
    top: (_l, k) => (
      <g>
        <rect x={14} y={52} width={210} height={26} rx={6} fill="rgba(10,10,20,0.75)" stroke="#9fb6e0" />
        <text x={119} y={69.5} textAnchor="middle" fontSize={12} fill="#cfe0ff" fontWeight={700}>EXPORT CONTROLS · {Math.round(k * 100)}%</text>
      </g>
    ),
  },

  surveillance: {
    sky: (_l, k, seed) => {
      const rnd = visualRng(seed + 'd');
      const drones = count(k, 1, 7);
      return (
        <g>
          {Array.from({ length: drones }, (_, i) => {
            const x = 80 + rnd() * 1040;
            const y = 60 + rnd() * 160;
            return (
              <g key={i}>
                <rect x={x - 8} y={y - 1.5} width={16} height={3} rx={1.5} fill="#8b94a8" />
                <line x1={x - 10} y1={y - 3} x2={x - 4} y2={y - 3} stroke="#8b94a8" />
                <line x1={x + 4} y1={y - 3} x2={x + 10} y2={y - 3} stroke="#8b94a8" />
                <circle className="w-blink" cx={x} cy={y + 2.5} r={1.8} fill="#ff3030" style={{ animationDelay: `${rnd()}s` }} />
              </g>
            );
          })}
        </g>
      );
    },
    street: (_l, k, seed) => {
      const rnd = visualRng(seed);
      const cams = count(k, 3, 12);
      return (
        <g>
          {Array.from({ length: cams }, (_, i) => {
            const x = 50 + (i * 1100) / cams + rnd() * 20;
            const top = GROUND_Y - 56;
            return (
              <g key={i}>
                <line x1={x} y1={GROUND_Y + 10} x2={x} y2={top} stroke="#5a6478" strokeWidth={2.5} />
                <g className="w-sweep" style={{ transformOrigin: `${x}px ${top}px`, animationDelay: `${rnd() * 3}s` }}>
                  <polygon points={`${x},${top} ${x - 26},${ROAD_BOTTOM} ${x + 26},${ROAD_BOTTOM}`} fill="#ff4040" opacity={0.08} />
                </g>
                <rect x={x - 2} y={top - 4} width={12} height={7} rx={1.5} fill="#cfd5e0" />
                <circle className="w-blink" cx={x + 8} cy={top - 0.5} r={1.4} fill="#ff2a2a" />
              </g>
            );
          })}
          {k > 0.4 && <Crowd x0={180} x1={260} n={count(k, 3, 14)} seed={seed + 'p'} signs={0.5} colors={['#c9d3e8', '#a6e3b8']} />}
        </g>
      );
    },
  },

  // Positive: rooftop solar spreads; lighting.ts also lets it partly reverse blackouts.
  solarBoom: {
    sky: (_l, k) => <rect x={0} y={GROUND_Y - 220} width={SCENE_W} height={220} fill="url(#w-dawn)" opacity={0.35 + 0.55 * k} />,
    street: (l, k) => {
      const roofs = l.buildings.filter((b) => b.kind !== 'hq').sort((a, b) => a.district - b.district);
      const panels = roofs.slice(0, Math.round(roofs.length * (0.2 + 0.8 * k)));
      return (
        <g>
          {panels.map((b) => {
            const n = Math.max(1, Math.floor((b.w - 8) / 14));
            const y = GROUND_Y - b.h - 6;
            return (
              <g key={b.id}>
                {Array.from({ length: n }, (_, i) => (
                  <g key={i}>
                    <polygon points={`${b.x + 5 + i * 14},${y + 6} ${b.x + 17 + i * 14},${y + 6} ${b.x + 15 + i * 14},${y} ${b.x + 7 + i * 14},${y}`} fill="#2357b8" stroke="#9cc4ff" strokeWidth={0.5} />
                    <polygon className="w-glint" points={`${b.x + 7 + i * 14},${y + 1} ${b.x + 10 + i * 14},${y + 1} ${b.x + 9 + i * 14},${y + 5} ${b.x + 6 + i * 14},${y + 5}`} fill="#ffffff" style={{ animationDelay: `${(i % 5) * 0.4}s` }} />
                  </g>
                ))}
              </g>
            );
          })}
        </g>
      );
    },
  },

  flooding: {
    top: (_l, k) => {
      const level = SCENE_H - (40 + 170 * k);
      return (
        <g opacity={0.92}>
          <g className="w-wave">
            <path
              d={`M-40,${level} ${Array.from({ length: 16 }, (_, i) => `Q${-10 + i * 80},${level - 8} ${20 + i * 80},${level} T${100 + i * 80},${level}`).join(' ')} L${SCENE_W + 60},${SCENE_H} L-40,${SCENE_H} Z`}
              fill="url(#w-water)"
            />
          </g>
          {Array.from({ length: 10 }, (_, i) => (
            <line key={i} x1={40 + i * 120} y1={level + 14 + (i % 3) * 10} x2={80 + i * 120} y2={level + 14 + (i % 3) * 10} stroke="#bfe6ff" strokeOpacity={0.35} strokeWidth={2} />
          ))}
        </g>
      );
    },
  },

  // Abstract unrest: smoke, barricades and a crowd. No injuries or weapons shown.
  unrest: {
    sky: (_l, k) => <rect x={0} y={GROUND_Y - 160} width={SCENE_W} height={160} fill="url(#w-ember)" opacity={0.2 + 0.5 * k} />,
    street: (_l, k, seed) => {
      const rnd = visualRng(seed);
      const plumes = count(k, 2, 7);
      const barricades = count(k, 1, 5);
      return (
        <g>
          {Array.from({ length: plumes }, (_, i) => (
            <Smoke key={i} x={100 + rnd() * 1000} y={GROUND_Y - 10} delay={rnd() * 3} scale={0.8 + k} />
          ))}
          <Crowd x0={620} x1={980} n={count(k, 8, 45)} seed={seed + 'c'} raise={0.4} signs={0.15} colors={['#c9d3e8', '#d8b0a0', '#a0b0d8']} />
          {Array.from({ length: barricades }, (_, i) => (
            <g key={`b${i}`} transform={`translate(${560 + i * 90}, ${ROAD_TOP + 30})`}>
              <rect x={-22} y={-8} width={44} height={8} fill="#d9a03a" />
              <rect x={-22} y={-8} width={44} height={8} fill="url(#w-stripes)" />
              <line x1={-18} y1={0} x2={-18} y2={8} stroke="#777" strokeWidth={2} />
              <line x1={18} y1={0} x2={18} y2={8} stroke="#777" strokeWidth={2} />
            </g>
          ))}
        </g>
      );
    },
  },
};
