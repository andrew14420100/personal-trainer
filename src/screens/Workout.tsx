import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Flag, List, Minus, PlayCircle, Plus, X, TrendingUp, Timer as TimerIcon } from 'lucide-react';
import { useData } from '../app/store';
import { DAY_BY_ID, SLOTS } from '../data/program';
import { EXERCISE_BY_ID } from '../data/exercises';
import { VIDEOS_BY_EXERCISE } from '../data/videos';
import type { ExerciseLog, Session, SetLog, Technique } from '../lib/db';
import { addSet, discardSession, finishSession, mutate, removeSet, updateSet } from '../lib/workout';
import { doneSets, lastLog } from '../lib/stats';
import { progressionHint, formatKg } from '../lib/progression';
import { formatPrescription } from '../lib/plan';
import { formatClock, timer, unlockAudio } from '../lib/timer';
import { setKeepAwake } from '../lib/wakelock';
import { navigate } from '../lib/router';
import { ConfirmSheet, Empty, Notice, Sheet, toast } from '../components/ui';
import { VideoPlayer } from '../components/VideoPlayer';
import { Cues } from '../components/Technique';
import { TimerPill } from '../components/Shell';
import { num } from '../lib/format';

export function Workout() {
  const data = useData();
  const s = data.active;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!s) return;
    const tick = () => setElapsed(Date.now() - s.startedAt);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [s?.startedAt, s]);

  useEffect(() => {
    if (!s || !data.settings.keepAwake) return;
    void setKeepAwake(true);
    return () => void setKeepAwake(false);
  }, [s?.id, data.settings.keepAwake, s]);

  if (!data.ready) return null;
  if (!s) {
    return (
      <main className="screen no-tab">
        <Empty
          icon={<PlayCircle size={26} />}
          title="Nessun allenamento in corso"
          action={
            <button className="btn primary" onClick={() => navigate('/')}>
              Vai a Oggi
            </button>
          }
        >
          Avvia un allenamento dalla schermata Oggi o dalla Scheda.
        </Empty>
      </main>
    );
  }
  return <ActiveWorkout key={s.id} session={s} elapsed={elapsed} />;
}

