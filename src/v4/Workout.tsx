import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calculator,
  Check,
  ChevronDown,
  Flag,
  Flame,
  Info,
  Link2,
  List,
  Medal,
  Minus,
  MoreHorizontal,
  Pause,
  Play,
  PlayCircle,
  Plus,
  Repeat,
  Timer as TimerIcon,
  Trash2,
  TrendingUp,
  Unlink,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { SLOTS } from '../data/program';
import { exOrFallback } from '../data/catalog';
import { EXERCISE_MUSCLES } from '../data/muscles';
import { REAL_VIDEOS } from '../data/realVideos';
import type { ExerciseLog, Session, SetLog, SetType, Technique } from '../lib/db';
import { addSet, discardSession, finishSession, logFor, mutate, removeSet, togglePause, updateSet } from '../lib/workout';
import { activeElapsed, doneSets, lastLog } from '../lib/stats';
import { exerciseBests, setPRs, warmupSets, PR_LABEL, type PRKind } from '../lib/records';
import { formatKg, progressionHint } from '../lib/progression';
import { dayAsItems, formatPrescription } from '../lib/plan';
import { fromUnit, num, toUnit, unitLabel } from '../lib/format';
import { formatClock, timer, unlockAudio } from '../lib/timer';
import { setKeepAwake } from '../lib/wakelock';
import { sessionMeta, ROUTINE_ACCENTS } from '../lib/meta';
import { navigate } from '../lib/router';
import { uid } from '../lib/db';
import type { RoutineItem } from '../lib/settings';
import type { DayId } from '../data/types';
import { Confirm, Empty, Notice, Seg, Sheet, Switch, toast } from './kit';
import { Player } from './Player';
import { ExerciseThumb } from './Plan';
import { ExercisePicker, newItem } from './Routines';
import { OneRmCalc, PlateCalc } from './Tools';

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

const TYPE_SHORT: Record<SetType, string> = { warmup: 'R', drop: 'D', failure: 'C' };
const TYPE_LABEL: Record<SetType | 'normal', string> = { normal: 'Normale', warmup: 'Riscaldamento', drop: 'Drop set', failure: 'A cedimento' };

/** Logs of the same superset group, in order, with their index in the session. */
const groupMembers = (s: Session, g?: string) => (g ? s.exercises.map((l, i) => ({ l, i })).filter((x) => x.l.group === g) : []);

