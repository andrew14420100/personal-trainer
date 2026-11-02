// Development contact sheet: renders key frames of every technical animation.
import { ANIMATIONS } from '../src/anim/library';
import { build, frameAt } from '../src/anim/timeline';
import { drawFrame } from '../src/anim/render';
import { W, H } from '../src/anim/rig';

const out = document.getElementById('out')!;
const only = new URLSearchParams(location.search).get('ex');
for (const spec of ANIMATIONS.filter((a) => !only || a.exerciseId === only)) {
  const row = document.createElement('div');
  row.className = 'row';
  const b = build(spec, 'errors');
  const times: number[] = [];
  const rep = spec.rep ?? 2.8;
  times.push(1); // setup
  for (const s of b.segments) {
    if (s.kind === 'bad') times.push(s.start + rep * 0.4 / (s.error?.speed ?? 1));
    if (s.kind === 'fix') times.push(s.start + 0.9 + rep * 0.4);
  }
  const q = build(spec, 'quick');
  for (const t of times.slice(0, 7)) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    drawFrame(c.getContext('2d')!, frameAt(spec, b, t, []));
    row.appendChild(c);
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  drawFrame(c.getContext('2d')!, frameAt(spec, q, 0.01, ['start']));
  row.prepend(c);
  const label = document.createElement('div');
  label.textContent = spec.exerciseId;
  label.style.width = '90px';
  row.prepend(label);
  out.appendChild(row);
}
document.title = 'ready';
