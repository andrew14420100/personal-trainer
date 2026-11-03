import { Calculator, CheckCircle2, Folder, ChevronRight, Clock, Dumbbell, Layers, Library, Pencil, Play, PlayCircle, Plus, Timer } from 'lucide-react';
import { allExercises } from '../data/catalog';
import { FreeStartButton } from './Routines';
import { sessionMeta } from '../lib/meta';
import { useData } from '../app/store';
import { DAYS, DAY_BY_ID } from '../data/program';
import { EXERCISE_BY_ID } from '../data/exercises';
import { EXERCISE_MUSCLES, MUSCLE_REGION, aggregate } from '../data/muscles';
import { REAL_VIDEOS } from '../data/realVideos';
import { youtubeThumb } from '../data/videos';
import { photoCredit } from '../data/media';
import { effectiveDay, estimateMinutes, formatPrescription, type EffectiveSlot } from '../lib/plan';
import { lastLog, completed, weekStart } from '../lib/stats';
import { kg } from '../lib/format';
import { navigate } from '../lib/router';
import { startSession } from '../lib/workout';
import { Anatomy } from '../components/Anatomy';
import type { DayId } from '../data/types';
import { AppBar, Empty, NavBar, Notice, Section } from './kit';

export function Plan() {
  const { settings, calibration, sessions } = useData();
  const wk = weekStart(Date.now());
  const doneThisWeek = new Set(completed(sessions).filter((s) => weekStart(s.startedAt) === wk).map((s) => s.dayId));
  const total = DAYS.reduce((a, d) => a + effectiveDay(d.id, settings, calibration).length, 0);
  return (
    <main className="page">
      <AppBar title="Allenamenti" />
      <p className="t-sm c2" style={{ marginTop: -4 }}>
        Scheda di 4 giorni · {total} posizioni · settimana da lunedì
      </p>
      <div className="col mt16">
        {DAYS.map((d) => {
          const slots = effectiveDay(d.id, settings, calibration);
          const m = aggregate(slots.map((s) => s.exerciseId));
          const done = doneThisWeek.has(d.id);
          return (
            <button key={d.id} className="plan-card" style={{ ['--day' as string]: d.accent }} onClick={() => navigate(`/giorno/${d.id}`)} aria-label={`${d.weekdayLabel}: ${d.name}`}>
              <span className="thumb">
                <img src={d.photo} alt="" loading="lazy" style={{ objectPosition: d.photoPosition }} />
                <span className="n">{d.number}</span>
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="t-label" style={{ color: 'var(--day)' }}>
                  {d.weekdayLabel} · {d.code}
                </span>
                <span className="t-h3" style={{ display: 'block', marginTop: 4 }}>
                  {d.name}
                </span>
                <span className="t-xs c2" style={{ display: 'block', marginTop: 4 }}>
                  {[...new Set(m.primary.map((x) => MUSCLE_REGION[x]))].join(' · ')}
                </span>
                <span className="row t-xs c3 mt8" style={{ gap: 12 }}>
                  <span className="row" style={{ gap: 4 }}>
                    <Dumbbell size={13} /> {slots.length}
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    <Clock size={13} /> ~{estimateMinutes(slots)}′
                  </span>
                  {done && (
                    <span className="row c-ok" style={{ gap: 4 }}>
                      <CheckCircle2 size={13} /> fatto
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <Section title="Le mie schede" action={<button className="link" onClick={() => navigate('/routine/nuova')}>+ Nuova</button>}>
        {settings.routines.length ? (
          <div className="col" style={{ gap: 12 }}>
            {[...new Set(settings.routines.map((r) => r.folder || ''))].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b))).map((f) => (
              <div key={f || '—'}>
                {(f || settings.routines.some((r) => r.folder)) && (
                  <div className="t-label row" style={{ marginBottom: 6, gap: 6 }}>
                    <Folder size={13} /> {f || 'Senza cartella'}
                  </div>
                )}
                <div className="list">
                  {settings.routines
                    .filter((r) => (r.folder || '') === f)
                    .map((r) => (
                      <button key={r.id} className="list-row" style={{ ['--day' as string]: r.accent }} onClick={() => navigate(`/routine/${r.id}`)}>
                        <span className="dot" />
                        <span className="grow">
                          <span className="t-h3" style={{ display: 'block' }}>
                            {r.name}
                          </span>
                          <span className="t-xs c3">
                            {r.items.length} esercizi · {r.items.reduce((a, i) => a + i.sets, 0)} serie
                          </span>
                        </span>
                        <ChevronRight size={18} className="c3" />
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button className="card tap" onClick={() => navigate('/routine/nuova')}>
            <div className="row">
              <Plus size={20} className="c-accent" />
              <span className="grow">
                <span className="t-h3" style={{ display: 'block' }}>
                  Crea una scheda personale
                </span>
                <span className="t-xs c3">Per giorni extra, in vacanza o per provare esercizi nuovi</span>
              </span>
            </div>
          </button>
        )}
      </Section>

      <Section title="Altro">
        <div className="list">
          <FreeStartButton />
          <button className="list-row" onClick={() => navigate('/libreria')}>
            <Library size={20} className="c2" />
            <span className="grow">
              <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                Libreria esercizi
              </span>
              <span className="t-xs c3">{allExercises().length} esercizi, cerca per nome o muscolo, crea i tuoi</span>
            </span>
            <ChevronRight size={18} className="c3" />
          </button>
          <button className="list-row" onClick={() => navigate('/strumenti')}>
            <Calculator size={20} className="c2" />
            <span className="grow">
              <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                Strumenti
              </span>
              <span className="t-xs c3">Calcolatore dischi, massimale (1RM), percentuali</span>
            </span>
            <ChevronRight size={18} className="c3" />
          </button>
        </div>
      </Section>
      <p className="t-xs c3 mt16">Foto: {[...new Set(DAYS.map((d) => photoCredit(d.photo)))].join(' · ')}</p>
    </main>
  );
}

export function ExerciseThumb({ exerciseId, n }: { exerciseId: string; n?: number }) {
  const v = REAL_VIDEOS[exerciseId]?.[0];
  return (
    <span className="ex-thumb" aria-hidden>
      {v && <img src={youtubeThumb(v.youtubeId)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />}
      {n != null && <span className="n">{n}</span>}
    </span>
  );
}

export function ExerciseRow({ slot, n, onClick, right }: { slot: EffectiveSlot; n: number; onClick: () => void; right?: React.ReactNode }) {
  const ex = EXERCISE_BY_ID[slot.exerciseId];
  return (
    <button className="ex-row" onClick={onClick} aria-label={`${n}. ${ex.name}`}>
      <ExerciseThumb exerciseId={ex.id} n={n} />
      <span style={{ minWidth: 0 }}>
        <span className="ex-group" style={{ display: 'block' }}>
          {EXERCISE_MUSCLES[ex.id]?.group}
        </span>
        <span className="ex-name" style={{ display: 'block' }}>
          {ex.name}
        </span>
        <span className="ex-sub" style={{ display: 'block' }}>
          {formatPrescription(slot, slot.todaySets)} · rec. {slot.restSec}s
        </span>
      </span>
      {right ?? <ChevronRight size={18} className="c3" />}
    </button>
  );
}

export function DayView({ dayId }: { dayId: DayId }) {
  const { settings, calibration, sessions, active } = useData();
  const day = DAY_BY_ID[dayId];
  if (!day)
    return (
      <main className="page">
        <NavBar fallback="/allenamenti" />
        <Empty icon={<Dumbbell size={22} />} title="Allenamento non trovato" />
      </main>
    );
  const slots = effectiveDay(dayId, settings, calibration);
  const m = aggregate(slots.map((s) => s.exerciseId));
  const sets = slots.reduce((a, s) => a + s.todaySets, 0);
  const wk = weekStart(Date.now());
  const doneWeek = completed(sessions).filter((s) => s.dayId === dayId && weekStart(s.startedAt) === wk);
  const last = completed(sessions).filter((s) => s.dayId === dayId).pop();
  const begin = async () => {
    if (!active) await startSession(dayId, settings, calibration, sessions);
    navigate('/allenamento');
  };
  return (
    <main className="page" style={{ ['--day' as string]: day.accent }}>
      <NavBar title={day.code} fallback="/allenamenti" />
      <article className="hero" style={{ minHeight: 260 }}>
        <img src={day.photo} alt="" style={{ objectPosition: day.photoPosition }} />
        <span className="credit">{photoCredit(day.photo)}</span>
        <span className="chip glass">
          <span className="dot" /> {day.weekdayLabel} · Giorno {day.number} · {day.code}
        </span>
        <h1 className="t-display mt8" style={{ fontSize: 26 }}>
          {day.name}
        </h1>
        <p className="t-sm c2" style={{ marginTop: 4 }}>
          {day.title}
        </p>
        <div className="hero-meta">
          <span>
            <Clock size={15} /> ~{estimateMinutes(slots)} min
          </span>
          <span>
            <Dumbbell size={15} /> {slots.length} esercizi
          </span>
          <span>
            <Layers size={15} /> {sets} serie
          </span>
        </div>
      </article>

      <div className="row mt12">
        {active ? (
          <button className="btn primary lg grow" onClick={() => navigate('/allenamento')}>
            <PlayCircle size={20} /> {active.dayId === dayId ? 'Riprendi allenamento' : `In corso: ${sessionMeta(active, settings).name}`}
          </button>
        ) : (
          <button className="btn primary lg grow" onClick={begin}>
            <Play size={18} fill="currentColor" /> Inizia allenamento
          </button>
        )}
      </div>
      <div className="row t-sm c2 mt8" style={{ gap: 6 }}>
        {doneWeek.length ? (
          <>
            <CheckCircle2 size={15} color="var(--ok)" /> Completato questa settimana
          </>
        ) : last ? (
          <>Ultima volta: {new Date(last.startedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</>
        ) : (
          <>Non ancora eseguito</>
        )}
      </div>
      {calibration && (
        <div className="mt12">
          <Notice>Calibrazione attiva: gli esercizi da 3 serie si fanno con 2 serie fino a 4 sedute completate.</Notice>
        </div>
      )}

      <Section title="Muscoli coinvolti">
        <div className="card">
          <div className="chips" style={{ marginBottom: 12 }}>
            {day.focus.map((f) => (
              <span key={f} className="chip">
                {f}
              </span>
            ))}
          </div>
          <Anatomy primary={m.primary} secondary={m.secondary} />
        </div>
      </Section>

      <Section title={`Esercizi (${slots.length})`}>
        <div className="list">
          {slots.map((s, i) => {
            const prev = lastLog(sessions, s.exerciseId);
            const top = prev ? Math.max(...prev.log.sets.filter((x) => x.done).map((x) => x.weight ?? 0)) : null;
            return (
              <ExerciseRow
                key={s.id}
                slot={s}
                n={i + 1}
                onClick={() => navigate(`/esercizio/${s.exerciseId}?slot=${s.id}`)}
                right={
                  top != null && top > 0 ? (
                    <span className="t-xs c3" style={{ textAlign: 'right' }}>
                      ultimo
                      <br />
                      <b className="c2">{kg(top)}</b>
                    </span>
                  ) : undefined
                }
              />
            );
          })}
        </div>
        <button className="btn block mt12" onClick={() => navigate(`/giorno/${dayId}/modifica`)}>
          <Pencil size={16} /> Modifica esercizi, serie e recuperi
        </button>
        {settings.dayEdits[dayId] && (
          <p className="t-xs c3 mt8">
            <Timer size={12} /> Giorno personalizzato: puoi ripristinare l’originale da “Modifica”.
          </p>
        )}
      </Section>
    </main>
  );
}
