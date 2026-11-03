// 4.1 analytics computed only from the user's completed sessions: personal records (also live
// during a workout), sets per muscle, streaks, monthly / yearly reports, heat-map days.
import { EXERCISE_MUSCLES, type MuscleId } from '../data/muscles';
import type { ExerciseLog, Session, SetLog } from './db';
import { completed, doneSets, e1rm, isoDate, sessionDurationMin, sessionSets, sessionVolume, weekStart } from './stats';

export type PRKind = 'carico' | '1rm' | 'ripetizioni' | 'volume-serie';
export const PR_LABEL: Record<PRKind, string> = { carico: 'Carico massimo', '1rm': '1RM stimato', ripetizioni: 'Più ripetizioni', 'volume-serie': 'Volume di una serie' };

export interface Best {
  value: number;
  date: number;
  sessionId: string;
  detail: string;
}
export type Bests = Partial<Record<PRKind, Best>>;

const setVals = (x: SetLog) => {
  const w = x.weight ?? 0;
  const r = x.reps ?? 0;
  return { carico: w, '1rm': r <= 12 ? e1rm(w, r) : 0, ripetizioni: r, 'volume-serie': w * r } as Record<PRKind, number>;
};

function scan(logs: { log: ExerciseLog; s: Session }[]): Bests {
  const b: Bests = {};
  for (const { log, s } of logs) {
    if (log.unit !== 'reps') continue;
    for (const x of doneSets(log)) {
      const v = setVals(x);
      (Object.keys(v) as PRKind[]).forEach((k) => {
        if (v[k] > 0 && (!b[k] || v[k] > b[k]!.value)) b[k] = { value: v[k], date: s.startedAt, sessionId: s.id, detail: `${x.weight ?? 0} kg × ${x.reps}` };
      });
    }
  }
  return b;
}

/** Best values per exercise over all completed sessions (optionally before a timestamp). */
export function exerciseBests(sessions: Session[], exerciseId: string, before?: number, excludeId?: string): Bests {
  const logs = completed(sessions)
    .filter((s) => s.id !== excludeId && (before == null || s.startedAt < before))
    .flatMap((s) => s.exercises.filter((l) => l.exerciseId === exerciseId).map((log) => ({ log, s })));
  return scan(logs);
}

/** Records a single set beats compared to the history BEFORE this session (none on the first time). */
export function setPRs(set: SetLog, prior: Bests, hasHistory: boolean): PRKind[] {
  if (!hasHistory || !set.done || set.type === 'warmup' || !set.reps) return [];
  const v = setVals(set);
  return (Object.keys(v) as PRKind[]).filter((k) => v[k] > 0 && prior[k] && v[k] > prior[k]!.value);
}

/** Every record event in history (a set that beat the previous best), newest first. */
export function prTimeline(sessions: Session[]): { exerciseId: string; kind: PRKind; value: number; date: number; sessionId: string; detail: string }[] {
  const out: ReturnType<typeof prTimeline> = [];
  const bests = new Map<string, Bests>();
  for (const s of completed(sessions)) {
    for (const log of s.exercises) {
      if (log.unit !== 'reps') continue;
      const had = bests.has(log.exerciseId);
      const b = bests.get(log.exerciseId) ?? {};
      const before = { ...b };
      for (const x of doneSets(log)) {
        const v = setVals(x);
        (Object.keys(v) as PRKind[]).forEach((k) => {
          if (v[k] > 0 && (!b[k] || v[k] > b[k]!.value)) b[k] = { value: v[k], date: s.startedAt, sessionId: s.id, detail: `${x.weight ?? 0} kg × ${x.reps}` };
        });
      }
      if (had)
        (Object.keys(b) as PRKind[]).forEach((k) => {
          if (b[k]!.sessionId === s.id && (!before[k] || b[k]!.value > before[k]!.value)) out.push({ exerciseId: log.exerciseId, kind: k, value: b[k]!.value, date: s.startedAt, sessionId: s.id, detail: b[k]!.detail });
        });
      bests.set(log.exerciseId, b);
    }
  }
  return out.reverse();
}

