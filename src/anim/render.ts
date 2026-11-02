// Canvas renderer: cinematic dark studio, grey mannequin, machines, red/green technical overlays.
import { FLOOR, H, W, type Skeleton, type Vec } from './rig';
import type { Equip, Overlay, Pt } from './spec';

export const RED = '#ff3b47';
export const GREEN = '#22e08a';

export interface FrameInfo {
  sk: Skeleton;
  equipment: Equip[];
  overlays: Overlay[];
  /** 0 = red (error), 1 = green (correct), null = no overlay colour (neutral white). */
  tone: number | null;
  badge: 'bad' | 'good' | null;
  badgeT: number; // seconds since the badge appeared (pop animation)
  caption: string;
  phase: string;
  trail: Vec[];
  camera?: [number, number, number];
  labels: boolean;
}

function pt(sk: Skeleton, p: Pt): Vec {
  if (Array.isArray(p)) return p as Vec;
  if (typeof p === 'string') return (sk as unknown as Record<string, Vec>)[p];
  const b = (sk as unknown as Record<string, Vec>)[p.a];
  return [b[0] + p.d[0], b[1] + p.d[1]];
}

function mixColor(t: number) {
  // red → green through a neutral tone
  const a = [255, 59, 71];
  const b = [34, 224, 138];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function limb(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, w: number, fill: string, hi: string, outline?: string) {
  ctx.lineCap = 'round';
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = w + 4;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  // specular highlight along the limb
  ctx.strokeStyle = hi;
  ctx.lineWidth = Math.max(2, w * 0.22);
  const off = w * 0.22;
  ctx.beginPath();
  ctx.moveTo(a[0] - off * 0.3, a[1] - off);
  ctx.lineTo(b[0] - off * 0.3, b[1] - off);
  ctx.stroke();
}

function drawEquip(ctx: CanvasRenderingContext2D, sk: Skeleton, e: Equip, layer: 'back' | 'front') {
  const frame = '#3a3e46';
  const frameHi = '#555a64';
  const pad = '#1d1f24';
  const metal = '#8a9099';
  const front = e.t === 'handle' || e.t === 'dumbbell' || e.t === 'barbell' || e.t === 'pad';
  if ((layer === 'front') !== front) return;
  ctx.save();
  switch (e.t) {
    case 'rect': {
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      if (e.rot) ctx.rotate((e.rot * Math.PI) / 180);
      roundRect(ctx, -e.w / 2, -e.h / 2, e.w, e.h, e.r ?? 6);
      ctx.fillStyle = e.tone === 'pad' ? pad : e.tone === 'dark' ? '#24272d' : frame;
      ctx.fill();
      ctx.strokeStyle = e.tone === 'pad' ? '#2c2f36' : frameHi;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'rail':
      ctx.strokeStyle = frameHi;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y1);
      ctx.lineTo(e.x, e.y2);
      ctx.stroke();
      break;
    case 'mat':
      roundRect(ctx, e.x, FLOOR - 6, e.w, 8, 4);
      ctx.fillStyle = '#20232a';
      ctx.fill();
      break;
    case 'pulley': {
      ctx.fillStyle = '#2b2e35';
      ctx.strokeStyle = metal;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.at[0], e.at[1], e.r ?? 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'cable': {
      const to = pt(sk, e.to);
      ctx.strokeStyle = '#b9bec7';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(e.from[0], e.from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();
      break;
    }
    case 'lever': {
      const to = pt(sk, e.to);
      ctx.strokeStyle = frame;
      ctx.lineWidth = e.width ?? 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(e.pivot[0], e.pivot[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.arc(e.pivot[0], e.pivot[1], 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'plate': {
      const c = pt(sk, e.at);
      ctx.translate(c[0] + (e.d?.[0] ?? 0), c[1] + (e.d?.[1] ?? 0));
      ctx.rotate((e.rot * Math.PI) / 180);
      roundRect(ctx, -e.w / 2, -e.h / 2, e.w, e.h, 5);
      ctx.fillStyle = frame;
      ctx.fill();
      ctx.strokeStyle = frameHi;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'pad': {
      const c = pt(sk, e.at);
      ctx.fillStyle = pad;
      ctx.strokeStyle = '#3a3e46';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c[0], c[1], e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'handle': {
      const c = pt(sk, e.at);
      ctx.fillStyle = '#c4c9d1';
      if (e.kind === 'bar') {
        ctx.beginPath();
        ctx.arc(c[0], c[1], 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'rope') {
        ctx.strokeStyle = '#d8c48a';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(c[0], c[1] - 10);
        ctx.lineTo(c[0], c[1] + 6);
        ctx.stroke();
      } else {
        roundRect(ctx, c[0] - 5, c[1] - 9, 10, 18, 4);
        ctx.fill();
      }
      break;
    }
    case 'dumbbell': {
      const c = pt(sk, e.at);
      ctx.fillStyle = '#2a2d33';
      ctx.strokeStyle = '#6e747d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c[0], c[1], 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9aa0a8';
      ctx.beginPath();
      ctx.arc(c[0], c[1], 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'barbell': {
      const c = pt(sk, e.at);
      const r = e.r ?? 34;
      ctx.fillStyle = '#1c1e22';
      ctx.strokeStyle = '#5b6069';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9aa0a8';
      ctx.beginPath();
      ctx.arc(c[0], c[1], 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function dashed(ctx: CanvasRenderingContext2D, color: string, draw: () => void, width = 3.5) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([9, 7]);
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  draw();
  ctx.stroke();
  ctx.restore();
}

function drawOverlay(ctx: CanvasRenderingContext2D, sk: Skeleton, o: Overlay, color: string, trail: Vec[]) {
  switch (o.t) {
    case 'line': {
      let a = pt(sk, o.a);
      let b = pt(sk, o.b);
      if (o.ext) {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        a = [a[0] - (dx / l) * o.ext, a[1] - (dy / l) * o.ext];
        b = [b[0] + (dx / l) * o.ext, b[1] + (dy / l) * o.ext];
      }
      dashed(ctx, color, () => {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      });
      break;
    }
    case 'level': {
      const a = pt(sk, o.a);
      const b = pt(sk, o.b);
      dashed(ctx, color, () => {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], a[1]);
      });
      break;
    }
    case 'spine': {
      // a line along the back, offset behind the torso
      const off = 22;
      const u = sk.trunkDir;
      const n: Vec = [-u[1], u[0]]; // backwards normal
      const p0: Vec = [sk.hip[0] + n[0] * off * 0.8, sk.hip[1] + n[1] * off * 0.8];
      const p1: Vec = [sk.shoulder[0] + n[0] * off * 0.8, sk.shoulder[1] + n[1] * off * 0.8];
      const c: Vec = [sk.spineCtrl[0] + n[0] * off, sk.spineCtrl[1] + n[1] * off];
      dashed(ctx, color, () => {
        ctx.moveTo(p0[0] - u[0] * 10, p0[1] - u[1] * 10);
        ctx.quadraticCurveTo(c[0], c[1], p1[0] + u[0] * 14, p1[1] + u[1] * 14);
      });
      break;
    }
    case 'plumb': {
      const a = pt(sk, o.a);
      dashed(ctx, color, () => {
        ctx.moveTo(a[0], a[1] - (o.up ?? 60));
        ctx.lineTo(a[0], a[1] + (o.down ?? 60));
      });
      break;
    }
    case 'ring': {
      const a = pt(sk, o.a);
      dashed(
        ctx,
        color,
        () => {
          ctx.arc(a[0], a[1], o.r ?? 20, 0, Math.PI * 2);
        },
        3,
      );
      break;
    }
    case 'trail': {
      if (trail.length < 2) break;
      dashed(ctx, color, () => {
        ctx.moveTo(trail[0][0], trail[0][1]);
        for (const p of trail) ctx.lineTo(p[0], p[1]);
      });
      break;
    }
    case 'arrow': {
      const a = pt(sk, o.a);
      const r = (o.dir * Math.PI) / 180;
      const l = o.len ?? 46;
      const b: Vec = [a[0] + Math.cos(r) * l, a[1] + Math.sin(r) * l];
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b[0] + Math.cos(r) * 4, b[1] + Math.sin(r) * 4);
      ctx.lineTo(b[0] + Math.cos(r + 2.5) * 13, b[1] + Math.sin(r + 2.5) * 13);
      ctx.lineTo(b[0] + Math.cos(r - 2.5) * 13, b[1] + Math.sin(r - 2.5) * 13);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
  }
}

function drawBodyFront(ctx: CanvasRenderingContext2D, sk: Skeleton) {
  const near = '#c9cdd3';
  const nearHi = '#eef0f3';
  const side = '#b3b8bf';
  // legs
  limb(ctx, sk.hip, sk.knee, 24, side, nearHi);
  limb(ctx, sk.knee, sk.ankle, 18, side, nearHi);
  limb(ctx, sk.farHip, sk.farKnee, 24, side, nearHi);
  limb(ctx, sk.farKnee, sk.farAnkle, 18, side, nearHi);
  limb(ctx, sk.ankle, sk.toe, 10, side, nearHi);
  limb(ctx, sk.farAnkle, sk.farToe, 10, side, nearHi);
  // torso (trapezoid)
  const g = ctx.createLinearGradient(sk.hip[0], sk.hip[1], sk.farShoulder[0], sk.farShoulder[1]);
  g.addColorStop(0, '#a5abb3');
  g.addColorStop(1, '#d8dce1');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(sk.hip[0] - 8, sk.hip[1] + 8);
  ctx.lineTo(sk.farHip[0] + 8, sk.farHip[1] + 8);
  ctx.quadraticCurveTo(sk.farShoulder[0] + 6, (sk.farHip[1] + sk.farShoulder[1]) / 2, sk.farShoulder[0] + 10, sk.farShoulder[1]);
  ctx.quadraticCurveTo(sk.neck[0], sk.farShoulder[1] - 12, sk.shoulder[0] - 10, sk.shoulder[1]);
  ctx.quadraticCurveTo(sk.shoulder[0] - 6, (sk.hip[1] + sk.shoulder[1]) / 2, sk.hip[0] - 8, sk.hip[1] + 8);
  ctx.closePath();
  ctx.fill();
  limb(ctx, sk.neck, [sk.neck[0], (sk.shoulder[1] + sk.neck[1]) / 2 + 6], 16, '#b9bec6', '#dde0e5');
  const hg = ctx.createRadialGradient(sk.headC[0] - 5, sk.headC[1] - 6, 3, sk.headC[0], sk.headC[1], 19);
  hg.addColorStop(0, '#f2f3f5');
  hg.addColorStop(1, '#a9afb7');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(sk.headC[0], sk.headC[1], 15, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // arms
  for (const [s, e, h] of [
    [sk.shoulder, sk.elbow, sk.hand],
    [sk.farShoulder, sk.farElbow, sk.farHand],
  ] as const) {
    ctx.fillStyle = '#c3c8ce';
    ctx.beginPath();
    ctx.arc(s[0], s[1], 12, 0, Math.PI * 2);
    ctx.fill();
    limb(ctx, s, e, 17, near, nearHi);
    limb(ctx, e, h, 13, near, nearHi);
  }
}

function drawBody(ctx: CanvasRenderingContext2D, sk: Skeleton) {
  if (sk.front) return drawBodyFront(ctx, sk);
  const far = '#5d626b';
  const farHi = '#737882';
  const near = '#c9cdd3';
  const nearHi = '#eef0f3';
  // far limbs
  limb(ctx, sk.hip, sk.farKnee, 22, far, farHi);
  limb(ctx, sk.farKnee, sk.farAnkle, 17, far, farHi);
  limb(ctx, sk.farHeel, sk.farToe, 9, far, farHi);
  limb(ctx, sk.shoulder, sk.farElbow, 15, far, farHi);
  limb(ctx, sk.farElbow, sk.farHand, 12, far, farHi);
  // torso
  ctx.save();
  const g = ctx.createLinearGradient(sk.hip[0] - 30, sk.hip[1], sk.shoulder[0] + 30, sk.shoulder[1]);
  g.addColorStop(0, '#aab0b8');
  g.addColorStop(1, '#d7dbe0');
  ctx.strokeStyle = g;
  ctx.lineCap = 'round';
  ctx.lineWidth = 38;
  ctx.beginPath();
  ctx.moveTo(sk.hip[0], sk.hip[1]);
  ctx.quadraticCurveTo(sk.spineCtrl[0], sk.spineCtrl[1], sk.shoulder[0], sk.shoulder[1]);
  ctx.stroke();
  // chest volume (on the front side of the torso)
  ctx.fillStyle = '#d2d6db';
  const u = sk.trunkDir;
  const n: Vec = [-u[1], u[0]].map((v) => -v) as Vec; // forward normal
  const chest: Vec = [sk.shoulder[0] - u[0] * 32 + n[0] * 9, sk.shoulder[1] - u[1] * 32 + n[1] * 9];
  ctx.beginPath();
  ctx.ellipse(chest[0], chest[1], 26, 18, Math.atan2(u[1], u[0]), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // pelvis
  ctx.fillStyle = '#9ea4ad';
  ctx.beginPath();
  ctx.arc(sk.hip[0], sk.hip[1], 19, 0, Math.PI * 2);
  ctx.fill();
  // neck + head
  limb(ctx, sk.shoulder, sk.neck, 14, '#b9bec6', '#dde0e5');
  const hg = ctx.createRadialGradient(sk.headC[0] - 5, sk.headC[1] - 6, 3, sk.headC[0], sk.headC[1], 19);
  hg.addColorStop(0, '#f2f3f5');
  hg.addColorStop(1, '#a9afb7');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(sk.headC[0], sk.headC[1], 17, 0, Math.PI * 2);
  ctx.fill();
  // near limbs
  limb(ctx, sk.hip, sk.knee, 24, near, nearHi, '#6f757e');
  limb(ctx, sk.knee, sk.ankle, 18, near, nearHi, '#6f757e');
  limb(ctx, sk.heel, sk.toe, 10, '#b4b9c0', nearHi);
  limb(ctx, sk.shoulder, sk.elbow, 17, near, nearHi, '#6f757e');
  limb(ctx, sk.elbow, sk.hand, 13, near, nearHi, '#6f757e');
  ctx.fillStyle = '#d9dce0';
  ctx.beginPath();
  ctx.arc(sk.hand[0], sk.hand[1], 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawBadge(ctx: CanvasRenderingContext2D, kind: 'bad' | 'good', t: number) {
  const s = Math.min(1, t / 0.18);
  const pop = s < 1 ? 0.6 + 0.6 * s : 1 + Math.max(0, 0.12 - (t - 0.18)) ;
  const cx = W / 2;
  const cy = 46;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pop, pop);
  ctx.fillStyle = kind === 'bad' ? RED : GREEN;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 18;
  roundRect(ctx, -22, -22, 44, 44, 11);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 'bad') {
    ctx.moveTo(-9, -9);
    ctx.lineTo(9, 9);
    ctx.moveTo(9, -9);
    ctx.lineTo(-9, 9);
  } else {
    ctx.moveTo(-10, 1);
    ctx.lineTo(-3, 9);
    ctx.lineTo(11, -8);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawFrame(ctx: CanvasRenderingContext2D, f: FrameInfo) {
  ctx.save();
  // background: dark studio with a soft spotlight
  const bg = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.5, W * 0.95);
  bg.addColorStop(0, '#2a2d33');
  bg.addColorStop(1, '#0b0c0e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (f.camera) {
    const [cx, cy, s] = f.camera;
    ctx.translate(W / 2, H / 2);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
  }
  // floor
  const fl = ctx.createLinearGradient(0, FLOOR, 0, H + 200);
  fl.addColorStop(0, '#1a1c20');
  fl.addColorStop(1, '#0b0c0e');
  ctx.fillStyle = fl;
  ctx.fillRect(-400, FLOOR, W + 800, 600);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-400, FLOOR);
  ctx.lineTo(W + 400, FLOOR);
  ctx.stroke();

  for (const e of f.equipment) drawEquip(ctx, f.sk, e, 'back');
  drawBody(ctx, f.sk);
  for (const e of f.equipment) drawEquip(ctx, f.sk, e, 'front');

  if (f.tone != null && f.overlays.length) {
    const color = mixColor(f.tone);
    for (const o of f.overlays) drawOverlay(ctx, f.sk, o, color, f.trail);
  }
  ctx.restore();

  if (f.badge) drawBadge(ctx, f.badge, f.badgeT);

  if (f.labels) {
    // phase label
    if (f.phase) {
      ctx.font = '800 11px "Archivo Variable", system-ui, sans-serif';
      const tw = ctx.measureText(f.phase).width;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, 12, 14, tw + 18, 22, 11);
      ctx.fill();
      ctx.fillStyle = '#e8eaed';
      ctx.fillText(f.phase, 21, 29);
    }
    // caption
    if (f.caption) {
      ctx.font = '700 15px "Inter Variable", system-ui, sans-serif';
      const tw = Math.min(W - 40, ctx.measureText(f.caption).width);
      const x = (W - tw) / 2 - 14;
      ctx.fillStyle = 'rgba(8,9,11,0.72)';
      roundRect(ctx, x, H - 50, tw + 28, 32, 16);
      ctx.fill();
      ctx.fillStyle = f.badge === 'bad' ? '#ffb3b8' : f.badge === 'good' ? '#a9f5d0' : '#f1f2f4';
      ctx.textAlign = 'center';
      ctx.fillText(f.caption, W / 2, H - 29, W - 40);
      ctx.textAlign = 'left';
    }
  }
  ctx.restore();
}
