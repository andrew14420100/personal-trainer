import { useEffect, useState } from 'react';
import { Check, Trash2, Trophy } from 'lucide-react';
import { useData } from '../app/store';
import { DAY_BY_ID } from '../data/program';
import { EXERCISE_BY_ID } from '../data/exercises';
import { deleteSession, saveSession, type Session, type SetLog } from '../lib/db';
import { doneSets, exerciseHistory, logVolume, previousSameDay, sessionDurationMin, sessionReps, sessionSets, sessionVolume } from '../lib/stats';
import { fullDate, num, time, volume } from '../lib/format';
import { navigate } from '../lib/router';
import { Confirm, Empty, NavBar, Notice, Section, toast } from './kit';
import { ExerciseThumb } from './Plan';

function Delta({ cur, prev }: { cur: number; prev: number | null }) {
  if (prev == null || prev === 0) return <div className="s">nessun confronto</div>;
  const d = cur - prev;
  const pct = Math.round((d / prev) * 100);
  return (
    <div className="s" style={{ color: d > 0 ? 'var(--ok)' : d < 0 ? 'var(--bad)' : undefined }}>
      {d > 0 ? '+' : ''}
      {pct}% vs precedente
    </div>
  );
}

export function SessionView({ id, justFinished }: { id: string; justFinished: boolean }) {
  const { sessions, ready } = useData();
  const s = sessions.find((x) => x.id === id);
  if (!ready) return null;
  if (!s || s.status !== 'completed')
    return (
      <main className="page">
        <NavBar fallback="/progressi" />
        <Empty icon={<Trash2 size={22} />} title="Sessione non trovata">
          Potrebbe essere stata eliminata.
        </Empty>
      </main>
    );
  const day = DAY_BY_ID[s.dayId];
  const prev = previousSameDay(sessions, s);
  const records = s.exercises
    .map((l) => {
      const h = exerciseHistory(sessions, l.exerciseId).filter((p) => p.date < s.startedAt);
      const best = Math.max(0, ...h.map((p) => p.topWeight));
      const top = Math.max(0, ...doneSets(l).map((x) => x.weight ?? 0));
      return h.length && top > best ? { id: l.exerciseId, top, best } : null;
    })
    .filter(Boolean) as { id: string; top: number; best: number }[];
  return (
    <main className="page" style={{ ['--day' as string]: day.accent }}>
      <NavBar title={justFinished ? 'Allenamento salvato' : 'Riepilogo'} fallback="/progressi" />
      <div className="t-label" style={{ color: 'var(--day)' }}>
        {fullDate(new Date(s.startedAt))} · {time(s.startedAt)} · {day.code}
      </div>
      <h1 className="t-h1" style={{ marginTop: 4 }}>
        {day.name}
      </h1>
      <p className="t-sm c2" style={{ marginTop: 4 }}>
        {s.calibration ? 'Seduta di calibrazione · ' : ''}
        {s.rpe ? `RPE ${s.rpe}/10` : 'RPE non indicato'}
      </p>
      <div className="stats mt16">
        <div className="stat">
          <div className="t-label">Durata</div>
          <div className="v">{sessionDurationMin(s)} min</div>
          <Delta cur={sessionDurationMin(s)} prev={prev ? sessionDurationMin(prev) : null} />
        </div>
        <div className="stat">
          <div className="t-label">Volume</div>
          <div className="v c-data">{volume(sessionVolume(s))}</div>
          <Delta cur={sessionVolume(s)} prev={prev ? sessionVolume(prev) : null} />
        </div>
        <div className="stat">
          <div className="t-label">Serie</div>
          <div className="v">{sessionSets(s)}</div>
          <Delta cur={sessionSets(s)} prev={prev ? sessionSets(prev) : null} />
        </div>
        <div className="stat">
          <div className="t-label">Ripetizioni</div>
          <div className="v">{sessionReps(s)}</div>
          <Delta cur={sessionReps(s)} prev={prev ? sessionReps(prev) : null} />
        </div>
      </div>
      <p className="t-xs c3 mt8">
        Volume = kg × ripetizioni delle serie completate (esercizi a tempo esclusi). Confronto con la seduta precedente dello stesso giorno
        {prev ? ` (${new Date(prev.startedAt).toLocaleDateString('it-IT')})` : ': non disponibile'}.
      </p>
      {records.length > 0 && (
        <div className="mt12">
          <Notice icon={<Trophy size={17} color="var(--warn)" />}>
            <b>Nuovi massimi di carico:</b> {records.map((r) => `${EXERCISE_BY_ID[r.id].name} ${num(r.top, 2)} kg (prima ${num(r.best, 2)})`).join(' · ')}
          </Notice>
        </div>
      )}
      <SessionEditor session={s} />
      {s.note && (
        <Section title="Note">
          <p className="t-sm c2">{s.note}</p>
        </Section>
      )}
      {justFinished && (
        <button className="btn primary lg block mt24" onClick={() => navigate('/', { replace: true })}>
          <Check size={18} /> Fatto
        </button>
      )}
    </main>
  );
}

