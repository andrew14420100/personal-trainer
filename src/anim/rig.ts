// FORMA LAB — kinematic rig for the technical animations.
// Side (sagittal) view, athlete facing right (+x). Logical stage: 400 × 500, floor at y = FLOOR.
// Arms and legs are solved with two-bone inverse kinematics, so hands and feet can be pinned to the
// equipment (handles, footplates, floor) exactly like a real athlete.

export const W = 400;
export const H = 500;
export const FLOOR = 440;

export const L = {
  torso: 118,
  neck: 12,
  head: 17,
  upperArm: 64,
  forearm: 60,
  thigh: 92,
  shin: 88,
  foot: 34,
  heel: 8,
};

export type Vec = [number, number];

/** A target for a hand or a foot: world coordinates, or relative to the shoulder (hands) / hip (feet). */
export type Target = { w: Vec } | { s: Vec } | { h: Vec };

export interface Pose {
  hip: Vec;
  /** Torso angle from vertical: 0 = upright, + = leaning forward, − = leaning back. */
  trunk: number;
  /** Spine curvature: + = rounded (flexion), − = arched (extension). */
  bend?: number;
  /** Head angle relative to the torso: + = chin down. */
  head?: number;
  hand: Target;
  foot: Target;
  farHand?: Target;
  farFoot?: Target;
  /** Elbow / knee bend side for the IK solution (+1 / −1). */
  elbow?: number;
  knee?: number;
  /** Foot orientation in degrees (0 = flat, + = toes up / heel down, − = on the toes). */
  ankle?: number;
  farAnkle?: number;
  /** Front view only: shoulders elevation (− = shrugged up). */
  shrug?: number;
}

export interface Skeleton {
  front: boolean;
  farShoulder: Vec;
  farHip: Vec;
  hip: Vec;
  shoulder: Vec;
  neck: Vec;
  headC: Vec;
  midback: Vec;
  spineCtrl: Vec;
  elbow: Vec;
  hand: Vec;
  knee: Vec;
  ankle: Vec;
  toe: Vec;
  heel: Vec;
  farElbow: Vec;
  farHand: Vec;
  farKnee: Vec;
  farAnkle: Vec;
  farToe: Vec;
  farHeel: Vec;
  trunkDir: Vec;
}

const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
const len = (a: Vec) => Math.hypot(a[0], a[1]);

function resolve(t: Target, shoulder: Vec, hip: Vec): Vec {
  if ('w' in t) return t.w;
  if ('s' in t) return add(shoulder, t.s);
  return add(hip, t.h);
}

/** Two-bone IK: returns the middle joint (elbow / knee). */
export function ik(root: Vec, target: Vec, a: number, b: number, side: number): Vec {
  const d0 = sub(target, root);
  let d = len(d0);
  d = Math.max(Math.abs(a - b) + 0.5, Math.min(a + b - 0.01, d));
  const base = Math.atan2(d0[1], d0[0]);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const ang = base + side * Math.acos(Math.max(-1, Math.min(1, cosA)));
  return [root[0] + a * Math.cos(ang), root[1] + a * Math.sin(ang)];
}

/** Clamp the end effector to the reachable distance (so a straight limb stays straight). */
function reach(root: Vec, target: Vec, total: number): Vec {
  const d = sub(target, root);
  const l = len(d);
  if (l <= total - 0.01) return target;
  return add(root, scale(d, (total - 0.01) / l));
}

