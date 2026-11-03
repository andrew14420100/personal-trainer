import { describe, expect, it } from 'vitest';
import { DAYS, SLOTS, slotsForDay } from '../../src/data/program';
import { EXERCISES, EXERCISE_BY_ID } from '../../src/data/exercises';
import { VIDEO_LIBRARY, VIDEOS_BY_EXERCISE, allVideoIds } from '../../src/data/videos';

// The program exactly as written in the brief: [name, sets, min, max]
const BRIEF: Record<string, [string, number, number, number][]> = {
  'upper-a': [
    ['Chest Press', 3, 8, 12],
    ['Lat Machine presa prona', 3, 8, 12],
    ['Panca inclinata con manubri', 2, 8, 12],
    ['Pulley triangolo', 3, 8, 12],
    ['Alzate laterali con manubri', 2, 12, 20],
    ['Pushdown tricipiti', 2, 10, 15],
    ['Curl con manubri', 2, 10, 15],
  ],
  'lower-a': [
    ['Leg Press', 3, 8, 12],
    ['Stacco rumeno con manubri', 3, 8, 12],
    ['Leg Extension', 2, 10, 15],
    ['Leg Curl seduto', 3, 10, 15],
    ['Calf Raise', 3, 10, 15],
    ['Plank', 2, 20, 40],
  ],
  'upper-b': [
    ['Panca inclinata 30° al Multipower', 3, 8, 12],
    ['Low Row Machine', 3, 8, 12],
    ['Pec Fly Machine', 2, 10, 15],
    ['Lat Machine presa neutra', 3, 8, 12],
    ['Shoulder Press Machine', 2, 8, 12],
    ['Curl su panca inclinata', 2, 10, 15],
    ['Estensioni tricipiti al cavo', 2, 10, 15],
  ],
  'lower-b': [
    ['Hack Squat', 3, 8, 12],
    ['Hip Thrust Machine', 3, 8, 12],
    ['Split Squat assistito', 2, 8, 12],
    ['Leg Curl', 3, 10, 15],
    ['Calf Raise', 3, 10, 15],
    ['Dead Bug', 2, 8, 10],
  ],
};

describe('program', () => {
  it('has 4 days on Mon/Tue/Thu/Fri and 26 positions', () => {
    expect(DAYS.map((d) => d.weekday)).toEqual([1, 2, 4, 5]);
    expect(SLOTS).toHaveLength(26);
    expect(new Set(SLOTS.map((s) => s.id)).size).toBe(26);
  });

  it('matches the brief exactly (names, order, sets, rep ranges)', () => {
    for (const [dayId, rows] of Object.entries(BRIEF)) {
      const slots = slotsForDay(dayId as never);
      expect(slots.map((s) => [EXERCISE_BY_ID[s.exerciseId].name, s.sets, s.repsMin, s.repsMax])).toEqual(rows);
    }
  });

  it('marks time-based and unilateral positions', () => {
    expect(SLOTS.find((s) => s.exerciseId === 'plank')!.unit).toBe('sec');
    expect(SLOTS.find((s) => s.exerciseId === 'assisted-split-squat')!.sideLabel).toBe('per gamba');
    expect(SLOTS.find((s) => s.exerciseId === 'dead-bug')!.sideLabel).toBe('per lato');
  });

  it('has 25 distinct exercises, each used by the program', () => {
    expect(EXERCISES).toHaveLength(25);
    const used = new Set(SLOTS.map((s) => s.exerciseId));
    expect(used.size).toBe(25);
    EXERCISES.forEach((e) => expect(used.has(e.id)).toBe(true));
  });

  it('every exercise has a complete technical page', () => {
    for (const e of EXERCISES) {
      expect(e.setup.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.execution.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.errors.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.cues.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.cues.length, e.id).toBeLessThanOrEqual(4);
      expect(e.alternatives.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.breathing.length).toBeGreaterThan(10);
      e.errors.forEach((x) => [x.title, x.wrong, x.why, x.fix].forEach((t) => expect(t.length).toBeGreaterThan(5)));
    }
  });
});

describe('video library', () => {
  it('covers every exercise with a demo and a tutorial, or declares what is missing', () => {
    expect(VIDEO_LIBRARY).toHaveLength(25);
    for (const e of EXERCISES) {
      const v = VIDEOS_BY_EXERCISE[e.id];
      expect(v, e.id).toBeTruthy();
      if (!v.demo || !v.tutorial) expect(v.missing.length, e.id).toBeGreaterThan(0);
      if (v.demo) expect(v.demo.kind).toBe('demo');
      if (v.tutorial) expect(v.tutorial.kind).toBe('tutorial');
    }
  });

  it('uses well-formed, unique YouTube ids and never the same video as demo and tutorial', () => {
    const ids = allVideoIds();
    ids.forEach((id) => expect(id).toMatch(/^[\w-]{11}$/));
    expect(new Set(ids).size).toBe(ids.length);
    VIDEO_LIBRARY.forEach((v) => v.demo && v.tutorial && expect(v.demo.youtubeId).not.toBe(v.tutorial.youtubeId));
  });

  it('flags every non-exact match with an explanation', () => {
    VIDEO_LIBRARY.flatMap((v) => [v.demo, v.tutorial, ...v.extra])
      .filter((x) => x && x.match !== 'esatto')
      .forEach((x) => expect(x!.matchNote, x!.youtubeId).toBeTruthy());
  });
});
