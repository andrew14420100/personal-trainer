import { useMemo, useState } from 'react';
import { ArrowRightLeft, CalendarX2, CheckCircle2, ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react';
import { sessionMeta } from '../lib/meta';
import { useData, useSettingsUpdater } from '../app/store';
import { effectiveDay, estimateMinutes } from '../lib/plan';
import { sessionDurationMin, sessionSets, sessionVolume } from '../lib/stats';
import { dateInfo, iso, mondayOf, monthGrid, parseIso, weekDates, addDays, type DateInfo } from '../lib/schedule';
import { fullDate, monthName, volume } from '../lib/format';
import { navigate } from '../lib/router';
import { startSession } from '../lib/workout';
import { AppBar, Notice, Seg, Sheet, toast } from './kit';
import { Legend, StateDots, WeekStrip, stateLabel, weekLabel } from './Week';

const WD = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export function Calendar({ embedded = false, initialView = 'settimana' }: { embedded?: boolean; initialView?: 'settimana' | 'mese' } = {}) {
  const { sessions, settings } = useData();
  const today = iso(new Date());
  const [view, setView] = useState<'settimana' | 'mese'>(initialView);
  const [sel, setSel] = useState(today);
  const [ym, setYm] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }));
  const cells = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const infos = useMemo(() => new Map(cells.filter(Boolean).map((d) => [iso(d!), dateInfo(iso(d!), sessions, settings.moves, today)])), [cells, sessions, settings.moves, today]);
  const monthStats = useMemo(() => {
    let planned = 0;
    let done = 0;
    for (const i of infos.values()) {
      if (i.date > today) continue;
      if (i.plan) planned++;
      if (i.state === 'done') done++;
    }
    return { planned, done };
  }, [infos, today]);
  const shiftMonth = (n: number) => setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  const Wrap = embedded ? 'div' : 'main';
  return (
    <Wrap className={embedded ? undefined : 'page'}>
      {!embedded && <AppBar title="Calendario" />}
      {!embedded && <Seg label="Vista" value={view} onChange={setView} options={[{ value: 'settimana', label: 'Settimana' }, { value: 'mese', label: 'Mese' }]} />}

      {view === 'settimana' ? (
        <div className="card mt12">
          <WeekStrip selected={sel} onSelect={setSel} />
        </div>
      ) : (
        <div className="card mt12">
          <div className="row spread" style={{ marginBottom: 8 }}>
            <button className="icon-btn clear" aria-label="Mese precedente" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={20} />
            </button>
            <button
              className="link"
              style={{ color: 'var(--t1)', textTransform: 'capitalize' }}
              aria-label="Torna al mese corrente"
              onClick={() => {
                setYm({ y: new Date().getFullYear(), m: new Date().getMonth() });
                setSel(today);
              }}
            >
              {monthName(ym.m)} {ym.y}
            </button>
            <button className="icon-btn clear" aria-label="Mese successivo" onClick={() => shiftMonth(1)}>
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="month" role="grid" aria-label={`${monthName(ym.m)} ${ym.y}`}>
            {WD.map((w, i) => (
              <div key={i} className="h" aria-hidden>
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={i} className="mcell out" aria-hidden />;
              const info = infos.get(iso(d))!;
              return (
                <button
                  key={i}
                  className={`mcell${info.date === today ? ' today' : ''}${info.date === sel ? ' sel' : ''}${info.state === 'done' ? ' done' : ''}`}
                  aria-label={`${d.getDate()} ${monthName(d.getMonth())}: ${stateLabel(info)}${info.plan ? ', ' + info.plan.name : ''}`}
                  aria-pressed={info.date === sel}
                  onClick={() => setSel(info.date)}
                >
                  {d.getDate()}
                  <StateDots info={info} />
                </button>
              );
            })}
          </div>
          <p className="t-xs c3 mt12">
            {monthStats.planned ? `Fino a oggi: ${monthStats.done} allenamenti su ${monthStats.planned} programmati.` : 'Nessun allenamento programmato passato in questo mese.'}
          </p>
        </div>
      )}
      <div className="mt8">
        <Legend />
      </div>

      <DayPanel date={sel} />
      {view === 'settimana' && <WeekList date={sel} onSelect={setSel} />}
    </Wrap>
  );
}

