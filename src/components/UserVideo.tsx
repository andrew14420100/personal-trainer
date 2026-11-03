// The user's own footage of an exercise (recorded or imported from the iPhone), played muted,
// inline and looping with synchronised red/green annotations (✕ / ✓, lines, circles, arrows).
// Footage you record yourself is yours: annotating it is legal, unlike third-party videos.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Circle, MoveUpRight, Pause, Pencil, Play, Plus, Slash, Trash2, X } from 'lucide-react';
import { deleteMedia, getMedia, saveMedia, uid, type MediaItem, type Marker, type Shape } from '../lib/db';
import { EXERCISE_BY_ID } from '../data/exercises';
import { Confirm as ConfirmSheet, toast } from '../v4/kit';

const RED = '#ff3b47';
const GREEN = '#22e08a';

export function useMedia(id: string) {
  const [item, setItem] = useState<MediaItem | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getMedia(id)
      .then((m) => alive && setItem(m ?? null))
      .catch(() => alive && setItem(null));
    return () => {
      alive = false;
    };
  }, [id]);
  return [item, setItem] as const;
}

function Overlay({ markers, time, draft }: { markers: Marker[]; time: number; draft?: Shape | null }) {
  const active = markers.filter((m) => time >= m.t && time < m.t + m.dur);
  const kind = active[active.length - 1]?.kind;
  const caption = active[active.length - 1]?.label;
  return (
    <>
    <svg className="uv-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        <filter id="uvglow">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[...active.flatMap((m) => m.shapes.map((s) => ({ s, c: m.kind === 'bad' ? RED : GREEN }))), ...(draft ? [{ s: draft, c: '#ffffff' }] : [])].map(({ s, c }, i) => {
        const [a, b] = s.p;
        const common = { stroke: c, strokeWidth: 0.9, fill: 'none', strokeDasharray: '2.2 1.6', vectorEffect: 'non-scaling-stroke' as const, filter: 'url(#uvglow)' };
        if (s.type === 'circle' && a && b) {
          const r = Math.hypot((b[0] - a[0]) * 100, (b[1] - a[1]) * 100);
          return <ellipse key={i} cx={a[0] * 100} cy={a[1] * 100} rx={r} ry={r} {...common} style={{ strokeWidth: 3 }} />;
        }
        if (!a || !b) return a ? <circle key={i} cx={a[0] * 100} cy={a[1] * 100} r={1.2} fill={c} /> : null;
        return (
          <g key={i}>
            <line x1={a[0] * 100} y1={a[1] * 100} x2={b[0] * 100} y2={b[1] * 100} {...common} style={{ strokeWidth: 3.5 }} />
            {s.type === 'arrow' && <circle cx={b[0] * 100} cy={b[1] * 100} r={1.6} fill={c} />}
          </g>
        );
      })}
    </svg>
    {kind && (
      <div className="uv-hud" aria-live="polite">
        <span className={`uv-badge ${kind}`}>{kind === 'bad' ? '✕' : '✓'}</span>
        {caption && <span className={`uv-caption ${kind}`}>{caption}</span>}
      </div>
    )}
    </>
  );
}

