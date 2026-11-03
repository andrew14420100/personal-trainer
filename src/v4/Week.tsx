import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../app/store';
import { addDays, dateInfo, iso, mondayOf, parseIso, weekDates, type DateInfo } from '../lib/schedule';

const WD = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export function weekLabel(monday: Date): string {
  const sun = addDays(monday, 6);
  const sameMonth = monday.getMonth() === sun.getMonth();
  const sameYear = monday.getFullYear() === sun.getFullYear();
  return `${monday.getDate()}${sameMonth ? '' : ' ' + MONTHS[monday.getMonth()]}${sameYear ? '' : ' ' + monday.getFullYear()} – ${sun.getDate()} ${MONTHS[sun.getMonth()]} ${sun.getFullYear()}`;
}

export function StateDots({ info }: { info: DateInfo }) {
  const c = info.state === 'done' ? 'st-done' : info.state === 'skipped' ? 'st-skipped' : info.plan ? 'st-planned' : '';
  return (
    <span className="st" aria-hidden>
      {c && <i className={c} style={info.plan ? ({ ['--day' as string]: info.plan.accent } as React.CSSProperties) : undefined} />}
      {(info.movedIn || info.movedOut) && <i className="st-moved" />}
    </span>
  );
}

export function stateLabel(info: DateInfo): string {
  switch (info.state) {
    case 'done':
      return 'Completato';
    case 'today':
      return 'Oggi';
    case 'skipped':
      return 'Saltato';
    case 'planned':
      return info.movedIn ? 'Spostato qui' : 'Programmato';
    default:
      return info.movedOut ? 'Spostato' : 'Riposo';
  }
}

/** Monday-first week strip with previous/next week navigation. */
export function WeekStrip({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const { sessions, settings } = useData();
  const today = iso(new Date());
  const [monday, setMonday] = useState(() => mondayOf(parseIso(selected)));
  const infos = useMemo(() => weekDates(monday).map((d) => dateInfo(iso(d), sessions, settings.moves, today)), [monday, sessions, settings.moves, today]);
  const isThisWeek = iso(monday) === iso(mondayOf(new Date()));
  return (
    <div>
      <div className="row spread" style={{ marginBottom: 6 }}>
        <button className="icon-btn clear" aria-label="Settimana precedente" onClick={() => setMonday((m) => addDays(m, -7))}>
          <ChevronLeft size={20} />
        </button>
        <button
          className="link"
          style={{ color: 'var(--t1)' }}
          onClick={() => {
            setMonday(mondayOf(new Date()));
            onSelect(today);
          }}
          aria-label="Torna a questa settimana"
        >
          {isThisWeek ? 'Questa settimana' : weekLabel(monday)}
        </button>
        <button className="icon-btn clear" aria-label="Settimana successiva" onClick={() => setMonday((m) => addDays(m, 7))}>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="week" role="list" aria-label={weekLabel(monday)}>
        {infos.map((info, i) => {
          const d = parseIso(info.date);
          return (
            <button
              key={info.date}
              role="listitem"
              className={`wday${info.date === today ? ' today' : ''}${info.date === selected ? ' sel' : ''}${info.state === 'done' ? ' done' : ''}`}
              aria-label={`${WD[i]} ${d.getDate()} ${MONTHS[d.getMonth()]}: ${stateLabel(info)}${info.plan ? ', ' + info.plan.name : ''}`}
              aria-pressed={info.date === selected}
              onClick={() => onSelect(info.date)}
            >
              <span className="wd">{WD[i]}</span>
              <span className="dn">{d.getDate()}</span>
              <StateDots info={info} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Legend() {
  return (
    <div className="legend">
      <span>
        <i className="st-done" /> completato
      </span>
      <span>
        <i className="st-planned" style={{ ['--day' as string]: 'var(--t2)' } as React.CSSProperties} /> programmato
      </span>
      <span>
        <i className="st-skipped" /> saltato
      </span>
      <span>
        <i className="st-moved" /> spostato
      </span>
    </div>
  );
}