function SessionEditor({ session }: { session: Session }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(session);
  const [del, setDel] = useState(false);
  useEffect(() => setDraft(session), [session]);
  const setVal = (ei: number, si: number, patch: Partial<SetLog>) =>
    setDraft((d) => {
      const n = structuredClone(d);
      n.exercises[ei].sets[si] = { ...n.exercises[ei].sets[si], ...patch };
      return n;
    });
  const parse = (t: string) => {
    const x = t.replace(',', '.').trim();
    if (!x) return null;
    const n = Number(x);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  return (
    <Section
      title="Esercizi"
      action={
        edit ? (
          <div className="row" style={{ gap: 14 }}>
            <button
              className="link"
              style={{ color: 'var(--t2)' }}
              onClick={() => {
                setDraft(session);
                setEdit(false);
              }}
            >
              Annulla
            </button>
            <button
              className="link"
              onClick={async () => {
                await saveSession(draft);
                setEdit(false);
                toast('Sessione aggiornata');
              }}
            >
              Salva
            </button>
          </div>
        ) : (
          <button className="link" onClick={() => setEdit(true)}>
            Modifica
          </button>
        )
      }
    >
      <div className="list">
        {draft.exercises.map((l, ei) => {
          const ex = EXERCISE_BY_ID[l.exerciseId];
          const sets = edit ? l.sets : doneSets(l);
          return (
            <div key={l.slotId} style={{ padding: '12px 14px' }}>
              <button className="row" style={{ width: '100%', border: 0, background: 'none', color: 'inherit', padding: 0, textAlign: 'left' }} onClick={() => !edit && navigate(`/esercizio/${l.exerciseId}`)}>
                <ExerciseThumb exerciseId={l.exerciseId} />
                <span className="grow">
                  <span className="ex-name" style={{ display: 'block' }}>
                    {ex.name}
                  </span>
                  <span className="ex-sub">{l.unit === 'sec' ? `${doneSets(l).length} serie` : volume(logVolume(l))}</span>
                </span>
              </button>
              {sets.length ? (
                edit ? (
                  <div className="col mt8" style={{ gap: 6 }}>
                    {sets.map((x, si) => (
                      <div key={si} className="set-r" style={{ gridTemplateColumns: '30px 1fr 1fr 46px' }}>
                        <span className="idx">{si + 1}</span>
                        <input className="set-in" inputMode="decimal" aria-label={`Kg serie ${si + 1}`} defaultValue={x.weight ?? ''} onBlur={(e) => setVal(ei, si, { weight: parse(e.target.value) })} />
                        <input className="set-in" inputMode="numeric" aria-label={`Ripetizioni serie ${si + 1}`} defaultValue={x.reps ?? ''} onBlur={(e) => setVal(ei, si, { reps: parse(e.target.value) })} />
                        <button className={`check${x.done ? ' on' : ''}`} aria-pressed={x.done} aria-label={`Serie ${si + 1} completata`} onClick={() => setVal(ei, si, { done: !x.done })}>
                          <Check size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chips mt8">
                    {sets.map((x, si) => (
                      <span key={si} className="chip" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {l.unit === 'sec' ? `${x.reps} s` : `${x.weight == null ? '—' : num(x.weight, 2)} kg × ${x.reps}`}
                      </span>
                    ))}
                  </div>
                )
              ) : (
                <div className="t-sm c3 mt8">Nessuna serie completata</div>
              )}
              {(l.technique || l.rir != null || l.note) && !edit && (
                <div className="t-xs c2 mt8">{[l.technique && `Tecnica: ${l.technique}`, l.rir != null && `RIR ${l.rir === 3 ? '3+' : l.rir}`, l.note].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          );
        })}
      </div>
      {edit && (
        <button className="btn danger block mt16" onClick={() => setDel(true)}>
          <Trash2 size={17} /> Elimina sessione
        </button>
      )}
      <Confirm
        open={del}
        onClose={() => setDel(false)}
        title="Eliminare la sessione?"
        body="La sessione e tutte le sue serie verranno rimosse dallo storico e dai grafici."
        confirmLabel="Elimina definitivamente"
        danger
        onConfirm={async () => {
          await deleteSession(session.id);
          toast('Sessione eliminata');
          navigate('/progressi', { replace: true });
        }}
      />
    </Section>
  );
}
