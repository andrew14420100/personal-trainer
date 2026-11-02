// Schematic body figure that highlights the area involved in a technique fault:
// RED while showing the error, GREEN once the correction is shown.
import type { BodyArea } from '../data/types';

const ZONES: Record<BodyArea, { pts: [number, number][]; back?: boolean; label: string }> = {
  neck: { pts: [[50, 25]], label: 'collo e trapezio' },
  shoulders: { pts: [[33, 33], [67, 33]], label: 'spalle' },
  chest: { pts: [[50, 42]], label: 'petto' },
  upperBack: { pts: [[50, 37]], back: true, label: 'scapole / parte alta della schiena' },
  elbows: { pts: [[27, 57], [73, 57]], label: 'gomiti' },
  wrists: { pts: [[23, 77], [77, 77]], label: 'polsi' },
  core: { pts: [[50, 60]], label: 'addome' },
  lowerBack: { pts: [[50, 70]], back: true, label: 'zona lombare' },
  hips: { pts: [[41, 82], [59, 82]], label: 'anche e bacino' },
  knees: { pts: [[42, 113], [58, 113]], label: 'ginocchia' },
  ankles: { pts: [[43, 146], [57, 146]], label: 'caviglie e piedi' },
};

export const areaLabel = (a: BodyArea) => ZONES[a].label;

export function BodyMap({ area, state, size = 64 }: { area: BodyArea; state: 'wrong' | 'right'; size?: number }) {
  const z = ZONES[area];
  const color = state === 'wrong' ? 'var(--wrong)' : 'var(--right)';
  return (
    <svg className="bodymap" width={size} height={size * 1.6} viewBox="0 0 100 160" role="img" aria-label={`Zona interessata: ${z.label}`}>
      <g fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="50" cy="13" r="8" />
        <path d="M50 22 L50 26 M36 31 Q50 27 64 31 L62 66 Q50 72 38 66 Z" />
        <path d="M36 31 L28 55 L23 77 M64 31 L72 55 L77 77" />
        <path d="M40 74 L42 112 L43 146 L38 152 M60 74 L58 112 L57 146 L62 152" />
      </g>
      {z.pts.map(([x, y], i) => (
        <g key={i}>
          <circle className="zone" cx={x} cy={y} r={11} fill={color} opacity={0.18} />
          <circle
            className="zone"
            cx={x}
            cy={y}
            r={6}
            fill={z.back ? 'none' : color}
            stroke={color}
            strokeWidth={z.back ? 2.5 : 0}
            strokeDasharray={z.back ? '3 2.5' : undefined}
          />
        </g>
      ))}
    </svg>
  );
}
