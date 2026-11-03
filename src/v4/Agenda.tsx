// 5.0 Agenda: day view with a visible week strip (default), week/month calendar, personal events,
// automatic rescheduling notices with undo, weekly comparison.
import { useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Clock, Lock, Moon, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { slotsForPlanDay } from '../lib/library';
import { useData, useSettingsUpdater } from '../app/store';
import { aggregate, MUSCLE_REGION } from '../data/muscles';
import { estimateMinutes } from '../lib/plan';
import { completed, sessionDurationMin, sessionReps, sessionSets, sessionVolume, weekStart } from '../lib/stats';
import { prTimeline } from '../lib/records';
import { addDays, dateInfo, iso, mondayOf, parseIso } from '../lib/schedule';
import { fullDate, num, volume } from '../lib/format';
import { sessionMeta } from '../lib/meta';
import { uid } from '../lib/db';
import { navigate } from '../lib/router';
import { AppBar, Section, Seg, Sheet, Switch, toast } from './kit';
import { Legend, WeekStrip } from './Week';
import { Calendar, DayPanel } from './Calendar';

type View = 'giorno' | 'settimana' | 'mese';

export function Agenda() {
  const today = iso(new Date());
  const [view, setView] = useState<View>('giorno');
  const [date, setDate] = useState(today);
  const [key, setKey] = useState(0); // remounts the week strip when jumping far
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = (d: string, jump = false) => {
    setDate(d);
    if (jump) setKey((k) => k + 1);
  };
  const shift = (n: number) => {
    const d = iso(addDays(parseIso(date), n));
    go(d, mondayOf(parseIso(d)).getTime() !== mondayOf(parseIso(date)).getTime());
  };
  return (
    <main className="page">
      <AppBar title="Agenda" />
      <Seg<View>
        label="Vista agenda"
        value={view}
        onChange={setView}
        options={[
          { value: 'giorno', label: 'Giorno' },
          { value: 'settimana', label: 'Settimana' },
          { value: 'mese', label: 'Mese' },
        ]}
      />
      {view === 'giorno' ? (
        <>
          <div className="card mt12">
            <WeekStrip key={key} selected={date} onSelect={(d) => go(d)} />
            <div className="mt8">
              <Legend />
            </div>
          </div>
          <div className="row mt12">
            <button className="icon-btn" aria-label="Giorno precedente" onClick={() => shift(-1)}>
              <ChevronLeft size={20} />
            </button>
            <input type="date" className="input grow" aria-label="Scegli data" value={date} onChange={(e) => e.target.value && go(e.target.value, true)} />
            <button className="icon-btn" aria-label="Giorno successivo" onClick={() => shift(1)}>
              <ChevronRight size={20} />
            </button>
            {date !== today && (
              <button className="btn sm" onClick={() => go(today, true)}>
                Oggi
              </button>
            )}
          </div>
          <div
            onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
            onTouchEnd={(e) => {
              const t = touch.current;
              touch.current = null;
              if (!t) return;
              const dx = e.changedTouches[0].clientX - t.x;
              const dy = e.changedTouches[0].clientY - t.y;
              if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1);
            }}
          >
            <RescheduleNotices />
            <DayAgenda date={date} />
          </div>
          <WeekCompare />
        </>
      ) : (
        <div className="mt12">
          <Calendar embedded initialView={view} key={view} />
        </div>
      )}
    </main>
  );
}

