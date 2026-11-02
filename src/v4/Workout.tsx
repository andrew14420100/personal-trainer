import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Flag, Info, List, Minus, Pause, Play, PlayCircle, Plus, Timer as TimerIcon, TrendingUp, Video, X } from 'lucide-react';
import { useData } from '../app/store';
import { DAY_BY_ID, SLOTS } from '../data/program';
import { EXERCISE_BY_ID } from '../data/exercises';
import { EXERCISE_MUSCLES } from '../data/muscles';
import { REAL_VIDEOS } from '../data/realVideos';
import type { ExerciseLog, Session, SetLog, Technique } from '../lib/db';
import { addSet, discardSession, finishSession, mutate, removeSet, togglePause, updateSet } from '../lib/workout';
import { activeElapsed, doneSets, lastLog } from '../lib/stats';
import { formatKg, progressionHint } from '../lib/progression';
import { formatPrescription } from '../lib/plan';
import { formatClock, timer, unlockAudio } from '../lib/timer';
import { setKeepAwake } from '../lib/wakelock';
import { navigate } from '../lib/router';
import { Confirm, Empty, Notice, Seg, Sheet, toast } from './kit';
import { Player } from './Player';
import { ExerciseThumb } from './Plan';

export function Workout() {
  const data = useData();
  const s = data.active;
  useEffect(() => {
    if (!s || !data.settings.keepAwake || s.pausedAt) return;
    void setKeepAwake(true);
    return () => void setKeepAwake(false);
  }, [s?.id, s?.pausedAt, data.settings.keepAwake, s]);
  if (!data.ready) return null;
  if (!s)
    return (
      <main className="page bare">
        <Empty
          icon={<PlayCircle size={24} />}
          title="Nessun allenamento in corso"
          action={
            <button className="btn primary" onClick={() => navigate('/')}>
              Vai a Oggi
            </button>
          }
        >
          Avvia un allenamento da Oggi o da Allenamenti.
        </Empty>
      </main>
    );
  return <Active key={s.id} s={s} />;
}

function useElapsed(s: Session) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (s.pausedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [s.pausedAt]);
  return activeElapsed(s, s.pausedAt ? s.pausedAt : now);
}

