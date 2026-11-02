import { useMemo, useState } from 'react';
import { ChevronRight, ClipboardList, Plus, Ruler, Trash2 } from 'lucide-react';
import { useData } from '../app/store';
import { DAY_BY_ID } from '../data/program';
import { EXERCISES } from '../data/exercises';
import { EXERCISE_MUSCLES } from '../data/muscles';
import { deleteMeasurement, saveMeasurement, uid, type Measurement } from '../lib/db';
import { completed, exerciseHistory, frequencyLastWeeks, isoDate, sessionDurationMin, sessionReps, sessionSets, sessionVolume, weekOverWeek, weeklySummaries } from '../lib/stats';
import { kg, monthName, num, parseDecimal, shortDate, volume } from '../lib/format';
import { navigate, useRoute } from '../lib/router';
import { ChartCard } from '../components/Charts';
import { AppBar, Confirm, Empty, Section, Seg, toast } from './kit';
import { ExerciseThumb } from './Plan';

type Tab = 'panoramica' | 'esercizi' | 'storico' | 'misure';

export function Progress() {
  const { query } = useRoute();
  const tab = (query.get('tab') as Tab) || 'panoramica';
  const setTab = (t: Tab) => navigate(`/progressi?tab=${t}`, { replace: true });
  return (
    <main className="page">
      <AppBar title="Progressi" />
      <p className="t-sm c3" style={{ marginTop: -4 }}>
        Calcolati solo dai dati registrati su questo dispositivo.
      </p>
      <div className="mt12">
        <Seg<Tab>
          label="Sezioni progressi"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'panoramica', label: 'Panoramica' },
            { value: 'esercizi', label: 'Esercizi' },
            { value: 'storico', label: 'Storico' },
            { value: 'misure', label: 'Misure' },
          ]}
        />
      </div>
      <div key={tab}>
        {tab === 'panoramica' && <Overview />}
        {tab === 'esercizi' && <Exercises />}
        {tab === 'storico' && <Log />}
        {tab === 'misure' && <Measurements />}
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
        Completa la prima seduta: grafici e storico si costruiscono con i tuoi dati reali.
      </Empty>
    </div>
  );
}

const wk = (w: string) => shortDate(new Date(w + 'T12:00:00'));

