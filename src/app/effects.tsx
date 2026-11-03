// App-level effects for 5.0: theme attributes, automatic rescheduling, resume prompt.
import { useEffect, useState } from 'react';
import type { AppData } from './store';
import type { Settings } from '../lib/settings';
import { updateSettings } from '../lib/settings';
import { computeAutoMoves, iso, parseIso } from '../lib/schedule';
import { fullDate } from '../lib/format';
import { navigate } from '../lib/router';
import { togglePause } from '../lib/workout';
import { Sheet, toast } from '../v4/kit';
import { sessionMeta } from '../lib/meta';

export function useThemeAttributes(s: Settings) {
  useEffect(() => {
    const r = document.documentElement;
    if (s.theme === 'auto') delete r.dataset.theme;
    else r.dataset.theme = s.theme;
    r.dataset.text = s.textSize;
    if (s.gymMode) r.dataset.gym = '1';
    else delete r.dataset.gym;
    const dark = s.theme === 'dark' || (s.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0b0e' : '#f4f6fa');
  }, [s.theme, s.textSize, s.gymMode]);
}

/** Moves missed workouts to the next free day (see computeAutoMoves) and records each change. */
export function useAutoReschedule(d: AppData) {
  const key = d.ready ? `${d.sessions.length}|${JSON.stringify(d.settings.moves)}|${d.settings.events.length}|${d.settings.dismissedMisses.length}|${d.settings.autoReschedule}|${iso(new Date())}` : '';
  useEffect(() => {
    if (!d.ready || !d.settings.autoReschedule) return;
    const today = iso(new Date());
    if (!d.settings.rescheduleSince) {
      void updateSettings((s) => ({ ...s, rescheduleSince: today }));
      return;
    }
    const moves = computeAutoMoves(d.sessions, d.settings.moves, d.settings.events, d.settings.dismissedMisses, today, d.settings.rescheduleSince);
    if (!moves.length) return;
    void updateSettings((s) => ({
      ...s,
      moves: { ...s.moves, ...Object.fromEntries(moves.map((m) => [m.from, m.to])) },
      autoMoves: [...s.autoMoves.filter((x) => !moves.some((m) => m.from === x.from)), ...moves.map((m) => ({ ...m, at: Date.now() }))].slice(-50),
    })).then(() => toast(moves.length === 1 ? `Allenamento saltato spostato a ${fullDate(parseIso(moves[0].to))}` : `${moves.length} allenamenti saltati riprogrammati`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** On (re)opening the app with a workout still open: ask whether to resume it. */
export function useResumePrompt(d: AppData, inWorkout: boolean) {
  const [open, setOpen] = useState(false);
  // the session that was already open when the app was (re)opened; sessions started now never prompt
  const [atStart, setAtStart] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!d.ready || atStart !== undefined) return;
    const id = d.active?.id ?? null;
    setAtStart(id);
    if (id && !inWorkout) setOpen(true);
  }, [d.ready, d.active, atStart, inWorkout]);
  useEffect(() => {
    if (atStart === undefined) return; // not decided yet
    if (inWorkout || !d.active || d.active.id !== atStart) setOpen(false);
  }, [inWorkout, d.active, atStart]);
  if (!d.active) return null;
  const a = d.active;
  return (
    <Sheet open={open} onClose={() => setOpen(false)} label="Allenamento in sospeso">
      <div className="col">
        <h3 className="t-h2">Riprendere l’allenamento?</h3>
        <p className="t-sm c2" style={{ margin: 0 }}>
          “{sessionMeta(a, d.settings).name}” è ancora aperto: iniziato {fullDate(new Date(a.startedAt))} alle {new Date(a.startedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}. Le serie inserite sono salvate.
        </p>
        <button
          className="btn primary lg block"
          onClick={async () => {
            setOpen(false);
            if (a.pausedAt) await togglePause(a.id);
            navigate('/allenamento');
          }}
        >
          Riprendi
        </button>
        <button className="btn block ghost" onClick={() => setOpen(false)}>
          Più tardi
        </button>
      </div>
    </Sheet>
  );
}
