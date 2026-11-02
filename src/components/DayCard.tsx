import { ArrowRight, CheckCircle2, Clock, Dumbbell, Play, PlayCircle } from 'lucide-react';
import type { Day } from '../data/types';
import { aggregate } from '../data/muscles';
import { useData } from '../app/store';
import { effectiveDay, estimateMinutes } from '../lib/plan';
import { completed, weekStart } from '../lib/stats';
import { navigate } from '../lib/router';
import { startSession } from '../lib/workout';
import { photoCredit } from '../data/media';
import { Anatomy } from './Anatomy';

export type DayStatus = 'todo' | 'active' | 'done';

export function useDayStatus(day: Day): DayStatus {
  const { sessions, active } = useData();
  if (active?.dayId === day.id) return 'active';
  const thisWeek = weekStart(Date.now());
  return completed(sessions).some((s) => s.dayId === day.id && weekStart(s.startedAt) === thisWeek) ? 'done' : 'todo';
}

const STATUS: Record<DayStatus, { label: string; cls: string }> = {
  todo: { label: 'Da iniziare', cls: '' },
  active: { label: 'In corso', cls: 'warn' },
  done: { label: 'Completato', cls: 'ok' },
};

export function DayCard({ day, today = false }: { day: Day; today?: boolean }) {
  const { settings, calibration, sessions, active } = useData();
  const slots = effectiveDay(day.id, settings, calibration);
  const muscles = aggregate(slots.map((s) => s.exerciseId));
  const status = useDayStatus(day);
  const st = STATUS[status];
  const begin = async () => {
    if (!active) await startSession(day.id, settings, calibration, sessions);
    navigate('/allenamento');
  };
  const busyOther = !!active && active.dayId !== day.id;

  return (
    <article className={`dcard${today ? ' today' : ''}`} style={{ ['--accent' as string]: day.accent }} aria-label={`Giorno ${day.number}: ${day.name}`}>
      <img className="dcard-bg" src={day.photo} alt="" loading="lazy" style={{ objectPosition: day.photoPosition }} />
      <span className="dcard-credit">{photoCredit(day.photo)}</span>
      <button className="dcard-main" onClick={() => navigate(`/giorno/${day.id}`)} aria-label={`Apri ${day.name}`}>
        <div className="dcard-text">
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>
            Giorno {day.number} · {day.weekdayLabel}
            {today ? ' · oggi' : ''}
          </div>
          <h3 className="dcard-title">{day.name}</h3>
          <div className="small text-2" style={{ marginTop: 4 }}>
            {day.title.split(' · ')[0]}
          </div>
          <div className="chips" style={{ marginTop: 10 }}>
            {day.focus.map((f) => (
              <span key={f} className="chip">
                {f}
              </span>
            ))}
          </div>
        </div>
        <div className="dcard-anatomy" aria-hidden>
          <Anatomy primary={muscles.primary} secondary={muscles.secondary} size="sm" legend={false} />
        </div>
      </button>
      <div className="dcard-foot">
        <span className="row small text-2" style={{ gap: 6 }}>
          <Dumbbell size={15} /> {slots.length} esercizi
        </span>
        <span className="row small text-2" style={{ gap: 6 }}>
          <Clock size={15} /> ~{estimateMinutes(slots)} min
        </span>
        <span className={`chip ${st.cls}`}>
          {status === 'done' ? <CheckCircle2 size={13} /> : status === 'active' ? <PlayCircle size={13} /> : null} {st.label}
        </span>
        <span className="tiny muted dcard-code">{day.code}</span>
      </div>
      <div className="dcard-actions">
        <button className={`btn ${status === 'done' ? '' : 'accent'} grow`} onClick={begin} disabled={busyOther}>
          <Play size={16} fill="currentColor" /> {status === 'active' ? 'Riprendi allenamento' : status === 'done' ? 'Ripeti allenamento' : 'Inizia allenamento'}
        </button>
        <button className="btn" onClick={() => navigate(`/giorno/${day.id}`)} aria-label={`Esercizi di ${day.name}`}>
          Esercizi <ArrowRight size={16} />
        </button>
      </div>
      {busyOther && <p className="tiny muted" style={{ padding: '0 16px 14px' }}>Hai già un allenamento in corso: concludilo prima di iniziarne un altro.</p>}
    </article>
  );
}
