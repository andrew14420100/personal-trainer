import { useMemo, useState } from 'react';
import { Activity, ArrowRight, CalendarCheck, CheckCircle2, Clock, Dumbbell, Flame, Star, TrendingUp, Moon } from 'lucide-react';
import { useData } from '../app/store';
import { DAYS, DAY_BY_ID, dayForWeekday, nextScheduledDay } from '../data/program';
import { EXERCISE_BY_ID } from '../data/exercises';
import { effectiveDay, estimateMinutes, CALIBRATION_SESSIONS } from '../lib/plan';
import { completed, exerciseHistory, isoDate, sessionDurationMin, sessionVolume, weekOverWeek, weekStart } from '../lib/stats';
import { fullDate, greeting, num, relativeDays, shortDate, volume } from '../lib/format';
import { navigate } from '../lib/router';
import { startSession } from '../lib/workout';
import { Empty, Notice, Section, Sheet } from '../components/ui';
import { photoCredit, restDayPhoto } from '../data/media';
import type { DayId } from '../data/types';
import { youtubeThumb } from '../data/videos';
import { VIDEOS_BY_EXERCISE } from '../data/videos';

export function Home() {
  const data = useData();
  const { sessions, settings, calibration, active } = data;
  const now = new Date();
  const todayDay = dayForWeekday(now.getDay());
  const next = nextScheduledDay(now, !todayDay);
  const done = completed(sessions);
  const todayKey = isoDate(now);
  const todayDone = todayDay ? done.find((s) => s.dayId === todayDay.id && isoDate(new Date(s.startedAt)) === todayKey) : undefined;
  const [pick, setPick] = useState(false);

  const shown = todayDay ?? next.day;
  const slots = effectiveDay(shown.id, settings, calibration);
  const minutes = estimateMinutes(slots);

  const begin = async (dayId: DayId) => {
    if (active) return navigate('/allenamento');
    await startSession(dayId, settings, calibration, sessions);
    navigate('/allenamento');
  };

  return (
    <main className="screen" style={{ ['--accent' as string]: shown.accent }}>
      <div className="brandbar">
        <div className="brand">
          FORMA<b>·</b>LAB
        </div>
        <span className="chip">{fullDate(now)}</span>
      </div>

      <h1 className="display h2" style={{ margin: '14px 0 16px' }}>
        {greeting(now, settings.name)}
      </h1>

      {/* ── Today hero ─────────────────────────────────────────── */}
      <article className="hero" aria-label="Allenamento di oggi">
        <img className="hero-img" src={todayDay ? shown.photo : restDayPhoto} alt="" style={{ objectPosition: shown.photoPosition }} />
        <span className="credit">{photoCredit(todayDay ? shown.photo : restDayPhoto)}</span>
        {todayDay ? (
          <>
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>
              Oggi · {todayDay.weekdayLabel}
            </div>
            <h2 className="display h1" style={{ marginTop: 8 }}>
              {todayDay.name}
            </h2>
            <p className="text-2" style={{ marginTop: 6 }}>
              {todayDay.title}
            </p>
          </>
        ) : (
          <>
            <div className="eyebrow">
              <Moon size={13} style={{ verticalAlign: '-2px' }} /> Giorno di recupero
            </div>
            <h2 className="display h1" style={{ marginTop: 8 }}>
              Recupero
            </h2>
            <p className="text-2" style={{ marginTop: 6 }}>
              Prossimo: <b style={{ color: 'var(--accent)' }}>{next.day.name}</b> · {next.day.weekdayLabel} ({relativeDays(next.date.getTime())})
            </p>
          </>
        )}
        <div className="chips" style={{ marginTop: 14 }}>
          {shown.focus.map((f) => (
            <span key={f} className="chip">
              {f}
            </span>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14, gap: 16 }}>
          <span className="row small text-2" style={{ gap: 6 }}>
            <Clock size={16} /> ~{minutes} min
          </span>
          <span className="row small text-2" style={{ gap: 6 }}>
            <Dumbbell size={16} /> {slots.length} esercizi
          </span>
          <span className="row small text-2" style={{ gap: 6 }}>
            <Activity size={16} /> {slots.reduce((a, s) => a + s.todaySets, 0)} serie
          </span>
        </div>

        <div style={{ marginTop: 18 }}>
          {active ? (
            <button className="btn primary lg block" onClick={() => navigate('/allenamento')}>
              Riprendi allenamento <ArrowRight size={20} />
            </button>
          ) : todayDone ? (
            <div className="stack" style={{ gap: 10 }}>
              <div className="row" style={{ color: 'var(--right)', fontWeight: 700 }}>
                <CheckCircle2 size={20} /> Allenamento di oggi completato
              </div>
              <button className="btn block" onClick={() => navigate(`/riepilogo/${todayDone.id}`)}>
                Vedi riepilogo
              </button>
            </div>
          ) : todayDay ? (
            <button className="btn accent lg block" onClick={() => begin(todayDay.id)}>
              Inizia allenamento <ArrowRight size={20} />
            </button>
          ) : (
            <button className="btn lg block" onClick={() => setPick(true)}>
              Allenati comunque
            </button>
          )}
        </div>
        {active && (
          <p className="small text-2" style={{ marginTop: 10 }}>
            In corso: {DAY_BY_ID[active.dayId].name} · {active.exercises.filter((l) => l.sets.some((s) => s.done)).length}/{active.exercises.length} esercizi avviati
          </p>
        )}
        {!active && !todayDone && todayDay && (
          <p className="small text-2" style={{ marginTop: 10 }}>
            Stato: non iniziato ·{' '}
            <button className="link" style={{ padding: 0 }} onClick={() => setPick(true)}>
              scegli un altro giorno
            </button>
          </p>
        )}
      </article>

      {calibration && (
        <div style={{ marginTop: 14 }}>
          <Notice kind="info">
            <b>Settimana di calibrazione.</b> Le prime {CALIBRATION_SESSIONS} sedute usano un volume ridotto (gli esercizi da 3 serie diventano 2). Scegli carichi che ti lascino 2–3 ripetizioni di margine. Puoi
            modificarlo in Profilo.
          </Notice>
        </div>
      )}

      <WeekStrip />

      <Stats />

      <Section title="I quattro allenamenti" action={<button className="link" onClick={() => navigate('/scheda')}>Scheda completa</button>}>
        <div className="stack" style={{ gap: 10 }}>
          {DAYS.map((d) => {
            const sl = effectiveDay(d.id, settings, calibration);
            const last = [...done].reverse().find((s) => s.dayId === d.id);
            return (
              <button key={d.id} className="day-card" style={{ ['--accent' as string]: d.accent, minHeight: 112 }} onClick={() => navigate(`/giorno/${d.id}`)}>
                <img src={d.photo} alt="" style={{ objectPosition: d.photoPosition }} loading="lazy" />
                <span className="bar" />
                <div className="grow">
                  <div className="eyebrow" style={{ color: 'var(--accent)' }}>
                    {d.weekdayLabel}
                  </div>
                  <div className="display h3" style={{ marginTop: 4 }}>
                    {d.name}
                  </div>
                  <div className="small text-2" style={{ marginTop: 4 }}>
                    {sl.length} esercizi · ~{estimateMinutes(sl)} min · {last ? `ultima ${shortDate(last.startedAt)}` : 'mai eseguito'}
                  </div>
                </div>
                <ArrowRight size={20} />
              </button>
            );
          })}
        </div>
      </Section>

      <Favorites />

      <Sheet open={pick} onClose={() => setPick(false)} label="Scegli l’allenamento">
        <h3 className="display h3" style={{ marginBottom: 12 }}>
          Quale allenamento?
        </h3>
        <div className="stack" style={{ gap: 8 }}>
          {DAYS.map((d) => (
            <button
              key={d.id}
              className="btn block"
              style={{ justifyContent: 'space-between', ['--accent' as string]: d.accent }}
              onClick={() => {
                setPick(false);
                void begin(d.id);
              }}
            >
              <span className="row">
                <span className="dot" /> {d.name}
              </span>
              <span className="small muted">{d.weekdayLabel}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </main>
  );
}

function WeekStrip() {
  const { sessions } = useData();
  const now = new Date();
  const start = new Date(weekStart(now) + 'T00:00:00');
  const doneDays = new Map<string, DayId>();
  completed(sessions).forEach((s) => doneDays.set(isoDate(new Date(s.startedAt)), s.dayId));
  const labels = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
  const weekDone = completed(sessions).filter((s) => weekStart(s.startedAt) === weekStart(now));
  const planned = DAYS.length;
  const pct = Math.min(1, weekDone.length / planned);
  const minutes = weekDone.reduce((a, s) => a + sessionDurationMin(s), 0);
  const vol = weekDone.reduce((a, s) => a + sessionVolume(s), 0);
  return (
    <Section title="Questa settimana" action={<button className="link" onClick={() => navigate('/calendario')}>Calendario</button>}>
      <div className="card tight row" style={{ gap: 16, marginBottom: 10 }}>
        <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`${weekDone.length} allenamenti su ${planned} programmati`}>
          <circle cx="38" cy="38" r="31" fill="none" stroke="var(--surface-3)" strokeWidth="8" />
          <circle
            cx="38"
            cy="38"
            r="31"
            fill="none"
            stroke="var(--action)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 31 * pct} ${2 * Math.PI * 31}`}
            transform="rotate(-90 38 38)"
            style={{ transition: 'stroke-dasharray .8s var(--ease)' }}
          />
          <text x="38" y="44" textAnchor="middle" fill="var(--text)" style={{ font: '800 19px var(--display)' }}>
            {weekDone.length}/{planned}
          </text>
        </svg>
        <div className="grow">
          <div style={{ fontWeight: 750 }}>{weekDone.length >= planned ? 'Settimana completata' : weekDone.length ? 'Settimana in corso' : 'Settimana da iniziare'}</div>
          <div className="small text-2" style={{ marginTop: 4 }}>
            {weekDone.length ? `${minutes} min · ${volume(vol)} di volume` : 'Nessuna seduta registrata in questa settimana.'}
          </div>
        </div>
      </div>
      <div className="week" role="list">
        {labels.map((l, i) => {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const key = isoDate(d);
          const plan = dayForWeekday(d.getDay());
          const did = doneDays.get(key);
          const color = did ? DAY_BY_ID[did].accent : plan?.accent;
          return (
            <div
              role="listitem"
              key={key}
              className={`week-day${key === isoDate(now) ? ' today' : ''}`}
              style={{ ['--pip' as string]: color }}
              aria-label={`${l} ${d.getDate()}: ${did ? 'allenamento completato' : plan ? `previsto ${plan.name}` : 'riposo'}`}
            >
              {l}
              <b>{d.getDate()}</b>
              <span className={`pip${did ? ' done' : plan ? ' plan' : ''}`} />
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function Stats() {
  const { sessions } = useData();
  const done = completed(sessions);
  const wow = weekOverWeek(sessions);
  const now = new Date();
  const next = nextScheduledDay(now, false);

  const progress = useMemo(() => {
    const ids = [...new Set(done.flatMap((s) => s.exercises.map((e) => e.exerciseId)))];
    return ids
      .map((id) => {
        const h = exerciseHistory(sessions, id).filter((p) => p.topWeight > 0);
        if (h.length < 2) return null;
        return { id, first: h[0].topWeight, last: h[h.length - 1].topWeight, n: h.length };
      })
      .filter((x): x is { id: string; first: number; last: number; n: number } => !!x)
      .sort((a, b) => (b.last - b.first) / b.first - (a.last - a.first) / a.first)
      .slice(0, 3);
  }, [done, sessions]);

  if (!done.length) {
    return (
      <Section title="Statistiche">
        <Empty icon={<Flame size={26} />} title="Il tuo registro parte da zero">
          Qui compariranno allenamenti completati, volume, confronti settimanali e progressione dei carichi — calcolati solo dai dati che registri. Nessun numero dimostrativo.
        </Empty>
      </Section>
    );
  }
  const last = done[done.length - 1];
  const totalVolume = done.reduce((a, s) => a + sessionVolume(s), 0);
  return (
    <Section title="Statistiche" action={<button className="link" onClick={() => navigate('/progressi?tab=grafici')}>Grafici</button>}>
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Allenamenti completati</div>
          <div className="stat-value">{done.length}</div>
          <div className="stat-sub">{wow.cur ? `${wow.cur.sessions} questa settimana` : 'nessuno questa settimana'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Volume settimana</div>
          <div className="stat-value" style={{ color: 'var(--data)' }}>
            {volume(wow.cur?.volume ?? 0)}
          </div>
          <div className="stat-sub">
            {wow.volumePct == null ? (
              wow.prev ? 'settimana scorsa senza carichi' : 'nessun dato la settimana scorsa'
            ) : (
              <span className={wow.volumePct >= 0 ? 'up' : 'down'}>
                {wow.volumePct >= 0 ? '+' : ''}
                {num(wow.volumePct, 0)}% vs settimana scorsa
              </span>
            )}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Ultima sessione</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {DAY_BY_ID[last.dayId].name}
          </div>
          <div className="stat-sub">
            {relativeDays(last.startedAt)} · {volume(sessionVolume(last))}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Prossimo allenamento</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {next.day.name}
          </div>
          <div className="stat-sub">
            {next.day.weekdayLabel} · {relativeDays(next.date.getTime())}
          </div>
        </div>
      </div>
      <div className="card tight" style={{ marginTop: 10 }}>
        <div className="row between">
          <div className="row" style={{ gap: 8, fontWeight: 700 }}>
            <TrendingUp size={18} color="var(--progress)" /> Progressione carichi
          </div>
          <span className="small muted" style={{ whiteSpace: 'nowrap' }}>
            totale {volume(totalVolume)}
          </span>
        </div>
        {progress.length ? (
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            {progress.map((p) => {
              const pct = ((p.last - p.first) / p.first) * 100;
              return (
                <button key={p.id} className="row between tap-row" onClick={() => navigate(`/esercizio/${p.id}`)}>
                  <span className="grow small" style={{ fontWeight: 600 }}>
                    {EXERCISE_BY_ID[p.id].name}
                  </span>
                  <span className="small num text-2">
                    {num(p.first, 1)} → <b style={{ color: 'var(--text)' }}>{num(p.last, 1)} kg</b>
                  </span>
                  <span className={`small num ${pct >= 0 ? 'up' : 'down'}`} style={{ minWidth: 52, textAlign: 'right' }}>
                    {pct >= 0 ? '+' : ''}
                    {num(pct, 0)}%
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="small text-2" style={{ marginTop: 8 }}>
            Servono almeno due sessioni con carico per lo stesso esercizio per mostrare la progressione.
          </p>
        )}
      </div>
      <button className="btn block ghost" style={{ marginTop: 10 }} onClick={() => navigate('/progressi')}>
        <CalendarCheck size={18} /> Storico completo
      </button>
    </Section>
  );
}

function Favorites() {
  const { settings } = useData();
  const favs = settings.favorites.filter((id) => EXERCISE_BY_ID[id]);
  return (
    <Section title="Esercizi preferiti">
      {favs.length ? (
        <div className="stack" style={{ gap: 8 }}>
          {favs.map((id) => {
            const ex = EXERCISE_BY_ID[id];
            const vid = VIDEOS_BY_EXERCISE[id]?.demo;
            return (
              <button key={id} className="ex-row" onClick={() => navigate(`/esercizio/${id}`)}>
                <div className="ex-thumb" style={{ width: 64, height: 48 }}>
                  {vid && <img src={youtubeThumb(vid.youtubeId)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
                </div>
                <div className="grow">
                  <div className="ex-name">{ex.name}</div>
                  <div className="ex-meta">{ex.primary.join(', ')}</div>
                </div>
                <Star size={18} color="var(--progress)" fill="var(--progress)" />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="small text-2">Tocca la stella nella pagina di un esercizio per averlo qui a portata di mano.</p>
      )}
    </Section>
  );
}