function ActiveWorkout({ session: s, elapsed }: { session: Session; elapsed: number }) {
  const data = useData();
  const day = DAY_BY_ID[s.dayId];
  const idx = Math.min(s.currentIndex, s.exercises.length - 1);
  const log = s.exercises[idx];
  const ex = EXERCISE_BY_ID[log.exerciseId];
  const rest = data.settings.restOverrides[ex.id] ?? ex.restSec;
  const prev = lastLog(data.sessions, ex.id, s.id);
  const hint = progressionHint(ex, { repsMin: log.repsMin, repsMax: log.repsMax, sets: log.targetSets }, prev?.log ?? null);
  const [showVideo, setShowVideo] = useState(false);
  const [list, setList] = useState(false);
  const [exit, setExit] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [finish, setFinish] = useState(false);
  const isLast = idx === s.exercises.length - 1;

  useEffect(() => setShowVideo(false), [idx]);

  const go = (i: number) => mutate(s.id, (x) => ({ ...x, currentIndex: Math.max(0, Math.min(x.exercises.length - 1, i)) })).then(() => window.scrollTo({ top: 0 }));

  const onSetDone = async (setIdx: number, patch: Partial<SetLog>) => {
    unlockAudio();
    // Decide on the freshest stored copy (props may lag behind a just-committed input).
    let outcome: 'done' | 'undone' | 'missing' = 'missing';
    let remaining = 0;
    await mutate(s.id, (x) => {
      const l = x.exercises[idx];
      const cur = { ...l.sets[setIdx], ...patch };
      if (cur.done) {
        outcome = 'undone';
        return updateSet(x, idx, setIdx, { ...patch, done: false });
      }
      if (cur.reps == null || cur.reps <= 0) {
        outcome = 'missing';
        return updateSet(x, idx, setIdx, patch);
      }
      outcome = 'done';
      remaining = l.sets.filter((z, i) => i !== setIdx && !z.done).length;
      return updateSet(x, idx, setIdx, { ...patch, done: true });
    });
    if (outcome === 'missing') {
      toast(ex.tracking === 'time' ? 'Inserisci i secondi effettivi' : 'Inserisci le ripetizioni effettive');
      return;
    }
    if (outcome === 'done') {
      const lastOfWorkout = isLast && remaining === 0;
      if (data.settings.autoRest && !lastOfWorkout) timer.start(rest, remaining ? `${ex.name} · serie ${setIdx + 2}` : 'Prossimo esercizio');
    }
  };

  const completedEx = s.exercises.filter((l) => l.sets.length && l.sets.every((x) => x.done)).length;

  return (
    <main className="screen no-tab" style={{ ['--accent' as string]: day.accent, paddingBottom: 'calc(var(--safe-b) + 170px)' }}>
      <header className="topbar">
        <button className="icon-btn" aria-label="Esci dall’allenamento" onClick={() => setExit(true)}>
          <X size={22} />
        </button>
        <div className="topbar-title">
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 800, letterSpacing: '.1em' }}>{day.name.toUpperCase()}</div>
          <div className="num tiny muted">
            {formatClock(elapsed)} · {completedEx}/{s.exercises.length} completati
          </div>
        </div>
        <button className="icon-btn" aria-label="Elenco esercizi" onClick={() => setList(true)}>
          <List size={20} />
        </button>
        <TimerPill inWorkout inline />
      </header>

      <div className="wk-progress" aria-hidden style={{ marginTop: 4 }}>
        {s.exercises.map((l, i) => (
          <span key={l.slotId} className={l.sets.every((x) => x.done) ? 'done' : i === idx ? 'current' : ''} />
        ))}
      </div>

      {s.calibration && (
        <div style={{ marginTop: 12 }}>
          <Notice kind="info">Calibrazione: volume ridotto, lascia 2–3 ripetizioni di margine.</Notice>
        </div>
      )}

      <div key={idx} style={{ animation: 'screen-in .4s var(--ease) both' }}>
        <div className="eyebrow" style={{ marginTop: 18 }}>
          Esercizio {idx + 1} di {s.exercises.length}
        </div>
        <button className="row tap-row" style={{ marginTop: 6 }} aria-label={`${ex.name}: apri la scheda tecnica`} onClick={() => navigate(`/esercizio/${ex.id}?slot=${log.slotId}`)}>
          <h1 className="display h2" style={{ flex: 1 }}>
            {ex.name}
          </h1>
        </button>
        <div className="chips" style={{ marginTop: 10 }}>
          <span className="chip accent">{formatPrescription({ ...log, sideLabel: SLOTS.find((z) => z.id === log.slotId)?.sideLabel }, log.targetSets)}</span>
          <span className="chip">
            <TimerIcon size={13} /> {rest}s
          </span>
          {ex.primary.slice(0, 2).map((m) => (
            <span key={m} className="chip">
              {m}
            </span>
          ))}
        </div>

        {/* Previous session */}
        <div className="card tight flat" style={{ marginTop: 12 }}>
          <div className="row between">
            <div className="small" style={{ fontWeight: 700 }}>
              Sessione precedente
            </div>
            <div className="tiny muted">{prev ? new Date(prev.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : ''}</div>
          </div>
          {prev ? (
            <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
              {doneSets(prev.log).map((x, i) => (
                <span key={i} className="chip num">
                  {ex.tracking === 'time' ? `${x.reps} s` : `${num(x.weight ?? 0, 2)} kg × ${x.reps}`}
                </span>
              ))}
            </div>
          ) : (
            <div className="small muted" style={{ marginTop: 4 }}>
              Prima volta: nessun dato precedente.
            </div>
          )}
          <div className="row small" style={{ gap: 8, marginTop: 10, color: 'var(--text-2)' }}>
            <TrendingUp size={16} color="var(--progress)" style={{ flex: 'none' }} />
            <span>
              <b style={{ color: 'var(--text)' }}>{hint.title}.</b> {hint.detail}
            </span>
          </div>
        </div>

        {/* Video */}
        <button className="btn block ghost" style={{ marginTop: 10, justifyContent: 'space-between' }} onClick={() => setShowVideo((v) => !v)} aria-expanded={showVideo}>
          <span className="row">
            <PlayCircle size={18} /> Guarda la dimostrazione
          </span>
          <ChevronDown size={18} style={{ transform: showVideo ? 'rotate(180deg)' : undefined, transition: 'transform .25s' }} />
        </button>
        {showVideo && (
          <div style={{ marginTop: 10 }}>
            <VideoPlayer video={VIDEOS_BY_EXERCISE[ex.id]?.demo} label={ex.name} autoLoad />
            <div style={{ marginTop: 10 }}>
              <Cues cues={ex.cues} />
            </div>
          </div>
        )}

        {/* Sets */}
        <div className="set-cap" style={{ marginTop: 18 }}>
          <span>#</span>
          <span>{ex.load === 'bodyweight' ? 'Kg extra' : 'Kg'}</span>
          <span>{ex.tracking === 'time' ? 'Secondi' : 'Rip.'}</span>
          <span>Fatto</span>
        </div>
        <div className="stack" style={{ gap: 8, marginTop: 6 }}>
          {log.sets.map((set, i) => (
            <SetRow
              key={i}
              index={i}
              set={set}
              log={log}
              active={!set.done && log.sets.findIndex((x) => !x.done) === i}
              prevSet={prev ? doneSets(prev.log)[i] : undefined}
              onChange={(patch) => mutate(s.id, (x) => updateSet(x, idx, i, patch))}
              onToggle={(patch) => onSetDone(i, patch)}
            />
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn sm" aria-label="Aggiungi una serie" onClick={() => mutate(s.id, (x) => addSet(x, idx))}>
            <Plus size={16} /> Serie
          </button>
          <button className="btn sm ghost" aria-label="Rimuovi l’ultima serie" disabled={log.sets.length <= 1} onClick={() => mutate(s.id, (x) => removeSet(x, idx, x.exercises[idx].sets.length - 1))}>
            <Minus size={16} /> Serie
          </button>
          <div className="grow" />
          <button className="btn sm ghost" aria-label={`Avvia recupero di ${rest} secondi`} onClick={() => timer.start(rest, ex.name)}>
            <TimerIcon size={16} /> {rest}s
          </button>
        </div>

        {/* Technique & notes */}
        <div className="card tight flat" style={{ marginTop: 16 }}>
          <div className="label">Tecnica percepita</div>
          <div className="seg" style={{ marginTop: 6 }} role="group" aria-label="Tecnica percepita">
            {(['buona', 'discreta', 'da migliorare'] as Technique[]).map((t) => (
              <button key={t} aria-pressed={log.technique === t} onClick={() => mutate(s.id, (x) => ((x.exercises[idx].technique = x.exercises[idx].technique === t ? undefined : t), x))}>
                {t}
              </button>
            ))}
          </div>
          {ex.tracking === 'reps' && (
            <>
              <div className="label" style={{ marginTop: 12 }}>
                Ripetizioni di margine nell’ultima serie (RIR)
              </div>
              <div className="seg" style={{ marginTop: 6 }} role="group" aria-label="Ripetizioni di margine">
                {[0, 1, 2, 3].map((r) => (
                  <button key={r} aria-pressed={log.rir === r} onClick={() => mutate(s.id, (x) => ((x.exercises[idx].rir = x.exercises[idx].rir === r ? null : r), x))}>
                    {r === 3 ? '3+' : r}
                  </button>
                ))}
              </div>
            </>
          )}
          <NoteField value={log.note} onSave={(note) => mutate(s.id, (x) => ((x.exercises[idx].note = note), x))} />
        </div>
      </div>

      <div className="wk-footer">
        <div>
          <button className="icon-btn" style={{ width: 60, height: 60 }} aria-label="Esercizio precedente" disabled={idx === 0} onClick={() => go(idx - 1)}>
            <ArrowLeft size={22} />
          </button>
          {isLast ? (
            <button className="btn primary lg grow" onClick={() => setFinish(true)}>
              <Flag size={20} /> Termina
            </button>
          ) : (
            <button className="btn accent lg grow" onClick={() => go(idx + 1)}>
              Successivo <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>

      <Sheet open={list} onClose={() => setList(false)} label="Esercizi della sessione">
        <h3 className="display h3" style={{ marginBottom: 12 }}>
          {day.name}
        </h3>
        <div className="stack" style={{ gap: 8 }}>
          {s.exercises.map((l, i) => {
            const done = l.sets.filter((x) => x.done).length;
            return (
              <button
                key={l.slotId}
                className="ex-row"
                style={{ borderColor: i === idx ? 'var(--accent)' : undefined }}
                onClick={() => {
                  setList(false);
                  void go(i);
                }}
              >
                <span className="display" style={{ width: 28, textAlign: 'center', fontSize: 18 }}>
                  {i + 1}
                </span>
                <div className="grow">
                  <div className="ex-name">{EXERCISE_BY_ID[l.exerciseId].name}</div>
                  <div className="ex-meta">
                    {done}/{l.sets.length} serie
                  </div>
                </div>
                {done === l.sets.length && <Check size={20} color="var(--right)" />}
              </button>
            );
          })}
          <button
            className="btn block primary"
            style={{ marginTop: 8 }}
            onClick={() => {
              setList(false);
              setFinish(true);
            }}
          >
            <Flag size={18} /> Termina allenamento
          </button>
        </div>
      </Sheet>

      <Sheet open={exit} onClose={() => setExit(false)} label="Esci dall’allenamento">
        <div className="stack">
          <h3 className="display h3">Uscire?</h3>
          <p className="small text-2">I dati inseriti sono già salvati su questo dispositivo. Puoi riprendere l’allenamento dalla schermata Oggi.</p>
          <button
            className="btn block"
            onClick={() => {
              setExit(false);
              navigate('/');
            }}
          >
            Esci e riprendi più tardi
          </button>
          <button
            className="btn block primary"
            onClick={() => {
              setExit(false);
              setFinish(true);
            }}
          >
            Termina e salva
          </button>
          <button
            className="btn block danger"
            onClick={() => {
              setExit(false);
              setDiscard(true);
            }}
          >
            Annulla allenamento
          </button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={discard}
        onClose={() => setDiscard(false)}
        title="Annullare l’allenamento?"
        body="Tutte le serie registrate in questa sessione verranno eliminate. L’operazione non è reversibile."
        confirmLabel="Elimina sessione"
        danger
        onConfirm={async () => {
          timer.stop();
          await discardSession(s.id);
          navigate('/', { replace: true });
        }}
      />

      <FinishSheet open={finish} onClose={() => setFinish(false)} session={s} />
    </main>
  );
}

function SetRow({
  index,
  set,
  log,
  active,
  prevSet,
  onChange,
  onToggle,
}: {
  index: number;
  set: SetLog;
  log: ExerciseLog;
  active: boolean;
  prevSet?: SetLog;
  onChange: (p: Partial<SetLog>) => void;
  onToggle: (patch: Partial<SetLog>) => void;
}) {
  const fmtW = (v: number | null) => (v == null ? '' : String(v).replace('.', ','));
  const [w, setW] = useState(fmtW(set.weight));
  const [r, setR] = useState(set.reps == null ? '' : String(set.reps));
  // "dirty" = typed but not yet committed. While dirty or focused, store updates never overwrite the text.
  const wDirty = useRef(false);
  const rDirty = useRef(false);
  const wf = useRef(false);
  const rf = useRef(false);
  useEffect(() => {
    if (!wf.current && !wDirty.current) setW(fmtW(set.weight));
  }, [set.weight]);
  useEffect(() => {
    if (!rf.current && !rDirty.current) setR(set.reps == null ? '' : String(set.reps));
  }, [set.reps]);

  const parse = (t: string, int = false) => {
    const x = t.replace(',', '.').trim();
    if (!x) return null;
    const n = Number(x);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return int ? Math.round(n) : Math.round(n * 100) / 100;
  };
  /** Collect uncommitted edits and mark them committed. */
  const takeDirty = (): Partial<SetLog> => {
    const patch: Partial<SetLog> = {};
    if (wDirty.current) {
      const v = parse(w);
      if (v !== undefined) patch.weight = v;
      wDirty.current = false;
    }
    if (rDirty.current) {
      const v = parse(r, true);
      if (v !== undefined) patch.reps = v;
      rDirty.current = false;
    }
    return patch;
  };
  const range = `${log.repsMin}–${log.repsMax}`;
  return (
    <div className={`set-row${active ? ' active' : ''}${set.done ? ' done' : ''}`}>
      <div className="set-idx">{index + 1}</div>
      <input
        className="mini-input"
        inputMode="decimal"
        aria-label={`Carico serie ${index + 1} in kg`}
        placeholder={prevSet?.weight != null ? formatKg(prevSet.weight) : '0'}
        value={w}
        onFocus={() => (wf.current = true)}
        onChange={(e) => {
          wDirty.current = true;
          setW(e.target.value);
        }}
        onBlur={() => {
          wf.current = false;
          if (!wDirty.current) return;
          if (parse(w) === undefined) {
            wDirty.current = false;
            return setW(fmtW(set.weight));
          }
          const p = takeDirty();
          if (Object.keys(p).length) onChange(p);
        }}
      />
      <input
        className="mini-input"
        inputMode="numeric"
        aria-label={`${log.unit === 'sec' ? 'Secondi' : 'Ripetizioni'} serie ${index + 1}`}
        placeholder={prevSet?.reps != null ? String(prevSet.reps) : range}
        value={r}
        onFocus={() => (rf.current = true)}
        onChange={(e) => {
          rDirty.current = true;
          setR(e.target.value);
        }}
        onBlur={() => {
          rf.current = false;
          if (!rDirty.current) return;
          if (parse(r, true) === undefined) {
            rDirty.current = false;
            return setR(set.reps == null ? '' : String(set.reps));
          }
          const p = takeDirty();
          if (Object.keys(p).length) onChange(p);
        }}
      />
      <button
        className={`set-check${set.done ? ' on' : ''}`}
        aria-pressed={set.done}
        aria-label={set.done ? `Serie ${index + 1} completata: tocca per modificare` : `Segna serie ${index + 1} come completata`}
        onClick={() => onToggle(takeDirty())}
      >
        <Check size={24} strokeWidth={3} />
      </button>
    </div>
  );
}

function NoteField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="field" style={{ marginTop: 12 }}>
      <label htmlFor="ex-note">Nota sull’esercizio</label>
      <textarea id="ex-note" className="input" style={{ minHeight: 64 }} value={v} placeholder="Sedile 4, presa media…" onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} />
    </div>
  );
}

function FinishSheet({ open, onClose, session }: { open: boolean; onClose: () => void; session: Session }) {
  const [rpe, setRpe] = useState<number | null>(session.rpe ?? null);
  const [note, setNote] = useState(session.note ?? '');
  const pending = session.exercises.reduce((a, l) => a + l.sets.filter((x) => !x.done).length, 0);
  const doneCount = session.exercises.reduce((a, l) => a + l.sets.filter((x) => x.done).length, 0);
  return (
    <Sheet open={open} onClose={onClose} label="Termina allenamento">
      <div className="stack">
        <h3 className="display h3">Termina allenamento</h3>
        {pending > 0 && (
          <Notice>
            {pending} {pending === 1 ? 'serie non è segnata' : 'serie non sono segnate'} come completata: non verranno conteggiate.
          </Notice>
        )}
        <div>
          <div className="label">Difficoltà percepita della seduta (RPE 1–10)</div>
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`btn sm${rpe === n ? ' primary' : ''}`} style={{ minWidth: 44 }} aria-pressed={rpe === n} onClick={() => setRpe(rpe === n ? null : n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>
            1 = molto facile · 10 = sforzo massimo
          </div>
        </div>
        <div className="field">
          <label htmlFor="session-note">Note sulla seduta</label>
          <textarea id="session-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Energia, sonno, dolori, palestra affollata…" />
        </div>
        <button
          className="btn primary lg block"
          disabled={doneCount === 0}
          onClick={async () => {
            timer.stop();
            await finishSession(session.id, { rpe, note });
            onClose();
            navigate(`/riepilogo/${session.id}`, { replace: true });
          }}
        >
          Salva allenamento
        </button>
        {doneCount === 0 && <p className="small muted">Segna almeno una serie come completata per salvare.</p>}
      </div>
    </Sheet>
  );
}
