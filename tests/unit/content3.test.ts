import { describe, expect, it } from 'vitest';
import { DAYS, SLOTS, slotsForDay } from '../../src/data/program';
import { EXERCISES, EXERCISE_BY_ID } from '../../src/data/exercises';
import { EXERCISE_MUSCLES, MUSCLE_LABEL, MUSCLE_REGION, aggregate } from '../../src/data/muscles';
import { REAL_VIDEOS } from '../../src/data/realVideos';

describe('day names', () => {
  it('are self-explanatory (muscles), numbered 1–4, with the technical code only as secondary label', () => {
    expect(DAYS.map((d) => d.number)).toEqual([1, 2, 3, 4]);
    expect(DAYS.map((d) => d.code)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B']);
    for (const d of DAYS) {
      expect(d.name).not.toMatch(/upper|lower/i);
      expect(d.name.length).toBeGreaterThan(8);
    }
  });
  it('list only muscle regions that the day really trains as primary or secondary', () => {
    for (const d of DAYS) {
      const agg = aggregate(slotsForDay(d.id).map((s) => s.exerciseId));
      const regions = new Set([...agg.primary, ...agg.secondary].map((m) => MUSCLE_REGION[m]));
      const normal = (f: string) => (f === 'Petto alto' ? 'Petto' : f);
      d.focus.forEach((f) => expect(regions.has(normal(f)), `${d.id}: ${f}`).toBe(true));
      // every PRIMARY region is mentioned in the focus chips
      new Set(agg.primary.map((m) => MUSCLE_REGION[m])).forEach((r) => expect(d.focus.map(normal), `${d.id} misses ${r}`).toContain(r));
    }
  });
});

describe('anatomy', () => {
  it('maps every exercise to valid primary/secondary muscles and a group', () => {
    expect(Object.keys(EXERCISE_MUSCLES).sort()).toEqual(EXERCISES.map((e) => e.id).sort());
    for (const [id, m] of Object.entries(EXERCISE_MUSCLES)) {
      expect(m.primary.length, id).toBeGreaterThan(0);
      [...m.primary, ...m.secondary].forEach((x) => expect(MUSCLE_LABEL[x], `${id}: ${x}`).toBeTruthy());
      expect(m.primary.some((x) => m.secondary.includes(x)), id).toBe(false);
      expect(m.group.length).toBeGreaterThan(3);
    }
  });
  it('agrees with the textual technical page for key exercises', () => {
    expect(EXERCISE_MUSCLES['lat-pulldown-wide'].primary).toEqual(['dorsali']);
    expect(EXERCISE_BY_ID['lat-pulldown-wide'].primary).toContain('Gran dorsale');
    expect(EXERCISE_MUSCLES['calf-raise'].primary).toEqual(['polpacci']);
    expect(EXERCISE_MUSCLES['hip-thrust-machine'].primary).toEqual(['glutei']);
  });
});

describe('real videos', () => {
  it('cover every exercise (all 26 positions) with well-formed unique ids', () => {
    const ids: string[] = [];
    for (const e of EXERCISES) {
      expect(REAL_VIDEOS[e.id]?.length, e.id).toBeGreaterThan(0);
      REAL_VIDEOS[e.id].forEach((v) => {
        expect(v.youtubeId).toMatch(/^[\w-]{11}$/);
        expect(v.author.length).toBeGreaterThan(1);
        ids.push(v.youtubeId);
      });
    }
    SLOTS.forEach((s) => expect(REAL_VIDEOS[s.exerciseId]).toBeTruthy());
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('flag any non-exact variant with a note', () => {
    Object.values(REAL_VIDEOS)
      .flat()
      .filter((v) => v.match !== 'esatto')
      .forEach((v) => expect(v.note, v.youtubeId).toBeTruthy());
  });
});
