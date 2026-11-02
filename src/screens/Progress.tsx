import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Ruler, Trash2, Plus } from 'lucide-react';
import { useData } from '../app/store';
import { DAY_BY_ID } from '../data/program';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { deleteMeasurement, saveMeasurement, uid, type Measurement } from '../lib/db';
import { completed, exerciseHistory, frequencyLastWeeks, isoDate, sessionDurationMin, sessionReps, sessionSets, sessionVolume, weekOverWeek, weeklySummaries } from '../lib/stats';
import { monthName, num, shortDate, volume, parseDecimal } from '../lib/format';
import { navigate, useRoute } from '../lib/router';
import { ChartCard } from '../components/Charts';
import { ConfirmSheet, Empty, Section, Segmented, toast } from '../components/ui';

type Tab = 'registro' | 'grafici' | 'calendario' | 'misure';

export function Progress() {
  const { query } = useRoute();
  const tab = (query.get('tab') as Tab) || 'registro';
  const setTab = (t: Tab) => navigate(`/progressi?tab=${t}`, { replace: true });
  return (
    <main className="screen">
      <div className="brandbar">
        <div className="brand">
          FORMA<b>·</b>LAB
        </div>
      </div>
      <h1 className="display h1" style={{ marginTop: 12 }}>
        Progressi
      </h1>
      <p className="text-2 small" style={{ marginTop: 6 }}>
        Solo dati che hai registrato su questo dispositivo.
      </p>
      <div style={{ marginTop: 16, position: 'sticky', top: 'calc(var(--safe-t) + 6px)', zIndex: 20 }}>
        <Segmented
          label="Sezioni progressi"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'registro', label: 'Storico' },
            { value: 'grafici', label: 'Grafici' },
            { value: 'calendario', label: 'Calendario' },
            { value: 'misure', label: 'Misure' },
          ]}
        />
      </div>
      <div key={tab} style={{ animation: 'screen-in .35s var(--ease) both' }}>
        {tab === 'registro' && <Log />}
        {tab === 'grafici' && <Charts />}
        {tab === 'calendario' && <Calendar />}
        {tab === 'misure' && <Measurements />}
      </div>
    </main>
  );
}

