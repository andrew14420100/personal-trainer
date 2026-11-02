// Plays a technical animation on a <canvas>: silent, inline, looping, works offline and on Safari iOS
// (it is drawn in real time, no video file or codec involved).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { AnimSpec } from './spec';
import { build, frameAt } from './timeline';
import { drawFrame } from './render';
import { W, H } from './rig';

export type AnimMode = 'quick' | 'errors';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function AnimPlayer({
  spec,
  mode,
  cues,
  compact = false,
  autoPlay = true,
  labels = true,
  initialSpeed = 1,
}: {
  spec: AnimSpec;
  mode: AnimMode;
  cues: string[];
  compact?: boolean;
  autoPlay?: boolean;
  labels?: boolean;
  initialSpeed?: number;
}) {
  const built = useMemo(() => build(spec, mode), [spec, mode]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const [playing, setPlaying] = useState(autoPlay && !reduceMotion());
  const [speed, setSpeed] = useState(initialSpeed);
  const [segId, setSegId] = useState(built.segments[0]?.id);
  const [visible, setVisible] = useState(true);
  const [full, setFull] = useState(false);

  useEffect(() => {
    timeRef.current = 0;
    setSegId(built.segments[0]?.id);
  }, [built]);

  // pause when off screen (battery) and when the app goes to background
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((e) => setVisible(e[0]?.isIntersecting ?? true), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [full]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0;
    let last = performance.now();
    let lastSeg = '';
    const draw = () => {
      drawFrame(ctx, frameAt(spec, built, timeRef.current, cues, labels));
      const t = timeRef.current % built.total;
      const seg = built.segments.find((s) => t >= s.start && t < s.start + s.dur);
      if (seg && seg.id !== lastSeg) {
        lastSeg = seg.id;
        setSegId(seg.id);
      }
    };
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playing && visible && document.visibilityState === 'visible') timeRef.current += dt * speed;
      draw();
      raf = requestAnimationFrame(loop);
    };
    draw();
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spec, built, cues, labels, playing, visible, speed, full]);

  const jump = (id: string) => {
    const s = built.segments.find((x) => x.id === id);
    if (s) timeRef.current = s.start + 0.001;
    setPlaying(true);
  };

  const chips = mode === 'errors' ? built.segments.filter((s) => s.kind === 'bad' || s.kind === 'setup' || s.kind === 'good') : [];
  const activeChip = (() => {
    const cur = built.segments.find((s) => s.id === segId);
    if (!cur) return '';
    if (cur.kind === 'fix') return cur.id.replace(/-fix$/, '-bad');
    return cur.id;
  })();

  const stage = (
    <div ref={wrapRef} className={`anim-stage${compact ? ' compact' : ''}${full ? ' full' : ''}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Animazione tecnica: ${mode === 'quick' ? 'dimostrazione' : 'errori e correzioni'}`}
        onClick={() => setPlaying((p) => !p)}
      />
      {!playing && (
        <button className="anim-play" onClick={() => setPlaying(true)} aria-label="Riproduci">
          <Play size={28} fill="currentColor" />
        </button>
      )}
      <div className="anim-tools">
        <button className="icon-btn" aria-label={playing ? 'Pausa' : 'Riproduci'} onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          className="icon-btn"
          aria-label="Ricomincia"
          onClick={() => {
            timeRef.current = 0;
            setPlaying(true);
          }}
        >
          <RotateCcw size={17} />
        </button>
        <button className={`icon-btn${speed !== 1 ? ' on' : ''}`} aria-label={speed === 1 ? 'Rallenta a metà velocità' : 'Velocità normale'} onClick={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}>
          <span style={{ fontWeight: 800, fontSize: 12 }}>{speed === 1 ? '1×' : '½×'}</span>
        </button>
        <button className="icon-btn" aria-label={full ? 'Esci da schermo intero' : 'Schermo intero'} onClick={() => setFull((f) => !f)}>
          {full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="anim-player">
      {full ? createPortal(<div className="anim-full-backdrop">{stage}</div>, document.body) : stage}
      {chips.length > 0 && (
        <div className="anim-chips" role="tablist" aria-label="Fasi">
          {chips.map((s) => (
            <button key={s.id} role="tab" aria-selected={activeChip === s.id} className={`anim-chip ${s.kind}`} onClick={() => jump(s.id)}>
              {s.kind === 'bad' ? '✕ ' : s.kind === 'good' ? '✓ ' : ''}
              {s.kind === 'setup' ? 'Posizione' : s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
