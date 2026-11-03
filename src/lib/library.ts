// 5.0 program library: the DEFAULT program drives Home, Agenda, Calendar, "Inizia oggi",
// rescheduling and reminders. Pure functions over Settings (one atomic write each), unit-tested.
// Deleting programs/routines NEVER touches sessions, loads, measurements, photos or notes.
import { DAYS } from '../data/program';
import type { Day, DayId } from '../data/types';
import { uid, type Session } from './db';
import type { Program, Routine, Settings } from './settings';
import { effectiveDay, itemsToSlots, type EffectiveSlot } from './plan';
import { commitDraft, currentWeek, phaseOf, setsForWeek, type Draft } from './exchange';
import { startCustom, startSession } from './workout';

export const ORIGINAL = 'original';
export const NONE = 'none';

/** A planned training day of the default program (original plan day or program routine). */
export interface PlanDay extends Omit<Day, 'id'> {
  /** 'upper-a'… for the original plan, `r:<routineId>` for program days. */
  id: string;
  routineId?: string;
  programId?: string;
}

const WD_NUM: Record<string, number> = { domenica: 0, lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6 };
const WD_LABEL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const SPREAD = [1, 2, 4, 5, 3, 6, 0]; // Mon, Tue, Thu, Fri, Wed, Sat, Sun

/** Weekday (0–6) for every program day: explicit weekday, then recommendedWeekdays, then a spread. */
export function assignWeekdays(p: Pick<Program, 'days' | 'recommendedWeekdays'>): number[] {
  const used = new Set<number>();
  const out: (number | null)[] = p.days.map((d) => {
    const n = d.weekday != null ? WD_NUM[d.weekday] : undefined;
    if (n == null || used.has(n)) return null;
    used.add(n);
    return n;
  });
  const pool = [...(p.recommendedWeekdays ?? []).map((w) => WD_NUM[w]).filter((n) => n != null), ...SPREAD];
  return out.map((n) => {
    if (n != null) return n;
    const free = pool.find((x) => !used.has(x)) ?? 1;
    used.add(free);
    return free;
  });
}

export function planDaysFor(s: Settings): PlanDay[] {
  if (s.activeProgramId === ORIGINAL) return s.originalHidden ? [] : DAYS;
  const p = s.programs.find((x) => x.id === s.activeProgramId && !x.archived);
  if (!p) return [];
  const wds = assignWeekdays(p);
  return p.days.map((d, i) => {
    const r = s.routines.find((x) => x.id === d.routineId);
    const photo = DAYS[i % DAYS.length];
    return {
      id: `r:${d.routineId}`,
      routineId: d.routineId,
      programId: p.id,
      weekday: wds[i],
      weekdayLabel: WD_LABEL[wds[i]],
      number: i + 1,
      name: d.name,
      code: `Giorno ${i + 1}`,
      title: d.muscleGroups.join(', ') || p.name,
      focus: d.muscleGroups,
      accent: r?.accent ?? '#4f80ff',
      photo: photo.photo,
      photoPosition: photo.photoPosition,
    };
  });
}

export const defaultName = (s: Settings) => (s.activeProgramId === ORIGINAL && !s.originalHidden ? 'Scheda FORMA LAB (4 giorni)' : s.programs.find((p) => p.id === s.activeProgramId)?.name ?? 'Nessuna scheda attiva');

/** Exercises of a plan day; program days follow the phase of the current week. */
export function slotsForPlanDay(day: PlanDay, s: Settings, calibration: boolean, now = Date.now()): EffectiveSlot[] {
  if (!day.routineId) return effectiveDay(day.id as DayId, s, calibration);
  const r = s.routines.find((x) => x.id === day.routineId);
  if (!r) return [];
  const p = s.programs.find((x) => x.id === day.programId);
  const ph = p ? phaseOf(p, currentWeek(p, now)) : undefined;
  return itemsToSlots(r.items, 'upper-a', s, false).map((sl) => ({ ...sl, todaySets: setsForWeek(sl.todaySets, ph), plannedSets: setsForWeek(sl.plannedSets, ph) }));
}

