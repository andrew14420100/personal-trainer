// Weekly schedule: Monday-based weeks, planned days from the program, user moves (reschedule),
// and the real status of each date computed from the recorded sessions.
import { DAYS } from '../data/program';
import type { PlanDay } from './library';
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
  plan?: PlanDay;
  /** True when the plan comes from another date (rescheduled here). */
  movedIn?: boolean;
  /** Original planned workout that was moved away from this date. */
  movedOut?: { day: PlanDay; to: string };
  sessions: Session[];
  state: DayState;
}

// The calendar follows the DEFAULT program (set by the store on every load; the original plan by
// default, which keeps older data and tests working). Before `since` no plan is shown.
let PLAN: PlanDay[] = DAYS;
let SINCE = '';
export function setPlanSchedule(days: PlanDay[], since: string) {
  PLAN = days;
  SINCE = since;
}
export const currentPlanDays = () => PLAN;

function basePlan(date: Date): PlanDay | undefined {
  if (SINCE && iso(date) < SINCE) return undefined;
  return PLAN.find((d) => d.weekday === date.getDay());
}

/** Planned workout for a date, taking moves into account. */
export function planFor(dateIso: string, moves: Moves): { plan?: PlanDay; movedIn?: boolean; movedOut?: { day: PlanDay; to: string } } {
  const base = basePlan(parseIso(dateIso));
  let plan: PlanDay | undefined;
  let movedOut: { day: PlanDay; to: string } | undefined;
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
export function nextPlanned(moves: Moves, now = new Date()): { date: string; day: PlanDay } | null {
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

export function dayById(id: string): PlanDay | undefined {
  return PLAN.find((d) => d.id === id);
}

// ── 5.0: automatic rescheduling of missed workouts ────────────────────────────
// Rules (pure, deterministic, DST-safe because it only manipulates yyyy-mm-dd dates):
//  1. a planned workout of a PAST date with no completed session is "missed";
//  2. it is moved to the first day from max(missed+1, today) that has NO other workout, no
//     completed session and no personal event that blocks training;
//  3. it is never moved past the next weekly occurrence of the same workout (origin + 7 days):
//     if no free day exists before it, it simply stays missed (no accumulation);
//  4. if the same workout was trained on another day since the origin, it is not missed;
//  5. dates the user dismissed (undo) are never touched again; existing manual moves are kept;
//  6. only misses from the last 7 days AND after the feature was enabled are considered.
export interface AutoMove {
  from: string; // original planned date (key of `moves`)
  to: string;
}
export interface BlockingEvent {
  date: string;
  blocks: boolean;
}

/** `since`: first date the feature was active (older misses are history, never moved). */
export function computeAutoMoves(sessions: Session[], moves: Moves, events: BlockingEvent[], dismissed: string[], todayIso: string, since: string, lookbackDays = 7): AutoMove[] {
  const out: AutoMove[] = [];
  const m: Moves = { ...moves };
  const today = parseIso(todayIso);
  const blocked = new Set(events.filter((e) => e.blocks).map((e) => e.date));
  const doneDays = new Set(sessions.filter((s) => s.status === 'completed').map((s) => iso(new Date(s.startedAt))));
  const originOf = (d: string): string => Object.entries(m).find(([f, t]) => t === d && f !== d)?.[0] ?? d;
  for (let i = lookbackDays; i >= 1; i--) {
    const d = iso(addDays(today, -i));
    if (d < since) continue;
    const info = dateInfo(d, sessions, m, todayIso);
    if (info.state !== 'skipped' || !info.plan) continue;
    const origin = originOf(d);
    if (dismissed.includes(origin)) continue;
    const limit = iso(addDays(parseIso(origin), 7));
    // trained anyway on another day since the origin? then it is not missed
    const trained = sessions.some((s) => s.status === 'completed' && s.dayId === info.plan!.id && iso(new Date(s.startedAt)) >= origin && iso(new Date(s.startedAt)) <= todayIso);
    if (trained) continue;
    let t = parseIso(d) < today ? addDays(parseIso(d), 1) : today;
    if (t < today) t = today;
    let target: string | null = null;
    for (; iso(t) < limit; t = addDays(t, 1)) {
      const k = iso(t);
      if (blocked.has(k) || doneDays.has(k)) continue;
      if (planFor(k, m).plan) continue;
      target = k;
      break;
    }
    if (!target) continue;
    m[origin] = target;
    out.push({ from: origin, to: target });
  }
  return out;
}
