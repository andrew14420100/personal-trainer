import { describe, expect, it } from 'vitest';
import '../../src/data/catalog';
import type { Session } from '../../src/lib/db';
import { exerciseBests, muscleSets, periodReports, prTimeline, setPRs, warmupSets, weekStreak } from '../../src/lib/records';
import { doneSets, sessionVolume } from '../../src/lib/stats';
import { plateBreakdown } from '../../src/v4/Tools';
import { fromUnit, kg, setWeightUnit, toUnit } from '../../src/lib/format';
import { remindersIcs, setsCsv } from '../../src/lib/exports';
import { DEFAULT_SETTINGS } from '../../src/lib/settings';
import { allExercises, registerCustomExercises } from '../../src/data/catalog';
import { EXERCISE_BY_ID } from '../../src/data/exercises';
import { itemsToSlots } from '../../src/lib/plan';

const S = (id: string, date: string, sets: [number, number, string?][], ex = 'chest-press'): Session => ({
  id,
  dayId: 'upper-a',
  startedAt: new Date(date + 'T18:00:00').getTime(),
  endedAt: new Date(date + 'T19:00:00').getTime(),
  status: 'completed',
  calibration: false,
  currentIndex: 0,
  exercises: [{ slotId: 'x', exerciseId: ex, targetSets: 3, repsMin: 8, repsMax: 12, unit: 'reps', perSide: false, note: '', sets: sets.map(([w, r, t]) => ({ weight: w, reps: r, done: true, ...(t ? { type: t as 'warmup' } : {}) })) }],
});

describe('4.1 records and analytics', () => {
  const a = S('a', '2026-10-05', [[40, 10], [40, 9]]);
  const b = S('b', '2026-10-12', [[20, 10, 'warmup'], [42.5, 10], [42.5, 8]]);
  it('warm-up sets are excluded from stats', () => {
    expect(doneSets(b.exercises[0])).toHaveLength(2);
    expect(sessionVolume(b)).toBe(42.5 * 18);
  });
  it('bests and live PRs compare only with previous history', () => {
    const prior = exerciseBests([a], 'chest-press');
    expect(prior.carico?.value).toBe(40);
    expect(setPRs({ weight: 42.5, reps: 10, done: true }, prior, true)).toContain('carico');
    expect(setPRs({ weight: 42.5, reps: 10, done: true }, {}, false)).toEqual([]);
    expect(setPRs({ weight: 60, reps: 5, done: true, type: 'warmup' }, prior, true)).toEqual([]);
  });
  it('PR timeline starts from the second time an exercise is done', () => {
    const t = prTimeline([a, b]);
    expect(t.every((p) => p.sessionId === 'b')).toBe(true);
    expect(t.map((p) => p.kind)).toContain('carico');
  });
  it('sets per muscle: primary 1, secondary 0.5', () => {
    const m = muscleSets([b], 0, Date.now());
    expect(m.pettorali).toBe(2);
    expect(m.tricipiti).toBe(1);
  });
  it('week streak counts consecutive Monday weeks', () => {
    expect(weekStreak([a, b], new Date('2026-10-14T12:00:00').getTime())).toBe(2);
    expect(weekStreak([a], new Date('2026-10-28T12:00:00').getTime())).toBe(0);
  });
  it('monthly report', () => {
    const r = periodReports([a, b], 'month')[0];
    expect(r.key).toBe('2026-10');
    expect(r.sessions).toBe(2);
    expect(r.prs).toBeGreaterThan(0);
  });
  it('warm-up generator rounds to 2.5 kg', () => {
    expect(warmupSets(100, DEFAULT_SETTINGS.warmup)).toEqual([
      { weight: 40, reps: 5 },
      { weight: 60, reps: 5 },
      { weight: 80, reps: 3 },
    ]);
  });
});

describe('4.1 tools, units, exports, catalog', () => {
  it('plate calculator', () => {
    expect(plateBreakdown(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]).plates).toEqual([25, 15]);
    expect(plateBreakdown(61.25, 20, [25, 20, 10, 5, 2.5]).rest).toBeCloseTo(0.625);
  });
  it('kg/lb conversion only changes display', () => {
    setWeightUnit('lb');
    expect(toUnit(100)).toBe(220.5);
    expect(fromUnit(220.5)).toBeCloseTo(100.017, 2);
    expect(kg(100)).toContain('lb');
    setWeightUnit('kg');
    expect(kg(100)).toBe('100 kg');
  });
  it('CSV has one row per set with Italian separators', () => {
    const csv = setsCsv([S('a', '2026-10-05', [[42.5, 10]])], DEFAULT_SETTINGS);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('42,5');
    expect(lines[1].split(';')[3]).toBe('Chest Press');
  });
  it('calendar file has 4 weekly events with alarm', () => {
    const ics = remindersIcs(DEFAULT_SETTINGS, new Date('2026-11-02T10:00:00'));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    expect(ics).toContain('TRIGGER:-PT30M');
  });
  it('catalog: program + library + cardio + custom exercises', () => {
    const n = allExercises().length;
    expect(n).toBeGreaterThanOrEqual(25 + 40);
    expect(EXERCISE_BY_ID['treadmill'].tracking).toBe('cardio');
    registerCustomExercises([{ id: 'u-1', name: 'Mio esercizio', group: 'Petto', primary: ['pettorali'], secondary: [], equipment: '', tracking: 'reps', load: 'external', restSec: 90 }]);
    expect(allExercises().length).toBe(n + 1);
    expect(EXERCISE_BY_ID['u-1'].name).toBe('Mio esercizio');
    registerCustomExercises([]);
    expect(EXERCISE_BY_ID['u-1']).toBeUndefined();
  });
  it('routine items become slots with supersets and rest', () => {
    const slots = itemsToSlots(
      [
        { id: 'i1', exerciseId: 'barbell-curl', sets: 3, repsMin: 8, repsMax: 12, unit: 'reps', perSide: false, group: 'A', restSec: 60 },
        { id: 'i2', exerciseId: 'skull-crusher', sets: 3, repsMin: 8, repsMax: 12, unit: 'reps', perSide: false, group: 'A' },
      ],
      'upper-a',
      DEFAULT_SETTINGS,
      false,
    );
    expect(slots.map((s) => s.group)).toEqual(['A', 'A']);
    expect(slots[0].restSec).toBe(60);
    expect(slots[1].restSec).toBe(EXERCISE_BY_ID['skull-crusher'].restSec);
  });
});
