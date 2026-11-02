import { ArrowRight, Clapperboard, Clock, Dumbbell, Activity, AlertTriangle } from 'lucide-react';
import { useData } from '../app/store';
import { DAYS, DAY_BY_ID, SLOTS } from '../data/program';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { youtubeThumb } from '../data/videos';
import { REAL_VIDEOS } from '../data/realVideos';
import { EXERCISE_MUSCLES, MUSCLE_LABEL, aggregate } from '../data/muscles';
import { DayCard } from '../components/DayCard';
import { Anatomy } from '../components/Anatomy';
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
        Allenamenti
      </h1>
      <p className="text-2" style={{ marginTop: 8 }}>
        {SLOTS.length} posizioni di esercizio, {EXERCISES.length} esercizi distinti (il Calf Raise compare martedì e venerdì).
      </p>
      <button className="card tap tight row between" style={{ marginTop: 14 }} onClick={() => navigate('/video')}>
        <span className="row" style={{ gap: 10 }}>
          <Clapperboard size={20} color="var(--action)" />
          <span>
            <b>Videoteca tecnica</b>
            <span className="small text-2" style={{ display: 'block' }}>
              Animazioni ✕ / ✓ per tutti gli esercizi, i tuoi video, storyboard
            </span>
          </span>
        </span>
        <ArrowRight size={18} />
      </button>
      <div className="stack" style={{ marginTop: 18, gap: 14 }}>
        {DAYS.map((d) => (
          <DayCard key={d.id} day={d} today={d.weekday === new Date().getDay()} />
        ))}
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
          Giorno {day.number} · {day.weekdayLabel} · {day.code}
        </div>
        <h1 className="display h2" style={{ marginTop: 6, textWrap: 'balance' }}>
          {day.name}
        </h1>
        <p className="text-2" style={{ marginTop: 6 }}>
          {day.title.split(' · ')[0]}
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
          {active ? (active.dayId === dayId ? 'Riprendi allenamento' : 'Allenamento in corso') : 'Inizia allenamento'} <ArrowRight size={20} />
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

      <section className="card tight" style={{ marginTop: 18 }} aria-label="Muscoli allenati">
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <div style={{ width: 150, flex: 'none' }}>
            <Anatomy {...aggregate(slots.map((x) => x.exerciseId))} size="sm" />
          </div>
          <div className="grow">
            <div className="eyebrow">Muscoli allenati</div>
            <div className="small" style={{ marginTop: 6, lineHeight: 1.5 }}>
              <b>Principali:</b> {aggregate(slots.map((x) => x.exerciseId)).primary.map((m) => MUSCLE_LABEL[m]).join(', ')}
            </div>
            <div className="small text-2" style={{ marginTop: 4, lineHeight: 1.5 }}>
              <b>Secondari:</b> {aggregate(slots.map((x) => x.exerciseId)).secondary.map((m) => MUSCLE_LABEL[m]).join(', ') || '—'}
            </div>
          </div>
        </div>
      </section>

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
  const mus = EXERCISE_MUSCLES[slot.exerciseId];
  const vid = REAL_VIDEOS[slot.exerciseId]?.[0];
  const sets = last ? doneSets(last) : [];
  const topW = sets.length ? Math.max(...sets.map((x) => x.weight ?? 0)) : null;
  return (
    <button className="ex-row ex-row-lg" onClick={() => navigate(`/esercizio/${slot.exerciseId}?slot=${slot.id}`)}>
      <div className="ex-thumb tall">
        {vid && <img src={youtubeThumb(vid.youtubeId)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
        <span className="n">{slot.order}</span>
      </div>
      <div className="grow">
        <div className="eyebrow" style={{ color: 'var(--accent)', fontSize: 11 }}>
          {mus.group}
        </div>
        <div className="ex-name" style={{ marginTop: 2 }}>
          {ex.name}
        </div>
        <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
          <span className="chip accent num">{formatPrescription(slot, slot.todaySets)}</span>
          <span className="chip num">rec. {slot.restSec}s</span>
        </div>
        <div className="ex-meta muted" style={{ marginTop: 6 }}>
          {mus.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}
          {topW != null && ex.tracking === 'reps' ? ` · ultimo ${kg(topW)}` : ''}
          {slot.todaySets !== slot.plannedSets && ` · poi ${slot.plannedSets} serie`}
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