/** Work sets per muscle (primary = 1, secondary = 0.5) between two timestamps. */
export function muscleSets(sessions: Session[], from: number, to = Date.now(), extra?: Session): Record<MuscleId, number> {
  const out = {} as Record<MuscleId, number>;
  const list = completed(sessions).filter((s) => s.startedAt >= from && s.startedAt <= to);
  if (extra) list.push(extra);
  for (const s of list)
    for (const l of s.exercises) {
      const m = EXERCISE_MUSCLES[l.exerciseId];
      if (!m || l.unit === 'min') continue;
      const n = doneSets(l).length;
      if (!n) continue;
      m.primary.forEach((x) => (out[x] = (out[x] ?? 0) + n));
      m.secondary.forEach((x) => (out[x] = (out[x] ?? 0) + n * 0.5));
    }
  return out;
}

/** Split muscles into "most trained" (≥ 50% of the max) and "trained" for the anatomy map. */
export function heatLevels(m: Record<string, number>): { primary: MuscleId[]; secondary: MuscleId[] } {
  const max = Math.max(0, ...Object.values(m));
  const ids = Object.keys(m) as MuscleId[];
  return { primary: ids.filter((k) => m[k] >= max * 0.5 && m[k] > 0), secondary: ids.filter((k) => m[k] > 0 && m[k] < max * 0.5) };
}

/** Consecutive Monday-weeks with at least one completed session (current week counts if trained). */
export function weekStreak(sessions: Session[], now = Date.now()): number {
  const weeks = new Set(completed(sessions).map((s) => weekStart(s.startedAt)));
  const d = new Date(weekStart(now) + 'T12:00:00');
  if (!weeks.has(isoDate(d))) d.setDate(d.getDate() - 7); // current week not trained yet: don't break the streak
  let n = 0;
  while (weeks.has(isoDate(d))) {
    n++;
    d.setDate(d.getDate() - 7);
  }
  return n;
}

export interface PeriodReport {
  key: string;
  sessions: number;
  minutes: number;
  sets: number;
  volume: number;
  prs: number;
  days: number;
  topExercise: string | null;
}

export function periodReports(sessions: Session[], by: 'month' | 'year'): PeriodReport[] {
  const prs = prTimeline(sessions);
  const map = new Map<string, Session[]>();
  for (const s of completed(sessions)) {
    const k = by === 'month' ? isoDate(new Date(s.startedAt)).slice(0, 7) : String(new Date(s.startedAt).getFullYear());
    map.set(k, [...(map.get(k) ?? []), s]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => {
      const count = new Map<string, number>();
      list.forEach((s) => s.exercises.forEach((l) => doneSets(l).length && count.set(l.exerciseId, (count.get(l.exerciseId) ?? 0) + doneSets(l).length)));
      const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        key,
        sessions: list.length,
        minutes: list.reduce((a, s) => a + sessionDurationMin(s), 0),
        sets: list.reduce((a, s) => a + sessionSets(s), 0),
        volume: list.reduce((a, s) => a + sessionVolume(s), 0),
        prs: prs.filter((p) => (by === 'month' ? isoDate(new Date(p.date)).slice(0, 7) : String(new Date(p.date).getFullYear())) === key).length,
        days: new Set(list.map((s) => isoDate(new Date(s.startedAt)))).size,
        topExercise: top?.[0] ?? null,
      };
    });
}

/** Sessions per day for the last `weeks` weeks (Monday-aligned), oldest first. */
export function activityDays(sessions: Session[], weeks: number, now = Date.now()): { date: string; count: number }[] {
  const byDay = new Map<string, number>();
  completed(sessions).forEach((s) => {
    const k = isoDate(new Date(s.startedAt));
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  });
  const start = new Date(weekStart(now) + 'T12:00:00');
  start.setDate(start.getDate() - 7 * (weeks - 1));
  const out: { date: string; count: number }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push({ date: isoDate(d), count: byDay.get(isoDate(d)) ?? 0 });
  }
  return out;
}

/** Warm-up sets for a work load, rounded to `step` (kg). */
export function warmupSets(work: number, scheme: { pct: number; reps: number }[], step = 2.5): { weight: number; reps: number }[] {
  if (!work || work <= 0) return [];
  return scheme.map((w) => ({ weight: Math.max(0, Math.round((work * w.pct) / 100 / step) * step), reps: w.reps })).filter((w) => w.weight > 0);
}
