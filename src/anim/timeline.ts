// Builds the looping sequence of an animation:
//  quick  → clean repetitions (loop)
//  errors → A. starting position · B. error (red ✕) · C. correction (red → green ✓) · D. clean reps
import { applyDelta, ease, lerpPose, solve, type Pose, type Vec } from './rig';
import type { AnimError, AnimSpec, Overlay } from './spec';
import type { FrameInfo } from './render';

export interface Segment {
  id: string;
  label: string;
  start: number;
  dur: number;
  kind: 'setup' | 'bad' | 'fix' | 'good' | 'demo';
  error?: AnimError;
}

interface Built {
  segments: Segment[];
  total: number;
}

const repDur = (spec: AnimSpec) => spec.rep ?? 2.8;

/** Normalised position (0 = start pose, 1 = end pose) inside a repetition. */
function repK(x: number): number {
  if (x < 0.36) return ease(x / 0.36);
  if (x < 0.46) return 1;
  if (x < 0.9) return 1 - ease((x - 0.46) / 0.44);
  return 0;
}

function poses(spec: AnimSpec, e: AnimError | undefined, amount: number): [Pose, Pose] {
  const s = applyDelta(spec.start, e?.start, amount);
  let en = applyDelta(spec.end, e?.end, amount);
  if (e?.rom && amount > 0) en = lerpPose(s, en, 1 - (1 - e.rom) * amount);
  return [s, en];
}

function poseInRep(spec: AnimSpec, e: AnimError | undefined, amount: number, local: number, speed: number): Pose {
  const [s, en] = poses(spec, e, amount);
  if (spec.hold) {
    // isometric: gentle breathing motion between start and a hint of the end pose
    const k = 0.5 - 0.5 * Math.cos((local / 3) * Math.PI * 2);
    return lerpPose(s, en, k * 0.25);
  }
  const d = repDur(spec) / speed;
  return lerpPose(s, en, repK((local % d) / d));
}

export function build(spec: AnimSpec, mode: 'quick' | 'errors'): Built {
  const d = repDur(spec);
  const segs: Segment[] = [];
  let t = 0;
  const push = (s: Omit<Segment, 'start'>) => {
    segs.push({ ...s, start: t });
    t += s.dur;
  };
  if (mode === 'quick') {
    push({ id: 'demo', label: 'Esecuzione', dur: spec.hold ? 6 : d * 3, kind: 'demo' });
    return { segments: segs, total: t };
  }
  push({ id: 'setup', label: 'Posizione', dur: 2.2, kind: 'setup' });
  for (const e of spec.errors) {
    const sp = e.speed ?? 1;
    push({ id: `${e.id}-bad`, label: e.bad, dur: spec.hold ? 3.2 : (d / sp) * 2, kind: 'bad', error: e });
    push({ id: `${e.id}-fix`, label: e.good, dur: spec.hold ? 3.6 : 0.9 + d * 2, kind: 'fix', error: e });
  }
  push({ id: 'final', label: 'Esecuzione corretta', dur: spec.hold ? 4 : d * 2, kind: 'good' });
  return { segments: segs, total: t };
}

function poseAt(spec: AnimSpec, seg: Segment, local: number): { pose: Pose; tone: number | null } {
  const e = seg.error;
  switch (seg.kind) {
    case 'setup':
      return { pose: spec.start, tone: 1 };
    case 'bad':
      return { pose: poseInRep(spec, e, 1, local, e?.speed ?? 1), tone: 0 };
    case 'fix': {
      const m = 0.9;
      if (local < m) {
        const k = ease(local / m);
        // from the faulty start position to the correct one, colour red → green
        return { pose: applyDelta(spec.start, e?.start, 1 - k), tone: k };
      }
      return { pose: poseInRep(spec, e, 0, local - m, 1), tone: 1 };
    }
    default:
      return { pose: poseInRep(spec, undefined, 0, local, 1), tone: 1 };
  }
}

export function frameAt(spec: AnimSpec, built: Built, time: number, cues: string[], labels = true): FrameInfo {
  const t = ((time % built.total) + built.total) % built.total;
  const seg = built.segments.find((s) => t >= s.start && t < s.start + s.dur) ?? built.segments[built.segments.length - 1];
  const local = t - seg.start;
  const { pose, tone } = poseAt(spec, seg, local);
  const sk = solve(pose, spec.front);

  let overlays: Overlay[] = [];
  let badge: FrameInfo['badge'] = null;
  let caption = '';
  let phase = '';
  const errIdx = seg.error ? spec.errors.indexOf(seg.error) + 1 : 0;
  switch (seg.kind) {
    case 'setup':
      overlays = spec.setup.overlays;
      caption = spec.setup.caption;
      phase = 'A · POSIZIONE INIZIALE';
      break;
    case 'bad':
      overlays = seg.error!.overlays;
      badge = 'bad';
      caption = seg.error!.bad;
      phase = `B · ERRORE ${errIdx}/${spec.errors.length}`;
      break;
    case 'fix':
      overlays = seg.error!.overlays;
      badge = local > 0.55 ? 'good' : 'bad';
      caption = local > 0.55 ? seg.error!.good : seg.error!.bad;
      phase = `C · CORREZIONE ${errIdx}/${spec.errors.length}`;
      break;
    case 'good':
      overlays = [];
      badge = 'good';
      caption = 'Esecuzione corretta';
      phase = 'D · ESECUZIONE';
      break;
    case 'demo': {
      overlays = spec.demo ?? [];
      const n = spec.hold ? Math.floor(local / 2) : Math.floor(local / repDur(spec));
      caption = cues.length ? cues[n % cues.length] : '';
      phase = 'DIMOSTRAZIONE';
      break;
    }
  }
  const badgeStart = seg.kind === 'fix' ? 0.55 : 0;
  const badgeT = Math.max(0, local - badgeStart);

  // trail of a joint over the current repetition (bar path, hand path…)
  const trail: Vec[] = [];
  const tr = overlays.find((o) => o.t === 'trail') as Extract<Overlay, { t: 'trail' }> | undefined;
  if (tr && !spec.hold) {
    const speed = seg.kind === 'bad' ? (seg.error?.speed ?? 1) : 1;
    const d = repDur(spec) / speed;
    const off = seg.kind === 'fix' ? 0.9 : 0;
    const inRep = local - off;
    if (inRep > 0) {
      const cycleStart = inRep - (inRep % d);
      for (let x = cycleStart; x <= inRep; x += d / 40) {
        const p = poseAt(spec, seg, x + off).pose;
        const s = solve(p, spec.front) as unknown as Record<string, Vec>;
        const a = tr.a;
        trail.push(typeof a === 'string' ? s[a] : Array.isArray(a) ? (a as Vec) : [s[a.a][0] + a.d[0], s[a.a][1] + a.d[1]]);
      }
    }
  }

  return { sk, equipment: spec.equipment, overlays, tone: overlays.length ? tone : null, badge, badgeT, caption, phase, trail, camera: spec.camera, labels };
}