export function solve(p: Pose, front = false): Skeleton {
  if (front) return solveFront(p);
  const t = rad(p.trunk);
  const u: Vec = [Math.sin(t), -Math.cos(t)]; // hip → shoulder
  const n: Vec = [Math.cos(t), Math.sin(t)]; // forward normal (chest side)
  const hip = p.hip;
  const shoulder = add(hip, scale(u, L.torso));
  const mid = add(hip, scale(u, L.torso / 2));
  const bend = p.bend ?? 0;
  const spineCtrl = add(mid, scale(n, -bend * 1.1)); // rounded back bows backwards
  const midback = add(mid, scale(n, -bend * 0.55 - 14));
  const h = rad(p.trunk + (p.head ?? 0) + bend * 0.6);
  const hu: Vec = [Math.sin(h), -Math.cos(h)];
  const neck = add(shoulder, scale(hu, L.neck));
  const headC = add(neck, scale(hu, L.head));

  const arm = L.upperArm + L.forearm;
  const leg = L.thigh + L.shin;
  const hand = reach(shoulder, resolve(p.hand, shoulder, hip), arm);
  const farHand = reach(shoulder, resolve(p.farHand ?? p.hand, shoulder, hip), arm);
  const ankle = reach(hip, resolve(p.foot, shoulder, hip), leg);
  const farAnkle = reach(hip, resolve(p.farFoot ?? p.foot, shoulder, hip), leg);
  const eSide = p.elbow ?? 1;
  const kSide = p.knee ?? -1;
  const elbow = ik(shoulder, hand, L.upperArm, L.forearm, eSide);
  const farElbow = ik(shoulder, farHand, L.upperArm, L.forearm, eSide);
  const knee = ik(hip, ankle, L.thigh, L.shin, kSide);
  const farKnee = ik(hip, farAnkle, L.thigh, L.shin, kSide);

  const footVec = (ank: Vec, a: number): [Vec, Vec] => {
    const r = rad(-(a ?? 0));
    const dir: Vec = [Math.cos(r), Math.sin(r)];
    return [add(ank, scale(dir, L.foot)), add(ank, scale(dir, -L.heel))];
  };
  const [toe, heel] = footVec(ankle, p.ankle ?? 0);
  const [farToe, farHeel] = footVec(farAnkle, p.farAnkle ?? p.ankle ?? 0);

  return { front: false, farShoulder: shoulder, farHip: hip, hip, shoulder, neck, headC, midback, spineCtrl, elbow, hand, knee, ankle, toe, heel, farElbow, farHand, farKnee, farAnkle, farToe, farHeel, trunkDir: u };
}

/**
 * Front (frontal-plane) view: the athlete faces the camera. "hand"/"foot" targets describe the
 * limb on the left of the screen; the other side is mirrored.
 */
function solveFront(p: Pose): Skeleton {
  const t = rad(p.trunk);
  const u: Vec = [Math.sin(t), -Math.cos(t)];
  const hipC = p.hip;
  const top = add(hipC, scale(u, L.torso));
  const shrug = p.shrug ?? 0;
  const shoulder: Vec = [top[0] - 26, top[1] + shrug];
  const farShoulder: Vec = [top[0] + 26, top[1] + shrug];
  const hip: Vec = [hipC[0] - 14, hipC[1]];
  const farHip: Vec = [hipC[0] + 14, hipC[1]];
  const neck = add(top, scale(u, L.neck));
  const headC = add(neck, scale(u, L.head));
  const mirror = (tg: Target, other: Vec): Vec => {
    if ('w' in tg) return [2 * hipC[0] - tg.w[0], tg.w[1]];
    const d = 's' in tg ? tg.s : tg.h;
    return [other[0] - d[0], other[1] + d[1]];
  };
  const arm = L.upperArm + L.forearm;
  const leg = L.thigh + L.shin;
  const hand = reach(shoulder, resolve(p.hand, shoulder, hip), arm);
  const farHand = reach(farShoulder, mirror(p.hand, farShoulder), arm);
  const ankle = reach(hip, resolve(p.foot, shoulder, hip), leg);
  const farAnkle = reach(farHip, mirror(p.foot, farHip), leg);
  const eSide = p.elbow ?? -1;
  const kSide = p.knee ?? 1;
  const elbow = ik(shoulder, hand, L.upperArm, L.forearm, eSide);
  const farElbow = ik(farShoulder, farHand, L.upperArm, L.forearm, -eSide);
  const knee = ik(hip, ankle, L.thigh, L.shin, kSide);
  const farKnee = ik(farHip, farAnkle, L.thigh, L.shin, -kSide);
  const toe: Vec = [ankle[0] - 6, ankle[1] + 8];
  const farToe: Vec = [farAnkle[0] + 6, farAnkle[1] + 8];
  const mid = add(hipC, scale(u, L.torso / 2));
  return {
    front: true,
    hip,
    farHip,
    shoulder,
    farShoulder,
    neck,
    headC,
    midback: mid,
    spineCtrl: mid,
    elbow,
    hand,
    knee,
    ankle,
    toe,
    heel: ankle,
    farElbow,
    farHand,
    farKnee,
    farAnkle,
    farToe,
    farHeel: farAnkle,
    trunkDir: u,
  };
}

