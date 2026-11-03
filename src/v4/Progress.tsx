import { useMemo, useState } from 'react';
import { ChevronRight, ClipboardList, Flame, Medal } from 'lucide-react';
import { useData } from '../app/store';
import { EXERCISE_MUSCLES, MUSCLE_LABEL, type MuscleId } from '../data/muscles';
import { allExercises, exName } from '../data/catalog';
import { completed, exerciseHistory, frequencyLastWeeks, sessionDurationMin, sessionReps, sessionSets, sessionVolume, weekOverWeek, weeklySummaries } from '../lib/stats';
import { activityDays, exerciseBests, heatLevels, muscleSets, periodReports, prTimeline, weekStreak, PR_LABEL, type PRKind } from '../lib/records';
import { kg, monthName, num, shortDate, toUnit, unitLabel, volume } from '../lib/format';
import { sessionMeta } from '../lib/meta';
import { navigate, useRoute } from '../lib/router';
import { ChartCard } from '../components/Charts';
import { Anatomy } from '../components/Anatomy';
import { AppBar, Empty, Section, Seg } from './kit';
import { ExerciseThumb } from './Plan';
import { BodyTab } from './Body';

type Tab = 'panoramica' | 'muscoli' | 'record' | 'report' | 'esercizi' | 'storico' | 'corpo';
const TABS: { value: Tab; label: string }[] = [
  { value: 'panoramica', label: 'Panoramica' },
  { value: 'muscoli', label: 'Muscoli' },
  { value: 'record', label: 'Record' },
  { value: 'report', label: 'Report' },
  { value: 'esercizi', label: 'Esercizi' },
  { value: 'storico', label: 'Storico' },
  { value: 'corpo', label: 'Corpo' },
];

export function Progress() {
  const { query } = useRoute();
  const raw = query.get('tab');
  const tab = (raw === 'misure' ? 'corpo' : (raw as Tab)) || 'panoramica';
  const setTab = (t: Tab) => navigate(`/progressi?tab=${t}`, { replace: true });
  return (
    <main className="page">
      <AppBar title="Progressi" />
      <p className="t-sm c3" style={{ marginTop: -4 }}>
        Calcolati solo dai dati registrati su questo dispositivo.
      </p>
      <div className="hscroll mt12" role="tablist" aria-label="Sezioni progressi">
        {TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={tab === t.value} className={`chip${tab === t.value ? ' accent' : ''}`} style={{ height: 34, padding: '0 14px' }} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </div>
      <div key={tab}>
        {tab === 'panoramica' && <Overview />}
        {tab === 'muscoli' && <Muscles />}
        {tab === 'record' && <Records />}
        {tab === 'report' && <Reports />}
        {tab === 'esercizi' && <Exercises />}
        {tab === 'storico' && <Log />}
        {tab === 'corpo' && <BodyTab />}
      </div>
    </main>
  );
}

function NoData() {
  return (
    <div className="mt24">
      <Empty
        icon={<ClipboardList size={22} />}
        title="Ancora nessun allenamento"
        action={
          <button className="btn primary" onClick={() => navigate('/')}>
            Vai a Oggi
          </button>
        }
      >
        Completa la prima seduta: grafici, record e report si costruiscono con i tuoi dati reali.
      </Empty>
    </div>
  );
}

const wk = (w: string) => shortDate(new Date(w + 'T12:00:00'));

export function Heatmap({ weeks = 17 }: { weeks?: number }) {
  const { sessions } = useData();
  const days = activityDays(sessions, weeks);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <div className="heat" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }} role="img" aria-label={`Attività delle ultime ${weeks} settimane: ${days.filter((d) => d.count).length} giorni di allenamento`}>
        {days.map((d) => (
          <i key={d.date} title={`${d.date}: ${d.count}`} style={{ background: d.count ? 'var(--ok)' : d.date > today ? 'transparent' : undefined, opacity: d.count > 1 ? 1 : d.count ? 0.8 : 1 }} />
        ))}
      </div>
      <div className="row spread t-xs c3 mt8">
        <span>{shortDate(new Date(days[0].date + 'T12:00:00'))}</span>
        <span>L → D in colonna · verde = allenamento</span>
      </div>
    </div>
  );
}

