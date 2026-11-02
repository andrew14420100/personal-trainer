import { ArrowRight, Clock, Dumbbell, Activity, AlertTriangle } from 'lucide-react';
import { useData } from '../app/store';
import { DAYS, DAY_BY_ID, SLOTS } from '../data/program';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { VIDEOS_BY_EXERCISE, youtubeThumb } from '../data/videos';
import { effectiveDay, estimateMinutes, formatPrescription, type EffectiveSlot } from '../lib/plan';
import { lastLog, doneSets } from '../lib/stats';
import { navigate } from '../lib/router';
import { startSession } from '../lib/workout';
import { Notice, TopBar } from '../components/ui';
import { photoCredit } from '../data/media';
import type { DayId } from '../data/types';
import type { ExerciseLog } from '../lib/db';
import { kg } from '../lib/format';

export function Program() {
  const { settings, calibration } = useData();
  return (
    <main className="screen">
      <div className="brandbar">
        <div className="brand">
          FORMA<b>·</b>LAB
        </div>
      </div>
      <div className="eyebrow" style={{ marginTop: 12 }}>
        Scheda personale · 4 giorni
      </div>
      <h1 className="display h1" style={{ marginTop: 6 }}>
        La scheda
      </h1>
      <p className="text-2" style={{ marginTop: 8 }}>
        {SLOTS.length} posizioni di esercizio, {EXERCISES.length} esercizi distinti (il Calf Raise compare martedì e venerdì).
      </p>
      <div className="stack" style={{ marginTop: 18, gap: 12 }}>
        {DAYS.map((d) => {
          const sl = effectiveDay(d.id, settings, calibration);
          return (
            <button key={d.id} className="day-card" style={{ ['--accent' as string]: d.accent, minHeight: 170 }} onClick={() => navigate(`/giorno/${d.id}`)}>
              <img src={d.photo} alt="" style={{ objectPosition: d.photoPosition }} loading="lazy" />
              <span className="bar" />
              <div className="grow">
                <div className="eyebrow" style={{ color: 'var(--accent)' }}>
                  {d.weekdayLabel}
                </div>
                <div className="display h2" style={{ marginTop: 4 }}>
                  {d.name}
                </div>
                <div className="small text-2" style={{ marginTop: 6 }}>
                  {d.title}
                </div>
                <div className="small text-2" style={{ marginTop: 8 }}>
                  {sl.length} esercizi · {sl.reduce((a, s) => a + s.todaySets, 0)} serie · ~{estimateMinutes(sl)} min
                </div>
              </div>
              <ArrowRight size={22} />
            </button>
          );
        })}
      </div>
    </main>
  );
}

export function DayScreen({ dayId }: { dayId: DayId }) {
  const { settings, calibration, sessions, active } = useData();
  const day = DAY_BY_ID[dayId];
  if (!day) return <NotFound />;
  const slots = effectiveDay(dayId, settings, calibration);
  const begin = async () => {
    if (!active) await startSession(dayId, settings, calibration, sessions);
    navigate('/allenamento');
  };
  return (
    <main className="screen flush-top" style={{ ['--accent' as string]: day.accent }}>
      <TopBar over fallback="/scheda" />
      <article className="hero day">
        <img className="hero-img" src={day.photo} alt="" style={{ objectPosition: day.photoPosition }} />
        <span className="credit" style={{ top: 'calc(var(--safe-t) + 60px)' }}>
          {photoCredit(day.photo)}
        </span>
        <div className="eyebrow" style={{ color: 'var(--accent)' }}>
          {day.weekdayLabel}
        </div>
        <h1 className="display h1" style={{ marginTop: 6 }}>
          {day.name}
        </h1>
        <p className="text-2" style={{ marginTop: 6 }}>
          {day.title}
        </p>
        <div className="row small text-2" style={{ marginTop: 12, gap: 16 }}>
          <span className="row" style={{ gap: 6 }}>
            <Clock size={16} /> ~{estimateMinutes(slots)} min
          </span>
          <span className="row" style={{ gap: 6 }}>
            <Dumbbell size={16} /> {slots.length} esercizi
          </span>
          <span className="row" style={{ gap: 6 }}>
            <Activity size={16} /> {slots.reduce((a, s) => a + s.todaySets, 0)} serie
          </span>
        </div>
      </article>

      <div style={{ marginTop: 18 }}>
        <button className="btn accent lg block" onClick={begin}>
          {active ? (active.dayId === dayId ? 'Riprendi allenamento' : 'Allenamento in corso') : `Inizia ${day.name}`} <ArrowRight size={20} />
        </button>
        {active && active.dayId !== dayId && (
          <p className="small text-2" style={{ marginTop: 8 }}>
            Hai già un allenamento in corso ({DAY_BY_ID[active.dayId].name}): concludilo o annullalo prima di iniziarne un altro.
          </p>
        )}
      </div>

      {calibration && (
        <div style={{ marginTop: 14 }}>
          <Notice kind="info">Calibrazione attiva: le serie mostrate sono ridotte. Tra parentesi le serie previste dopo l’adattamento.</Notice>
        </div>
      )}

      <div className="stack" style={{ marginTop: 18, gap: 10 }}>
        {slots.map((s) => (
          <SlotRow key={s.id} slot={s} last={lastLog(sessions, s.exerciseId)?.log ?? null} />
        ))}
      </div>
    </main>
  );
}

function SlotRow({ slot, last }: { slot: EffectiveSlot; last: ExerciseLog | null }) {
  const ex = EXERCISE_BY_ID[slot.exerciseId];
  const vid = VIDEOS_BY_EXERCISE[slot.exerciseId]?.demo;
  const sets = last ? doneSets(last) : [];
  const topW = sets.length ? Math.max(...sets.map((x) => x.weight ?? 0)) : null;
  return (
    <button className="ex-row" onClick={() => navigate(`/esercizio/${slot.exerciseId}?slot=${slot.id}`)}>
      <div className="ex-thumb">
        {vid && <img src={youtubeThumb(vid.youtubeId)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
        <span className="n">{slot.order}</span>
      </div>
      <div className="grow">
        <div className="ex-name">{ex.name}</div>
        <div className="ex-meta">
          {formatPrescription(slot, slot.todaySets)}
          {slot.todaySets !== slot.plannedSets && <span className="muted"> ({slot.plannedSets})</span>}
          {' · '}rec. {slot.restSec}s
        </div>
        <div className="ex-meta muted">
          {topW != null && ex.tracking === 'reps' ? `Ultimo carico: ${kg(topW)}` : ex.primary.join(', ')}
          {ex.variantNote && (
            <span style={{ color: 'var(--progress)' }}>
              {' '}
              · <AlertTriangle size={12} style={{ verticalAlign: '-1px' }} /> variante
            </span>
          )}
        </div>
      </div>
      <ArrowRight size={18} className="muted" />
    </button>
  );
}

export function NotFound() {
  return (
    <main className="screen">
      <TopBar />
      <h1 className="display h2">Pagina non trovata</h1>
      <button className="btn primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
        Torna a Oggi
      </button>
    </main>
  );
}
