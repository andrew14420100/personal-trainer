// Pure statistics computed ONLY from sessions recorded by the user. No demo data.
import type { ExerciseLog, Session, SetLog } from './db';

export const doneSets = (log: ExerciseLog): SetLog[] => log.sets.filter((s) => s.done && s.reps != null && s.reps > 0);

/** Volume load (kg × reps) for one exercise log. Time-based or unloaded sets count 0. */
export function logVolume(log: ExerciseLog): number {
  if (log.unit === 'sec') return 0;
  const sides = log.perSide ? 2 : 1;
  return doneSets(log).reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0) * sides, 0);
}

export function sessionVolume(s: Session): number {
  return s.exercises.reduce((sum, l) => sum + logVolume(l), 0);
}

export function sessionSets(s: Session): number {
  return s.exercises.reduce((sum, l) => sum + doneSets(l).length, 0);
}

export function sessionReps(s: Session): number {
  return s.exercises.reduce((sum, l) => (l.unit === 'sec' ? sum : sum + doneSets(l).reduce((a, x) => a + (x.reps ?? 0) * (l.perSide ? 2 : 1), 0)), 0);
}

export function sessionDurationMin(s: Session): number {
  if (!s.endedAt) return 0;
  return Math.max(1, Math.round((s.endedAt - s.startedAt) / 60000));
}

export const completed = (sessions: Session[]) => sessions.filter((s) => s.status === 'completed').sort((a, b) => a.startedAt - b.startedAt);

/** Monday-based week start (local time) as yyyy-mm-dd. */
export function weekStart(ts: number | Date): string {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return isoDate(d);
}

export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface WeekSummary {
  week: string;
  sessions: number;
  volume: number;
  sets: number;
  reps: number;
}

export function weeklySummaries(sessions: Session[]): WeekSummary[] {
  const map = new Map<string, WeekSummary>();
  for (const s of completed(sessions)) {
    const w = weekStart(s.startedAt);
    const cur = map.get(w) ?? { week: w, sessions: 0, volume: 0, sets: 0, reps: 0 };
    cur.sessions += 1;
    cur.volume += sessionVolume(s);
    cur.sets += sessionSets(s);
    cur.reps += sessionReps(s);
    map.set(w, cur);
  }
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
}

/** Comparison of current week vs previous week (null if there is no data for a fair comparison). */
export function weekOverWeek(sessions: Session[], now = Date.now()) {
  const weeks = weeklySummaries(sessions);
  const thisW = weekStart(now);
  const prevDate = new Date(thisW + 'T00:00:00');
  prevDate.setDate(prevDate.getDate() - 7);
  const prevW = isoDate(prevDate);
  const cur = weeks.find((w) => w.week === thisW) ?? null;
  const prev = weeks.find((w) => w.week === prevW) ?? null;
  const pct = cur && prev && prev.volume > 0 ? ((cur.volume - prev.volume) / prev.volume) * 100 : null;
  return { cur, prev, volumePct: pct };
}

/** Epley estimate, only meaningful for 1–12 reps. */
export function e1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface ExercisePoint {
  sessionId: string;
  date: number;
  topWeight: number;
  topReps: number;
  bestE1rm: number;
  totalReps: number;
  volume: number;
  sets: number;
  log: ExerciseLog;
}

/** History of one exercise across completed sessions (chronological). */
export function exerciseHistory(sessions: Session[], exerciseId: string): ExercisePoint[] {
  const out: ExercisePoint[] = [];
  for (const s of completed(sessions)) {
    for (const log of s.exercises) {
      if (log.exerciseId !== exerciseId) continue;
      const sets = doneSets(log);
      if (!sets.length) continue;
      let top = sets[0];
      for (const x of sets) if ((x.weight ?? 0) > (top.weight ?? 0) || ((x.weight ?? 0) === (top.weight ?? 0) && (x.reps ?? 0) > (top.reps ?? 0))) top = x;
      out.push({
        sessionId: s.id,
        date: s.startedAt,
        topWeight: top.weight ?? 0,
        topReps: top.reps ?? 0,
        bestE1rm: Math.max(...sets.map((x) => (x.reps! <= 12 ? e1rm(x.weight ?? 0, x.reps!) : 0))),
        totalReps: sets.reduce((a, x) => a + (x.reps ?? 0), 0),
        volume: logVolume(log),
        sets: sets.length,
        log,
      });
    }
  }
  return out;
}

/** The most recent completed log of an exercise, optionally excluding a session. */
export function lastLog(sessions: Session[], exerciseId: string, excludeSessionId?: string): { log: ExerciseLog; date: number } | null {
  const list = completed(sessions).filter((s) => s.id !== excludeSessionId);
  for (let i = list.length - 1; i >= 0; i--) {
    const log = list[i].exercises.find((l) => l.exerciseId === exerciseId && doneSets(l).length > 0);
    if (log) return { log, date: list[i].startedAt };
  }
  return null;
}

/** Previous completed session of the same day (for the end-of-workout comparison). */
export function previousSameDay(sessions: Session[], current: Session): Session | null {
  const list = completed(sessions).filter((s) => s.dayId === current.dayId && s.id !== current.id && s.startedAt < current.startedAt);
  return list.length ? list[list.length - 1] : null;
}

/** Days (yyyy-mm-dd) with at least one completed session. */
export function trainingDays(sessions: Session[]): Set<string> {
  return new Set(completed(sessions).map((s) => isoDate(new Date(s.startedAt))));
}

/** Number of training sessions in each of the last `n` weeks (oldest first), including empty weeks. */
export function frequencyLastWeeks(sessions: Session[], n: number, now = Date.now()): { week: string; count: number }[] {
  const weeks = weeklySummaries(sessions);
  const out: { week: string; count: number }[] = [];
  const start = new Date(weekStart(now) + 'T00:00:00');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - 7 * i);
    const k = isoDate(d);
    out.push({ week: k, count: weeks.find((w) => w.week === k)?.sessions ?? 0 });
  }
  return out;
}