function NoData() {
  return (
    <div style={{ marginTop: 20 }}>
      <Empty
        icon={<ClipboardList size={26} />}
        title="Ancora nessun allenamento"
        action={
          <button className="btn primary" onClick={() => navigate('/')}>
            Vai all’allenamento di oggi
          </button>
        }
      >
        Completa la prima seduta: storico, grafici e calendario si costruiscono da soli con i tuoi dati reali.
      </Empty>
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
        <Section key={k} title={k} action={<span className="small muted">{list.length} sedute</span>}>
          <div className="stack" style={{ gap: 8 }}>
            {list.map((s) => {
              const d = DAY_BY_ID[s.dayId];
              return (
                <button key={s.id} className="card tap tight flat" style={{ ['--accent' as string]: d.accent }} onClick={() => navigate(`/sessione/${s.id}`)}>
                  <div className="row between">
                    <div className="row">
                      <span className="dot" />
                      <b>{d.name}</b>
                    </div>
                    <span className="small muted">
                      {new Date(s.startedAt).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="row small text-2 num" style={{ marginTop: 8, gap: 14 }}>
                    <span>{sessionDurationMin(s)} min</span>
                    <span>{sessionSets(s)} serie</span>
                    <span>{sessionReps(s)} rip.</span>
                    <span style={{ color: 'var(--data)' }}>{volume(sessionVolume(s))}</span>
                    {s.rpe ? <span>RPE {s.rpe}</span> : null}
                  </div>
                  {s.note && (
                    <div className="small muted" style={{ marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.note}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>
      ))}
    </>
  );
}

function Charts() {
  const { sessions } = useData();
  const done = completed(sessions);
  const trained = useMemo(() => EXERCISES.filter((e) => exerciseHistory(sessions, e.id).length > 0), [sessions]);
  const [exId, setExId] = useState<string>('');
  const current = exId || trained[0]?.id || '';
  if (!done.length) return <NoData />;

  const weeks = weeklySummaries(sessions).slice(-12);
  const freq = frequencyLastWeeks(sessions, 8);
  const wow = weekOverWeek(sessions);
  const h = current ? exerciseHistory(sessions, current) : [];
  const ex = current ? EXERCISE_BY_ID[current] : null;
  const wk = (w: string) => shortDate(new Date(w + 'T00:00:00'));

  return (
    <div className="stack" style={{ gap: 12, marginTop: 18 }}>
      <div className="card tight">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Questa settimana vs la precedente</div>
        <table className="data">
          <thead>
            <tr>
              <th></th>
              <th>Settimana scorsa</th>
              <th>Questa</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['Sedute', 'sessions', (n: number) => String(n)],
                ['Serie', 'sets', (n: number) => String(n)],
                ['Ripetizioni', 'reps', (n: number) => num(n)],
                ['Volume', 'volume', volume],
              ] as const
            ).map(([label, key, f]) => (
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

      <ChartCard title="Volume settimanale" subtitle="kg × ripetizioni, ultime 12 settimane con dati" kind="bar" unit="kg" highlightLast data={weeks.map((w) => ({ key: w.week, label: wk(w.week), value: Math.round(w.volume), detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard title="Frequenza" subtitle="sedute per settimana, ultime 8 settimane" kind="bar" unit="sedute" color="var(--action)" data={freq.map((w) => ({ key: w.week, label: wk(w.week), value: w.count, detail: `settimana del ${wk(w.week)}` }))} />
      <ChartCard
        title="Volume per seduta"
        kind="line"
        unit="kg"
        data={done.slice(-20).map((s) => ({ key: s.id, label: shortDate(s.startedAt), value: Math.round(sessionVolume(s)), detail: `${DAY_BY_ID[s.dayId].name} · ${shortDate(s.startedAt)}` }))}
      />
      {done.some((s) => s.rpe) && (
        <ChartCard
          title="Difficoltà percepita (RPE)"
          kind="line"
          unit="/10"
          color="var(--progress)"
          data={done.filter((s) => s.rpe).slice(-20).map((s) => ({ key: s.id, label: shortDate(s.startedAt), value: s.rpe!, detail: `${DAY_BY_ID[s.dayId].name} · ${shortDate(s.startedAt)}` }))}
        />
      )}

      <Section title="Per esercizio">
        <select className="input" value={current} onChange={(e) => setExId(e.target.value)} aria-label="Scegli esercizio">
          {trained.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {ex && h.length > 0 && (
          <div className="stack" style={{ gap: 12, marginTop: 12 }}>
            {ex.tracking === 'reps' ? (
              <>
                <ChartCard title="Progressione del carico" subtitle="carico massimo della seduta" kind="line" unit="kg" data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: p.topWeight, detail: `${shortDate(p.date)} · ${p.topReps} rip.` }))} />
                <ChartCard title="Progressione delle ripetizioni" subtitle="ripetizioni totali della seduta" kind="line" unit="rip." color="var(--action)" data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: p.totalReps }))} />
                <ChartCard title="Volume dell’esercizio" kind="bar" unit="kg" data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: Math.round(p.volume) }))} />
                {h.some((p) => p.bestE1rm > 0) && (
                  <ChartCard
                    title="1RM stimato (Epley)"
                    subtitle="stima indicativa da serie fino a 12 ripetizioni"
                    kind="line"
                    unit="kg"
                    color="var(--progress)"
                    data={h.filter((p) => p.bestE1rm > 0).map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: Math.round(p.bestE1rm * 10) / 10 }))}
                  />
                )}
              </>
            ) : (
              <ChartCard title="Durata massima" kind="line" unit="s" data={h.map((p) => ({ key: p.sessionId, label: shortDate(p.date), value: p.topReps }))} />
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function Calendar() {
  const { sessions } = useData();
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const byDay = new Map<string, ReturnType<typeof completed>>();
  completed(sessions).forEach((s) => {
    const k = isoDate(new Date(s.startedAt));
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  });
  const monthCount = [...byDay.entries()].filter(([k]) => k.startsWith(`${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`)).reduce((a, [, v]) => a + v.length, 0);
  return (
    <div style={{ marginTop: 18 }}>
      <div className="card tight">
        <div className="row between" style={{ marginBottom: 12 }}>
          <button className="icon-btn" aria-label="Mese precedente" onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>
              {monthName(first.getMonth())} {first.getFullYear()}
            </div>
            <div className="small muted">{monthCount} sedute completate</div>
          </div>
          <button className="icon-btn" aria-label="Mese successivo" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))}>
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
            const list = byDay.get(k);
            const today = k === isoDate(now);
            return list ? (
              <button
                key={k}
                className={`c done${today ? ' today' : ''}`}
                style={{ ['--cal' as string]: DAY_BY_ID[list[0].dayId].accent }}
                aria-label={`${i + 1}: ${list.map((s) => DAY_BY_ID[s.dayId].name).join(', ')}`}
                onClick={() => navigate(`/sessione/${list[0].id}`)}
              >
                {i + 1}
              </button>
            ) : (
              <div key={k} className={`c${today ? ' today' : ''}`}>
                {i + 1}
              </div>
            );
          })}
        </div>
        <div className="row wrap small text-2" style={{ gap: 12, marginTop: 14 }}>
          {Object.values(DAY_BY_ID).map((d) => (
            <span key={d.id} className="row" style={{ gap: 6, ['--accent' as string]: d.accent }}>
              <span className="dot" /> {d.name}
            </span>
          ))}
        </div>
      </div>
    </div>
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

  const series = measurements.filter((m) => m[field] != null);
  const fdef = FIELDS.find((f) => f.key === field)!;
  return (
    <div className="stack" style={{ gap: 12, marginTop: 18 }}>
      <button className="btn primary block" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Plus size={18} /> Nuova misurazione
      </button>
      {open && (
        <div className="card tight">
          <div className="field">
            <label htmlFor="m-date">Data</label>
            <input id="m-date" type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            {FIELDS.map((f) => (
              <div className="field" key={f.key}>
                <label htmlFor={`m-${f.key}`}>
                  {f.label} ({f.unit})
                </label>
                <input id={`m-${f.key}`} className="input" inputMode="decimal" value={form[f.key as string] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="m-note">Nota</label>
            <input id="m-note" className="input" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="btn primary block" style={{ marginTop: 12 }} onClick={save}>
            Salva
          </button>
        </div>
      )}
      {measurements.length === 0 ? (
        <Empty icon={<Ruler size={26} />} title="Nessuna misurazione">
          Facoltativo: registra peso corporeo e circonferenze per seguirne l’andamento. Misura sempre nelle stesse condizioni (es. al mattino, a digiuno).
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
            <ChartCard title={fdef.label} kind="line" unit={fdef.unit} color="var(--progress)" data={series.map((m) => ({ key: m.id, label: shortDate(new Date(m.date + 'T00:00:00')), value: m[field] as number }))} />
          ) : (
            <p className="small text-2">Servono almeno due misurazioni di “{fdef.label.toLowerCase()}” per il grafico.</p>
          )}
          <div className="stack" style={{ gap: 8 }}>
            {[...measurements].reverse().map((m) => (
              <div key={m.id} className="card tight flat row between">
                <div className="grow">
                  <b>{new Date(m.date + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                  <div className="small text-2">
                    {FIELDS.filter((f) => m[f.key] != null)
                      .map((f) => `${f.label} ${num(m[f.key] as number, 1)} ${f.unit}`)
                      .join(' · ')}
                  </div>
                  {m.note && <div className="small muted">{m.note}</div>}
                </div>
                <button className="icon-btn plain" aria-label="Elimina misurazione" onClick={() => setDel(m.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <ConfirmSheet open={!!del} onClose={() => setDel(null)} title="Eliminare la misurazione?" confirmLabel="Elimina" danger onConfirm={() => del && deleteMeasurement(del)} />
    </div>
  );
}
