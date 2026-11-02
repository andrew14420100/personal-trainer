// Lightweight interactive SVG charts (no external library, work offline).
// Single-series charts: the title names the series, so no legend box. Tap or hover a point/bar to
// read its exact value; every chart offers a table view for accessibility.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export interface Point {
  key: string;
  label: string; // x-axis short label
  value: number;
  detail?: string; // tooltip secondary line
}

const H = 170;
const PAD = { t: 16, r: 10, b: 24, l: 38 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

function niceStep(span: number): number {
  const raw = span / 2;
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** Rounded [lo, hi] with hi - lo = 2 nice steps, so the 3 gridlines get round labels. */
function niceRange(min: number, max: number): [number, number] {
  const span = max === min ? Math.max(1, Math.abs(max) * 0.2) : (max - min) * 1.4;
  const step = niceStep(span);
  let lo = Math.floor((min - (max === min ? step : (max - min) * 0.2)) / step) * step;
  lo = Math.max(0, lo);
  let hi = lo + step * 2;
  while (hi < max) hi += step;
  return [lo, hi];
}

const fmt = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 1 });

function useWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth || 320);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width;
      if (cw) setW(cw);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Tip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div className="chart-tip" style={{ left: x, top: y - 10 }}>
      {children}
    </div>
  );
}

export function LineChart({ data, color = 'var(--data)', unit, label }: { data: Point[]; color?: string; unit: string; label: string }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const vals = data.map((d) => d.value);
  const [lo, hi] = niceRange(Math.min(...vals), Math.max(...vals));
  const iw = Math.max(10, w - PAD.l - PAD.r);
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 56)));

  const onMove = (clientX: number) => {
    const el = ref.current;
    if (!el || !data.length) return;
    const rx = clientX - el.getBoundingClientRect().left;
    let best = 0;
    let bd = Infinity;
    data.forEach((_, i) => {
      const d = Math.abs(x(i) - rx);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setHover(best);
  };

  return (
    <div
      className="chart"
      ref={ref}
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerDown={(e) => onMove(e.clientX)}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={`${label}: ${data.map((d) => `${d.label} ${fmt(d.value)} ${unit}`).join(', ')}`}
    >
      <svg height={H} viewBox={`0 0 ${w} ${H}`}>
        <g className="grid">
          {ticks.map((t, i) => (
            <line key={i} x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {ticks.map((t, i) => (
            <text key={i} x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end">
              {fmt(t)}
            </text>
          ))}
          {data.map((d, i) =>
            i % every === 0 || i === data.length - 1 ? (
              <text key={d.key} x={x(i)} y={H - 6} textAnchor="middle">
                {d.label}
              </text>
            ) : null,
          )}
        </g>
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={d.key} cx={x(i)} cy={y(d.value)} r={hover === i ? 6 : 4} fill={color} stroke="var(--surface)" strokeWidth={2} />
        ))}
      </svg>
      {hover != null && data[hover] && (
        <Tip x={x(hover)} y={y(data[hover].value)}>
          <b>
            {fmt(data[hover].value)} {unit}
          </b>
          <span className="muted">{data[hover].detail ?? data[hover].label}</span>
        </Tip>
      )}
    </div>
  );
}

export function BarChart({ data, color = 'var(--data)', unit, label, highlightLast }: { data: Point[]; color?: string; unit: string; label: string; highlightLast?: boolean }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const iw = Math.max(10, w - PAD.l - PAD.r);
  const ih = H - PAD.t - PAD.b;
  const slot = iw / Math.max(1, data.length);
  const bw = Math.max(4, Math.min(28, slot - 6));
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const ticks = [0, max / 2, max];
  const every = Math.ceil(data.length / Math.max(2, Math.floor(iw / 48)));

  return (
    <div className="chart" ref={ref} onPointerLeave={() => setHover(null)} role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${fmt(d.value)} ${unit}`).join(', ')}`}>
      <svg height={H} viewBox={`0 0 ${w} ${H}`}>
        <g className="grid">
          {ticks.map((t, i) => (
            <line key={i} x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {ticks.map((t, i) => (
            <text key={i} x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end">
              {fmt(t)}
            </text>
          ))}
          {data.map((d, i) =>
            i % every === 0 || i === data.length - 1 ? (
              <text key={d.key} x={PAD.l + slot * i + slot / 2} y={H - 6} textAnchor="middle">
                {d.label}
              </text>
            ) : null,
          )}
        </g>
        {data.map((d, i) => {
          const cx = PAD.l + slot * i + slot / 2;
          const top = y(d.value);
          const h = Math.max(0, PAD.t + ih - top);
          const r = Math.min(4, bw / 2, h);
          const dim = hover != null && hover !== i;
          const fill = highlightLast && i !== data.length - 1 ? 'color-mix(in srgb, ' + color + ' 45%, #2a2a30)' : color;
          return (
            <g key={d.key} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={cx - slot / 2} y={PAD.t} width={slot} height={ih} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${cx - bw / 2},${PAD.t + ih} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${PAD.t + ih} Z`}
                  fill={fill}
                  opacity={dim ? 0.45 : 1}
                />
              )}
            </g>
          );
        })}
        <line x1={PAD.l} x2={w - PAD.r} y1={PAD.t + ih} y2={PAD.t + ih} stroke="rgba(255,255,255,0.2)" />
      </svg>
      {hover != null && data[hover] && (
        <Tip x={PAD.l + slot * hover + slot / 2} y={y(data[hover].value)}>
          <b>
            {fmt(data[hover].value)} {unit}
          </b>
          <span className="muted">{data[hover].detail ?? data[hover].label}</span>
        </Tip>
      )}
    </div>
  );
}

/** Chart card with a "Grafico / Tabella" toggle. */
export function ChartCard({ title, subtitle, data, unit, kind, color, highlightLast }: { title: string; subtitle?: string; data: Point[]; unit: string; kind: 'line' | 'bar'; color?: string; highlightLast?: boolean }) {
  const [table, setTable] = useState(false);
  return (
    <div className="card tight">
      <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
        <div className="grow">
          <div style={{ fontWeight: 700 }}>{title}</div>
          {subtitle && <div className="small muted">{subtitle}</div>}
        </div>
        <button className="btn sm ghost" onClick={() => setTable((t) => !t)} aria-pressed={table}>
          {table ? 'Grafico' : 'Tabella'}
        </button>
      </div>
      {table ? (
        <table className="data">
          <thead>
            <tr>
              <th>Data</th>
              <th>Valore</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <td>{d.detail ?? d.label}</td>
                <td>
                  {fmt(d.value)} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : kind === 'line' ? (
        <LineChart data={data} unit={unit} label={title} color={color} />
      ) : (
        <BarChart data={data} unit={unit} label={title} color={color} highlightLast={highlightLast} />
      )}
    </div>
  );
}
