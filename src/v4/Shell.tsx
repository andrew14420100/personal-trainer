import { useEffect, useRef } from 'react';
import { CalendarDays, Dumbbell, Home, LineChart, Minus, Pause, Play, Plus, SkipForward, User } from 'lucide-react';
import { navigate, useRoute } from '../lib/router';
import { beep, formatClock, timer, useTimer } from '../lib/timer';
import { useData } from '../app/store';

const TABS = [
  { path: '', label: 'Oggi', icon: Home },
  { path: 'allenamenti', label: 'Allenamenti', icon: Dumbbell },
  { path: 'calendario', label: 'Calendario', icon: CalendarDays },
  { path: 'progressi', label: 'Progressi', icon: LineChart },
  { path: 'profilo', label: 'Profilo', icon: User },
];
const PARENT: Record<string, string> = { giorno: 'allenamenti', esercizio: 'allenamenti', routine: 'allenamenti', libreria: 'allenamenti', strumenti: 'allenamenti', sessione: 'progressi', videoteca: 'profilo' };

export function TabBar() {
  const { path } = useRoute();
  const root = path[0] ?? '';
  const active = PARENT[root] ?? root;
  return (
    <div className="tabbar">
      <nav aria-label="Navigazione principale">
        {TABS.map((t) => (
          <button key={t.path} className="tab" aria-current={active === t.path ? 'page' : undefined} onClick={() => navigate('/' + t.path)}>
            <t.icon size={22} strokeWidth={active === t.path ? 2.3 : 1.8} aria-hidden />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
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