function Overview() {
  const { sessions, settings } = useData();
  const done = completed(sessions);
  if (!done.length) return <NoData />;
  const weeks = weeklySummaries(sessions).slice(-12);
  const freq = frequencyLastWeeks(sessions, 8);
  const wow = weekOverWeek(sessions);
  const streak = weekStreak(sessions);
  const rows = [
    ['Sedute', 'sessions', (n: number) => String(n)],
    ['Serie completate', 'sets', (n: number) => String(n)],
    ['Ripetizioni', 'reps', (n: number) => num(n)],
    ['Volume', 'volume', volume],
  ] as const;
  return (
    <div className="col mt16">
      <div className="stats">
        <div className="stat">
          <div className="t-label">Settimane di fila</div>
          <div className="v c-accent">
            <Flame size={20} /> {streak}
          </div>
          <div className="s">con almeno un allenamento</div>
        </div>
        <div className="stat">
          <div className="t-label">Totale</div>
          <div className="v">{done.length}</div>
          <div className="s">{Math.round(done.reduce((a, s) => a + sessionDurationMin(s), 0) / 60)} ore di allenamento</div>
        </div>
      </div>
      <div className="card">
        <div className="t-h3" style={{ marginBottom: 10 }}>
          Costanza
        </div>
        <Heatmap />
      </div>
      <div className="card tight">
        <div className="t-h3" style={{ marginBottom: 8 }}>
          Questa settimana vs la precedente
        </div>
        <table className="data">
          <thead>
            <tr>
              <th></th>
              <th>Scorsa</th>
              <th>Questa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, key, f]) => (
              <tr key={key}>
                <td>{label}</td>
                <td>{wow.prev ? f(wow.prev[key]) : '—'}</td>
                <td>
                  <b>{wow.cur ? f(wow.cur[key]) : '—'}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ChartCard title="Volume settimanale" subtitle={`${unitLabel()} × ripetizioni · ultime 12 settimane con dati`} kind="bar" unit={unitLabel()} highlightLast data={weeks.map((w) => ({ key: w.week, label: wk(w.week), value: Math.round(toUnit(w.volume)), detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard title="Serie completate per settimana" kind="bar" unit="serie" color="var(--ok)" highlightLast data={weeks.map((w) => ({ key: w.week, label: wk(w.week), value: w.sets, detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard title="Frequenza" subtitle="sedute per settimana · ultime 8 settimane" kind="bar" unit="sedute" color="var(--accent)" data={freq.map((w) => ({ key: w.week, label: wk(w.week), value: w.count, detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard title="Ripetizioni per settimana" kind="line" unit="rip." data={weeks.map((w) => ({ key: w.week, label: wk(w.week), value: w.reps, detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard title="Durata delle sedute" subtitle="ultime 20 sedute" kind="bar" unit="min" color="var(--t2)" data={done.slice(-20).map((s) => ({ key: s.id, label: shortDate(s.startedAt), value: sessionDurationMin(s), detail: `${sessionMeta(s, settings).name} · ${shortDate(s.startedAt)}` }))} />
      {done.some((s) => s.rpe) && (
        <ChartCard
          title="Fatica percepita (RPE)"
          kind="line"
          unit="/10"
          color="var(--warn)"
          data={done
            .filter((s) => s.rpe)
            .slice(-20)
            .map((s) => ({ key: s.id, label: shortDate(s.startedAt), value: s.rpe!, detail: `${sessionMeta(s, settings).name} · ${shortDate(s.startedAt)}` }))}
        />
      )}
    </div>
  );
}

const RANGES = { '7': 7, '30': 30, '90': 90 } as const;

export function MuscleMap({ days = 7, compact = false }: { days?: number; compact?: boolean }) {
  const { sessions } = useData();
  const m = muscleSets(sessions, Date.now() - days * 86400000);
  const lv = heatLevels(m);
  const list = (Object.keys(m) as MuscleId[]).sort((a, b) => m[b] - m[a]);
  const max = Math.max(1, ...list.map((k) => m[k]));
  return (
    <div>
      <Anatomy primary={lv.primary} secondary={lv.secondary} size={compact ? 'sm' : 'md'} legend={false} />
      <div className="row t-xs c3 mt8" style={{ gap: 14, justifyContent: 'center' }}>
        <span className="row" style={{ gap: 5 }}>
          <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--muscle-p)' }} /> più allenati
        </span>
        <span className="row" style={{ gap: 5 }}>
          <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--muscle-s)' }} /> allenati
        </span>
      </div>
      {!compact && (
        <div className="col mt16" style={{ gap: 8 }}>
          {list.length ? (
            list.map((k) => (
              <div key={k} className="bar-row">
                <span>{MUSCLE_LABEL[k]}</span>
                <span className="b">
                  <i style={{ width: `${(m[k] / max) * 100}%` }} />
                </span>
                <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(m[k], 1)}</span>
              </div>
            ))
          ) : (
            <p className="t-sm c3">Nessuna serie nel periodo.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Muscles() {
  const [r, setR] = useState<keyof typeof RANGES>('7');
  return (
    <div className="col mt16">
      <Seg
        label="Periodo"
        value={r}
        onChange={setR}
        options={[
          { value: '7', label: '7 giorni' },
          { value: '30', label: '30 giorni' },
          { value: '90', label: '3 mesi' },
        ]}
      />
      <div className="card">
        <MuscleMap days={RANGES[r]} />
      </div>
      <p className="t-xs c3" style={{ margin: 0 }}>
        Serie di lavoro completate per muscolo: 1 per i muscoli principali dell’esercizio, 0,5 per i secondari. Il riscaldamento non conta. Come riferimento generale molte linee guida indicano circa 10–20 serie
        settimanali per gruppo muscolare: non è una prescrizione.
      </p>
    </div>
  );
}

const KINDS: PRKind[] = ['carico', '1rm', 'ripetizioni', 'volume-serie'];

function Records() {
  const { sessions } = useData();
  const timeline = useMemo(() => prTimeline(sessions), [sessions]);
  const trained = useMemo(() => allExercises().filter((e) => e.tracking === 'reps' && exerciseHistory(sessions, e.id).length > 0), [sessions]);
  if (!trained.length) return <NoData />;
  const fmt = (k: PRKind, v: number) => (k === 'ripetizioni' ? `${v} rip.` : k === 'volume-serie' ? volume(v) : kg(Math.round(v * 10) / 10));
  return (
    <div className="mt16">
      <Section title="Record recenti">
        {timeline.length ? (
          <div className="list">
            {timeline.slice(0, 12).map((p, i) => (
              <button key={i} className="list-row" onClick={() => navigate(`/sessione/${p.sessionId}`)}>
                <Medal size={20} color="var(--warn)" />
                <span className="grow">
                  <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                    {exName(p.exerciseId)}
                  </span>
                  <span className="t-xs c2">
                    {PR_LABEL[p.kind]}: {fmt(p.kind, p.value)} · {shortDate(p.date)}
                  </span>
                </span>
                <ChevronRight size={16} className="c3" />
              </button>
            ))}
          </div>
        ) : (
          <p className="t-sm c3">I record compaiono dalla seconda volta che fai un esercizio, quando superi un tuo valore precedente.</p>
        )}
      </Section>
      <Section title="Migliori per esercizio">
        <div className="col" style={{ gap: 8 }}>
          {trained.map((e) => {
            const b = exerciseBests(sessions, e.id);
            return (
              <button key={e.id} className="card tap" onClick={() => navigate(`/esercizio/${e.id}`)}>
                <div className="row">
                  <ExerciseThumb exerciseId={e.id} />
                  <span className="grow ex-name">{e.name}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  {KINDS.map((k) =>
                    b[k] ? (
                      <div key={k}>
                        <div className="t-label">{PR_LABEL[k]}</div>
                        <div className="t-sm" style={{ fontWeight: 700 }}>
                          {fmt(k, b[k]!.value)}
                        </div>
                        <div className="t-xs c3">{shortDate(b[k]!.date)}</div>
                      </div>
                    ) : null,
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function ReportCard({ r, title }: { r: ReturnType<typeof periodReports>[number]; title: string }) {
  return (
    <div className="card">
      <div className="row spread">
        <span className="t-h3" style={{ textTransform: 'capitalize' }}>
          {title}
        </span>
        {r.prs > 0 && (
          <span className="chip warn sm">
            <Medal size={12} /> {r.prs} record
          </span>
        )}
      </div>
      <div className="stats mt12">
        <div className="stat" style={{ background: 'var(--s2)' }}>
          <div className="t-label">Sedute</div>
          <div className="v">{r.sessions}</div>
          <div className="s">{r.days} giorni diversi</div>
        </div>
        <div className="stat" style={{ background: 'var(--s2)' }}>
          <div className="t-label">Tempo</div>
          <div className="v">{Math.round(r.minutes / 6) / 10} h</div>
          <div className="s">{r.sets} serie</div>
        </div>
      </div>
      <div className="t-sm c2 mt12">
        Volume {volume(r.volume)}
        {r.topExercise ? ` · esercizio più fatto: ${exName(r.topExercise)}` : ''}
      </div>
    </div>
  );
}

function Reports() {
  const { sessions } = useData();
  const [by, setBy] = useState<'month' | 'year'>('month');
  const list = periodReports(sessions, by);
  if (!list.length) return <NoData />;
  return (
    <div className="col mt16">
      <Seg
        label="Periodo del report"
        value={by}
        onChange={setBy}
        options={[
          { value: 'month', label: 'Mensile' },
          { value: 'year', label: 'Annuale' },
        ]}
      />
      {list.map((r) => (
        <ReportCard key={r.key} r={r} title={by === 'month' ? `${monthName(Number(r.key.slice(5, 7)) - 1)} ${r.key.slice(0, 4)}` : `Anno ${r.key}`} />
      ))}
    </div>
  );
}

function Exercises() {
  const { sessions } = useData();
  const trained = useMemo(() => allExercises().map((e) => ({ e, h: exerciseHistory(sessions, e.id) })).filter((x) => x.h.length > 0), [sessions]);
  const [exId, setExId] = useState('');
  if (!trained.length) return <NoData />;
  const cur = trained.find((x) => x.e.id === exId) ?? trained[0];
  const { e: ex, h } = cur;
  const U = unitLabel();
  return (
    <div className="col mt16">
      <select className="input" value={ex.id} onChange={(e) => setExId(e.target.value)} aria-label="Scegli esercizio">
        {trained.map(({ e }) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      {ex.tracking === 'reps' ? (
        <>
          <ChartCard title="Carico massimo" subtitle={ex.name} kind="line" unit={U} data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: toUnit(p.topWeight), detail: `${shortDate(p.date)} · ${p.topReps} rip.` }))} />
          {h.some((p) => p.bestE1rm > 0) && (
            <ChartCard title="1RM stimato (Epley)" subtitle="stima indicativa da serie fino a 12 ripetizioni" kind="line" unit={U} color="var(--warn)" data={h.filter((p) => p.bestE1rm > 0).map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: Math.round(toUnit(p.bestE1rm) * 10) / 10 }))} />
          )}
          <ChartCard title="Ripetizioni totali" kind="line" unit="rip." color="var(--ok)" data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: p.totalReps }))} />
          <ChartCard title="Volume dell’esercizio" kind="bar" unit={U} data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: Math.round(toUnit(p.volume)) }))} />
        </>
      ) : (
        <ChartCard title="Durata migliore" subtitle={ex.name} kind="line" unit="s" data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: p.topReps }))} />
      )}
      <Section title="Tutti gli esercizi registrati">
        <div className="list">
          {trained.map(({ e, h }) => {
            const l = h[h.length - 1];
            return (
              <button key={e.id} className="ex-row" onClick={() => navigate(`/esercizio/${e.id}`)}>
                <ExerciseThumb exerciseId={e.id} />
                <span style={{ minWidth: 0 }}>
                  <span className="ex-group" style={{ display: 'block' }}>
                    {EXERCISE_MUSCLES[e.id]?.group}
                  </span>
                  <span className="ex-name" style={{ display: 'block' }}>
                    {e.name}
                  </span>
                  <span className="ex-sub">
                    {h.length} sedute · ultimo {e.tracking === 'time' ? `${l.topReps} s` : kg(l.topWeight)}
                  </span>
                </span>
                <ChevronRight size={18} className="c3" />
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Log() {
  const { sessions, settings } = useData();
  const done = completed(sessions).reverse();
  if (!done.length) return <NoData />;
  const groups = new Map<string, typeof done>();
  done.forEach((s) => {
    const d = new Date(s.startedAt);
    const k = `${monthName(d.getMonth())} ${d.getFullYear()}`;
    groups.set(k, [...(groups.get(k) ?? []), s]);
  });
  return (
    <>
      {[...groups.entries()].map(([k, list]) => (
        <Section key={k} title={k.charAt(0).toUpperCase() + k.slice(1)} action={<span className="t-xs c3">{list.length} sedute</span>}>
          <div className="list">
            {list.map((s) => {
              const d = sessionMeta(s, settings);
              return (
                <button key={s.id} className="list-row" style={{ ['--day' as string]: d.accent }} onClick={() => navigate(`/sessione/${s.id}`)}>
                  <span className="dot" />
                  <span className="grow">
                    <span className="row spread">
                      <b className="t-sm">{d.name}</b>
                      <span className="t-xs c3">{new Date(s.startedAt).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </span>
                    <span className="row t-xs c2" style={{ gap: 10, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                      <span>{sessionDurationMin(s)} min</span>
                      <span>{sessionSets(s)} serie</span>
                      <span>{sessionReps(s)} rip.</span>
                      <span className="c-data">{volume(sessionVolume(s))}</span>
                      {s.rpe ? <span>RPE {s.rpe}</span> : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      ))}
    </>
  );
}
