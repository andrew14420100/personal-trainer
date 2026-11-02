import { EXERCISE_BY_ID } from '../data/exercises';
import { SLOTS, SLOT_VARIANTS, slotsForDay } from '../data/program';
import type { DayId, Slot } from '../data/types';
import type { Session } from './db';
import type { Settings } from './settings';

export const CALIBRATION_SESSIONS = 4;

/** Is the calibration (reduced volume) week active? */
export function isCalibration(settings: Settings, sessions: Session[]): boolean {
  if (settings.calibration === 'on') return true;
  if (settings.calibration === 'off') return false;
  return sessions.filter((s) => s.status === 'completed').length < CALIBRATION_SESSIONS;
}

/** Calibration rule: 3-set exercises are done with 2 sets; 2-set exercises unchanged. */
export function calibrationSets(sets: number): number {
  return sets >= 3 ? sets - 1 : sets;
}

export interface EffectiveSlot extends Slot {
  /** Sets prescribed today (after calibration). */
  todaySets: number;
  /** Prescribed sets after adaptation (from the program or user override). */
  plannedSets: number;
  restSec: number;
  overridden: boolean;
  variants?: string[];
}

export function effectiveSlot(slot: Slot, settings: Settings, calibration: boolean): EffectiveSlot {
  const o = settings.slotOverrides[slot.id] ?? {};
  const exerciseId = o.exerciseId && (SLOT_VARIANTS[slot.id] ?? []).includes(o.exerciseId) ? o.exerciseId : slot.exerciseId;
  const plannedSets = o.sets ?? slot.sets;
  const ex = EXERCISE_BY_ID[exerciseId];
  return {
    ...slot,
    exerciseId,
    repsMin: o.repsMin ?? slot.repsMin,
    repsMax: o.repsMax ?? slot.repsMax,
    plannedSets,
    todaySets: calibration ? calibrationSets(plannedSets) : plannedSets,
    restSec: settings.restOverrides[exerciseId] ?? ex.restSec,
    overridden: Object.keys(o).length > 0,
    variants: SLOT_VARIANTS[slot.id],
  };
}

export function effectiveDay(dayId: DayId, settings: Settings, calibration: boolean): EffectiveSlot[] {
  return slotsForDay(dayId).map((s) => effectiveSlot(s, settings, calibration));
}

/** Rough duration estimate in minutes: ~45 s per set + rest between sets + 2 min setup per exercise + 5 min warm-up. */
export function estimateMinutes(slots: EffectiveSlot[]): number {
  let sec = 5 * 60;
  for (const s of slots) {
    const work = s.unit === 'sec' ? s.repsMax : 45;
    const sides = s.perSide ? 2 : 1;
    sec += s.todaySets * work * sides + Math.max(0, s.todaySets - 1) * s.restSec + 120;
  }
  return Math.round(sec / 60 / 5) * 5;
}

export function formatPrescription(
  s: { repsMin: number; repsMax: number; unit: 'reps' | 'sec'; sideLabel?: string },
  sets: number,
): string {
  const range = `${s.repsMin}–${s.repsMax}${s.unit === 'sec' ? ' s' : ''}`;
  return `${sets} × ${range}${s.sideLabel ? ' ' + s.sideLabel : ''}`;
}

export const TOTAL_POSITIONS = SLOTS.length;