/** Automatic reschedules with an undo action. */
export function RescheduleNotices() {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const recent = settings.autoMoves.filter((m) => settings.moves[m.from] === m.to && m.to >= iso(addDays(new Date(), -1)));
  if (!recent.length) return null;
  return (
    <div className="col mt12" style={{ gap: 8 }}>
      {recent.map((m) => {
        const plan = dateInfo(m.to, [], settings.moves, iso(new Date())).plan;
        return (
          <div key={m.from} className="card change-banner row" role="status">
            <CalendarClock size={20} color="var(--accent)" />
            <span className="grow t-sm">
              <b>{plan?.name ?? 'Allenamento'}</b> saltato il {fullDate(parseIso(m.from))}: spostato a <b>{fullDate(parseIso(m.to))}</b>.
            </span>
            <button
              className="btn sm"
              onClick={() =>
                update((s) => {
                  const moves = { ...s.moves };
                  delete moves[m.from];
                  return { ...s, moves, autoMoves: s.autoMoves.filter((x) => x.from !== m.from), dismissedMisses: [...s.dismissedMisses, m.from] };
                }).then(() => toast('Riprogrammazione annullata: la seduta resta saltata'))
              }
            >
              <RotateCcw size={14} /> Annulla
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DayAgenda({ date }: { date: string }) {
  const { sessions, settings, calibration } = useData();
  const update = useSettingsUpdater();
  const today = iso(new Date());
  const info = dateInfo(date, sessions, settings.moves, today);
  const events = settings.events.filter((e) => e.date === date).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const [add, setAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [blocks, setBlocks] = useState(false);
  const slots = info.plan ? slotsForPlanDay(info.plan, settings, calibration) : [];
  const regions = [...new Set(aggregate(slots.map((s) => s.exerciseId)).primary.map((m) => MUSCLE_REGION[m]))];
  const nextPlan = (() => {
    for (let i = 1; i <= 7; i++) {
      const d = iso(addDays(parseIso(date), i));
      const p = dateInfo(d, sessions, settings.moves, today).plan;
      if (p) return { d, p };
    }
    return null;
  })();
  return (
    <Section title={fullDate(parseIso(date))} label="Agenda del giorno">
      <div className="col" style={{ gap: 8 }}>
        {info.sessions.map((s) => (
          <button key={s.id} className="card tap agenda-item done" style={{ ['--day' as string]: sessionMeta(s, settings).accent }} onClick={() => navigate(`/sessione/${s.id}`)}>
            <span className="time">{new Date(s.startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>
              <span className="t-h3 ttl" style={{ display: 'block' }}>
                {sessionMeta(s, settings).name}
              </span>
              <span className="t-xs c2">
                {sessionDurationMin(s)} min · {sessionSets(s)} serie · {volume(sessionVolume(s))}
              </span>
            </span>
            <CheckCircle2 size={24} color="var(--ok)" aria-label="Completato" />
          </button>
        ))}
        {events.map((e) => (
          <div key={e.id} className="card agenda-item">
            <span className="time">{e.time || '—'}</span>
            <span>
              <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                {e.title}
              </span>
              <span className="t-xs c3">{e.blocks ? 'Impegno: niente allenamenti spostati qui' : 'Impegno personale'}</span>
            </span>
            <button className="icon-btn clear" aria-label={`Elimina ${e.title}`} onClick={() => update((s) => ({ ...s, events: s.events.filter((x) => x.id !== e.id) }))}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {info.plan && !info.sessions.length && (
          <div data-plan={info.plan.id}>
            <DayPanel date={date} />
          </div>
        )}
        {!info.plan && !info.sessions.length && (
          <div className="card rest-card row" style={{ gap: 14 }}>
            <Moon size={26} color="var(--accent)" />
            <span className="grow">
              <span className="t-h3" style={{ display: 'block' }}>
                {info.movedOut ? 'Allenamento spostato' : 'Giorno di riposo'}
              </span>
              <span className="t-sm c2">
                {info.movedOut
                  ? `${info.movedOut.day.name} → ${info.movedOut.to ? fullDate(parseIso(info.movedOut.to)) : 'annullato'}`
                  : nextPlan
                    ? `Prossimo: ${nextPlan.p.name}, ${fullDate(parseIso(nextPlan.d))}`
                    : 'Recupera bene: il recupero fa parte del programma.'}
              </span>
            </span>
          </div>
        )}
        {info.plan && !info.sessions.length && regions.length > 0 && (
          <div className="chips">
            {regions.map((r) => (
              <span key={r} className="chip">
                {r}
              </span>
            ))}
            <span className="chip">
              <Clock size={12} /> ~{estimateMinutes(slots)} min
            </span>
          </div>
        )}
        <button className="btn ghost" onClick={() => setAdd(true)}>
          <Plus size={16} /> Aggiungi impegno
        </button>
      </div>
      <Sheet open={add} onClose={() => setAdd(false)} label="Nuovo impegno">
        <div className="col">
          <h3 className="t-h2">Nuovo impegno · {fullDate(parseIso(date))}</h3>
          <input className="input" placeholder="Titolo (es. Cena, lavoro, viaggio)" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titolo impegno" />
          <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Orario impegno" />
          <div className="row">
            <span className="grow t-sm">
              <Lock size={14} /> Blocca la giornata (la riprogrammazione automatica non sposta allenamenti qui)
            </span>
            <Switch checked={blocks} onChange={setBlocks} label="Blocca la giornata" />
          </div>
          <button
            className="btn primary block"
            onClick={async () => {
              if (!title.trim()) return toast('Scrivi un titolo');
              await update((s) => ({ ...s, events: [...s.events, { id: uid(), date, time: time || undefined, title: title.trim(), blocks }] }));
              setTitle('');
              setTime('');
              setBlocks(false);
              setAdd(false);
              toast('Impegno aggiunto');
            }}
          >
            Salva
          </button>
        </div>
      </Sheet>
    </Section>
  );
}

/** This week vs last week on every available indicator. */
export function WeekCompare() {
  const { sessions } = useData();
  const thisW = weekStart(Date.now());
  const prevD = new Date(thisW + 'T12:00:00');
  prevD.setDate(prevD.getDate() - 7);
  const prevW = weekStart(prevD);
  const pick = (w: string) => completed(sessions).filter((s) => weekStart(s.startedAt) === w);
  const a = pick(prevW);
  const b = pick(thisW);
  const prs = prTimeline(sessions);
  const prIn = (w: string) => prs.filter((p) => weekStart(p.date) === w).length;
  const rows: [string, number, number, (n: number) => string][] = [
    ['Allenamenti', a.length, b.length, (n) => String(n)],
    ['Giorni attivi', new Set(a.map((s) => iso(new Date(s.startedAt)))).size, new Set(b.map((s) => iso(new Date(s.startedAt)))).size, (n) => String(n)],
    ['Serie', a.reduce((x, s) => x + sessionSets(s), 0), b.reduce((x, s) => x + sessionSets(s), 0), (n) => String(n)],
    ['Ripetizioni', a.reduce((x, s) => x + sessionReps(s), 0), b.reduce((x, s) => x + sessionReps(s), 0), (n) => num(n)],
    ['Volume', a.reduce((x, s) => x + sessionVolume(s), 0), b.reduce((x, s) => x + sessionVolume(s), 0), volume],
    ['Tempo attivo', a.reduce((x, s) => x + sessionDurationMin(s), 0), b.reduce((x, s) => x + sessionDurationMin(s), 0), (n) => `${n} min`],
    ['Record', prIn(prevW), prIn(thisW), (n) => String(n)],
  ];
  return (
    <Section title="Confronto settimanale">
      <div className="card tight">
        <table className="data">
          <thead>
            <tr>
              <th></th>
              <th>Scorsa</th>
              <th>Questa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([l, x, y, f]) => (
              <tr key={l}>
                <td>{l}</td>
                <td>{f(x)}</td>
                <td>
                  <b style={{ color: y > x ? 'var(--ok)' : undefined }}>{f(y)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="t-xs c3 mt8" style={{ marginBottom: 0 }}>
          Settimane da lunedì a domenica. Quella in corso potrebbe non essere conclusa.
        </p>
      </div>
    </Section>
  );
}

