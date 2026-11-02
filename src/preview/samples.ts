// PREVIEW ONLY: generates clearly-marked EXAMPLE sessions so the charts can be explored inside the
// Claude preview. Never included in the published app's behaviour (guarded by __PREVIEW__), and
// every generated session carries the note "[ESEMPIO]".
import { restore, uid, type Session } from '../lib/db';
import { buildSession } from '../lib/workout';
import { DEFAULT_SETTINGS } from '../lib/settings';
import { DAYS } from '../data/program';
import { EXERCISE_BY_ID } from '../data/exercises';

const BASE: Record<string, number> = {
  'chest-press': 40, 'lat-pulldown-wide': 45, 'incline-db-press': 16, 'cable-row-v': 40, 'lateral-raise': 6, 'triceps-pushdown': 20, 'db-curl': 10,
  'leg-press': 100, 'db-rdl': 20, 'leg-extension': 35, 'seated-leg-curl': 30, 'calf-raise': 50,
  'smith-incline-press': 30, 'low-row-machine': 40, 'pec-fly': 35, 'lat-pulldown-neutral': 45, 'shoulder-press-machine': 25, 'incline-db-curl': 8, 'overhead-cable-triceps': 15,
  'hack-squat': 60, 'hip-thrust-machine': 60, 'assisted-split-squat': 0, 'lying-leg-curl': 25, 'dead-bug': 0,
};

export async function loadSamples(weeks = 4) {
  const sessions: Session[] = [];
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(18, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - 7 * weeks);
  for (let w = 0; w < weeks; w++) {
    for (const d of DAYS) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + w * 7 + (d.weekday - 1));
      if (date > now) continue;
      const cal = sessions.length < 4;
      const s = buildSession(d.id, DEFAULT_SETTINGS, cal, sessions);
      s.id = uid();
      s.startedAt = date.getTime();
      s.endedAt = date.getTime() + (48 + ((w * 7 + d.weekday) % 15)) * 60000;
      s.status = 'completed';
      s.rpe = 6 + ((w + d.weekday) % 3);
      s.note = '[ESEMPIO] Seduta generata per l’anteprima';
      s.exercises.forEach((l) => {
        const ex = EXERCISE_BY_ID[l.exerciseId];
        const step = ex.increment || 0;
        const load = (BASE[l.exerciseId] ?? 0) + step * Math.floor(w / 1.5);
        l.sets = l.sets.map((_, i) => ({
          weight: ex.tracking === 'time' ? null : load,
          reps: ex.tracking === 'time' ? 25 + w * 5 : Math.min(l.repsMax, l.repsMin + w + (i === 0 ? 1 : 0)),
          done: true,
          completedAt: s.startedAt + i * 120000,
        }));
        l.technique = 'buona';
        l.rir = 2;
      });
      sessions.push(s);
    }
  }
  await restore({ sessions, measurements: [], kv: [] }, 'merge');
  return sessions.length;
}
