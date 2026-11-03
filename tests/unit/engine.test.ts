import { describe, expect, it } from 'vitest';
import type { ExerciseLog, Session } from '../../src/lib/db';
import { e1rm, exerciseHistory, frequencyLastWeeks, lastLog, logVolume, previousSameDay, sessionReps, sessionSets, sessionVolume, weekOverWeek, weekStart, weeklySummaries } from '../../src/lib/stats';
import { progressionHint } from '../../src/lib/progression';
import { calibrationSets, effectiveDay, estimateMinutes, isCalibration } from '../../src/lib/plan';
import { buildSession, updateSet, addSet, removeSet } from '../../src/lib/workout';
import { DEFAULT_SETTINGS } from '../../src/lib/settings';
import { EXERCISE_BY_ID } from '../../src/data/exercises';

const log = (exerciseId: string, sets: [number | null, number | null, boolean][], extra: Partial<ExerciseLog> = {}): ExerciseLog => ({
  slotId: 'x',
  exerciseId,
  targetSets: sets.length,
  repsMin: 8,
  repsMax: 12,
  unit: 'reps',
  perSide: false,
  note: '',
  sets: sets.map(([weight, reps, done]) => ({ weight, reps, done })),
  ...extra,
});
const session = (id: string, date: string, exercises: ExerciseLog[], status: Session['status'] = 'completed', dayId: Session['dayId'] = 'upper-a'): Session => ({
  id,
  dayId,
  startedAt: new Date(date).getTime(),
  endedAt: new Date(date).getTime() + 3600_000,
  status,
  calibration: false,
  currentIndex: 0,
  exercises,
});

describe('stats', () => {
  it('counts only completed sets in volume, sets and reps', () => {
    const l = log('chest-press', [
      [40, 10, true],
      [40, 9, true],
      [40, 8, false],
    ]);
    expect(logVolume(l)).toBe(760);
    const s = session('a', '2026-10-05T10:00:00', [l]);
    expect(sessionVolume(s)).toBe(760);
    expect(sessionSets(s)).toBe(2);
    expect(sessionReps(s)).toBe(19);
  });

  it('excludes time-based work from volume and doubles unilateral reps', () => {
    expect(logVolume(log('plank', [[null, 30, true]], { unit: 'sec' }))).toBe(0);
    expect(logVolume(log('assisted-split-squat', [[10, 8, true]], { perSide: true }))).toBe(160);
  });

  it('groups by Monday-based weeks and compares with previous week', () => {
    expect(weekStart(new Date('2026-11-01T12:00:00'))).toBe('2026-10-26'); // Sunday → previous Monday
    expect(weekStart(new Date('2026-11-02T08:00:00'))).toBe('2026-11-02');
    const sessions = [session('a', '2026-10-27T10:00:00', [log('chest-press', [[50, 10, true]])]), session('b', '2026-11-03T10:00:00', [log('chest-press', [[60, 10, true]])])];
    expect(weeklySummaries(sessions).map((w) => w.volume)).toEqual([500, 600]);
    const wow = weekOverWeek(sessions, new Date('2026-11-04T10:00:00').getTime());
    expect(wow.volumePct).toBeCloseTo(20);
    expect(frequencyLastWeeks(sessions, 3, new Date('2026-11-04T10:00:00').getTime()).map((x) => x.count)).toEqual([0, 1, 1]);
  });

  it('ignores active sessions and finds last log / previous same day', () => {
    const a = session('a', '2026-10-05T10:00:00', [log('chest-press', [[40, 10, true]])]);
    const b = session('b', '2026-10-12T10:00:00', [log('chest-press', [[45, 10, true]])]);
    const c = session('c', '2026-10-19T10:00:00', [log('chest-press', [[50, 10, true]])], 'active');
    expect(lastLog([a, b, c], 'chest-press')!.log.sets[0].weight).toBe(45);
    expect(lastLog([a, b, c], 'chest-press', 'b')!.log.sets[0].weight).toBe(40);
    expect(previousSameDay([a, b], b)!.id).toBe('a');
    expect(exerciseHistory([a, b, c], 'chest-press').map((p) => p.topWeight)).toEqual([40, 45]);
  });

  it('computes Epley e1RM', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1);
    expect(e1rm(0, 10)).toBe(0);
  });
});

