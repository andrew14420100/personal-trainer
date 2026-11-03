import { useMemo, useState } from 'react';
import { ArrowRight, Award, CheckCircle2, ChevronRight, Clock, Dumbbell, Flame, History, Moon, Play, PlayCircle, TrendingUp } from 'lucide-react';
import { sessionMeta } from '../lib/meta';
import { useData, useSettingsUpdater } from '../app/store';
import { ArrowDown, ArrowUp, Lightbulb, SlidersHorizontal } from 'lucide-react';
import { ALL_HOME_WIDGETS } from '../lib/settings';
import { computeTips } from '../lib/tips';
import { LineChart, ChartCard } from '../components/Charts';
import { SortableList, Switch } from './kit';
import { RescheduleNotices, WeekCompare } from './Agenda';
import { Goals } from './Body';
import { shortDate, toUnit, unitLabel } from '../lib/format';
import { weeklySummaries } from '../lib/stats';
import { Camera, FolderOpen, Medal, Scale, Zap } from 'lucide-react';
import { prTimeline, weekStreak, PR_LABEL } from '../lib/records';
import { exName } from '../data/catalog';
import { startCustom } from '../lib/workout';
import { MuscleMap } from './Progress';
import { planDaysFor, slotsForPlanDay, startPlanDay, dayLink, type PlanDay } from '../lib/library';
import { FilePlus2, FileUp } from 'lucide-react';
import { aggregate, MUSCLE_REGION } from '../data/muscles';
import { photoCredit, restDayPhoto } from '../data/media';
import { estimateMinutes } from '../lib/plan';
import { completed, exerciseHistory, sessionDurationMin, sessionSets, sessionVolume, weekStart } from '../lib/stats';
import { iso, nextPlanned, parseIso, todayPlan, dateInfo } from '../lib/schedule';
import { fullDate, greeting, kg, relativeDays, volume } from '../lib/format';
import { navigate } from '../lib/router';
import { Empty, Section, Sheet } from './kit';
import { Legend, WeekStrip, stateLabel } from './Week';

export function Home() {
  const { sessions, settings, calibration, active } = useData();
  const now = new Date();
  const today = todayPlan(sessions, settings.moves, now);
  const next = nextPlanned(settings.moves, now);
  const planDays = planDaysFor(settings);
  const shown = today.plan ?? next?.day ?? planDays[0] ?? null;
  const slots = shown ? slotsForPlanDay(shown, settings, calibration) : [];
  const muscles = aggregate(slots.map((s) => s.exerciseId));
  const regions = [...new Set(muscles.primary.map((m) => MUSCLE_REGION[m]))];
  const doneToday = today.sessions[0];
  const [pick, setPick] = useState(false);
  const [sel, setSel] = useState(iso(now));
  const [edit, setEdit] = useState(false);

  const begin = async (day: PlanDay) => {
    if (!active) await startPlanDay(day, settings, calibration, sessions);
    navigate('/allenamento');
  };
  const status = active ? 'In corso' : doneToday ? 'Completato' : today.plan ? 'Da iniziare' : 'Giorno di riposo';

  return (
    <main className="page" style={{ ['--day' as string]: shown?.accent ?? 'var(--accent)' }}>
      <header className="appbar">
        <div>
          <div className="t-sm c3">{fullDate(now)}</div>
          <h1 className="appbar-title">{greeting(now, settings.name)}</h1>
        </div>
      </header>

      {/* ── Today ─────────────────────────────────────────── */}
      {shown ? (
      <article className="hero mt8" aria-label="Allenamento di oggi" data-plan={shown.id}>
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
              <PlayCircle size={20} /> Riprendi la seduta
            </button>
          ) : doneToday ? (
            <button className="btn ok lg grow" onClick={() => navigate(`/sessione/${doneToday.id}`)}>
              <CheckCircle2 size={20} /> Vedi riepilogo
            </button>
          ) : today.plan ? (
            <button className="btn primary lg grow" onClick={() => begin(shown)}>
              <Play size={18} fill="currentColor" /> Inizia oggi
            </button>
          ) : (
            <button className="btn lg grow" onClick={() => setPick(true)}>
              Allenati comunque
            </button>
          )}
          <button className="btn lg" onClick={() => navigate(dayLink(shown))} aria-label={`Apri ${shown.name}`}>
            <ArrowRight size={20} />
          </button>
        </div>
      </article>
      ) : (
        <NoProgramHero />
      )}
      {calibration && <p className="t-xs c3 mt8">Settimana di calibrazione: volume ridotto nelle prime 4 sedute (modificabile nel Profilo).</p>}

      <div className="row spread mt24" style={{ marginBottom: 4 }}>
        <h2 className="t-h2">La tua dashboard</h2>
        <button className="link" onClick={() => setEdit(true)}>
          <SlidersHorizontal size={14} /> Personalizza
        </button>
      </div>
      {settings.homeWidgets
        .filter((w) => w.visible)
        .map((w) => {
          const W = WIDGETS[w.id];
          return W ? <W.C key={w.id} sel={sel} setSel={setSel} /> : null;
        })}
      <WidgetEditor open={edit} onClose={() => setEdit(false)} />

      <Sheet open={pick} onClose={() => setPick(false)} label="Scegli l’allenamento">
        <h3 className="t-h2" style={{ marginBottom: 12 }}>
          Quale allenamento?
        </h3>
        <div className="list">
          {planDays.map((d) => (
            <button
              key={d.id}
              className="list-row"
              style={{ ['--day' as string]: d.accent }}
              onClick={() => {
                setPick(false);
                void begin(d);
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
        <button className="btn sm" onClick={() => navigate(dayLink(info.plan!))}>
          Apri
        </button>
      ) : null}
    </div>
  );
}

function Ring({ v, max }: { v: number; max: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max ? v / max : 0);
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`${v} allenamenti su ${max} questa settimana`}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--s3)" strokeWidth="8" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={pct >= 1 ? 'var(--ok)' : 'var(--accent)'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" fill="var(--t1)" style={{ font: '800 17px var(--f-title)' }}>
        {v}/{max}
      </text>
    </svg>
  );
}

