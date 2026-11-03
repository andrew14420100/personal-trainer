import { effectiveDay, type EffectiveSlot } from './plan';
import { getSession, saveSession, deleteSession, uid, type ExerciseLog, type Session, type SetLog } from './db';
import { lastLog } from './stats';
import type { Settings } from './settings';
import type { DayId } from '../data/types';

/** Create a new active session, pre-filling loads from the last time each exercise was done. */
export function buildSession(dayId: DayId, settings: Settings, calibration: boolean, history: Session[], now = Date.now()): Session {
  return sessionFromSlots(dayId, effectiveDay(dayId, settings, calibration), calibration, history, now);
}

/** New exercise log for a slot, pre-filled with the last loads used. */
export function logFor(s: { id: string; exerciseId: string; todaySets: number; repsMin: number; repsMax: number; unit: 'reps' | 'sec' | 'min'; perSide: boolean; restSec?: number; group?: string }, history: Session[]): ExerciseLog {
  const prev = lastLog(history, s.exerciseId)?.log;
  const prevWeights = prev?.sets.filter((x) => x.done && x.type !== 'warmup').map((x) => x.weight) ?? [];
  return {
    slotId: s.id,
    exerciseId: s.exerciseId,
    targetSets: s.todaySets,
    repsMin: s.repsMin,
    repsMax: s.repsMax,
    unit: s.unit,
    perSide: s.perSide,
    sets: Array.from({ length: s.todaySets }, (_, i) => ({ weight: prevWeights[Math.min(i, prevWeights.length - 1)] ?? null, reps: null, done: false })),
    note: '',
    ...(s.restSec != null ? { restSec: s.restSec } : {}),
    ...(s.group ? { group: s.group } : {}),
  };
}

export function sessionFromSlots(dayId: Session['dayId'], slots: EffectiveSlot[], calibration: boolean, history: Session[], now = Date.now(), title?: string): Session {
  return { id: uid(), dayId, ...(title ? { title } : {}), startedAt: now, status: 'active', calibration, currentIndex: 0, exercises: slots.map((s) => logFor(s, history)) };
}

/** Start a custom routine ('r:<id>') or an empty free workout ('free'). */
export async function startCustom(dayId: Session['dayId'], title: string, slots: EffectiveSlot[], history: Session[]): Promise<Session> {
  const s = sessionFromSlots(dayId, slots, false, history, Date.now(), title);
  await saveSession(s);
  return s;
}

export async function startSession(dayId: DayId, settings: Settings, calibration: boolean, history: Session[]): Promise<Session> {
  const s = buildSession(dayId, settings, calibration, history);
  await saveSession(s);
  return s;
}

// All session writes go through one queue: each update is applied to the freshest stored state,
// so fast typing (blur + tap fired together) can never overwrite a value with a stale copy.
let queue: Promise<unknown> = Promise.resolve();

/** Apply an update to the latest stored copy of a session and persist it (serialized). */
export function mutate(id: string, fn: (s: Session) => Session): Promise<Session | undefined> {
  const run = queue.then(async () => {
    const s = await getSession(id);
    if (!s) return undefined;
    const next = fn(structuredClone(s));
    await saveSession(next);
    return next;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function updateSet(s: Session, exIdx: number, setIdx: number, patch: Partial<SetLog>): Session {
  const log = s.exercises[exIdx];
  log.sets[setIdx] = { ...log.sets[setIdx], ...patch };
  if (patch.done === true) log.sets[setIdx].completedAt = Date.now();
  if (patch.done === false) delete log.sets[setIdx].completedAt;
  return s;
}

export function addSet(s: Session, exIdx: number): Session {
  const log = s.exercises[exIdx];
  const last = log.sets[log.sets.length - 1];
  log.sets.push({ weight: last?.weight ?? null, reps: null, done: false });
  return s;
}

export function removeSet(s: Session, exIdx: number, setIdx: number): Session {
  const log = s.exercises[exIdx];
  if (log.sets.length > 1) log.sets.splice(setIdx, 1);
  return s;
}

export async function finishSession(id: string, extra: { rpe?: number | null; note?: string }): Promise<Session | undefined> {
  return mutate(id, (s) => {
    const now = Date.now();
    const pausedMs = (s.pausedMs ?? 0) + (s.pausedAt ? now - s.pausedAt : 0);
    return { ...s, ...extra, pausedAt: null, pausedMs, status: 'completed', endedAt: s.endedAt ?? now };
  });
}

/** Pause or resume the running session (paused time is excluded from the duration). */
export function togglePause(id: string): Promise<Session | undefined> {
  return mutate(id, (s) => {
    const now = Date.now();
    if (s.pausedAt) return { ...s, pausedMs: (s.pausedMs ?? 0) + (now - s.pausedAt), pausedAt: null };
    return { ...s, pausedAt: now };
  });
}

export const discardSession = (id: string) => deleteSession(id);