// ── Interpolation ───────────────────────────────────────────────────────────

function lerpN(a: number | undefined, b: number | undefined, k: number, d = 0) {
  const x = a ?? d;
  const y = b ?? d;
  return x + (y - x) * k;
}
const lerpV = (a: Vec, b: Vec, k: number): Vec => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

function lerpT(a: Target | undefined, b: Target | undefined, k: number): Target | undefined {
  if (!a || !b) return a ?? b;
  const ka = Object.keys(a)[0] as 'w' | 's' | 'h';
  const kb = Object.keys(b)[0];
  if (ka !== kb) return k < 0.5 ? a : b;
  return { [ka]: lerpV((a as Record<string, Vec>)[ka], (b as Record<string, Vec>)[ka], k) } as Target;
}

export function lerpPose(a: Pose, b: Pose, k: number): Pose {
  return {
    hip: lerpV(a.hip, b.hip, k),
    trunk: lerpN(a.trunk, b.trunk, k),
    bend: lerpN(a.bend, b.bend, k),
    head: lerpN(a.head, b.head, k),
    hand: lerpT(a.hand, b.hand, k)!,
    foot: lerpT(a.foot, b.foot, k)!,
    farHand: lerpT(a.farHand, b.farHand, k),
    farFoot: lerpT(a.farFoot, b.farFoot, k),
    elbow: k < 0.5 ? a.elbow : b.elbow,
    knee: k < 0.5 ? a.knee : b.knee,
    ankle: lerpN(a.ankle, b.ankle, k),
    farAnkle: a.farAnkle == null && b.farAnkle == null ? undefined : lerpN(a.farAnkle ?? a.ankle, b.farAnkle ?? b.ankle, k),
    shrug: lerpN(a.shrug, b.shrug, k),
  };
}

/** Delta applied by an error: numbers are added, vectors are added component-wise. */
export type PoseDelta = Partial<{
  hip: Vec;
  trunk: number;
  bend: number;
  head: number;
  hand: Vec;
  foot: Vec;
  farHand: Vec;
  farFoot: Vec;
  ankle: number;
  farAnkle: number;
  shrug: number;
}>;

function addT(t: Target | undefined, d: Vec | undefined): Target | undefined {
  if (!t || !d) return t;
  const k = Object.keys(t)[0] as 'w' | 's' | 'h';
  return { [k]: add((t as Record<string, Vec>)[k], d) } as Target;
}

export function applyDelta(p: Pose, d: PoseDelta | undefined, k = 1): Pose {
  if (!d || k === 0) return p;
  const s = (v: Vec | undefined): Vec | undefined => (v ? scale(v, k) : undefined);
  return {
    ...p,
    hip: d.hip ? add(p.hip, s(d.hip)!) : p.hip,
    trunk: p.trunk + (d.trunk ?? 0) * k,
    bend: (p.bend ?? 0) + (d.bend ?? 0) * k,
    head: (p.head ?? 0) + (d.head ?? 0) * k,
    hand: addT(p.hand, s(d.hand))!,
    foot: addT(p.foot, s(d.foot))!,
    farHand: addT(p.farHand, s(d.farHand)),
    farFoot: addT(p.farFoot, s(d.farFoot)),
    ankle: (p.ankle ?? 0) + (d.ankle ?? 0) * k,
    farAnkle: p.farAnkle == null && d.farAnkle == null ? p.farAnkle : (p.farAnkle ?? p.ankle ?? 0) + (d.farAnkle ?? 0) * k,
    shrug: (p.shrug ?? 0) + (d.shrug ?? 0) * k,
  };
}

export const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
