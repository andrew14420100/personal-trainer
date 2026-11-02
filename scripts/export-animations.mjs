// Exports technical animations to H.264 MP4 files (silent, 4:5, iPhone compatible).
// Requires: `npx vite --port 5190` running, ffmpeg, Playwright Chromium.
// Usage: node scripts/export-animations.mjs out-dir [exerciseId ...]
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const [out = 'export', ...ids] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const FPS = 24;
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5190/tools/anim-lab.html?ex=none');
await p.waitForFunction(() => document.title === 'ready');
const list = ids.length ? ids : await p.evaluate(() => [...document.querySelectorAll('.row div')].map((d) => d.textContent));
for (const ex of ids) {
  for (const mode of ['errors']) {
    const total = await p.evaluate(([e, m]) => window.animDuration(e, m), [ex, mode]);
    const dir = join(out, `${ex}-${mode}-frames`);
    mkdirSync(dir, { recursive: true });
    const n = Math.round(total * FPS);
    for (let i = 0; i < n; i++) {
      const url = await p.evaluate(([e, m, t]) => window.renderFrame(e, m, t, 720), [ex, mode, i / FPS]);
      writeFileSync(join(dir, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
    const file = join(out, `${ex}-${mode === 'errors' ? 'errori-correzioni' : 'dimostrazione'}.mp4`);
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(dir, 'f%05d.jpg'), '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', file], { stdio: 'inherit' });
    rmSync(dir, { recursive: true, force: true });
    console.log('exported', file, `${total.toFixed(1)} s`);
  }
}
void list;
await b.close();