export const dayLink = (day: PlanDay) => (day.programId ? `/programma/${day.programId}` : `/giorno/${day.id}`);

/** Session title for program days (week + phase). */
export function planDayTitle(day: PlanDay, s: Settings, now = Date.now()) {
  const p = s.programs.find((x) => x.id === day.programId);
  if (!p) return day.name;
  const w = currentWeek(p, now);
  return `${p.name} · ${day.name} · sett. ${w}`;
}

// ── Library operations ────────────────────────────────────────────────────────
const isoToday = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Make a program (or the original plan, or none) the default from today on. Past data is untouched. */
export function setDefault(s: Settings, id: string, now = Date.now()): Settings {
  if (s.activeProgramId === id) return s;
  const today = isoToday(now);
  const keepPastMoves = Object.fromEntries(Object.entries(s.moves).filter(([from]) => from < today));
  return {
    ...s,
    activeProgramId: id,
    originalHidden: id === ORIGINAL ? false : s.originalHidden,
    previousProgramIds: [s.activeProgramId, ...s.previousProgramIds.filter((x) => x !== s.activeProgramId)].filter((x) => x !== id && x !== NONE).slice(0, 10),
    // the new calendar starts today: past days keep their real history, no "missed" days are invented
    planSince: id === NONE ? s.planSince : today,
    rescheduleSince: today,
    moves: keepPastMoves,
    autoMoves: s.autoMoves.filter((m) => m.from < today),
    programs: s.programs.map((p) => (p.id === id ? { ...p, activatedAt: now, archived: false } : p)),
  };
}

/** Previous default that still exists (or 'none'). */
export function previousDefault(s: Settings): string {
  return s.previousProgramIds.find((x) => (x === ORIGINAL ? !s.originalHidden : s.programs.some((p) => p.id === x && !p.archived))) ?? NONE;
}

/** Routines that belong to a program (managed together with it). */
export const programRoutineIds = (s: Settings) => new Set(s.programs.flatMap((p) => p.days.map((d) => d.routineId)));

/** Sessions still open on something being deleted must be finished first. */
export function blockingSession(active: Session | null, s: Settings, sel: { original?: boolean; programs?: string[]; routines?: string[] }): boolean {
  if (!active) return false;
  if (sel.original && !String(active.dayId).startsWith('r:') && active.dayId !== 'free') return true;
  const rids = new Set([...(sel.routines ?? []), ...s.programs.filter((p) => sel.programs?.includes(p.id)).flatMap((p) => p.days.map((d) => d.routineId))]);
  return String(active.dayId).startsWith('r:') && rids.has(String(active.dayId).slice(2));
}

/** Delete programs (with their routines), personal routines and/or the original plan. No fallback default. */
export function deleteSchede(s: Settings, sel: { original?: boolean; programs?: string[]; routines?: string[] }): Settings {
  const progs = new Set(sel.programs ?? []);
  const rids = new Set([...(sel.routines ?? []), ...s.programs.filter((p) => progs.has(p.id)).flatMap((p) => p.days.map((d) => d.routineId))]);
  const defaultGone = (sel.original && s.activeProgramId === ORIGINAL) || progs.has(s.activeProgramId);
  return {
    ...s,
    originalHidden: sel.original ? true : s.originalHidden,
    programs: s.programs.filter((p) => !progs.has(p.id)),
    routines: s.routines.filter((r) => !rids.has(r.id)),
    activeProgramId: defaultGone ? NONE : s.activeProgramId,
    previousProgramIds: s.previousProgramIds.filter((x) => !progs.has(x) && !(sel.original && x === ORIGINAL)),
    // future moves of a removed calendar must not linger
    ...(defaultGone ? { moves: Object.fromEntries(Object.entries(s.moves).filter(([from]) => from < isoToday(Date.now()))), autoMoves: [] } : {}),
  };
}

