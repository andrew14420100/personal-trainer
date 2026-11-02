import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { useData } from '../app/store';
import { DAY_BY_ID, dayForWeekday } from '../data/program';
import { completed, isoDate, sessionDurationMin, sessionVolume } from '../lib/stats';
import { fullDate, monthName, volume } from '../lib/format';
import { navigate } from '../lib/router';
import { startSession } from '../lib/workout';
import { effectiveDay, estimateMinutes } from '../lib/plan';
import type { Session } from '../lib/db';

export function Calendar() {
  const { sessions, settings, calibration, active } = useData();
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const [sel, setSel] = useState(isoDate(now));
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;

  const byDay = useMemo(() => {
    const m = new Map<string, Session[]>();
    completed(sessions).forEach((s) => {
      const k = isoDate(new Date(s.startedAt));
      m.set(k, [...(m.get(k) ?? []), s]);
    });
    return m;
  }, [sessions]);

  // adherence this month: planned days up to today vs days with a session
  const stats = useMemo(() => {
    let planned = 0;
    let doneOnPlanned = 0;
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d);
      if (date > now) break;
      const k = isoDate(date);
      if (dayForWeekday(date.getDay())) {
        planned++;
        if (byDay.has(k)) doneOnPlanned++;
      }
      total += byDay.get(k)?.length ?? 0;
    }
    return { planned, doneOnPlanned, total };
  }, [byDay, first, daysInMonth, now]);

  const selDate = new Date(sel + 'T12:00:00');
  const selPlan = dayForWeekday(selDate.getDay());
  const selDone = byDay.get(sel) ?? [];
  const isFuture = sel > isoDate(now);

  return (
    <main className="screen">
      <div className="brandbar">
        <div className="brand">
          FORMA<b>·</b>LAB
        </div>
      </div>
      <h1 className="display h1" style={{ marginTop: 12 }}>
        Calendario
      </h1>
      <p className="text-2 small" style={{ marginTop: 6 }}>
        Giorni programmati e allenamenti realmente eseguiti.
      </p>

      <div className="card tight" style={{ marginTop: 16 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <button className="icon-btn" aria-label="Mese precedente" onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 750, textTransform: 'capitalize' }}>
              {monthName(first.getMonth())} {first.getFullYear()}
            </div>
            <div className="small muted">
              {stats.total} sedute · {stats.planned ? `${stats.doneOnPlanned}/${stats.planned} giorni programmati rispettati` : 'nessun giorno programmato trascorso'}
            </div>
          </div>
          <button className="icon-btn" aria-label="Mese successivo" onClick={() => setOffset((o) => o + 1)}>
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="cal">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
            <div key={i} className="h">
              {d}
            </div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={'o' + i} className="c out" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = new Date(first.getFullYear(), first.getMonth(), i + 1);
            const k = isoDate(d);
            const done = byDay.get(k);
            const plan = dayForWeekday(d.getDay());
            const color = done ? DAY_BY_ID[done[0].dayId].accent : plan?.accent;
            return (
              <button
                key={k}
                className={`c cal-day${done ? ' done' : ''}${k === isoDate(now) ? ' today' : ''}${k === sel ? ' sel' : ''}`}
                style={{ ['--cal' as string]: color }}
                aria-pressed={k === sel}
                aria-label={`${i + 1}: ${done ? 'allenamento eseguito ' + done.map((s) => DAY_BY_ID[s.dayId].name).join(', ') : plan ? 'programmato ' + plan.name : 'riposo'}`}
                onClick={() => setSel(k)}
              >
                {i + 1}
                {!done && plan && <span className="cal-dot" />}
              </button>
            );
          })}
        </div>
        <div className="row wrap small text-2" style={{ gap: 14, marginTop: 14 }}>
          <span className="row" style={{ gap: 6 }}>
            <span className="cal-legend done" /> eseguito
          </span>
          <span className="row" style={{ gap: 6 }}>
            <span className="cal-legend plan" /> programmato
          </span>
        </div>
      </div>

      <section className="section" aria-label="Giorno selezionato">
        <div className="eyebrow">{fullDate(selDate)}</div>
        <div className="stack" style={{ gap: 10, marginTop: 10 }}>
          {selDone.map((s) => (
            <button key={s.id} className="card tap tight" style={{ ['--accent' as string]: DAY_BY_ID[s.dayId].accent }} onClick={() => navigate(`/sessione/${s.id}`)}>
              <div className="row between">
                <span className="row" style={{ gap: 8, fontWeight: 750 }}>
                  <CheckCircle2 size={18} color="var(--right)" /> {DAY_BY_ID[s.dayId].name}
                </span>
                <ArrowRight size={18} className="muted" />
              </div>
              <div className="small text-2" style={{ marginTop: 6 }}>
                {sessionDurationMin(s)} min · {volume(sessionVolume(s))}
                {s.rpe ? ` · RPE ${s.rpe}` : ''}
              </div>
            </button>
          ))}
          {selPlan && selDone.length === 0 && (
            <div className="card tight" style={{ ['--accent' as string]: selPlan.accent }}>
              <div className="row" style={{ gap: 8, fontWeight: 750 }}>
                <Circle size={16} color="var(--accent)" /> {selPlan.name} · {selPlan.title}
              </div>
              <div className="small text-2" style={{ marginTop: 6 }}>
                {effectiveDay(selPlan.id, settings, calibration).length} esercizi · ~{estimateMinutes(effectiveDay(selPlan.id, settings, calibration))} min
                {!isFuture && sel !== isoDate(now) ? ' · non eseguito' : ''}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn sm" onClick={() => navigate(`/giorno/${selPlan.id}`)}>
                  Vedi esercizi
                </button>
                {sel === isoDate(now) && (
                  <button
                    className="btn sm accent"
                    onClick={async () => {
                      if (!active) await startSession(selPlan.id, settings, calibration, sessions);
                      navigate('/allenamento');
                    }}
                  >
                    {active ? 'Riprendi' : 'Inizia ora'}
                  </button>
                )}
              </div>
            </div>
          )}
          {!selPlan && selDone.length === 0 && <p className="small text-2">Giorno di recupero: nessun allenamento programmato.</p>}
        </div>
      </section>
    </main>
  );
}
