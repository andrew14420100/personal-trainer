import { useEffect, useRef } from 'react';
import { CalendarDays, Dumbbell, Home, LineChart, Settings2, Pause, Play, Plus, X } from 'lucide-react';
import { navigate, useRoute } from '../lib/router';
import { beep, formatClock, timer, useTimer } from '../lib/timer';
import { useData } from '../app/store';

const TABS = [
  { path: '', label: 'Oggi', icon: Home },
  { path: 'scheda', label: 'Allenamenti', icon: Dumbbell },
  { path: 'calendario', label: 'Calendario', icon: CalendarDays },
  { path: 'progressi', label: 'Progressi', icon: LineChart },
  { path: 'impostazioni', label: 'Profilo', icon: Settings2 },
];

export function TabBar() {
  const { path } = useRoute();
  const root = path[0] ?? '';
  const map: Record<string, string> = { giorno: 'scheda', esercizio: 'scheda', video: 'scheda', sessione: 'progressi', riepilogo: 'progressi', info: 'impostazioni' };
  const active = map[root] ?? root;
  return (
    <div className="tabbar">
      <nav aria-label="Navigazione principale">
        {TABS.map((t) => (
          <button key={t.path} className="tab" aria-current={active === t.path ? 'page' : undefined} onClick={() => navigate('/' + t.path)}>
            <t.icon size={22} strokeWidth={active === t.path ? 2.4 : 1.8} aria-hidden />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/** Floating rest timer, visible on every screen while a rest is running. */
export function TimerPill({ inWorkout, inline = false }: { inWorkout: boolean; inline?: boolean }) {
  const { state, remaining, done, paused } = useTimer();
  const { settings } = useData();
  const beeped = useRef<number | null>(null);
  const silent = inWorkout && !inline; // the inline instance in the workout header plays the sound
  useEffect(() => {
    if (silent) return;
    if (done && state && beeped.current !== state.endAt) {
      beeped.current = state.endAt;
      if (settings.sound && document.visibilityState === 'visible') beep();
    }
  }, [done, state, settings.sound, silent]);
  if (!state) return null;
  // In workout mode the timer lives inside the sticky header (inline) so it never covers inputs.
  if (silent) return null;
  return (
    <div className={`timer-pill${inline ? ' inline' : ''}${done ? ' done' : ''}`} role="timer" aria-live={done ? 'assertive' : 'off'} aria-label={`Recupero: ${state.label}`}>
      <div>
        <div className="tiny muted" style={{ fontWeight: 650, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {done ? 'Recupero terminato' : paused ? 'In pausa' : 'Recupero'}
        </div>
        <div className="t" style={{ color: done ? 'var(--action)' : undefined }}>
          {done ? 'VIA!' : formatClock(remaining)}
        </div>
      </div>
      {!done && (
        <>
          <button className="icon-btn" aria-label="Aggiungi 15 secondi" onClick={() => timer.add(15)}>
            <Plus size={18} />
            <span className="sr-only">15 s</span>
          </button>
          <button className="icon-btn" aria-label={paused ? 'Riprendi' : 'Pausa'} onClick={() => (paused ? timer.resume() : timer.pause())}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
        </>
      )}
      <button className="icon-btn" aria-label="Chiudi timer" onClick={() => timer.stop()}>
        <X size={18} />
      </button>
      {!inWorkout && !done && (
        <button className="sr-only" onClick={() => navigate('/allenamento')}>
          Torna all’allenamento
        </button>
      )}
    </div>
  );
}
