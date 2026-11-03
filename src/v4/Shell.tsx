import { useEffect, useRef, useState } from 'react';
import { activeElapsed } from '../lib/stats';
import { Activity, CalendarDays, Dumbbell, Home, LayoutGrid, Library, LineChart, Minus, Pause, Play, Plus, SkipForward } from 'lucide-react';
import { navigate, useRoute } from '../lib/router';
import { beep, formatClock, timer, useTimer } from '../lib/timer';
import { useData } from '../app/store';

export const TAB_DEFS: Record<string, { label: string; icon: typeof Home; to: string; match: string[] }> = {
  '': { label: 'Oggi', icon: Home, to: '/', match: [''] },
  agenda: { label: 'Agenda', icon: CalendarDays, to: '/agenda', match: ['agenda', 'calendario'] },
  allenati: { label: 'Allenati', icon: Dumbbell, to: '/allenamenti', match: ['allenamenti', 'giorno', 'esercizio', 'routine', 'strumenti', 'importa', 'programma'] },
  progressi: { label: 'Progressi', icon: LineChart, to: '/progressi', match: ['progressi', 'sessione'] },
  altro: { label: 'Altro', icon: LayoutGrid, to: '/altro', match: ['altro', 'profilo', 'videoteca'] },
  libreria: { label: 'Esercizi', icon: Library, to: '/libreria', match: ['libreria'] },
};
export const TAB_PRESETS: { id: string; label: string; tabs: string[] }[] = [
  { id: 'standard', label: 'Standard: Oggi · Agenda · Allenati · Progressi · Altro', tabs: ['', 'agenda', 'allenati', 'progressi', 'altro'] },
  { id: 'palestra', label: 'Palestra: Oggi · Allenati · Esercizi · Progressi · Altro', tabs: ['', 'allenati', 'libreria', 'progressi', 'altro'] },
  { id: 'agenda', label: 'Agenda prima: Agenda · Oggi · Allenati · Progressi · Altro', tabs: ['agenda', '', 'allenati', 'progressi', 'altro'] },
];

export function TabBar() {
  const { path } = useRoute();
  const { settings } = useData();
  const root = path[0] ?? '';
  const tabs = (settings.tabs?.length === 5 ? settings.tabs : ['', 'agenda', 'allenati', 'progressi', 'altro']).filter((t) => TAB_DEFS[t]);
  return (
    <div className="tabbar">
      <nav aria-label="Navigazione principale">
        {tabs.map((id) => {
          const t = TAB_DEFS[id];
          const on = t.match.includes(root);
          return (
            <button key={id || 'oggi'} className="tab" aria-current={on ? 'page' : undefined} onClick={() => navigate(t.to)}>
              <t.icon size={22} strokeWidth={on ? 2.3 : 1.8} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Always-visible pill while a workout is running (outside workout mode). */
export function LivePill() {
  const { active } = useData();
  const { state } = useTimer();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active || active.pausedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!active || state) return null;
  return (
    <button className="live-pill" onClick={() => navigate('/allenamento')} aria-label="Torna all’allenamento in corso">
      <Activity size={18} /> {active.pausedAt ? 'Allenamento in pausa' : 'Allenamento in corso'}
      <span className="t">{formatClock(activeElapsed(active, active.pausedAt ?? now))}</span>
    </button>
  );
}

/** Rest timer bar: at the bottom in workout mode, above the tab bar elsewhere. One instance only. */
export function RestBar({ inWorkout }: { inWorkout: boolean }) {
  const { state, remaining, done, paused } = useTimer();
  const { settings, active } = useData();
  const beeped = useRef<number | null>(null);
  useEffect(() => {
    if (done && state && beeped.current !== state.endAt) {
      beeped.current = state.endAt;
      if (settings.sound && document.visibilityState === 'visible') beep();
      if ('vibrate' in navigator) navigator.vibrate?.(300);
    }
  }, [done, state, settings.sound]);
  if (!state) return null;
  const pct = state.duration ? Math.max(0, Math.min(1, 1 - remaining / (state.duration * 1000))) : 1;
  return (
    <div className="rest-bar" style={inWorkout ? undefined : { bottom: 'calc(var(--tab-h) + var(--safe-b))', paddingBottom: 10 }} role="timer" aria-live={done ? 'assertive' : 'off'} aria-label={`Recupero: ${state.label}`}>
      <div className="rest-prog">
        <i style={{ width: `${pct * 100}%`, background: done ? 'var(--ok)' : undefined }} />
      </div>
      <div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="t-xs c3" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {done ? 'Recupero terminato' : paused ? 'Recupero in pausa' : 'Recupero'} · {state.label}
          </div>
          <div className="rest-time" style={{ color: done ? 'var(--ok)' : undefined }}>
            {done ? 'Vai!' : formatClock(remaining)}
          </div>
        </div>
        {!done && (
          <>
            <button className="icon-btn" aria-label="Togli 15 secondi" onClick={() => timer.add(-15)}>
              <Minus size={18} />
            </button>
            <button className="icon-btn" aria-label="Aggiungi 15 secondi" onClick={() => timer.add(15)}>
              <Plus size={18} />
            </button>
            <button className="icon-btn" aria-label={paused ? 'Riprendi recupero' : 'Metti in pausa il recupero'} onClick={() => (paused ? timer.resume() : timer.pause())}>
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
          </>
        )}
        <button className="btn sm" aria-label={done ? 'Chiudi timer' : 'Salta recupero'} onClick={() => timer.stop()}>
          {done ? 'OK' : (
            <>
              <SkipForward size={15} /> Salta
            </>
          )}
        </button>
        {!inWorkout && active && (
          <button className="btn sm primary" onClick={() => navigate('/allenamento')}>
            Torna
          </button>
        )}
      </div>
    </div>
  );
}
