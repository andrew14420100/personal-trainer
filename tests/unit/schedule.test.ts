import { describe, expect, it } from 'vitest';
import { addDays, dateInfo, iso, mondayOf, monthGrid, nextPlanned, parseIso, planFor, weekDates } from '../../src/lib/schedule';
import type { Session } from '../../src/lib/db';

const s = (date: string, dayId: Session['dayId'], status: Session['status'] = 'completed'): Session => ({
  id: date + dayId, dayId, startedAt: parseIso(date).getTime(), status, calibration: false, currentIndex: 0, exercises: [],
});

describe('calendar dates', () => {
  it('starts weeks on Monday, across month and year boundaries', () => {
    expect(iso(mondayOf(parseIso('2026-11-02')))).toBe('2026-11-02'); // Monday
    expect(iso(mondayOf(parseIso('2026-11-01')))).toBe('2026-10-26'); // Sunday → previous Monday
    expect(iso(mondayOf(parseIso('2027-01-01')))).toBe('2026-12-28'); // across years
    expect(weekDates(parseIso('2026-12-28')).map(iso)).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
    expect(iso(addDays(parseIso('2028-02-28'), 1))).toBe('2028-02-29'); // leap year
    expect(iso(addDays(parseIso('2026-03-28'), 2))).toBe('2026-03-30'); // DST change in Europe
  });
  it('builds a Monday-first month grid', () => {
    const g = monthGrid(2026, 10); // November 2026 starts on Sunday
    expect(g.slice(0, 6).every((x) => x === null)).toBe(true);
    expect(iso(g[6]!)).toBe('2026-11-01');
    expect(g.length % 7).toBe(0);
    expect(g.filter(Boolean)).toHaveLength(30);
  });
});

describe('schedule states and moves', () => {
  const today = '2026-11-04'; // Wednesday
  it('derives planned / done / skipped / rest / today', () => {
    const sessions = [s('2026-11-02', 'upper-a')];
    expect(dateInfo('2026-11-02', sessions, {}, today).state).toBe('done');
    expect(dateInfo('2026-11-03', sessions, {}, today).state).toBe('skipped'); // Tuesday planned, nothing done
    expect(dateInfo('2026-11-04', sessions, {}, today).state).toBe('rest'); // Wednesday
    expect(dateInfo('2026-11-05', sessions, {}, today).state).toBe('planned');
    expect(dateInfo('2026-11-05', sessions, {}, '2026-11-05').state).toBe('today');
  });
  it('reschedules a workout to another date', () => {
    const moves = { '2026-11-03': '2026-11-04' };
    expect(planFor('2026-11-03', moves).plan).toBeUndefined();
    expect(planFor('2026-11-03', moves).movedOut?.to).toBe('2026-11-04');
    const w = planFor('2026-11-04', moves);
    expect(w.plan?.id).toBe('lower-a');
    expect(w.movedIn).toBe(true);
    expect(dateInfo('2026-11-04', [], moves, today).state).toBe('today');
    expect(nextPlanned(moves, parseIso('2026-11-03'))?.date).toBe('2026-11-04');
  });
});