/** Everything that counts as a "scheda" (for "Elimina tutte"). */
export function allSchede(s: Settings) {
  const inProg = programRoutineIds(s);
  return { original: !s.originalHidden, programs: s.programs.map((p) => p.id), routines: s.routines.filter((r) => !inProg.has(r.id)).map((r) => r.id) };
}

export function setArchived(s: Settings, sel: { programs?: string[]; routines?: string[] }, archived: boolean): Settings {
  const progs = new Set(sel.programs ?? []);
  const rids = new Set(sel.routines ?? []);
  const archivingDefault = archived && progs.has(s.activeProgramId);
  return {
    ...s,
    programs: s.programs.map((p) => (progs.has(p.id) ? { ...p, archived } : p)),
    routines: s.routines.map((r) => (rids.has(r.id) ? { ...r, archived } : r)),
    activeProgramId: archivingDefault ? NONE : s.activeProgramId,
  };
}

export function duplicateProgram(s: Settings, id: string, now = Date.now()): Settings {
  const p = s.programs.find((x) => x.id === id);
  if (!p) return s;
  const map = new Map<string, string>();
  const routines: Routine[] = p.days.map((d) => {
    const r = s.routines.find((x) => x.id === d.routineId)!;
    const nid = uid();
    map.set(d.routineId, nid);
    return { ...structuredClone(r), id: nid, items: r.items.map((i) => ({ ...i, id: uid() })), createdAt: now, archived: false };
  });
  const copy: Program = { ...structuredClone(p), id: uid(), name: `${p.name} (copia)`.slice(0, 80), days: p.days.map((d) => ({ ...d, routineId: map.get(d.routineId)! })), createdAt: now, updatedAt: now, activatedAt: undefined, archived: false, sourceKey: `${p.sourceKey}-copia-${now}` };
  return { ...s, programs: [...s.programs, copy], routines: [...s.routines, ...routines] };
}

export function duplicateRoutine(s: Settings, id: string, now = Date.now()): Settings {
  const r = s.routines.find((x) => x.id === id);
  if (!r) return s;
  return { ...s, routines: [...s.routines, { ...structuredClone(r), id: uid(), name: `${r.name} (copia)`, items: r.items.map((i) => ({ ...i, id: uid() })), createdAt: now, archived: false }] };
}

/** Explicit "Ripristina modello originale": the only way the original plan comes back. */
export const restoreOriginal = (s: Settings): Settings => ({ ...s, originalHidden: false });

export { DAYS };

/** Start the workout of a plan day (original plan day or program routine with its phase). */
export async function startPlanDay(day: PlanDay, s: Settings, calibration: boolean, history: Session[]) {
  if (!day.routineId) return startSession(day.id as DayId, s, calibration, history);
  return startCustom(day.id as `r:${string}`, planDayTitle(day, s), slotsForPlanDay(day, s, calibration), history);
}

export type ImportAction = 'add' | 'add-default' | 'replace-default' | 'replace-all';

/**
 * Applies an import in a single settings value: adds (or updates) the program, then optionally makes it
 * the default and removes the previous default / every other scheda. Never touches history.
 * Returns the new settings and the id of the imported program.
 */
export function applyImport(draft: Draft, s: Settings, action: ImportAction, mode: 'new' | { replace: string }, now = Date.now()): { settings: Settings; programId: string } {
  const prevDefault = s.activeProgramId;
  let next = commitDraft(draft, s, mode, now);
  const programId = typeof mode === 'object' ? mode.replace : next.programs[next.programs.length - 1].id;
  if (action === 'replace-default' && prevDefault !== NONE && prevDefault !== programId) {
    next = deleteSchede(next, prevDefault === ORIGINAL ? { original: true } : { programs: [prevDefault] });
  }
  if (action === 'replace-all') {
    const all = allSchede(next);
    next = deleteSchede(next, { original: all.original, programs: all.programs.filter((id) => id !== programId), routines: all.routines });
  }
  if (action !== 'add') next = setDefault(next, programId, now);
  return { settings: next, programId };
}
