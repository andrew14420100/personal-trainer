import { useMemo, useState } from 'react';
import { ArrowRight, Award, CheckCircle2, ChevronRight, Clock, Dumbbell, Flame, History, Moon, Play, PlayCircle, TrendingUp } from 'lucide-react';
import { useData } from '../app/store';
import { DAYS, DAY_BY_ID } from '../data/program';
import { aggregate, MUSCLE_REGION } from '../data/muscles';
import { photoCredit, restDayPhoto } from '../data/media';
import { effectiveDay, estimateMinutes } from '../lib/plan';
import { completed, exerciseHistory, sessionDurationMin, sessionSets, sessionVolume, weekStart } from '../lib/stats';
import { iso, nextPlanned, parseIso, todayPlan, dateInfo } from '../lib/schedule';
import { fullDate, greeting, relativeDays, volume } from '../lib/format';
import { navigate } from '../lib/router';
import { startSession } from '../lib/workout';
import type { DayId } from '../data/types';
import { Empty, Section, Sheet } from './kit';
import { Legend, WeekStrip, stateLabel } from './Week';

export function Home() {
  const { sessions, settings, calibration, active } = useData();
  const now = new Date();
  const today = todayPlan(sessions, settings.moves, now);
  const next = nextPlanned(settings.moves, now);
  const shown = today.plan ?? (next ? next.day : DAYS[0]);
  const slots = effectiveDay(shown.id, settings, calibration);
  const muscles = aggregate(slots.map((s) => s.exerciseId));
  const regions = [...new Set(muscles.primary.map((m) => MUSCLE_REGION[m]))];
  const doneToday = today.sessions[0];
  const [pick, setPick] = useState(false);
  const [sel, setSel] = useState(iso(now));

  const begin = async (dayId: DayId) => {
    if (!active) await startSession(dayId, settings, calibration, sessions);
    navigate('/allenamento');
  };
  const status = active ? 'In corso' : doneToday ? 'Completato' : today.plan ? 'Da iniziare' : 'Giorno di riposo';

  return (
    <main className="page" style={{ ['--day' as string]: shown.accent }}>
      <header className="appbar">
        <div>
          <div className="t-sm c3">{fullDate(now)}</div>
          <h1 className="appbar-title">{greeting(now, settings.name)}</h1>
        </div>
      </header>

      {/* ── Today ─────────────────────────────────────────── */}
      <article className="hero mt8" aria-label="Allenamento di oggi">
        <img src={today.plan ? shown.photo : restDayPhoto} alt="" style={{ objectPosition: shown.photoPosition }} />
        <span className="credit">{photoCredit(today.plan ? shown.photo : restDayPhoto)}</span>
        <div className="row wrap">
          <span className={`chip glass`}>
            {today.plan ? (
              <>
                <span className="dot" /> Oggi · Giorno {shown.number} · {shown.code}
              </>
            ) : (
              <>
                <Moon size={13} /> Riposo · prossimo {next ? relativeDays(parseIso(next.date).getTime()) : ''}
              </>
            )}
          </span>
          <span className={`chip ${active ? 'warn' : doneToday ? 'ok' : 'glass'}`}>{status}</span>
        </div>
        <h2 className="t-display mt8" style={{ fontSize: 26 }}>
          {shown.name}
        </h2>
        <p className="t-sm c2" style={{ marginTop: 4 }}>
          {regions.join(' · ')}
        </p>
        <div className="hero-meta">
          <span>
            <Clock size={15} /> ~{estimateMinutes(slots)} min
          </span>
          <span>
            <Dumbbell size={15} /> {slots.length} esercizi
          </span>
          <span>
            <Flame size={15} /> {slots.reduce((a, s) => a + s.todaySets, 0)} serie
          </span>
        </div>
        <div className="row mt16">
          {active ? (
            <button className="btn primary lg grow" onClick={() => navigate('/allenamento')}>
              <PlayCircle size={20} /> Riprendi allenamento
            </button>
          ) : doneToday ? (
            <button className="btn ok lg grow" onClick={() => navigate(`/sessione/${doneToday.id}`)}>
              <CheckCircle2 size={20} /> Vedi riepilogo
            </button>
          ) : today.plan ? (
            <button className="btn primary lg grow" onClick={() => begin(shown.id)}>
              <Play size={18} fill="currentColor" /> Inizia allenamento
            </button>
          ) : (
            <button className="btn lg grow" onClick={() => setPick(true)}>
              Allenati comunque
            </button>
          )}
          <button className="btn lg" onClick={() => navigate(`/giorno/${shown.id}`)} aria-label={`Apri ${shown.name}`}>
            <ArrowRight size={20} />
          </button>
        </div>
      </article>
      {calibration && <p className="t-xs c3 mt8">Settimana di calibrazione: volume ridotto nelle prime 4 sedute (modificabile nel Profilo).</p>}

      {/* ── Week ──────────────────────────────────────────── */}
      <Section title="Settimana" action={<button className="link" onClick={() => navigate('/calendario')}>Calendario</button>}>
        <div className="card">
          <WeekStrip selected={sel} onSelect={setSel} />
          <SelectedDay date={sel} />
          <div className="mt12">
            <Legend />
          </div>
        </div>
      </Section>

      <WeekProgress />
      <Overview />

      {/* ── Quick access to the plan ──────────────────────── */}
      <Section title="La tua scheda" action={<button className="link" onClick={() => navigate('/allenamenti')}>Apri</button>}>
        <div className="list">
          {DAYS.map((d) => (
            <button key={d.id} className="list-row" style={{ ['--day' as string]: d.accent }} onClick={() => navigate(`/giorno/${d.id}`)}>
              <span className="dot" />
              <span className="grow">
                <span className="t-h3" style={{ display: 'block' }}>
                  {d.name}
                </span>
                <span className="t-xs c3">
                  {d.weekdayLabel} · {d.code} · {effectiveDay(d.id, settings, calibration).length} esercizi
                </span>
              </span>
              <ChevronRight size={18} className="c3" />
            </button>
          ))}
        </div>
      </Section>

      <Milestones />

      <Sheet open={pick} onClose={() => setPick(false)} label="Scegli l’allenamento">
        <h3 className="t-h2" style={{ marginBottom: 12 }}>
          Quale allenamento?
        </h3>
        <div className="list">
          {DAYS.map((d) => (
            <button
              key={d.id}
              className="list-row"
              style={{ ['--day' as string]: d.accent }}
              onClick={() => {
                setPick(false);
                void begin(d.id);
              }}
            >
              <span className="dot" />
              <span className="grow t-h3">{d.name}</span>
              <span className="t-xs c3">{d.code}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </main>
  );
}

function SelectedDay({ date }: { date: string }) {
  const { sessions, settings } = useData();
  const info = dateInfo(date, sessions, settings.moves, iso(new Date()));
  const d = parseIso(date);
  return (
    <div className="row mt12" style={{ minHeight: 40 }}>
      <div className="grow">
        <div className="t-sm" style={{ fontWeight: 650 }}>
          {fullDate(d)} · <span className={info.state === 'done' ? 'c-ok' : info.state === 'skipped' ? 'c-bad' : 'c2'}>{stateLabel(info)}</span>
        </div>
        <div className="t-xs c3">{info.plan ? info.plan.name : info.movedOut ? `${info.movedOut.day.name} spostato al ${fullDate(parseIso(info.movedOut.to))}` : 'Nessun allenamento programmato'}</div>
      </div>
      {info.sessions[0] ? (
        <button className="btn sm" onClick={() => navigate(`/sessione/${info.sessions[0].id}`)}>
          Riepilogo
        </button>
      ) : info.plan ? (
        <button className="btn sm" onClick={() => navigate(`/giorno/${info.plan!.id}`)}>
          Apri
        </button>
      ) : null}
    </div>
  );
}

function WeekProgress() {
  const { sessions } = useData();
  const wk = weekStart(Date.now());
  const done = completed(sessions).filter((s) => weekStart(s.startedAt) === wk);
  const pct = Math.min(1, done.length / DAYS.length);
  return (
    <Section title="Progressi della settimana" action={<button className="link" onClick={() => navigate('/progressi')}>Dettagli</button>}>
      <div className="stats">
        <div className="stat">
          <div className="t-label">Sedute</div>
          <div className="v">
            {done.length}
            <span className="c3" style={{ fontSize: 16 }}>/{DAYS.length}</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: 'var(--s3)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--ok)' }} />
          </div>
        </div>
        <div className="stat">
          <div className="t-label">Volume</div>
          <div className="v c-data">{volume(done.reduce((a, s) => a + sessionVolume(s), 0))}</div>
          <div className="s">kg × ripetizioni</div>
        </div>
        <div className="stat">
          <div className="t-label">Serie</div>
          <div className="v">{done.reduce((a, s) => a + sessionSets(s), 0)}</div>
          <div className="s">completate</div>
        </div>
        <div className="stat">
          <div className="t-label">Tempo</div>
          <div className="v">{done.reduce((a, s) => a + sessionDurationMin(s), 0)} min</div>
          <div className="s">di allenamento</div>
        </div>
      </div>
    </Section>
  );
}

function Overview() {
  const { sessions } = useData();
  const done = completed(sessions);
  if (!done.length)
    return (
      <Section title="Il tuo storico">
        <Empty icon={<History size={22} />} title="Nessun allenamento registrato">
          Dopo la prima seduta qui vedrai l’ultimo allenamento, lo storico e le statistiche, calcolati solo dai tuoi dati.
        </Empty>
      </Section>
    );
  const last = done[done.length - 1];
  const total = done.reduce((a, s) => a + sessionVolume(s), 0);
  return (
    <Section title="Il tuo storico" action={<button className="link" onClick={() => navigate('/progressi?tab=storico')}>Tutto</button>}>
      <button className="card tap" style={{ ['--day' as string]: DAY_BY_ID[last.dayId].accent }} onClick={() => navigate(`/sessione/${last.id}`)}>
        <div className="row spread">
          <span className="t-label">Ultimo allenamento · {relativeDays(last.startedAt)}</span>
          <ChevronRight size={18} className="c3" />
        </div>
        <div className="t-h3 mt8">{DAY_BY_ID[last.dayId].name}</div>
        <div className="t-sm c2" style={{ marginTop: 4 }}>
          {sessionDurationMin(last)} min · {sessionSets(last)} serie · {volume(sessionVolume(last))}
          {last.rpe ? ` · RPE ${last.rpe}` : ''}
        </div>
      </button>
      <div className="stats mt8">
        <div className="stat">
          <div className="t-label">Allenamenti</div>
          <div className="v">{done.length}</div>
          <div className="s">in totale</div>
        </div>
        <div className="stat">
          <div className="t-label">Volume totale</div>
          <div className="v c-data">{volume(total)}</div>
          <div className="s">da quando hai iniziato</div>
        </div>
      </div>
    </Section>
  );
}

/** Milestones: only what has really been achieved, computed from the log. */
function Milestones() {
  const { sessions } = useData();
  const list = useMemo(() => {
    const done = completed(sessions);
    const out: { t: string; d: string }[] = [];
    if (done.length >= 1) out.push({ t: 'Primo allenamento', d: new Date(done[0].startedAt).toLocaleDateString('it-IT') });
    for (const n of [10, 25, 50, 100]) if (done.length >= n) out.push({ t: `${n} allenamenti`, d: new Date(done[n - 1].startedAt).toLocaleDateString('it-IT') });
    const perWeek = new Map<string, Set<string>>();
    done.forEach((s) => perWeek.set(weekStart(s.startedAt), (perWeek.get(weekStart(s.startedAt)) ?? new Set()).add(s.dayId)));
    const full = [...perWeek.entries()].filter(([, v]) => v.size >= 4).map(([k]) => k).sort();
    if (full.length) out.push({ t: 'Settimana completa (4/4)', d: new Date(full[0] + 'T12:00:00').toLocaleDateString('it-IT') });
    const ids = [...new Set(done.flatMap((s) => s.exercises.map((e) => e.exerciseId)))];
    const prs = ids.filter((id) => {
      const h = exerciseHistory(sessions, id).filter((p) => p.topWeight > 0);
      return h.length >= 2 && h[h.length - 1].topWeight > Math.max(...h.slice(0, -1).map((p) => p.topWeight));
    }).length;
    if (prs) out.push({ t: `${prs} record di carico nell’ultima seduta di ogni esercizio`, d: 'attuale' });
    return out;
  }, [sessions]);
  if (!list.length) return null;
  return (
    <Section title="Traguardi">
      <div className="list">
        {list.map((m) => (
          <div key={m.t} className="list-row">
            <Award size={20} color="var(--warn)" />
            <span className="grow t-sm" style={{ fontWeight: 650 }}>
              {m.t}
            </span>
            <span className="t-xs c3">{m.d}</span>
          </div>
        ))}
      </div>
      <p className="t-xs c3 mt8">
        <TrendingUp size={12} /> Calcolati dalle sedute registrate.
      </p>
    </Section>
  );
}