describe('progression hint (double progression)', () => {
  const ex = EXERCISE_BY_ID['chest-press'];
  const target = { repsMin: 8, repsMax: 12, sets: 3 };
  it('asks for a conservative start without data', () => expect(progressionHint(ex, target, null).kind).toBe('start'));
  it('suggests +increment when all sets hit the top with margin and good technique', () => {
    const h = progressionHint(ex, target, log('chest-press', [[40, 12, true], [40, 12, true], [40, 12, true]], { rir: 2, technique: 'buona' }));
    expect(h.kind).toBe('increase');
    expect(h.suggestedWeight).toBe(42.5);
  });
  it('holds when the top is reached without margin', () => {
    expect(progressionHint(ex, target, log('chest-press', [[40, 12, true], [40, 12, true], [40, 12, true]], { rir: 0 })).kind).toBe('hold');
  });
  it('holds for technique when declared to improve', () => {
    expect(progressionHint(ex, target, log('chest-press', [[40, 12, true], [40, 12, true], [40, 12, true]], { technique: 'da migliorare' })).kind).toBe('technique');
  });
  it('suggests reducing when sets fall below the range', () => {
    expect(progressionHint(ex, target, log('chest-press', [[40, 9, true], [40, 7, true]])).kind).toBe('reduce');
  });
  it('does not suggest an increase if not all target sets were done', () => {
    expect(progressionHint(ex, target, log('chest-press', [[40, 12, true], [40, null, false], [40, null, false]], { targetSets: 3 })).kind).not.toBe('increase');
  });
});

describe('plan & calibration', () => {
  it('reduces 3-set exercises to 2 during calibration only', () => {
    expect(calibrationSets(3)).toBe(2);
    expect(calibrationSets(2)).toBe(2);
    const cal = effectiveDay('upper-a', DEFAULT_SETTINGS, true);
    const full = effectiveDay('upper-a', DEFAULT_SETTINGS, false);
    expect(cal.map((s) => s.todaySets)).toEqual([2, 2, 2, 2, 2, 2, 2]);
    expect(full.map((s) => s.todaySets)).toEqual([3, 3, 2, 3, 2, 2, 2]);
    expect(estimateMinutes(full)).toBeGreaterThan(estimateMinutes(cal));
  });
  it('auto calibration ends after 4 completed sessions', () => {
    const s = (i: number) => session(String(i), `2026-10-0${i + 1}T10:00:00`, []);
    expect(isCalibration(DEFAULT_SETTINGS, [s(0), s(1), s(2)])).toBe(true);
    expect(isCalibration(DEFAULT_SETTINGS, [s(0), s(1), s(2), s(3)])).toBe(false);
    expect(isCalibration({ ...DEFAULT_SETTINGS, calibration: 'on' }, [s(0), s(1), s(2), s(3)])).toBe(true);
    expect(isCalibration({ ...DEFAULT_SETTINGS, calibration: 'off' }, [])).toBe(false);
  });
  it('applies user overrides and the leg-curl variant', () => {
    const settings = { ...DEFAULT_SETTINGS, slotOverrides: { 'lower-b-4': { exerciseId: 'seated-leg-curl', sets: 4 } }, restOverrides: { 'seated-leg-curl': 75 } };
    const s = effectiveDay('lower-b', settings, false)[3];
    expect(s.exerciseId).toBe('seated-leg-curl');
    expect(s.todaySets).toBe(4);
    expect(s.restSec).toBe(75);
    // unknown variants are ignored
    const bad = effectiveDay('lower-b', { ...DEFAULT_SETTINGS, slotOverrides: { 'lower-b-4': { exerciseId: 'plank' } } }, false)[3];
    expect(bad.exerciseId).toBe('lying-leg-curl');
  });
});

describe('workout session', () => {
  it('pre-fills loads from the previous session of each exercise', () => {
    const prev = session('p', '2026-10-05T10:00:00', [log('chest-press', [[40, 10, true], [42.5, 9, true]], { slotId: 'upper-a-1' })]);
    const s = buildSession('upper-a', DEFAULT_SETTINGS, false, [prev]);
    expect(s.status).toBe('active');
    expect(s.exercises).toHaveLength(7);
    expect(s.exercises[0].sets.map((x) => x.weight)).toEqual([40, 42.5, 42.5]);
    expect(s.exercises[0].sets.every((x) => x.reps === null && !x.done)).toBe(true);
    expect(s.exercises[1].sets.map((x) => x.weight)).toEqual([null, null, null]);
  });
  it('edits sets immutably-by-copy and keeps at least one set', () => {
    let s = buildSession('lower-a', DEFAULT_SETTINGS, true, []);
    s = updateSet(s, 0, 0, { weight: 100, reps: 10, done: true });
    expect(s.exercises[0].sets[0].completedAt).toBeTypeOf('number');
    s = addSet(s, 0);
    expect(s.exercises[0].sets).toHaveLength(3);
    expect(s.exercises[0].sets[2].weight).toBeNull();
    s = removeSet(removeSet(removeSet(s, 0, 2), 0, 1), 0, 0);
    expect(s.exercises[0].sets).toHaveLength(1);
  });
});