function Overview() {
  const { sessions } = useData();
  const done = completed(sessions);
  if (!done.length) return <NoData />;
  const weeks = weeklySummaries(sessions).slice(-12);
  const freq = frequencyLastWeeks(sessions, 8);
  const wow = weekOverWeek(sessions);
  const rows = [
    ['Sedute', 'sessions', (n: number) => String(n)],
    ['Serie completate', 'sets', (n: number) => String(n)],
    ['Ripetizioni', 'reps', (n: number) => num(n)],
    ['Volume', 'volume', volume],
  ] as const;
  return (
    <div className="col mt16">
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
        {wow.volumePct != null && (
          <p className="t-xs c3 mt8">
            Volume {wow.volumePct >= 0 ? '+' : ''}
            {num(wow.volumePct, 0)}% rispetto alla settimana scorsa (la settimana in corso potrebbe non essere conclusa).
          </p>
        )}
      </div>
      <ChartCard title="Volume settimanale" subtitle="kg × ripetizioni · ultime 12 settimane con dati" kind="bar" unit="kg" highlightLast data={weeks.map((w) => ({ key: w.week, label: wk(w.week), value: Math.round(w.volume), detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard title="Serie completate per settimana" kind="bar" unit="serie" color="var(--ok)" highlightLast data={weeks.map((w) => ({ key: w.week, label: wk(w.week), value: w.sets, detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard title="Frequenza" subtitle="sedute per settimana · ultime 8 settimane" kind="bar" unit="sedute" color="var(--accent)" data={freq.map((w) => ({ key: w.week, label: wk(w.week), value: w.count, detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard title="Ripetizioni per settimana" kind="line" unit="rip." data={weeks.map((w) => ({ key: w.week, label: wk(w.week), value: w.reps, detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard
        title="Volume per seduta"
        subtitle="ultime 20 sedute"
        kind="line"
        unit="kg"
        data={done.slice(-20).map((s) => ({ key: s.id, label: shortDate(s.startedAt), value: Math.round(sessionVolume(s)), detail: `${DAY_BY_ID[s.dayId].name} · ${shortDate(s.startedAt)}` }))}
      />
      {done.some((s) => s.rpe) && (
        <ChartCard
          title="Fatica percepita (RPE)"
          kind="line"
          unit="/10"
          color="var(--warn)"
          data={done
            .filter((s) => s.rpe)
            .slice(-20)
            .map((s) => ({ key: s.id, label: shortDate(s.startedAt), value: s.rpe!, detail: `${DAY_BY_ID[s.dayId].name} · ${shortDate(s.startedAt)}` }))}
        />
      )}
    </div>
  );
}

function Exercises() {
  const { sessions } = useData();
  const trained = useMemo(() => EXERCISES.map((e) => ({ e, h: exerciseHistory(sessions, e.id) })).filter((x) => x.h.length > 0), [sessions]);
  const [exId, setExId] = useState('');
  if (!trained.length) return <NoData />;
  const cur = trained.find((x) => x.e.id === exId) ?? trained[0];
  const { e: ex, h } = cur;
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
          <ChartCard title="Carico massimo" subtitle={ex.name} kind="line" unit="kg" data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: p.topWeight, detail: `${shortDate(p.date)} · ${p.topReps} rip.` }))} />
          <ChartCard title="Ripetizioni totali" kind="line" unit="rip." color="var(--ok)" data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: p.totalReps }))} />
          <ChartCard title="Volume dell’esercizio" kind="bar" unit="kg" data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: Math.round(p.volume) }))} />
          {h.some((p) => p.bestE1rm > 0) && (
            <ChartCard title="1RM stimato (Epley)" subtitle="stima indicativa da serie fino a 12 ripetizioni" kind="line" unit="kg" color="var(--warn)" data={h.filter((p) => p.bestE1rm > 0).map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: Math.round(p.bestE1rm * 10) / 10 }))} />
          )}
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
  const { sessions } = useData();
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
              const d = DAY_BY_ID[s.dayId];
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

const FIELDS: { key: keyof Measurement; label: string; unit: string }[] = [
  { key: 'bodyWeight', label: 'Peso corporeo', unit: 'kg' },
  { key: 'waist', label: 'Vita', unit: 'cm' },
  { key: 'chest', label: 'Torace', unit: 'cm' },
  { key: 'hips', label: 'Fianchi', unit: 'cm' },
  { key: 'arm', label: 'Braccio', unit: 'cm' },
  { key: 'thigh', label: 'Coscia', unit: 'cm' },
];

function Measurements() {
  const { measurements } = useData();
  const [form, setForm] = useState<Record<string, string>>({ date: isoDate(new Date()) });
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const [field, setField] = useState<keyof Measurement>('bodyWeight');
  const save = async () => {
    const m: Measurement = { id: uid(), date: form.date || isoDate(new Date()), note: form.note?.trim() || undefined };
    let any = false;
    for (const f of FIELDS) {
      const v = parseDecimal(form[f.key as string] ?? '');
      if (v != null) {
        (m as unknown as Record<string, number>)[f.key as string] = v;
        any = true;
      }
    }
    if (!any) return toast('Inserisci almeno una misura');
    await saveMeasurement(m);
    setForm({ date: isoDate(new Date()) });
    setOpen(false);
    toast('Misurazione salvata');
  };
  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
  const series = sorted.filter((m) => m[field] != null);
  const fdef = FIELDS.find((f) => f.key === field)!;
  return (
    <div className="col mt16">
      <button className="btn primary block" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Plus size={17} /> Nuova misurazione
      </button>
      {open && (
        <div className="card col">
          <div>
            <label className="t-label" htmlFor="m-date">
              Data
            </label>
            <input id="m-date" type="date" className="input mt8" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="t-label" htmlFor={`m-${f.key}`}>
                  {f.label} ({f.unit})
                </label>
                <input id={`m-${f.key}`} className="input mt8" inputMode="decimal" value={form[f.key as string] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div>
            <label className="t-label" htmlFor="m-note">
              Nota
            </label>
            <input id="m-note" className="input mt8" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="btn primary block" onClick={save}>
            Salva
          </button>
        </div>
      )}
      {measurements.length === 0 ? (
        <Empty icon={<Ruler size={22} />} title="Nessuna misurazione">
          Facoltativo: registra peso e circonferenze per seguirne l’andamento. Misura sempre nelle stesse condizioni.
        </Empty>
      ) : (
        <>
          <select className="input" value={field as string} onChange={(e) => setField(e.target.value as keyof Measurement)} aria-label="Misura da visualizzare">
            {FIELDS.map((f) => (
              <option key={f.key} value={f.key as string}>
                {f.label}
              </option>
            ))}
          </select>
          {series.length >= 2 ? (
            <ChartCard title={fdef.label} kind="line" unit={fdef.unit} color="var(--warn)" data={series.map((m) => ({ key: m.id, label: shortDate(new Date(m.date + 'T12:00:00')), value: m[field] as number }))} />
          ) : (
            <p className="t-sm c2">Servono almeno due misurazioni di “{fdef.label.toLowerCase()}” per il grafico.</p>
          )}
          <div className="list">
            {[...sorted].reverse().map((m) => (
              <div key={m.id} className="list-row">
                <span className="grow">
                  <b className="t-sm">{new Date(m.date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                  <span className="t-xs c2" style={{ display: 'block' }}>
                    {FIELDS.filter((f) => m[f.key] != null)
                      .map((f) => `${f.label} ${num(m[f.key] as number, 1)} ${f.unit}`)
                      .join(' · ')}
                  </span>
                  {m.note && <span className="t-xs c3">{m.note}</span>}
                </span>
                <button className="icon-btn clear" aria-label="Elimina misurazione" onClick={() => setDel(m.id)}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <Confirm open={!!del} onClose={() => setDel(null)} title="Eliminare la misurazione?" confirmLabel="Elimina" danger onConfirm={() => del && deleteMeasurement(del)} />
    </div>
  );
}