function Active({ s }: { s: Session }) {
  const data = useData();
  const { settings } = data;
  const day = sessionMeta(s, settings);
  const elapsed = useElapsed(s);
  const [list, setList] = useState(false);
  const [exit, setExit] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [finish, setFinish] = useState(false);
  const [add, setAdd] = useState(false);
  const paused = !!s.pausedAt;
  const empty = s.exercises.length === 0;
  const idx = empty ? -1 : Math.min(s.currentIndex, s.exercises.length - 1);
  const completedEx = s.exercises.filter((l) => l.sets.length && l.sets.every((x) => x.done)).length;

  const go = (i: number) => mutate(s.id, (x) => ({ ...x, currentIndex: Math.max(0, Math.min(x.exercises.length - 1, i)) })).then(() => window.scrollTo({ top: 0 }));
  const addExercises = (ids: string[], at?: number) =>
    mutate(s.id, (x) => {
      const logs = ids.map((id) => {
        const it = newItem(id);
        return logFor({ ...it, todaySets: it.sets, restSec: it.restSec }, data.sessions);
      });
      const pos = at ?? x.exercises.length;
      const ex = [...x.exercises];
      ex.splice(pos, 0, ...logs);
      return { ...x, exercises: ex, currentIndex: x.exercises.length ? pos : 0 };
    });

  return (
    <main className="page bare" style={{ ['--day' as string]: day.accent, paddingBottom: 'calc(var(--safe-b) + 180px)' }}>
      <header className="wk-top">
        <div className="row">
          <button className="icon-btn" aria-label="Chiudi allenamento" onClick={() => setExit(true)}>
            <X size={20} />
          </button>
          <div className="grow" style={{ textAlign: 'center', minWidth: 0 }}>
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

      {empty ? (
        <div className="mt24">
          <Empty
            icon={<Plus size={22} />}
            title="Allenamento libero"
            action={
              <button className="btn primary" onClick={() => setAdd(true)}>
                <Plus size={16} /> Aggiungi esercizi
              </button>
            }
          >
            Aggiungi gli esercizi che vuoi fare. A fine seduta potrai salvarla come scheda.
          </Empty>
        </div>
      ) : (
        <Current key={idx} s={s} idx={idx} paused={paused} go={go} onFinish={() => setFinish(true)} onAddAfter={() => setAdd(true)} />
      )}

      {/* ── Exercise list: reorder, remove, add ── */}
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
              <div key={l.slotId} className="ex-row" style={i === idx ? { background: 'var(--s2)' } : undefined}>
                <button
                  className="row"
                  style={{ gridColumn: '1 / 3', border: 0, background: 'none', color: 'inherit', padding: 0, textAlign: 'left', gap: 12 }}
                  aria-current={i === idx ? 'step' : undefined}
                  onClick={() => {
                    setList(false);
                    void go(i);
                  }}
                >
                  <ExerciseThumb exerciseId={l.exerciseId} n={i + 1} />
                  <span style={{ minWidth: 0 }}>
                    <span className="ex-name" style={{ display: 'block' }}>
                      {exOrFallback(l.exerciseId).name}
                    </span>
                    <span className="ex-sub">
                      {done}/{l.sets.length} serie{l.group ? ` · superserie ${l.group}` : ''}
                    </span>
                  </span>
                </button>
                <span className="row" style={{ gap: 2 }}>
                  <button
                    className="icon-btn clear"
                    style={{ width: 34, height: 34 }}
                    aria-label={`Sposta su ${exOrFallback(l.exerciseId).name}`}
                    disabled={i === 0}
                    onClick={() =>
                      mutate(s.id, (x) => {
                        const e = [...x.exercises];
                        [e[i - 1], e[i]] = [e[i], e[i - 1]];
                        return { ...x, exercises: e, currentIndex: x.currentIndex === i ? i - 1 : x.currentIndex === i - 1 ? i : x.currentIndex };
                      })
                    }
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="icon-btn clear"
                    style={{ width: 34, height: 34 }}
                    aria-label={`Sposta giù ${exOrFallback(l.exerciseId).name}`}
                    disabled={i === s.exercises.length - 1}
                    onClick={() =>
                      mutate(s.id, (x) => {
                        const e = [...x.exercises];
                        [e[i + 1], e[i]] = [e[i], e[i + 1]];
                        return { ...x, exercises: e, currentIndex: x.currentIndex === i ? i + 1 : x.currentIndex === i + 1 ? i : x.currentIndex };
                      })
                    }
                  >
                    <ArrowDown size={15} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
        <button
          className="btn block mt12"
          onClick={() => {
            setList(false);
            setAdd(true);
          }}
        >
          <Plus size={16} /> Aggiungi esercizi
        </button>
      </Sheet>

      <ExercisePicker open={add} onClose={() => setAdd(false)} onPick={(ids) => addExercises(ids, empty ? 0 : idx + 1)} />

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

function Current({ s, idx, paused, go, onFinish, onAddAfter }: { s: Session; idx: number; paused: boolean; go: (i: number) => Promise<unknown>; onFinish: () => void; onAddAfter: () => void }) {
  const data = useData();
  const { settings } = data;
  const log = s.exercises[idx];
  const ex = exOrFallback(log.exerciseId);
  const rest = log.restSec ?? settings.restOverrides[ex.id] ?? ex.restSec;
  const prev = lastLog(data.sessions, ex.id, s.id);
  const hint = progressionHint(ex, { repsMin: log.repsMin, repsMax: log.repsMax, sets: log.targetSets }, prev?.log ?? null);
  const prior = useMemo(() => exerciseBests(data.sessions, ex.id, undefined, s.id), [data.sessions, ex.id, s.id]);
  const hasHistory = Object.keys(prior).length > 0;
  const vid = REAL_VIDEOS[ex.id]?.[0];
  const isLast = idx === s.exercises.length - 1;
  const sideLabel = SLOTS.find((z) => z.id === log.slotId)?.sideLabel ?? (log.perSide ? 'per lato' : undefined);
  const members = groupMembers(s, log.group);
  const cardio = log.unit === 'min';
  const [showVideo, setShowVideo] = useState(true);
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const [replace, setReplace] = useState(false);
  const [tool, setTool] = useState<'dischi' | '1rm' | null>(null);
  const [setSheet, setSetSheet] = useState<number | null>(null);
  const prevWork = prev ? doneSets(prev.log) : [];
  const workIdx = (i: number) => log.sets.slice(0, i).filter((x) => x.type !== 'warmup').length;
  const firstWork = log.sets.find((x) => x.type !== 'warmup' && x.weight)?.weight ?? prevWork[0]?.weight ?? hint.suggestedWeight ?? null;

  const onSetDone = async (setIdx: number, patch: Partial<SetLog>) => {
    unlockAudio();
    let outcome: 'done' | 'undone' | 'missing' = 'missing';
    let after: Session | null = null;
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
      after = updateSet(x, idx, setIdx, { ...patch, done: true, completedAt: Date.now() });
      return after;
    });
    if (outcome === 'missing') return toast(cardio ? 'Inserisci i minuti' : ex.tracking === 'time' ? 'Inserisci i secondi effettivi' : 'Inserisci le ripetizioni effettive');
    if (outcome !== 'done' || !after) return;
    const x = after as Session;
    const l = x.exercises[idx];
    const done = l.sets[setIdx];
    const prs = setPRs(done, prior, hasHistory);
    if (prs.length) toast(`🏅 Record: ${prs.map((k) => PR_LABEL[k]).join(', ')}`);
    const nextSet = l.sets.find((z, i) => i > setIdx && !z.done);
    // superset: jump to the next member of the group that still has sets to do
    if (log.group && settings.smartSuperset) {
      const g = groupMembers(x, log.group);
      const pos = g.findIndex((m) => m.i === idx);
      const nextMember = [...g.slice(pos + 1), ...g.slice(0, pos)].find((m) => m.l.sets.some((z) => !z.done));
      const endOfRound = !nextMember || nextMember.i < idx || pos === g.length - 1;
      if (nextMember && !endOfRound) {
        await go(nextMember.i);
        return;
      }
      if (settings.autoRest && nextMember) timer.start(rest, `Superserie ${log.group}`);
      if (nextMember) await go(nextMember.i);
      return;
    }
    if (nextSet?.type === 'drop' || done.type === 'warmup') return; // no rest before a drop set or after a warm-up
    const lastOfWorkout = isLast && !nextSet;
    if (settings.autoRest && !lastOfWorkout && rest > 0) timer.start(rest, nextSet ? `${ex.name} · serie ${l.sets.indexOf(nextSet) + 1}` : 'Prossimo esercizio');
  };

  const fillSuggested = () =>
    hint.suggestedWeight != null &&
    mutate(s.id, (x) => {
      const e = structuredClone(x);
      e.exercises[idx].sets = e.exercises[idx].sets.map((z) => (z.done || z.type === 'warmup' ? z : { ...z, weight: hint.suggestedWeight! }));
      return e;
    }).then(() => toast(`Carico suggerito inserito: ${formatKg(toUnit(hint.suggestedWeight!))} ${unitLabel()}`));

  const addWarmups = () => {
    const w = warmupSets(firstWork ?? 0, settings.warmup);
    if (!w.length) return toast('Inserisci prima il carico di lavoro della prima serie');
    void mutate(s.id, (x) => {
      const e = structuredClone(x);
      const l = e.exercises[idx];
      l.sets = [...w.map((z) => ({ weight: z.weight, reps: null, done: false, type: 'warmup' as const })), ...l.sets.filter((z) => !(z.type === 'warmup' && !z.done))];
      return e;
    }).then(() => toast(`${w.length} serie di riscaldamento aggiunte`));
  };

  return (
    <div style={{ animation: 'page-in .3s var(--ease) both', opacity: paused ? 0.45 : 1, pointerEvents: paused ? 'none' : undefined }} aria-hidden={paused || undefined}>
      {s.calibration && idx === 0 && (
        <div className="mt12">
          <Notice>Calibrazione: volume ridotto, lascia 2–3 ripetizioni di margine.</Notice>
        </div>
      )}
      <div className="row mt16" style={{ alignItems: 'flex-start' }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="ex-group">
            {idx + 1}/{s.exercises.length} · {EXERCISE_MUSCLES[ex.id]?.group ?? '—'}
          </div>
          <h1 className="t-h1" style={{ marginTop: 2 }}>
            {ex.name}
          </h1>
        </div>
        <button className="icon-btn" aria-label={`Scheda tecnica di ${ex.name}`} onClick={() => navigate(`/esercizio/${ex.id}?slot=${log.slotId}`)}>
          <Info size={19} />
        </button>
        <button className="icon-btn" aria-label="Altre azioni sull’esercizio" onClick={() => setMenu(true)}>
          <MoreHorizontal size={19} />
        </button>
      </div>
      <div className="chips mt8">
        <span className="chip accent">{formatPrescription({ ...log, sideLabel }, log.targetSets)}</span>
        {rest > 0 && (
          <span className="chip">
            <TimerIcon size={13} /> {rest}s
          </span>
        )}
        {log.group && (
          <span className="chip warn">
            <Link2 size={13} /> Superserie {log.group}: {members.map((m) => exOrFallback(m.l.exerciseId).name.split(' ')[0]).join(' + ')}
          </span>
        )}
      </div>

      {vid && (
        <div className="mt12">
          {showVideo ? <Player youtubeId={vid.youtubeId} title={vid.title} autoPlay={settings.video.autoplay} compact /> : null}
          <button className="link mt8" onClick={() => setShowVideo((v) => !v)} aria-expanded={showVideo}>
            <Video size={14} /> {showVideo ? 'Nascondi video' : 'Mostra video'}
          </button>
        </div>
      )}

      {!cardio && (
        <div className="card tight mt12">
          <div className="row spread">
            <span className="t-label">Ultima volta</span>
            <span className="t-xs c3">{prev ? new Date(prev.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : 'nessun dato'}</span>
          </div>
          <div className="t-sm c2 mt8">
            {prev
              ? prevWork.map((x) => (ex.tracking === 'time' ? `${x.reps}s` : `${formatKg(toUnit(x.weight ?? 0))}×${x.reps}`)).join('  ·  ')
              : 'Prima volta: scegli un carico che lasci 2–3 ripetizioni di margine.'}
          </div>
          {prev && (
            <div className="row t-sm mt8" style={{ alignItems: 'flex-start' }}>
              <TrendingUp size={15} color="var(--ok)" style={{ flex: 'none', marginTop: 2 }} />
              <span className="c2 grow">
                <b style={{ color: 'var(--t1)' }}>{hint.title}.</b> {hint.detail}
              </span>
            </div>
          )}
          {hint.suggestedWeight != null && (
            <button className="btn sm mt8" onClick={fillSuggested}>
              <Wand2 size={14} /> Usa {formatKg(toUnit(hint.suggestedWeight))} {unitLabel()}
            </button>
          )}
        </div>
      )}

      <div className="sets mt12">
        <div className="set-h" style={cardio ? { gridTemplateColumns: '32px repeat(3, minmax(0, 1fr)) 46px' } : undefined}>
          <span>#</span>
          {cardio ? (
            <>
              <span>min</span>
              <span>km</span>
              <span>kcal</span>
            </>
          ) : (
            <>
              <span>Prec.</span>
              <span>{ex.load === 'bodyweight' ? `+${unitLabel()}` : unitLabel()}</span>
              <span>{ex.tracking === 'time' ? 'sec' : 'rip'}</span>
            </>
          )}
          <span>
            <Check size={14} />
          </span>
        </div>
        {log.sets.map((set, i) =>
          cardio ? (
            <CardioRow key={i} index={i} set={set} onChange={(p) => mutate(s.id, (x) => updateSet(x, idx, i, p))} onToggle={(p) => onSetDone(i, p)} />
          ) : (
            <SetRow
              key={i}
              index={i}
              set={set}
              log={log}
              label={set.type ? TYPE_SHORT[set.type] : String(workIdx(i) + 1)}
              prevSet={set.type === 'warmup' ? undefined : prevWork[workIdx(i)]}
              prs={setPRs(set, prior, hasHistory)}
              onType={() => setSetSheet(i)}
              onChange={(p) => mutate(s.id, (x) => updateSet(x, idx, i, p))}
              onToggle={(p) => onSetDone(i, p)}
            />
          ),
        )}
      </div>
      <div className="row wrap mt8" style={{ gap: 6 }}>
        <button className="btn sm ghost" aria-label="Aggiungi una serie" onClick={() => mutate(s.id, (x) => addSet(x, idx))}>
          <Plus size={15} /> Serie
        </button>
        <button className="btn sm ghost" aria-label="Rimuovi l’ultima serie" disabled={log.sets.length <= 1} onClick={() => mutate(s.id, (x) => removeSet(x, idx, x.exercises[idx].sets.length - 1))}>
          <Minus size={15} /> Serie
        </button>
        {!cardio && ex.load === 'external' && (
          <button className="btn sm ghost" onClick={addWarmups}>
            <Flame size={15} /> Riscaldamento
          </button>
        )}
        <div className="grow" />
        {rest > 0 && (
          <button className="btn sm" aria-label={`Avvia recupero di ${rest} secondi`} onClick={() => timer.start(rest, ex.name)}>
            <TimerIcon size={15} /> Recupero
          </button>
        )}
      </div>

      {!cardio && (
        <>
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
        </>
      )}

      <div className="wk-foot">
        <button className="btn lg" aria-label="Esercizio precedente" disabled={idx === 0} onClick={() => go(idx - 1)}>
          <ArrowLeft size={20} />
        </button>
        {isLast ? (
          <button className="btn primary lg grow" onClick={onFinish}>
            <Flag size={18} /> Termina allenamento
          </button>
        ) : (
          <button className="btn primary lg grow" onClick={() => go(idx + 1)}>
            Prossimo: {exOrFallback(s.exercises[idx + 1].exerciseId).name.split(' ').slice(0, 3).join(' ')} <ArrowRight size={18} />
          </button>
        )}
      </div>

      {/* ── Set type + RPE ── */}
      <Sheet open={setSheet != null} onClose={() => setSetSheet(null)} label="Tipo di serie">
        {setSheet != null && log.sets[setSheet] && (
          <div className="col">
            <h3 className="t-h2">Serie {setSheet + 1}</h3>
            <div className="list">
              {(['normal', 'warmup', 'drop', 'failure'] as const).map((t) => {
                const cur = (log.sets[setSheet].type ?? 'normal') === t;
                return (
                  <button
                    key={t}
                    className="list-row"
                    aria-pressed={cur}
                    onClick={() => mutate(s.id, (x) => updateSet(x, idx, setSheet, { type: t === 'normal' ? undefined : t })).then(() => setSetSheet(null))}
                  >
                    <span className={`chip sm${cur ? ' accent' : ''}`} style={{ minWidth: 28, justifyContent: 'center' }}>
                      {t === 'normal' ? setSheet + 1 : TYPE_SHORT[t]}
                    </span>
                    <span className="grow t-sm" style={{ fontWeight: 650 }}>
                      {TYPE_LABEL[t]}
                    </span>
                    {cur && <Check size={17} color="var(--ok)" />}
                  </button>
                );
              })}
            </div>
            <p className="t-xs c3" style={{ margin: 0 }}>
              Il riscaldamento non conta nelle statistiche e nei record. Prima di un drop set il recupero non parte.
            </p>
            {settings.rpePerSet && (
              <div>
                <div className="t-label">RPE di questa serie</div>
                <div className="row wrap mt8" style={{ gap: 6 }}>
                  {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => (
                    <button
                      key={r}
                      className={`btn sm${log.sets[setSheet].rpe === r ? ' primary' : ''}`}
                      style={{ minWidth: 48 }}
                      aria-pressed={log.sets[setSheet].rpe === r}
                      onClick={() => mutate(s.id, (x) => updateSet(x, idx, setSheet, { rpe: x.exercises[idx].sets[setSheet].rpe === r ? null : r }))}
                    >
                      {num(r, 1)}
                    </button>
                  ))}
                </div>
                <p className="t-xs c3 mt8" style={{ marginBottom: 0 }}>
                  10 = cedimento · 9 = 1 ripetizione di margine · 8 = 2 · 7 = 3
                </p>
              </div>
            )}
            <button
              className="btn danger ghost block"
              disabled={log.sets.length <= 1}
              onClick={() => mutate(s.id, (x) => removeSet(x, idx, setSheet)).then(() => setSetSheet(null))}
            >
              <Trash2 size={15} /> Elimina questa serie
            </button>
          </div>
        )}
      </Sheet>

      {/* ── Exercise menu ── */}
      <Sheet open={menu} onClose={() => setMenu(false)} label="Azioni esercizio">
        <h3 className="t-h2" style={{ marginBottom: 10 }}>
          {ex.name}
        </h3>
        <div className="list">
          <button className="list-row" onClick={() => (setMenu(false), setReplace(true))}>
            <Repeat size={18} className="c2" /> <span className="grow t-sm">Sostituisci esercizio</span>
          </button>
          <button className="list-row" onClick={() => (setMenu(false), onAddAfter())}>
            <Plus size={18} className="c2" /> <span className="grow t-sm">Aggiungi esercizi dopo questo</span>
          </button>
          {idx < s.exercises.length - 1 && (
            <button
              className="list-row"
              onClick={() => {
                setMenu(false);
                void mutate(s.id, (x) => {
                  const e = structuredClone(x);
                  const a = e.exercises[idx];
                  const b = e.exercises[idx + 1];
                  if (a.group && a.group === b.group) {
                    const same = e.exercises.filter((z) => z.group === a.group).length;
                    b.group = undefined;
                    if (same <= 2) a.group = undefined;
                  } else {
                    const used = new Set(e.exercises.map((z) => z.group).filter(Boolean));
                    const g = a.group ?? String.fromCharCode(65 + used.size);
                    a.group = g;
                    b.group = g;
                  }
                  return e;
                });
              }}
            >
              {log.group && s.exercises[idx + 1].group === log.group ? <Unlink size={18} className="c2" /> : <Link2 size={18} className="c2" />}
              <span className="grow t-sm">{log.group && s.exercises[idx + 1].group === log.group ? 'Separa dal successivo' : 'Superserie con il successivo'}</span>
            </button>
          )}
          <div className="list-row">
            <TimerIcon size={18} className="c2" />
            <span className="grow t-sm">Recupero: {rest} s</span>
            <button className="icon-btn" aria-label="Recupero meno 15 secondi" onClick={() => mutate(s.id, (x) => ((x.exercises[idx].restSec = Math.max(0, rest - 15)), x))}>
              <Minus size={16} />
            </button>
            <button className="icon-btn" aria-label="Recupero più 15 secondi" onClick={() => mutate(s.id, (x) => ((x.exercises[idx].restSec = Math.min(600, rest + 15)), x))}>
              <Plus size={16} />
            </button>
          </div>
          {!cardio && (
            <>
              <button className="list-row" onClick={() => (setMenu(false), setTool('dischi'))}>
                <Calculator size={18} className="c2" /> <span className="grow t-sm">Calcolatore dischi</span>
              </button>
              <button className="list-row" onClick={() => (setMenu(false), setTool('1rm'))}>
                <Medal size={18} className="c2" /> <span className="grow t-sm">Massimale (1RM) e percentuali</span>
              </button>
            </>
          )}
          <button
            className="list-row"
            style={{ color: 'var(--bad)' }}
            onClick={() => {
              setMenu(false);
              void mutate(s.id, (x) => ({ ...x, exercises: x.exercises.filter((_, j) => j !== idx), currentIndex: Math.max(0, Math.min(idx, x.exercises.length - 2)) }));
            }}
          >
            <Trash2 size={18} /> <span className="grow t-sm">Rimuovi dalla seduta</span>
          </button>
        </div>
      </Sheet>

      <ExercisePicker
        open={replace}
        multi={false}
        title="Sostituisci con…"
        onClose={() => setReplace(false)}
        onPick={([id]) =>
          mutate(s.id, (x) => {
            const e = structuredClone(x);
            const it = newItem(id);
            const fresh = logFor({ ...it, id: log.slotId, todaySets: Math.max(1, log.sets.length), restSec: it.restSec, group: log.group }, data.sessions);
            e.exercises[idx] = { ...fresh, slotId: log.slotId };
            return e;
          })
        }
      />

      <Sheet open={tool != null} onClose={() => setTool(null)} label={tool === 'dischi' ? 'Calcolatore dischi' : 'Massimale'}>
        <h3 className="t-h2" style={{ marginBottom: 12 }}>
          {tool === 'dischi' ? 'Calcolatore dischi' : 'Massimale (1RM)'}
        </h3>
        {tool === 'dischi' && <PlateCalc initial={firstWork} />}
        {tool === '1rm' && <OneRmCalc weight={log.sets.find((x) => x.done && x.type !== 'warmup')?.weight ?? prevWork[0]?.weight} reps={log.sets.find((x) => x.done && x.type !== 'warmup')?.reps ?? prevWork[0]?.reps} />}
      </Sheet>
    </div>
  );
}

function useField(value: number | null | undefined, toText: (v: number | null | undefined) => string) {
  const [t, setT] = useState(toText(value));
  const dirty = useRef(false);
  const focus = useRef(false);
  useEffect(() => {
    if (!focus.current && !dirty.current) setT(toText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return { t, setT, dirty, focus };
}

const parse = (t: string, int = false) => {
  const x = t.replace(',', '.').trim();
  if (!x) return null;
  const n = Number(x);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return int ? Math.round(n) : Math.round(n * 100) / 100;
};

function SetRow({
  index,
  set,
  log,
  label,
  prevSet,
  prs,
  onType,
  onChange,
  onToggle,
}: {
  index: number;
  set: SetLog;
  log: ExerciseLog;
  label: string;
  prevSet?: SetLog;
  prs: PRKind[];
  onType: () => void;
  onChange: (p: Partial<SetLog>) => void;
  onToggle: (p: Partial<SetLog>) => void;
}) {
  const fmtW = (v: number | null | undefined) => (v == null ? '' : String(toUnit(v)).replace('.', ','));
  const W = useField(set.weight, fmtW);
  const R = useField(set.reps, (v) => (v == null ? '' : String(v)));
  const takeDirty = (): Partial<SetLog> => {
    const patch: Partial<SetLog> = {};
    if (W.dirty.current) {
      const v = parse(W.t);
      if (v !== undefined) patch.weight = v == null ? null : fromUnit(v);
      W.dirty.current = false;
    }
    if (R.dirty.current) {
      const v = parse(R.t, true);
      if (v !== undefined) patch.reps = v;
      R.dirty.current = false;
    }
    return patch;
  };
  const fillFromPrev = (p: Partial<SetLog>): Partial<SetLog> => {
    const out = { ...p };
    if (set.weight == null && out.weight == null && prevSet?.weight != null && !W.t) out.weight = prevSet.weight;
    if (set.reps == null && out.reps == null && prevSet?.reps != null && !R.t) out.reps = prevSet.reps;
    return out;
  };
  const blur = (F: typeof W, int: boolean, reset: () => void) => {
    F.focus.current = false;
    if (!F.dirty.current) return;
    if (parse(F.t, int) === undefined) {
      F.dirty.current = false;
      return reset();
    }
    const p = takeDirty();
    if (Object.keys(p).length) onChange(p);
  };
  const typeClass = set.type ? ` t-${set.type}` : '';
  return (
    <div className={`set-r${set.done ? ' done' : ''}`}>
      <button className={`idx${typeClass}`} style={{ border: 0, background: 'none', height: 44, padding: 0 }} aria-label={`Serie ${index + 1}: tipo ${set.type ? TYPE_LABEL[set.type] : 'normale'}, tocca per cambiare`} onClick={onType}>
        {label}
        {set.rpe ? <span className="t-xs c3" style={{ display: 'block', fontWeight: 600, fontSize: 10 }}>@{num(set.rpe, 1)}</span> : null}
      </button>
      <span className="prev">
        {prs.length ? (
          <span className="c-accent" style={{ fontWeight: 750 }} aria-label={`Record: ${prs.map((k) => PR_LABEL[k]).join(', ')}`}>
            <Medal size={13} style={{ verticalAlign: '-2px' }} /> PR
          </span>
        ) : prevSet ? (
          log.unit === 'sec' ? `${prevSet.reps}s` : `${formatKg(toUnit(prevSet.weight ?? 0))}×${prevSet.reps}`
        ) : (
          '—'
        )}
      </span>
      <input
        className="set-in"
        inputMode="decimal"
        aria-label={`Carico serie ${index + 1} in ${unitLabel()}`}
        placeholder={prevSet?.weight != null ? formatKg(toUnit(prevSet.weight)) : '0'}
        value={W.t}
        onFocus={() => (W.focus.current = true)}
        onChange={(e) => {
          W.dirty.current = true;
          W.setT(e.target.value);
        }}
        onBlur={() => blur(W, false, () => W.setT(fmtW(set.weight)))}
      />
      <input
        className="set-in"
        inputMode="numeric"
        aria-label={`${log.unit === 'sec' ? 'Secondi' : 'Ripetizioni'} serie ${index + 1}`}
        placeholder={prevSet?.reps != null ? `${prevSet.reps}${log.unit === 'sec' ? 's' : ''}` : `${log.repsMin}–${log.repsMax}`}
        value={R.t}
        onFocus={() => (R.focus.current = true)}
        onChange={(e) => {
          R.dirty.current = true;
          R.setT(e.target.value);
        }}
        onBlur={() => blur(R, true, () => R.setT(set.reps == null ? '' : String(set.reps)))}
      />
      <button
        className={`check${set.done ? ' on' : ''}`}
        aria-pressed={set.done}
        aria-label={set.done ? `Serie ${index + 1} completata: tocca per modificare` : `Segna serie ${index + 1} come completata`}
        onClick={() => onToggle(set.done ? takeDirty() : fillFromPrev(takeDirty()))}
      >
        <Check size={22} strokeWidth={3} />
      </button>
    </div>
  );
}

function CardioRow({ index, set, onChange, onToggle }: { index: number; set: SetLog; onChange: (p: Partial<SetLog>) => void; onToggle: (p: Partial<SetLog>) => void }) {
  const M = useField(set.reps, (v) => (v == null ? '' : String(v)));
  const K = useField(set.distanceKm, (v) => (v == null ? '' : String(v).replace('.', ',')));
  const C = useField(set.kcal, (v) => (v == null ? '' : String(v)));
  const take = (): Partial<SetLog> => {
    const p: Partial<SetLog> = {};
    if (M.dirty.current) {
      const v = parse(M.t, true);
      if (v !== undefined) p.reps = v;
      M.dirty.current = false;
    }
    if (K.dirty.current) {
      const v = parse(K.t);
      if (v !== undefined) p.distanceKm = v;
      K.dirty.current = false;
    }
    if (C.dirty.current) {
      const v = parse(C.t, true);
      if (v !== undefined) p.kcal = v;
      C.dirty.current = false;
    }
    return p;
  };
  const field = (F: typeof M, label: string, mode: 'numeric' | 'decimal') => (
    <input
      className="set-in"
      inputMode={mode}
      aria-label={`${label} ${index + 1}`}
      value={F.t}
      onFocus={() => (F.focus.current = true)}
      onChange={(e) => {
        F.dirty.current = true;
        F.setT(e.target.value);
      }}
      onBlur={() => {
        F.focus.current = false;
        const p = take();
        if (Object.keys(p).length) onChange(p);
      }}
    />
  );
  return (
    <div className={`set-r${set.done ? ' done' : ''}`} style={{ gridTemplateColumns: '32px repeat(3, minmax(0, 1fr)) 46px' }}>
      <span className="idx">{index + 1}</span>
      {field(M, 'Minuti', 'numeric')}
      {field(K, 'Chilometri', 'decimal')}
      {field(C, 'Calorie', 'numeric')}
      <button className={`check${set.done ? ' on' : ''}`} aria-pressed={set.done} aria-label={set.done ? `Blocco ${index + 1} completato` : `Segna blocco ${index + 1} come completato`} onClick={() => onToggle(take())}>
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

/** Items of the routine/day as performed in this session (warm-ups excluded from the set count). */
function sessionItems(s: Session): RoutineItem[] {
  return s.exercises.map((l) => ({
    id: l.slotId || uid(),
    exerciseId: l.exerciseId,
    sets: Math.max(1, l.sets.filter((x) => x.type !== 'warmup').length),
    repsMin: l.repsMin,
    repsMax: l.repsMax,
    unit: l.unit,
    perSide: l.perSide,
    ...(l.restSec != null ? { restSec: l.restSec } : {}),
    ...(l.group ? { group: l.group } : {}),
  }));
}
const signature = (items: { exerciseId: string; sets: number; group?: string }[]) => items.map((i) => `${i.exerciseId}:${i.sets}:${i.group ?? ''}`).join('|');

function FinishSheet({ open, onClose, session }: { open: boolean; onClose: () => void; session: Session }) {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const [rpe, setRpe] = useState<number | null>(session.rpe ?? null);
  const [note, setNote] = useState(session.note ?? '');
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const pending = session.exercises.reduce((a, l) => a + l.sets.filter((x) => !x.done).length, 0);
  const doneCount = session.exercises.reduce((a, l) => a + l.sets.filter((x) => x.done).length, 0);
  const items = sessionItems(session);
  const isPlan = !session.dayId.startsWith('r:') && session.dayId !== 'free';
  const routine = settings.routines.find((r) => `r:${r.id}` === session.dayId);
  const original = isPlan ? dayAsItems(session.dayId as DayId, settings) : routine?.items ?? [];
  const changed = session.dayId !== 'free' && signature(items) !== signature(original.map((i) => ({ ...i, sets: i.sets })));
  const calibrated = isPlan && session.calibration;
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
        {(session.dayId === 'free' || changed) && items.length > 0 && (
          <div className="card inset col" style={{ gap: 10 }}>
            <div className="row">
              <span className="grow t-sm" style={{ fontWeight: 650 }}>
                {session.dayId === 'free' ? 'Salva come nuova scheda' : `Aggiorna “${sessionMeta(session, settings).name}” con le modifiche di oggi`}
              </span>
              <Switch checked={saveTemplate} onChange={setSaveTemplate} label="Salva le modifiche nella scheda" />
            </div>
            {saveTemplate && session.dayId === 'free' && <input className="input" placeholder="Nome della scheda" value={templateName} onChange={(e) => setTemplateName(e.target.value)} aria-label="Nome della nuova scheda" />}
            {saveTemplate && calibrated && <p className="t-xs c3" style={{ margin: 0 }}>Nota: oggi la calibrazione riduceva le serie; il numero di serie salvato sarà quello eseguito.</p>}
          </div>
        )}
        <button
          className="btn primary lg block"
          disabled={doneCount === 0}
          onClick={async () => {
            timer.stop();
            if (saveTemplate && items.length) {
              if (session.dayId === 'free') {
                const r = { id: uid(), name: templateName.trim() || `Allenamento del ${new Date(session.startedAt).toLocaleDateString('it-IT')}`, accent: ROUTINE_ACCENTS[settings.routines.length % ROUTINE_ACCENTS.length], items, createdAt: Date.now() };
                await update((st) => ({ ...st, routines: [...st.routines, r] }));
              } else if (isPlan) await update((st) => ({ ...st, dayEdits: { ...st.dayEdits, [session.dayId]: items } }));
              else if (routine) await update((st) => ({ ...st, routines: st.routines.map((r) => (r.id === routine.id ? { ...r, items } : r)) }));
            }
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

