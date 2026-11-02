import { describe, expect, it } from 'vitest';
import { ANIMATIONS, ANIMATION_BY_EXERCISE } from '../../src/anim/library';
import { build, frameAt } from '../../src/anim/timeline';
import { EXERCISES, EXERCISE_BY_ID } from '../../src/data/exercises';
import { SLOTS } from '../../src/data/program';
import { L } from '../../src/anim/rig';

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('technical animations', () => {
  it('cover all 25 exercises, hence all 26 program positions', () => {
    expect(ANIMATIONS).toHaveLength(25);
    EXERCISES.forEach((e) => expect(ANIMATION_BY_EXERCISE[e.id], e.id).toBeTruthy());
    SLOTS.forEach((s) => expect(ANIMATION_BY_EXERCISE[s.exerciseId]).toBeTruthy());
  });

  it('animate only faults that exist in the technical page, at least 2 per exercise', () => {
    for (const a of ANIMATIONS) {
      const ex = EXERCISE_BY_ID[a.exerciseId];
      expect(a.errors.length, a.exerciseId).toBeGreaterThanOrEqual(2);
      a.errors.forEach((e) => expect(ex.errors.map((x) => x.id), `${a.exerciseId}/${e.id}`).toContain(e.id));
      a.errors.forEach((e) => expect(e.overlays.length, `${a.exerciseId}/${e.id}`).toBeGreaterThan(0));
    }
  });

  it('follow the A·B·C·D sequence and loop', () => {
    const b = build(ANIMATIONS[0], 'errors');
    const kinds = b.segments.map((s) => s.kind);
    expect(kinds[0]).toBe('setup');
    expect(kinds[kinds.length - 1]).toBe('good');
    expect(kinds.filter((k) => k === 'bad')).toHaveLength(ANIMATIONS[0].errors.length);
    expect(kinds.filter((k) => k === 'fix')).toHaveLength(ANIMATIONS[0].errors.length);
    const f1 = frameAt(ANIMATIONS[0], b, 0.5, []);
    const f2 = frameAt(ANIMATIONS[0], b, b.total + 0.5, []);
    expect(f2.sk.hand).toEqual(f1.sk.hand);
  });

  it('show ✕ in red during faults and ✓ in green after the correction', () => {
    for (const a of ANIMATIONS) {
      const b = build(a, 'errors');
      const bad = b.segments.find((s) => s.kind === 'bad')!;
      const fix = b.segments.find((s) => s.kind === 'fix')!;
      const fb = frameAt(a, b, bad.start + 0.3, []);
      const ff = frameAt(a, b, fix.start + fix.dur - 0.1, []);
      expect(fb.badge).toBe('bad');
      expect(fb.tone).toBe(0);
      expect(ff.badge).toBe('good');
      expect(ff.tone).toBe(1);
    }
  });

  it('keep a valid skeleton in every frame (finite, limbs of constant length, inside the stage)', () => {
    for (const a of ANIMATIONS) {
      for (const mode of ['quick', 'errors'] as const) {
        const b = build(a, mode);
        for (let t = 0; t < b.total; t += 0.25) {
          const { sk } = frameAt(a, b, t, ['x']);
          for (const [k, v] of Object.entries(sk)) if (Array.isArray(v)) v.forEach((n) => expect(Number.isFinite(n), `${a.exerciseId} ${k}`).toBe(true));
          expect(Math.abs(dist(sk.shoulder, sk.elbow) - L.upperArm), a.exerciseId).toBeLessThan(0.6);
          expect(Math.abs(dist(sk.hip, sk.knee) - L.thigh), a.exerciseId).toBeLessThan(0.6);
          expect(sk.headC[1], `${a.exerciseId} head on stage`).toBeGreaterThan(0);
          expect(sk.hip[0], `${a.exerciseId} hip on stage`).toBeGreaterThan(0);
          expect(sk.hip[0]).toBeLessThan(400);
        }
      }
    }
  });
});