function Active({ s }: { s: Session }) {
  const data = useData();
  const day = DAY_BY_ID[s.dayId];
  const idx = Math.min(s.currentIndex, s.exercises.length - 1);
  const log = s.exercises[idx];
  const ex = EXERCISE_BY_ID[log.exerciseId];
  const rest = data.settings.restOverrides[ex.id] ?? ex.restSec;
  const prev = lastLog(data.sessions, ex.id, s.id);
  const hint = progressionHint(ex, { repsMin: log.repsMin, repsMax: log.repsMax, sets: log.targetSets }, prev?.log ?? null);
  const vid = REAL_VIDEOS[ex.id]?.[0];
  const elapsed = useElapsed(s);
  const [showVideo, setShowVideo] = useState(true);
  const [more, setMore] = useState(false);
  const [list, setList] = useState(false);
  const [exit, setExit] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [finish, setFinish] = useState(false);
  const isLast = idx === s.exercises.length - 1;
  const paused = !!s.pausedAt;
  const sideLabel = SLOTS.find((z) => z.id === log.slotId)?.sideLabel;

  const go = (i: number) => mutate(s.id, (x) => ({ ...x, currentIndex: Math.max(0, Math.min(x.exercises.length - 1, i)) })).then(() => window.scrollTo({ top: 0 }));

  const onSetDone = async (setIdx: number, patch: Partial<SetLog>) => {
    unlockAudio();
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
    if (outcome === 'missing') return toast(ex.tracking === 'time' ? 'Inserisci i secondi effettivi' : 'Inserisci le ripetizioni effettive');
    if (outcome === 'done' && data.settings.autoRest && !(isLast && remaining === 0)) timer.start(rest, remaining ? `${ex.name} · serie ${s.exercises[idx].sets.length - remaining + 1}` : 'Prossimo esercizio');
  };

  const completedEx = s.exercises.filter((l) => l.sets.length && l.sets.every((x) => x.done)).length;

  return (
    <main className="page bare" style={{ ['--day' as string]: day.accent, paddingBottom: 'calc(var(--safe-b) + 180px)' }}>
      <header className="wk-top">
        <div className="row">
          <button className="icon-btn" aria-label="Chiudi allenamento" onClick={() => setExit(true)}>
            <X size={20} />
          </button>
          <div className="grow" style={{ textAlign: 'center' }}>
            <div className="t-xs" style={{ color: 'var(--day)', fontWeight: 750, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {day.name}
            </div>
            <div className="t-sm" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 650 }} aria-label={`Tempo attivo ${formatClock(elapsed)}`}>
              {formatClock(elapsed)} <span className="c3">· {completedEx}/{s.exercises.length}</span>
            </div>
          </div>
          <button className={`icon-btn${paused ? ' on' : ''}`} aria-label={paused ? 'Riprendi allenamento' : 'Metti in pausa l’allenamento'} onClick={() => togglePause(s.id)}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button className="icon-btn" aria-label="Elenco esercizi" onClick={() => setList(true)}>
            <List size={19} />
          </button>
        </div>
        <div className="wk-steps" aria-hidden>
          {s.exercises.map((l, i) => (
            <span key={l.slotId} className={l.sets.length && l.sets.every((x) => x.done) ? 'done' : i === idx ? 'cur' : ''} />
          ))}
        </div>
      </header>

      {paused && (
        <div className="card mt12" role="status" style={{ textAlign: 'center' }}>
          <div className="t-h3">Allenamento in pausa</div>
          <p className="t-sm c2" style={{ margin: '6px 0 12px' }}>
            Il tempo in pausa non viene conteggiato nella durata.
          </p>
          <button className="btn primary block" onClick={() => togglePause(s.id)}>
            <Play size={16} fill="currentColor" /> Riprendi
          </button>
        </div>
      )}

      {s.calibration && !paused && idx === 0 && (
        <div className="mt12">
          <Notice>Calibrazione: volume ridotto, lascia 2–3 ripetizioni di margine.</Notice>
        </div>
      )}

      <div key={idx} style={{ animation: 'page-in .3s var(--ease) both', opacity: paused ? 0.45 : 1, pointerEvents: paused ? 'none' : undefined }} aria-hidden={paused || undefined}>
        <div className="row mt16" style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <div className="ex-group">
              {idx + 1}/{s.exercises.length} · {EXERCISE_MUSCLES[ex.id]?.group}
            </div>
            <h1 className="t-h1" style={{ marginTop: 2 }}>
              {ex.name}
            </h1>
          </div>
          <button className="icon-btn" aria-label={`Scheda tecnica di ${ex.name}`} onClick={() => navigate(`/esercizio/${ex.id}?slot=${log.slotId}`)}>
            <Info size={19} />
          </button>
        </div>
        <div className="chips mt8">
          <span className="chip accent">{formatPrescription({ ...log, sideLabel }, log.targetSets)}</span>
          <span className="chip">
            <TimerIcon size={13} /> {rest}s
          </span>
        </div>

        {vid && (
          <div className="mt12">
            {showVideo ? <Player youtubeId={vid.youtubeId} title={vid.title} autoPlay={data.settings.video.autoplay} compact /> : null}
            <button className="link mt8" onClick={() => setShowVideo((v) => !v)} aria-expanded={showVideo}>
              <Video size={14} /> {showVideo ? 'Nascondi video' : 'Mostra video'}
            </button>
          </div>
        )}

        {/* previous + hint */}
        <div className="card tight mt12">
          <div className="row spread">
            <span className="t-label">Ultima volta</span>
            <span className="t-xs c3">{prev ? new Date(prev.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : 'nessun dato'}</span>
          </div>
          <div className="t-sm c2 mt8">
            {prev ? doneSets(prev.log).map((x) => (ex.tracking === 'time' ? `${x.reps}s` : `${formatKg(x.weight ?? 0)}×${x.reps}`)).join('  ·  ') : 'Prima volta: scegli un carico che lasci 2–3 ripetizioni di margine.'}
          </div>
          {prev && (
            <div className="row t-sm mt8" style={{ alignItems: 'flex-start' }}>
              <TrendingUp size={15} color="var(--ok)" style={{ flex: 'none', marginTop: 2 }} />
              <span className="c2">
                <b style={{ color: 'var(--t1)' }}>{hint.title}.</b> {hint.detail}
              </span>
            </div>
          )}
        </div>

        {/* sets */}
        <div className="sets mt12">
          <div className="set-h">
            <span>#</span>
            <span>Prec.</span>
            <span>{ex.load === 'bodyweight' ? '+kg' : 'kg'}</span>
            <span>{ex.tracking === 'time' ? 'sec' : 'rip'}</span>
            <span>
              <Check size={14} />
            </span>
          </div>
          {log.sets.map((set, i) => (
            <SetRow key={i} index={i} set={set} log={log} prevSet={prev ? doneSets(prev.log)[i] : undefined} onChange={(p) => mutate(s.id, (x) => updateSet(x, idx, i, p))} onToggle={(p) => onSetDone(i, p)} />
          ))}
        </div>
        <div className="row mt8">
          <button className="btn sm ghost" aria-label="Aggiungi una serie" onClick={() => mutate(s.id, (x) => addSet(x, idx))}>
            <Plus size={15} /> Serie
          </button>
          <button className="btn sm ghost" aria-label="Rimuovi l’ultima serie" disabled={log.sets.length <= 1} onClick={() => mutate(s.id, (x) => removeSet(x, idx, x.exercises[idx].sets.length - 1))}>
            <Minus size={15} /> Serie
          </button>
          <div className="grow" />
          <button className="btn sm" aria-label={`Avvia recupero di ${rest} secondi`} onClick={() => timer.start(rest, ex.name)}>
            <TimerIcon size={15} /> Recupero
          </button>
        </div>

        {/* notes, technique, RIR */}
        <button className="link mt16" aria-expanded={more} onClick={() => setMore((m) => !m)}>
          Note, tecnica e RIR <ChevronDown size={14} style={{ transform: more ? 'rotate(180deg)' : undefined }} />
          {(log.note || log.technique || log.rir != null) && <span className="dot" style={{ background: 'var(--accent)', marginLeft: 6 }} />}
        </button>
        {more && (
          <div className="card tight mt8 col">
            <div>
              <div className="t-label">Tecnica percepita</div>
              <div className="mt8">
                <Seg<Technique | ''>
                  label="Tecnica percepita"
                  value={log.technique ?? ''}
                  onChange={(t) => mutate(s.id, (x) => ((x.exercises[idx].technique = t || undefined), x))}
                  options={[
                    { value: 'buona', label: 'Buona' },
                    { value: 'discreta', label: 'Discreta' },
                    { value: 'da migliorare', label: 'Da migliorare' },
                  ]}
                />
              </div>
            </div>
            {ex.tracking === 'reps' && (
              <div>
                <div className="t-label">Ripetizioni di margine nell’ultima serie</div>
                <div className="mt8">
                  <Seg<string>
                    label="RIR"
                    value={log.rir == null ? '' : String(log.rir)}
                    onChange={(r) => mutate(s.id, (x) => ((x.exercises[idx].rir = x.exercises[idx].rir === Number(r) ? null : Number(r)), x))}
                    options={['0', '1', '2', '3'].map((r) => ({ value: r, label: r === '3' ? '3+' : r }))}
                  />
                </div>
              </div>
            )}
            <NoteField value={log.note} onSave={(note) => mutate(s.id, (x) => ((x.exercises[idx].note = note), x))} />
          </div>
        )}

        <div className="wk-foot">
          <button className="btn lg" aria-label="Esercizio precedente" disabled={idx === 0} onClick={() => go(idx - 1)}>
            <ArrowLeft size={20} />
          </button>
          {isLast ? (
            <button className="btn primary lg grow" onClick={() => setFinish(true)}>
              <Flag size={18} /> Termina allenamento
            </button>
          ) : (
            <button className="btn primary lg grow" onClick={() => go(idx + 1)}>
              Prossimo: {EXERCISE_BY_ID[s.exercises[idx + 1].exerciseId].name.split(' ').slice(0, 3).join(' ')} <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>

      <Sheet open={list} onClose={() => setList(false)} label="Esercizi della sessione">
        <div className="row spread" style={{ marginBottom: 10 }}>
          <h3 className="t-h2">{day.name}</h3>
          <button
            className="btn sm primary"
            onClick={() => {
              setList(false);
              setFinish(true);
            }}
          >
            <Flag size={15} /> Termina
          </button>
        </div>
        <div className="list">
          {s.exercises.map((l, i) => {
            const done = l.sets.filter((x) => x.done).length;
            return (
              <button
                key={l.slotId}
                className="ex-row"
                aria-current={i === idx ? 'step' : undefined}
                style={i === idx ? { background: 'var(--s2)' } : undefined}
                onClick={() => {
                  setList(false);
                  void go(i);
                }}
              >
                <ExerciseThumb exerciseId={l.exerciseId} n={i + 1} />
                <span style={{ minWidth: 0 }}>
                  <span className="ex-name" style={{ display: 'block' }}>
                    {EXERCISE_BY_ID[l.exerciseId].name}
                  </span>
                  <span className="ex-sub">
                    {done}/{l.sets.length} serie
                  </span>
                </span>
                {done === l.sets.length && done > 0 ? <Check size={18} color="var(--ok)" /> : <span />}
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={exit} onClose={() => setExit(false)} label="Chiudi allenamento">
        <div className="col">
          <h3 className="t-h2">Chiudere l’allenamento?</h3>
          <p className="t-sm c2" style={{ margin: 0 }}>
            Le serie inserite sono già salvate sul dispositivo.
          </p>
          <button
            className="btn block"
            onClick={async () => {
              setExit(false);
              if (!s.pausedAt) await togglePause(s.id);
              navigate('/');
            }}
          >
            <Pause size={16} /> Metti in pausa ed esci
          </button>
          <button
            className="btn block primary"
            onClick={() => {
              setExit(false);
              setFinish(true);
            }}
          >
            <Flag size={16} /> Termina e salva
          </button>
          <button
            className="btn block danger"
            onClick={() => {
              setExit(false);
              setDiscard(true);
            }}
          >
            Elimina questa sessione
          </button>
        </div>
      </Sheet>
      <Confirm
        open={discard}
        onClose={() => setDiscard(false)}
        title="Eliminare la sessione?"
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

function SetRow({ index, set, log, prevSet, onChange, onToggle }: { index: number; set: SetLog; log: ExerciseLog; prevSet?: SetLog; onChange: (p: Partial<SetLog>) => void; onToggle: (p: Partial<SetLog>) => void }) {
  const fmtW = (v: number | null) => (v == null ? '' : String(v).replace('.', ','));
  const [w, setW] = useState(fmtW(set.weight));
  const [r, setR] = useState(set.reps == null ? '' : String(set.reps));
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
  /** Tapping ✓ on an empty row uses the previous session's values (shown as placeholders). */
  const fillFromPrev = (p: Partial<SetLog>): Partial<SetLog> => {
    const out = { ...p };
    if (set.weight == null && out.weight == null && prevSet?.weight != null && !w) out.weight = prevSet.weight;
    if (set.reps == null && out.reps == null && prevSet?.reps != null && !r) out.reps = prevSet.reps;
    return out;
  };
  const blur = (which: 'w' | 'r') => {
    if (which === 'w') wf.current = false;
    else rf.current = false;
    const dirty = which === 'w' ? wDirty : rDirty;
    if (!dirty.current) return;
    if (parse(which === 'w' ? w : r, which === 'r') === undefined) {
      dirty.current = false;
      return which === 'w' ? setW(fmtW(set.weight)) : setR(set.reps == null ? '' : String(set.reps));
    }
    const p = takeDirty();
    if (Object.keys(p).length) onChange(p);
  };
  const unit = log.unit === 'sec' ? 's' : '';
  return (
    <div className={`set-r${set.done ? ' done' : ''}`}>
      <span className="idx">{index + 1}</span>
      <span className="prev">{prevSet ? (log.unit === 'sec' ? `${prevSet.reps}s` : `${formatKg(prevSet.weight ?? 0)}×${prevSet.reps}`) : '—'}</span>
      <input
        className="set-in"
        inputMode="decimal"
        aria-label={`Carico serie ${index + 1} in kg`}
        placeholder={prevSet?.weight != null ? formatKg(prevSet.weight) : '0'}
        value={w}
        onFocus={() => (wf.current = true)}
        onChange={(e) => {
          wDirty.current = true;
          setW(e.target.value);
        }}
        onBlur={() => blur('w')}
      />
      <input
        className="set-in"
        inputMode="numeric"
        aria-label={`${log.unit === 'sec' ? 'Secondi' : 'Ripetizioni'} serie ${index + 1}`}
        placeholder={prevSet?.reps != null ? `${prevSet.reps}${unit}` : `${log.repsMin}–${log.repsMax}`}
        value={r}
        onFocus={() => (rf.current = true)}
        onChange={(e) => {
          rDirty.current = true;
          setR(e.target.value);
        }}
        onBlur={() => blur('r')}
      />
      <button className={`check${set.done ? ' on' : ''}`} aria-pressed={set.done} aria-label={set.done ? `Serie ${index + 1} completata: tocca per modificare` : `Segna serie ${index + 1} come completata`} onClick={() => onToggle(set.done ? takeDirty() : fillFromPrev(takeDirty()))}>
        <Check size={22} strokeWidth={3} />
      </button>
    </div>
  );
}

function NoteField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div>
      <label className="t-label" htmlFor="ex-note-w">
        Nota sull’esercizio
      </label>
      <textarea id="ex-note-w" className="input mt8" style={{ minHeight: 60 }} value={v} placeholder="Sedile 4, presa media…" onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} />
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
      <div className="col">
        <h3 className="t-h2">Termina allenamento</h3>
        {pending > 0 && <Notice>{pending === 1 ? '1 serie non è segnata' : `${pending} serie non sono segnate`} come completata: non verrà conteggiata.</Notice>}
        <div>
          <div className="t-label">Fatica percepita della seduta (RPE 1–10)</div>
          <div className="row wrap mt8" style={{ gap: 6 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`btn sm${rpe === n ? ' primary' : ''}`} style={{ minWidth: 42 }} aria-pressed={rpe === n} onClick={() => setRpe(rpe === n ? null : n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="t-xs c3 mt8">1 = molto facile · 10 = sforzo massimo</div>
        </div>
        <div>
          <label className="t-label" htmlFor="session-note">
            Note sulla seduta
          </label>
          <textarea id="session-note" className="input mt8" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Energia, sonno, dolori, palestra affollata…" />
        </div>
        <button
          className="btn primary lg block"
          disabled={doneCount === 0}
          onClick={async () => {
            timer.stop();
            await finishSession(session.id, { rpe, note });
            onClose();
            navigate(`/sessione/${session.id}?fine=1`, { replace: true });
          }}
        >
          Salva allenamento
        </button>
        {doneCount === 0 && <p className="t-sm c3">Segna almeno una serie come completata per salvare.</p>}
      </div>
    </Sheet>
  );
}