export function UserVideo({ exerciseId, kind }: { exerciseId: string; kind: 'quick' | 'errors' }) {
  const id = `${exerciseId}:${kind}`;
  const [item, setItem] = useMedia(id);
  const url = useMemo(() => (item?.blob ? URL.createObjectURL(item.blob) : null), [item?.blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [edit, setEdit] = useState(false);
  const [tool, setTool] = useState<Shape['type']>('line');
  const [draft, setDraft] = useState<Shape | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ex = EXERCISE_BY_ID[exerciseId];

  // keep time in sync (rAF for smooth overlays)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) setTime(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [url]);

  const persist = async (next: MediaItem) => {
    setItem(next);
    try {
      await saveMedia(next);
    } catch (e) {
      toast('Spazio insufficiente o archivio non disponibile');
      throw e;
    }
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) return toast('Scegli un file video');
    if (f.size > 400 * 1024 * 1024) return toast('Video troppo grande (max 400 MB): registra in 1080p');
    const m: MediaItem = { id, exerciseId, kind, blob: f, type: f.type, createdAt: Date.now(), markers: item?.markers ?? [] };
    await persist(m);
    setErr(null);
    toast('Video salvato su questo dispositivo');
  };

  const addMarker = (k: Marker['kind']) => {
    if (!item) return;
    const v = videoRef.current;
    v?.pause();
    setPlaying(false);
    const firstErr = ex.errors[0];
    const mk: Marker = {
      id: uid(),
      t: Math.max(0, (v?.currentTime ?? 0) - 0.05),
      dur: 1.6,
      kind: k,
      label: k === 'bad' ? (firstErr?.title ?? 'Errore') : (ex.cues[0] ?? 'Corretto'),
      shapes: [],
    };
    void persist({ ...item, markers: [...item.markers, mk].sort((a, b) => a.t - b.t) });
    setSel(mk.id);
  };

  const updMarker = (mid: string, patch: Partial<Marker>) => item && persist({ ...item, markers: item.markers.map((m) => (m.id === mid ? { ...m, ...patch } : m)) });

  const onStageTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!edit || !sel || !item) {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) void v.play().then(() => setPlaying(true));
      else {
        v.pause();
        setPlaying(false);
      }
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const p: [number, number] = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    if (!draft) setDraft({ type: tool, p: [p] });
    else {
      const shape: Shape = { ...draft, p: [draft.p[0], p] };
      setDraft(null);
      const m = item.markers.find((x) => x.id === sel);
      if (m) void updMarker(sel, { shapes: [...m.shapes, shape] });
    }
  };

  if (item === undefined) return <div className="uv-stage uv-empty">Caricamento…</div>;

  if (!item) {
    return (
      <div className="uv-empty card flat">
        <div className="row" style={{ gap: 10, fontWeight: 700 }}>
          <Camera size={20} color="var(--action)" /> Il tuo video {kind === 'quick' ? 'dimostrativo' : 'errori e correzioni'}
        </div>
        <p className="small text-2" style={{ marginTop: 6 }}>
          Registra con l’iPhone (o importa dalla libreria) un atleta reale, anche tu stesso. L’app lo riproduce in loop, senza audio, e ti permette di aggiungere ✕ rosse e ✓ verdi con linee
          sincronizzate al movimento. Il video resta solo su questo dispositivo.
        </p>
        <input ref={fileRef} type="file" accept="video/*" className="sr-only" id={`uv-${id}`} onChange={(e) => onFile(e.target.files?.[0])} />
        <label htmlFor={`uv-${id}`} className="btn primary block" style={{ marginTop: 12 }}>
          <Camera size={18} /> Registra o scegli un video
        </label>
      </div>
    );
  }

  const selM = item.markers.find((m) => m.id === sel);

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="uv-stage" onPointerUp={onStageTap}>
        {url && (
          <video
            ref={videoRef}
            src={url}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
            onError={() => setErr('Questo formato non è riproducibile qui. Su iPhone registra con la Fotocamera (HEVC/H.264).')}
          />
        )}
        <Overlay markers={item.markers} time={time} draft={draft} />
        {err && (
          <div className="player-msg" role="alert">
            {err}
          </div>
        )}
        {edit && sel && <div className="uv-hint">{draft ? 'Tocca il secondo punto' : `Tocca per disegnare: ${tool === 'line' ? 'linea' : tool === 'circle' ? 'cerchio' : 'freccia'}`}</div>}
      </div>

      <div className="row wrap" style={{ gap: 8 }}>
        <button
          className="icon-btn"
          aria-label={playing ? 'Pausa' : 'Riproduci'}
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) void v.play().then(() => setPlaying(true));
            else {
              v.pause();
              setPlaying(false);
            }
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="icon-btn" aria-label="Velocità" onClick={() => videoRef.current && (videoRef.current.playbackRate = videoRef.current.playbackRate === 1 ? 0.5 : 1)}>
          <span style={{ fontWeight: 800, fontSize: 12 }}>½×</span>
        </button>
        <input
          type="range"
          aria-label="Posizione nel video"
          min={0}
          max={dur || 1}
          step={0.05}
          value={time}
          onChange={(e) => videoRef.current && (videoRef.current.currentTime = Number(e.target.value))}
          style={{ flex: 1, minWidth: 120, accentColor: 'var(--action)' }}
        />
        <button className={`btn sm${edit ? ' primary' : ''}`} onClick={() => (setEdit((x) => !x), setDraft(null))}>
          <Pencil size={15} /> {edit ? 'Fine' : 'Annota'}
        </button>
      </div>

      {edit && (
        <div className="card tight flat stack" style={{ gap: 10 }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn sm danger" onClick={() => addMarker('bad')}>
              <X size={15} /> Errore qui
            </button>
            <button className="btn sm" style={{ color: 'var(--right)' }} onClick={() => addMarker('good')}>
              <Check size={15} /> Corretto qui
            </button>
            <div className="seg" role="group" aria-label="Strumento di disegno" style={{ padding: 3, marginLeft: 'auto' }}>
              {(
                [
                  ['line', Slash, 'Linea'],
                  ['circle', Circle, 'Cerchio'],
                  ['arrow', MoveUpRight, 'Freccia'],
                ] as const
              ).map(([k, Icon, lab]) => (
                <button key={k} aria-pressed={tool === k} aria-label={lab} style={{ minHeight: 34, padding: '0 10px' }} onClick={() => setTool(k)}>
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
          {item.markers.length === 0 && <p className="small text-2">Metti in pausa sul momento giusto e aggiungi un ✕ (errore) o una ✓ (esecuzione corretta). Poi tocca il video per disegnare.</p>}
          {item.markers.map((m) => (
            <div key={m.id} className={`uv-marker${sel === m.id ? ' sel' : ''}`} onClick={() => (setSel(m.id), videoRef.current && (videoRef.current.currentTime = m.t + 0.01))}>
              <span className={`uv-badge sm ${m.kind}`}>{m.kind === 'bad' ? '✕' : '✓'}</span>
              <div className="grow">
                <select
                  className="input"
                  style={{ minHeight: 38, padding: '6px 10px', fontSize: 14 }}
                  value={m.label}
                  aria-label="Didascalia"
                  onChange={(e) => updMarker(m.id, { label: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                >
                  {[m.label, ...(m.kind === 'bad' ? ex.errors.map((x) => x.title) : [...ex.cues, ...ex.errors.map((x) => x.fix.split('.')[0])])]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                </select>
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  da {m.t.toFixed(1)} s · durata{' '}
                  <button className="link" onClick={(e) => (e.stopPropagation(), updMarker(m.id, { dur: Math.max(0.4, m.dur - 0.4) }))}>
                    −
                  </button>{' '}
                  {m.dur.toFixed(1)} s{' '}
                  <button className="link" onClick={(e) => (e.stopPropagation(), updMarker(m.id, { dur: m.dur + 0.4 }))}>
                    +
                  </button>{' '}
                  · {m.shapes.length} segni
                </div>
              </div>
              <button className="icon-btn plain" aria-label="Elimina segni" onClick={(e) => (e.stopPropagation(), updMarker(m.id, { shapes: [] }))}>
                <Pencil size={15} />
              </button>
              <button className="icon-btn plain" aria-label="Elimina annotazione" onClick={(e) => (e.stopPropagation(), item && persist({ ...item, markers: item.markers.filter((x) => x.id !== m.id) }))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {selM && <p className="tiny muted">Annotazione selezionata: tocca due punti sul video per aggiungere {tool === 'line' ? 'una linea' : tool === 'circle' ? 'un cerchio' : 'una freccia'}.</p>}
          <div className="row" style={{ gap: 8 }}>
            <label htmlFor={`uv-r-${id}`} className="btn sm ghost">
              <Plus size={15} /> Sostituisci video
            </label>
            <input id={`uv-r-${id}`} type="file" accept="video/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            <button className="btn sm danger" onClick={() => setDel(true)}>
              <Trash2 size={15} /> Elimina video
            </button>
          </div>
        </div>
      )}
      <ConfirmSheet
        open={del}
        onClose={() => setDel(false)}
        title="Eliminare il video?"
        body="Il filmato e le sue annotazioni verranno rimossi da questo dispositivo."
        confirmLabel="Elimina"
        danger
        onConfirm={async () => {
          await deleteMedia(id);
          setItem(null);
          setEdit(false);
        }}
      />
    </div>
  );
}
