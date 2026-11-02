// Stylised anatomical map (front + back) highlighting primary muscles (solid) and secondary
// muscles (lighter). Pure SVG: crisp on Retina screens and available offline.
import type { MuscleId } from '../data/muscles';
import { MUSCLE_LABEL } from '../data/muscles';

type Shape = { m?: MuscleId; d: string };

// Coordinates are for one view (120 × 240), drawn symmetric: "L" shapes are mirrored around x = 60.
const e = (cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  `M ${cx - rx} ${cy} a ${rx} ${ry} ${rot} 1 0 ${rx * 2} 0 a ${rx} ${ry} ${rot} 1 0 ${-rx * 2} 0 Z`;

const FRONT_SIDE: Shape[] = [
  { m: 'deltoide-ant', d: 'M40 44 C33 44 28 50 28 58 C30 60 34 58 38 54 C41 51 43 48 44 46 Z' },
  { m: 'deltoide-lat', d: 'M26 62 C22 53 26 44 35 41 C38 41 39 43 37 45 C32 48 30 54 31 62 Z' },
  { m: 'pettorali', d: 'M59 50 L59 72 C52 75 44 73 40 67 C38 61 40 54 44 50 C48 48 54 48 59 50 Z' },
  { m: 'bicipiti', d: e(31, 79, 5.2, 13) },
  { m: 'avambracci', d: 'M26 94 C23 104 22 114 24 122 L30 122 C32 112 33 102 32 94 Z' },
  { m: 'obliqui', d: 'M42 74 C41 86 42 98 46 108 L50 106 C48 96 48 84 49 76 Z' },
  { m: 'quadricipiti', d: 'M45 124 C40 140 41 160 46 176 L56 176 C58 160 58 140 56 126 Z' },
  { m: 'adduttori', d: 'M56 126 C58 138 59 148 58 156 L59.5 156 L59.5 124 Z' },
  { d: 'M46 182 C44 196 45 212 48 226 L54 226 C56 212 56 196 55 182 Z' }, // tibia/shin (not trained)
];
const FRONT_CENTER: Shape[] = [
  { m: 'addominali', d: 'M51 76 L69 76 L68 112 C64 116 56 116 52 112 Z' },
];

const BACK_SIDE: Shape[] = [
  { m: 'deltoide-lat', d: 'M26 62 C22 53 26 44 35 41 C38 41 39 43 37 45 C32 48 30 54 31 62 Z' },
  { m: 'deltoide-post', d: 'M40 44 C33 44 28 50 28 58 C31 60 35 58 39 54 C42 51 43 48 44 46 Z' },
  { m: 'tricipiti', d: e(31, 79, 5.4, 13) },
  { m: 'avambracci', d: 'M26 94 C23 104 22 114 24 122 L30 122 C32 112 33 102 32 94 Z' },
  { m: 'dorsali', d: 'M42 62 C40 74 42 88 50 100 L57 96 C55 86 54 74 52 62 Z' },
  { m: 'glutei', d: e(51, 122, 9, 9.5) },
  { m: 'femorali', d: 'M44 134 C41 148 42 162 46 176 L56 176 C58 162 58 148 57 134 Z' },
  { m: 'polpacci', d: 'M45 182 C42 192 43 204 47 214 L54 214 C56 204 56 192 55 182 Z' },
];
const BACK_CENTER: Shape[] = [
  { m: 'trapezio', d: 'M60 30 L74 46 L66 64 L60 74 L54 64 L46 46 Z' },
  { m: 'romboidi', d: 'M53 54 L60 50 L67 54 L65 70 L60 76 L55 70 Z' },
  { m: 'lombari', d: 'M54 92 L66 92 L66 110 C63 112 57 112 54 110 Z' },
];

const SILHOUETTE =
  'M60 6 C68 6 72 12 72 20 C72 27 68 32 66 34 L68 40 C76 42 86 44 90 52 C94 62 92 76 94 90 C97 104 98 116 96 124 L90 124 C88 112 86 100 82 88 L80 100 C82 110 82 118 80 124 C82 140 80 160 76 178 C76 196 74 212 72 232 L64 232 C64 214 63 196 62 180 L60 132 L58 180 C57 196 56 214 56 232 L48 232 C46 212 44 196 44 178 C40 160 38 140 40 124 C38 118 38 110 40 100 L38 88 C34 100 32 112 30 124 L24 124 C22 116 23 104 26 90 C28 76 26 62 30 52 C34 44 44 42 52 40 L54 34 C52 32 48 27 48 20 C48 12 52 6 60 6 Z';

function View({ side, center, primary, secondary, label }: { side: Shape[]; center: Shape[]; primary: Set<MuscleId>; secondary: Set<MuscleId>; label: string }) {
  const fill = (m?: MuscleId) => (m && primary.has(m) ? 'var(--muscle-p)' : m && secondary.has(m) ? 'var(--muscle-s)' : 'var(--muscle-0)');
  const cls = (m?: MuscleId) => (m && primary.has(m) ? 'mus p' : m && secondary.has(m) ? 'mus s' : 'mus');
  return (
    <svg viewBox="0 0 120 240" className="anatomy-view" role="img" aria-label={label}>
      <path d={SILHOUETTE} fill="var(--muscle-body)" />
      {side.map((s, i) => (
        <g key={i}>
          <path d={s.d} fill={fill(s.m)} className={cls(s.m)} />
          <path d={s.d} fill={fill(s.m)} className={cls(s.m)} transform="translate(120 0) scale(-1 1)" />
        </g>
      ))}
      {center.map((s, i) => (
        <path key={'c' + i} d={s.d} fill={fill(s.m)} className={cls(s.m)} />
      ))}
      <circle cx="60" cy="19" r="11" fill="var(--muscle-0)" />
    </svg>
  );
}

export function Anatomy({ primary, secondary, size = 'md', legend = true }: { primary: MuscleId[]; secondary: MuscleId[]; size?: 'sm' | 'md'; legend?: boolean }) {
  const p = new Set(primary);
  const s = new Set(secondary);
  const desc = `Muscoli principali: ${primary.map((m) => MUSCLE_LABEL[m]).join(', ') || 'nessuno'}. Secondari: ${secondary.map((m) => MUSCLE_LABEL[m]).join(', ') || 'nessuno'}.`;
  return (
    <figure className={`anatomy ${size}`} aria-label={desc}>
      <div className="anatomy-views">
        <div>
          <View side={FRONT_SIDE} center={FRONT_CENTER} primary={p} secondary={s} label="Vista frontale" />
          {size === 'md' && <figcaption>Fronte</figcaption>}
        </div>
        <div>
          <View side={BACK_SIDE} center={BACK_CENTER} primary={p} secondary={s} label="Vista posteriore" />
          {size === 'md' && <figcaption>Retro</figcaption>}
        </div>
      </div>
      {legend && (
        <div className="anatomy-legend">
          <span>
            <i className="lp" /> Principali
          </span>
          <span>
            <i className="ls" /> Secondari
          </span>
        </div>
      )}
    </figure>
  );
}