function WeekList({ date, onSelect }: { date: string; onSelect: (d: string) => void }) {
  const { sessions, settings } = useData();
  const today = iso(new Date());
  const monday = mondayOf(parseIso(date));
  const infos = weekDates(monday).map((d) => dateInfo(iso(d), sessions, settings.moves, today));
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="t-h2">Settimana {weekLabel(monday)}</h2>
      </div>
      <div className="list">
        {infos.map((i) => (
          <button key={i.date} className="list-row" style={i.plan ? { ['--day' as string]: i.plan.accent } : undefined} onClick={() => onSelect(i.date)} aria-pressed={i.date === date}>
            <span style={{ width: 44, textAlign: 'center' }}>
              <span className="t-xs c3" style={{ display: 'block', textTransform: 'capitalize' }}>
                {parseIso(i.date).toLocaleDateString('it-IT', { weekday: 'short' })}
              </span>
              <span className="t-h3">{parseIso(i.date).getDate()}</span>
            </span>
            <span className="grow">
              <span className="t-sm" style={{ display: 'block', fontWeight: 650, color: i.plan || i.sessions.length ? 'var(--t1)' : 'var(--t3)' }}>
                {i.sessions[0] ? sessionMeta(i.sessions[0], settings).name : i.plan ? i.plan.name : i.movedOut ? `${i.movedOut.day.name} (spostato)` : 'Riposo'}
              </span>
              <span className={`t-xs ${i.state === 'done' ? 'c-ok' : i.state === 'skipped' ? 'c-bad' : 'c3'}`}>{stateLabel(i)}</span>
            </span>
            {i.state === 'done' ? <CheckCircle2 size={18} color="var(--ok)" /> : i.plan ? <span className="dot" /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function originOf(date: string, moves: Record<string, string>, info: DateInfo): string | null {
  if (info.movedIn) return Object.entries(moves).find(([f, t]) => t === date && f !== date)?.[0] ?? null;
  return info.plan ? date : null;
}

export function DayPanel({ date }: { date: string }) {
  const { sessions, settings, calibration, active } = useData();
  const update = useSettingsUpdater();
  const today = iso(new Date());
  const info = dateInfo(date, sessions, settings.moves, today);
  const [move, setMove] = useState(false);
  const [to, setTo] = useState(iso(addDays(parseIso(date), 1)));
  const origin = originOf(date, settings.moves, info);
  const d = parseIso(date);
  const isPast = date < today;
  const slots = info.plan ? effectiveDay(info.plan.id, settings, calibration) : [];

  const setMoveTo = (from: string, target: string | null) =>
    update((s) => {
      const m = { ...s.moves };
      if (target == null || target === from) delete m[from];
      else m[from] = target;
      return { ...s, moves: m };
    });

  return (
    <section className="section" aria-label="Giorno selezionato">
      <div className="section-head">
        <h2 className="t-h2" style={{ textTransform: 'capitalize' }}>
          {fullDate(d)}
        </h2>
        <span className={`chip ${info.state === 'done' ? 'ok' : info.state === 'skipped' ? 'bad' : info.state === 'today' ? 'accent' : ''}`}>{stateLabel(info)}</span>
      </div>

      {info.sessions.map((s) => (
        <button key={s.id} className="card tap" style={{ marginBottom: 8, ['--day' as string]: sessionMeta(s, settings).accent }} onClick={() => navigate(`/sessione/${s.id}`)}>
          <div className="t-label" style={{ color: 'var(--ok)' }}>
            <CheckCircle2 size={12} /> Completato
          </div>
          <div className="t-h3 mt8">{sessionMeta(s, settings).name}</div>
          <div className="t-sm c2" style={{ marginTop: 4 }}>
            {sessionDurationMin(s)} min · {sessionSets(s)} serie · {volume(sessionVolume(s))}
          </div>
        </button>
      ))}

      {info.plan && !info.sessions.length && (
        <div className="card" style={{ ['--day' as string]: info.plan.accent }}>
          <div className="row">
            <span className="dot" />
            <span className="t-label">
              {info.plan.code}
              {info.movedIn && origin ? ` · spostato dal ${parseIso(origin).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}` : ''}
            </span>
          </div>
          <div className="t-h3 mt8">{info.plan.name}</div>
          <div className="t-sm c2" style={{ marginTop: 4 }}>
            {slots.length} esercizi · ~{estimateMinutes(slots)} min
          </div>
          <div className="row wrap mt12">
            {date === today && !active && (
              <button
                className="btn primary"
                onClick={async () => {
                  await startSession(info.plan!.id, settings, calibration, sessions);
                  navigate('/allenamento');
                }}
              >
                <Play size={16} fill="currentColor" /> Inizia
              </button>
            )}
            <button className="btn" onClick={() => navigate(`/giorno/${info.plan!.id}`)}>
              Apri
            </button>
            {origin && (
              <button className="btn ghost" onClick={() => setMove(true)}>
                <ArrowRightLeft size={16} /> Sposta
              </button>
            )}
            {info.movedIn && origin && (
              <button className="btn ghost" onClick={() => setMoveTo(origin, null).then(() => toast('Data originale ripristinata'))}>
                <RotateCcw size={16} /> Ripristina
              </button>
            )}
          </div>
          {isPast && <p className="t-xs c3 mt12">Data passata senza un allenamento registrato: risulta saltato. Puoi spostarlo a un altro giorno.</p>}
        </div>
      )}

      {info.movedOut && (
        <div className="card mt8">
          <div className="t-sm">
            <b>{info.movedOut.day.name}</b> {info.movedOut.to ? `spostato a ${fullDate(parseIso(info.movedOut.to))}` : 'annullato per questa settimana'}.
          </div>
          <button className="btn sm ghost mt8" onClick={() => setMoveTo(date, null).then(() => toast('Data originale ripristinata'))}>
            <RotateCcw size={15} /> Ripristina in questa data
          </button>
        </div>
      )}

      {!info.plan && !info.sessions.length && !info.movedOut && <p className="t-sm c3">Giorno di riposo: nessun allenamento programmato.</p>}

      <Sheet open={move} onClose={() => setMove(false)} label="Sposta allenamento">
        {origin && info.plan && (
          <div className="col">
            <h3 className="t-h2">Sposta “{info.plan.name}”</h3>
            <p className="t-sm c2" style={{ margin: 0 }}>
              Data prevista: {fullDate(parseIso(origin))}. Scegli il nuovo giorno: il calendario mostrerà lo spostamento e potrai ripristinarlo.
            </p>
            <label className="t-label" htmlFor="move-to">
              Nuova data
            </label>
            <input id="move-to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            {to && dateInfo(to, sessions, settings.moves, today).plan && to !== date && (
              <Notice>In quella data è già previsto un allenamento: verrà sostituito da questo (l’altro resta spostabile).</Notice>
            )}
            <button
              className="btn primary lg block"
              disabled={!/^\d{4}-\d{2}-\d{2}$/.test(to)}
              onClick={async () => {
                await setMoveTo(origin, to);
                setMove(false);
                toast(`Spostato a ${fullDate(parseIso(to))}`);
              }}
            >
              Sposta
            </button>
            <button
              className="btn block ghost"
              onClick={async () => {
                await update((s) => ({ ...s, moves: { ...s.moves, [origin]: '' } }));
                setMove(false);
                toast('Allenamento annullato per quella data');
              }}
            >
              <CalendarX2 size={16} /> Annulla solo questa volta
            </button>
          </div>
        )}
      </Sheet>
    </section>
  );
}

