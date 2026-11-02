import { useEffect, useState } from 'react';
import { Check, Clock, Flame, Layers, Repeat, Trophy, Trash2 } from 'lucide-react';
import { useData } from '../app/store';
import { DAY_BY_ID } from '../data/program';
import { EXERCISE_BY_ID } from '../data/exercises';
import { deleteSession, saveSession, type Session, type SetLog } from '../lib/db';
import { doneSets, exerciseHistory, logVolume, previousSameDay, sessionDurationMin, sessionReps, sessionSets, sessionVolume } from '../lib/stats';
import { fullDate, num, time, volume } from '../lib/format';
import { navigate } from '../lib/router';
import { ConfirmSheet, Notice, Section, TopBar, toast } from '../components/ui';
import { NotFound } from './Program';

function Delta({ cur, prev, unit = '' }: { cur: number; prev: number | null; unit?: string }) {
  if (prev == null || prev === 0) return <span className="stat-sub muted">nessun confronto</span>;
  const d = cur - prev;
  const pct = (d / prev) * 100;
  return (
    <span className={`stat-sub ${d >= 0 ? 'up' : 'down'}`}>
      {d >= 0 ? '+' : ''}
      {num(d, 1)}
      {unit} ({d >= 0 ? '+' : ''}
      {num(pct, 0)}%) vs precedente
    </span>
  );
}

/** End-of-workout summary (also used to review any completed session). */
export function Summary({ id }: { id: string }) {
  const { sessions, ready } = useData();
  const s = sessions.find((x) => x.id === id);
  if (!ready) return null;
  if (!s) return <NotFound />;
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
    <main className="screen" style={{ ['--accent' as string]: day.accent }}>
      <TopBar fallback="/progressi" title="Riepilogo" />
      <div className="eyebrow" style={{ color: 'var(--accent)' }}>
        {fullDate(new Date(s.startedAt))} · {time(s.startedAt)}
      </div>
      <h1 className="display h1" style={{ marginTop: 6 }}>
        {day.name}
      </h1>
      <p className="text-2" style={{ marginTop: 6 }}>
        {s.calibration ? 'Seduta di calibrazione · ' : ''}
        {s.rpe ? `RPE ${s.rpe}/10` : 'RPE non indicato'}
      </p>

      <div className="stat-grid" style={{ marginTop: 18 }}>
        <div className="stat">
          <div className="stat-label">
            <Clock size={13} /> Durata
          </div>
          <div className="stat-value">{sessionDurationMin(s)} min</div>
          <Delta cur={sessionDurationMin(s)} prev={prev ? sessionDurationMin(prev) : null} unit=" min" />
        </div>
        <div className="stat">
          <div className="stat-label">
            <Flame size={13} /> Volume
          </div>
          <div className="stat-value" style={{ color: 'var(--data)' }}>
            {volume(sessionVolume(s))}
          </div>
          <Delta cur={sessionVolume(s)} prev={prev ? sessionVolume(prev) : null} unit=" kg" />
        </div>
        <div className="stat">
          <div className="stat-label">
            <Layers size={13} /> Serie
          </div>
          <div className="stat-value">{sessionSets(s)}</div>
          <Delta cur={sessionSets(s)} prev={prev ? sessionSets(prev) : null} />
        </div>
        <div className="stat">
          <div className="stat-label">
            <Repeat size={13} /> Ripetizioni
          </div>
          <div className="stat-value">{sessionReps(s)}</div>
          <Delta cur={sessionReps(s)} prev={prev ? sessionReps(prev) : null} />
        </div>
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>
        Volume = kg × ripetizioni delle serie completate (esercizi a tempo esclusi). Confronto con la seduta {day.name} precedente
        {prev ? ` del ${new Date(prev.startedAt).toLocaleDateString('it-IT')}` : ': non disponibile'}.
      </p>

      {records.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <Notice kind="ok">
            <b>
              <Trophy size={14} style={{ verticalAlign: '-2px' }} /> Nuovi massimi di carico:
            </b>{' '}
            {records.map((r) => `${EXERCISE_BY_ID[r.id].name} ${num(r.top, 2)} kg (prima ${num(r.best, 2)})`).join(' · ')}
          </Notice>
        </div>
      )}

      <SessionEditor session={s} />

      {s.note && (
        <Section title="Note">
          <p className="text-2">{s.note}</p>
        </Section>
      )}

      <div className="stack" style={{ marginTop: 24 }}>
        <button className="btn primary block" onClick={() => navigate('/', { replace: true })}>
          <Check size={18} /> Fatto
        </button>
      </div>
    </main>
  );
}

/** Per-exercise list; sets can be corrected after the workout. */
export function SessionEditor({ session }: { session: Session }) {
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
      title="Dettaglio esercizi"
      action={
        edit ? (
          <div className="row">
            <button
              className="link"
              style={{ color: 'var(--text-2)' }}
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
      <div className="stack" style={{ gap: 10 }}>
        {draft.exercises.map((l, ei) => {
          const ex = EXERCISE_BY_ID[l.exerciseId];
          const sets = edit ? l.sets : doneSets(l);
          return (
            <div key={l.slotId} className="card tight flat">
              <div className="row between">
                <button className="ex-name tap-row" style={{ width: 'auto' }} onClick={() => navigate(`/esercizio/${l.exerciseId}`)}>
                  {ex.name}
                </button>
                <span className="small muted num">{l.unit === 'sec' ? '' : volume(logVolume(l))}</span>
              </div>
              {sets.length ? (
                <div className={edit ? 'stack' : 'row wrap'} style={{ gap: 6, marginTop: 8 }}>
                  {sets.map((x, si) =>
                    edit ? (
                      <div key={si} className="row" style={{ gap: 6 }}>
                        <span className="small muted" style={{ width: 20 }}>
                          {si + 1}
                        </span>
                        <input
                          className="mini-input"
                          style={{ minHeight: 42, fontSize: 18 }}
                          inputMode="decimal"
                          aria-label={`Kg serie ${si + 1}`}
                          defaultValue={x.weight ?? ''}
                          onBlur={(e) => setVal(ei, si, { weight: parse(e.target.value) })}
                        />
                        <input
                          className="mini-input"
                          style={{ minHeight: 42, fontSize: 18 }}
                          inputMode="numeric"
                          aria-label={`Ripetizioni serie ${si + 1}`}
                          defaultValue={x.reps ?? ''}
                          onBlur={(e) => setVal(ei, si, { reps: parse(e.target.value) })}
                        />
                        <button className={`set-check${x.done ? ' on' : ''}`} style={{ width: 42, height: 42 }} aria-pressed={x.done} aria-label={`Serie ${si + 1} completata`} onClick={() => setVal(ei, si, { done: !x.done })}>
                          <Check size={18} />
                        </button>
                      </div>
                    ) : (
                      <span key={si} className="chip num">
                        {l.unit === 'sec' ? `${x.reps} s` : `${x.weight == null ? '—' : num(x.weight, 2)} kg × ${x.reps}`}
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <div className="small muted" style={{ marginTop: 6 }}>
                  Nessuna serie completata
                </div>
              )}
              {(l.technique || l.rir != null || l.note) && !edit && (
                <div className="small text-2" style={{ marginTop: 8 }}>
                  {[l.technique && `Tecnica: ${l.technique}`, l.rir != null && `RIR ${l.rir === 3 ? '3+' : l.rir}`, l.note].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {edit && (
        <button className="btn danger block" style={{ marginTop: 14 }} onClick={() => setDel(true)}>
          <Trash2 size={18} /> Elimina sessione
        </button>
      )}
      <ConfirmSheet
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