function WeekProgress() {
  const { sessions, settings } = useData();
  const wk = weekStart(Date.now());
  const done = completed(sessions).filter((s) => weekStart(s.startedAt) === wk);
  const goal = settings.goals.weeklySessions;
  const streak = weekStreak(sessions);
  return (
    <Section title="Questa settimana" action={<button className="link" onClick={() => navigate('/progressi')}>Dettagli</button>}>
      <div className="card row" style={{ gap: 16 }}>
        <Ring v={done.length} max={goal} />
        <div className="grow">
          <div className="t-h3">{done.length >= goal ? 'Obiettivo raggiunto' : `Ancora ${goal - done.length} ${goal - done.length === 1 ? 'allenamento' : 'allenamenti'}`}</div>
          <div className="t-sm c2" style={{ marginTop: 4 }}>
            <Flame size={14} color="var(--accent)" style={{ verticalAlign: '-2px' }} /> {streak} {streak === 1 ? 'settimana' : 'settimane'} di fila
          </div>
          <div className="t-xs c3" style={{ marginTop: 4 }}>
            {volume(done.reduce((a, s) => a + sessionVolume(s), 0))} · {done.reduce((a, s) => a + sessionSets(s), 0)} serie · {done.reduce((a, s) => a + sessionDurationMin(s), 0)} min
          </div>
        </div>
      </div>
    </Section>
  );
}

function Muscles7() {
  const { sessions } = useData();
  const has = completed(sessions).some((s) => s.startedAt > Date.now() - 7 * 86400000);
  if (!has) return null;
  return (
    <Section title="Muscoli allenati · 7 giorni" action={<button className="link" onClick={() => navigate('/progressi?tab=muscoli')}>Dettagli</button>}>
      <div className="card">
        <MuscleMap days={7} compact />
      </div>
    </Section>
  );
}

