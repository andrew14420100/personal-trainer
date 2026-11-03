// Weekly schedule: Monday-based weeks, planned days from the program, user moves (reschedule),
// and the real status of each date computed from the recorded sessions.
import { DAYS, DAY_BY_ID } from '../data/program';
import type { Day, DayId } from '../data/types';
import type { Session } from './db';

/** Local date → 'yyyy-mm-dd'. */
export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** 'yyyy-mm-dd' → local Date at noon (safe across DST changes). */
export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
  return x;
}
/** Monday of the week containing d. */
export function mondayOf(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}
export function weekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Moves: original planned date → new date ('' = cancelled). */
export type Moves = Record<string, string>;

export type DayState = 'done' | 'planned' | 'today' | 'skipped' | 'rest';

export interface DateInfo {
  date: string;
  /** Workout planned on this date (after moves), if any. */
  plan?: Day;
  /** True when the plan comes from another date (rescheduled here). */
  movedIn?: boolean;
  /** Original planned workout that was moved away from this date. */
  movedOut?: { day: Day; to: string };
  sessions: Session[];
  state: DayState;
}

function basePlan(date: Date): Day | undefined {
  return DAYS.find((d) => d.weekday === date.getDay());
}

/** Planned workout for a date, taking moves into account. */
export function planFor(dateIso: string, moves: Moves): { plan?: Day; movedIn?: boolean; movedOut?: { day: Day; to: string } } {
  const base = basePlan(parseIso(dateIso));
  let plan: Day | undefined;
  let movedOut: { day: Day; to: string } | undefined;
  if (base) {
    if (dateIso in moves && moves[dateIso] !== dateIso) movedOut = { day: base, to: moves[dateIso] };
    else plan = base;
  }
  let movedIn = false;
  for (const [from, to] of Object.entries(moves)) {
    if (to === dateIso && from !== dateIso) {
      const d = basePlan(parseIso(from));
      if (d) {
        plan = d;
        movedIn = true;
      }
    }
  }
  return { plan, movedIn, movedOut };
}

export function dateInfo(dateIso: string, sessions: Session[], moves: Moves, todayIso: string): DateInfo {
  const done = sessions.filter((s) => s.status === 'completed' && iso(new Date(s.startedAt)) === dateIso);
  const p = planFor(dateIso, moves);
  let state: DayState;
  if (done.length) state = 'done';
  else if (dateIso === todayIso && p.plan) state = 'today';
  else if (p.plan && dateIso < todayIso) state = 'skipped';
  else if (p.plan) state = 'planned';
  else state = 'rest';
  return { date: dateIso, ...p, sessions: done, state };
}

/** Today's workout (after moves), or null on a rest day. */
export function todayPlan(sessions: Session[], moves: Moves, now = new Date()): DateInfo {
  return dateInfo(iso(now), sessions, moves, iso(now));
}

/** Next date (after today) with a planned workout. */
export function nextPlanned(moves: Moves, now = new Date()): { date: string; day: Day } | null {
  for (let i = 1; i <= 21; i++) {
    const d = iso(addDays(now, i));
    const p = planFor(d, moves).plan;
    if (p) return { date: d, day: p };
  }
  return null;
}

/** Month grid (Monday first): array of dates, null for leading/trailing blanks. */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1, 12);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 1; i <= days; i++) cells.push(new Date(year, month, i, 12));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function dayById(id: DayId): Day {
  return DAY_BY_ID[id];
}