function RecentPRs() {
  const { sessions } = useData();
  const list = useMemo(() => prTimeline(sessions).slice(0, 3), [sessions]);
  if (!list.length) return null;
  return (
    <Section title="Record recenti" action={<button className="link" onClick={() => navigate('/progressi?tab=record')}>Tutti</button>}>
      <div className="list">
        {list.map((p, i) => (
          <button key={i} className="list-row" onClick={() => navigate(`/esercizio/${p.exerciseId}`)}>
            <Medal size={20} color="var(--warn)" />
            <span className="grow">
              <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                {exName(p.exerciseId)}
              </span>
              <span className="t-xs c2">
                {PR_LABEL[p.kind]} · {p.kind === 'ripetizioni' ? `${p.value} rip.` : p.kind === 'volume-serie' ? volume(p.value) : kg(Math.round(p.value * 10) / 10)} · {relativeDays(p.date)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function Quick() {
  const { sessions, active } = useData();
  const items: [React.ReactNode, string, () => void][] = [
    [<Zap key="z" size={20} color="var(--warn)" />, 'Allenamento libero', async () => {
      if (!active) await startCustom('free', 'Allenamento libero', [], sessions);
      navigate('/allenamento');
    }],
    [<FolderOpen key="f" size={20} color="var(--data)" />, 'Le mie schede', () => navigate('/allenamenti')],
    [<Scale key="s" size={20} color="var(--ok)" />, 'Peso e misure', () => navigate('/progressi?tab=corpo')],
    [<Camera key="c" size={20} color="var(--accent)" />, 'Foto progressi', () => navigate('/progressi?tab=corpo')],
  ];
  return (
    <Section title="Accesso rapido">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map(([icon, label, fn]) => (
          <button key={label} className="card tap row" style={{ display: 'flex', gap: 10, padding: 14 }} onClick={fn}>
            {icon}
            <span className="t-sm" style={{ fontWeight: 650 }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function Overview() {
  const { sessions, settings } = useData();
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
      <button className="card tap" style={{ ['--day' as string]: sessionMeta(last, settings).accent }} onClick={() => navigate(`/sessione/${last.id}`)}>
        <div className="row spread">
          <span className="t-label">Ultimo allenamento · {relativeDays(last.startedAt)}</span>
          <ChevronRight size={18} className="c3" />
        </div>
        <div className="t-h3 mt8">{sessionMeta(last, settings).name}</div>
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

// ── 5.0 widgets ────────────────────────────────────────────────────────────────
type WProps = { sel: string; setSel: (d: string) => void };

function WeekWidget({ sel, setSel }: WProps) {
  return (
    <Section title="Settimana" action={<button className="link" onClick={() => navigate('/agenda')}>Agenda</button>}>
      <div className="card">
        <WeekStrip selected={sel} onSelect={setSel} />
        <SelectedDay date={sel} />
        <div className="mt12">
          <Legend />
        </div>
      </div>
    </Section>
  );
}

function AgendaWidget() {
  const { settings, sessions } = useData();
  const today = iso(new Date());
  const info = dateInfo(today, sessions, settings.moves, today);
  const events = settings.events.filter((e) => e.date === today).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  return (
    <Section title="Agenda di oggi" action={<button className="link" onClick={() => navigate('/agenda')}>Apri</button>}>
      <RescheduleNotices />
      <div className="list mt8">
        <div className="list-row">
          {info.state === 'done' ? <CheckCircle2 size={20} color="var(--ok)" /> : info.plan ? <Dumbbell size={20} color="var(--accent)" /> : <Moon size={20} className="c3" />}
          <span className="grow t-sm" style={{ fontWeight: 650 }}>
            {info.sessions[0] ? sessionMeta(info.sessions[0], settings).name : info.plan ? info.plan.name : 'Giorno di riposo'}
          </span>
          <span className="t-xs c3">{stateLabel(info)}</span>
        </div>
        {events.map((e) => (
          <div key={e.id} className="list-row">
            <Clock size={18} className="c3" />
            <span className="grow t-sm">{e.title}</span>
            <span className="t-xs c3">{e.time ?? ''}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function WeekStatsWidget() {
  const { sessions } = useData();
  const wk = weekStart(Date.now());
  const done = completed(sessions).filter((s) => weekStart(s.startedAt) === wk);
  return (
    <Section title="Progressi della settimana">
      <div className="stats">
        <div className="stat">
          <div className="t-label">Sedute</div>
          <div className="v">{done.length}</div>
        </div>
        <div className="stat">
          <div className="t-label">Serie</div>
          <div className="v">{done.reduce((a, s) => a + sessionSets(s), 0)}</div>
        </div>
        <div className="stat">
          <div className="t-label">Volume</div>
          <div className="v c-data">{volume(done.reduce((a, s) => a + sessionVolume(s), 0))}</div>
        </div>
        <div className="stat">
          <div className="t-label">Tempo attivo</div>
          <div className="v">{done.reduce((a, s) => a + sessionDurationMin(s), 0)} min</div>
        </div>
      </div>
    </Section>
  );
}

function LastWidget() {
  const { sessions, settings } = useData();
  const done = completed(sessions);
  const last = done[done.length - 1];
  if (!last) return <Overview />;
  const same = done.filter((s) => s.dayId === last.dayId).slice(-8);
  return (
    <Section title="Ultimo allenamento" action={<button className="link" onClick={() => navigate(`/sessione/${last.id}`)}>Riepilogo</button>}>
      <div className="card">
        <div className="t-h3">{sessionMeta(last, settings).name}</div>
        <div className="t-sm c2" style={{ marginTop: 4 }}>
          {relativeDays(last.startedAt)} · {sessionDurationMin(last)} min · {sessionSets(last)} serie · {volume(sessionVolume(last))}
        </div>
        {same.length >= 2 ? (
          <div className="mt12">
            <LineChart data={same.map((s) => ({ key: s.id, label: shortDate(s.startedAt), value: Math.round(toUnit(sessionVolume(s))) }))} unit={unitLabel()} label="Volume delle ultime sedute dello stesso allenamento" />
            <p className="t-xs c3" style={{ margin: 0 }}>Volume delle ultime {same.length} sedute di questo allenamento.</p>
          </div>
        ) : (
          <p className="t-xs c3 mt8" style={{ marginBottom: 0 }}>Il grafico dei miglioramenti compare dalla seconda seduta dello stesso allenamento.</p>
        )}
      </div>
    </Section>
  );
}

function ChartWidget({ kind }: { kind: 'volume' | 'time' }) {
  const { sessions } = useData();
  const weeks = weeklySummaries(sessions).slice(-8);
  const mins = (w: string) => completed(sessions).filter((s) => weekStart(s.startedAt) === w).reduce((a, s) => a + sessionDurationMin(s), 0);
  if (!weeks.length) return null;
  return (
    <Section title={kind === 'volume' ? 'Volume settimanale' : 'Tempo di allenamento'}>
      <ChartCard
        title={kind === 'volume' ? `Volume (${unitLabel()} × rip.)` : 'Minuti attivi a settimana'}
        kind="bar"
        unit={kind === 'volume' ? unitLabel() : 'min'}
        color={kind === 'volume' ? 'var(--accent)' : 'var(--ok)'}
        highlightLast
        data={weeks.map((w) => ({ key: w.week, label: shortDate(new Date(w.week + 'T12:00:00')), value: kind === 'volume' ? Math.round(toUnit(w.volume)) : mins(w.week) }))}
      />
    </Section>
  );
}

function BodyWeightWidget() {
  const { measurements } = useData();
  const w = [...measurements].filter((m) => m.bodyWeight != null).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Section title="Peso corporeo" action={<button className="link" onClick={() => navigate('/progressi?tab=corpo')}>{w.length ? 'Dettagli' : 'Registra'}</button>}>
      <div className="card">
        {w.length ? (
          <>
            <div className="row spread">
              <span className="t-h1">{kg(w[w.length - 1].bodyWeight!)}</span>
              <span className="t-xs c3">{shortDate(new Date(w[w.length - 1].date + 'T12:00:00'))}</span>
            </div>
            {w.length >= 2 && <LineChart data={w.slice(-12).map((m) => ({ key: m.id, label: shortDate(new Date(m.date + 'T12:00:00')), value: toUnit(m.bodyWeight!) }))} unit={unitLabel()} label="Peso corporeo" />}
          </>
        ) : (
          <p className="t-sm c3" style={{ margin: 0 }}>Nessun peso registrato.</p>
        )}
      </div>
    </Section>
  );
}

function TipsWidget() {
  const { sessions, measurements, settings } = useData();
  const tips = useMemo(() => computeTips(sessions, measurements, settings).slice(0, 3), [sessions, measurements, settings]);
  if (!tips.length) return null;
  return (
    <Section title="Consigli" action={<span className="t-xs c3">regole locali</span>}>
      <div className="col" style={{ gap: 8 }}>
        {tips.map((t) => (
          <div key={t.id} className="card">
            <div className="row">
              <Lightbulb size={18} color="var(--accent)" />
              <span className="grow t-h3">{t.title}</span>
            </div>
            <p className="t-sm c2" style={{ margin: '6px 0 0' }}>
              {t.body}
            </p>
            {t.action && (
              <button className="btn sm mt8" onClick={() => navigate(t.action!.to)}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

const WIDGETS: Record<string, { label: string; C: (p: WProps) => JSX.Element | null }> = {
  agenda: { label: 'Agenda di oggi', C: AgendaWidget },
  week: { label: 'Calendario settimanale', C: WeekWidget },
  goal: { label: 'Obiettivo allenamenti', C: WeekProgress },
  weekProgress: { label: 'Progressi della settimana', C: WeekStatsWidget },
  last: { label: 'Ultima sessione con grafico', C: LastWidget },
  compare: { label: 'Confronto con la settimana precedente', C: WeekCompare },
  records: { label: 'Record recenti', C: RecentPRs },
  muscles: { label: 'Muscoli allenati (7 giorni)', C: Muscles7 },
  volume: { label: 'Volume', C: () => <ChartWidget kind="volume" /> },
  time: { label: 'Tempo di allenamento', C: () => <ChartWidget kind="time" /> },
  bodyweight: { label: 'Peso corporeo', C: BodyWeightWidget },
  goals: { label: 'Obiettivi personali', C: Goals },
  badges: { label: 'Traguardi', C: Milestones },
  tips: { label: 'Consigli', C: TipsWidget },
  quick: { label: 'Accesso rapido', C: Quick },
};

function WidgetEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const list = settings.homeWidgets;
  const save = (homeWidgets: typeof list) => update((s) => ({ ...s, homeWidgets }));
  return (
    <Sheet open={open} onClose={onClose} label="Personalizza la dashboard">
      <h3 className="t-h2">Personalizza la dashboard</h3>
      <p className="t-xs c3" style={{ margin: '4px 0 12px' }}>
        Trascina per riordinare, usa l’interruttore per mostrare o nascondere.
      </p>
      <div className="list">
        <SortableList
          label="Widget della Home"
          items={list}
          onChange={save}
          render={(w, handle, move) => (
            <div className="list-row" style={{ minHeight: 52 }}>
              {handle}
              <span className="grow t-sm" style={{ fontWeight: 650, color: w.visible ? undefined : 'var(--t3)' }}>
                {WIDGETS[w.id]?.label ?? w.id}
              </span>
              <span className="widget-tools">
                <button className="icon-btn clear" style={{ width: 34, height: 34 }} aria-label={`Sposta su ${WIDGETS[w.id]?.label}`} onClick={() => move(-1)}>
                  <ArrowUp size={15} />
                </button>
                <button className="icon-btn clear" style={{ width: 34, height: 34 }} aria-label={`Sposta giù ${WIDGETS[w.id]?.label}`} onClick={() => move(1)}>
                  <ArrowDown size={15} />
                </button>
              </span>
              <Switch checked={w.visible} onChange={(v) => save(list.map((x) => (x.id === w.id ? { ...x, visible: v } : x)))} label={`Mostra ${WIDGETS[w.id]?.label}`} />
            </div>
          )}
        />
      </div>
      <button className="btn ghost block mt12" onClick={() => save(ALL_HOME_WIDGETS.map((id) => ({ id, visible: true })))}>
        Ripristina predefiniti
      </button>
      <button className="btn primary block mt8" onClick={onClose}>
        Fatto
      </button>
    </Sheet>
  );
}

/** Zero programs is a valid state: nothing is restored automatically. */
function NoProgramHero() {
  return (
    <article className="card mt8 col" aria-label="Nessuna scheda attiva" style={{ textAlign: 'center', padding: 24 }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
        <FileUp size={26} color="var(--accent)" />
      </div>
      <h2 className="t-h1">Nessuna scheda attiva</h2>
      <p className="t-sm c2" style={{ margin: 0 }}>
        Importa una scheda (anche creata con ChatGPT), creane una o scegli un programma predefinito in Gestisci schede. Lo storico dei tuoi allenamenti resta sempre disponibile.
      </p>
      <button className="btn primary lg block" onClick={() => navigate('/importa')}>
        <FileUp size={18} /> Importa scheda
      </button>
      <div className="row">
        <button className="btn grow" onClick={() => navigate('/routine/nuova')}>
          <FilePlus2 size={16} /> Crea scheda
        </button>
        <button className="btn grow" onClick={() => navigate('/schede')}>
          Gestisci schede
        </button>
      </div>
    </article>
  );
}
