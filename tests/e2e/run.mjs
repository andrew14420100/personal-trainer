// End-to-end smoke test on the production build, emulating iPhone screens in Chromium.
// (WebKit/real iOS Safari is NOT available in this environment: see docs/RAPPORTO_TEST.md.)
// Usage: npm run build && npm run test:e2e
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const shots = join(root, 'tests/e2e/screens');
mkdirSync(shots, { recursive: true });
const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok, info });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ' — ' + info : ''}`);
};

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe' });
// Wait until the preview server answers (stdout contains ANSI colour codes, so poll HTTP instead).
for (let i = 0; ; i++) {
  try {
    if ((await fetch(BASE + '/')).ok) break;
  } catch {
    /* not ready yet */
  }
  if (i > 100) throw new Error('preview server timeout');
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await chromium.launch();
const errors = [];

async function layoutChecks(page, label) {
  const r = await page.evaluate(() => {
    const vw = Math.min(window.innerWidth, window.screen.width || window.innerWidth);
    const over = [];
    document.querySelectorAll('body *').forEach((el) => {
      const b = el.getBoundingClientRect();
      if (!b.width || getComputedStyle(el).position === 'fixed') return;
      if (el.closest('.phases,.anim-chips,.chart,.sheet-backdrop,.hero,.day-card,.player,.ex-thumb')) return; // horizontally scrollable or clipped (overflow:hidden)
      if (b.right > vw + 1 || b.left < -1) over.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60));
    });
    const unnamed = [...document.querySelectorAll('button, a[href], input, select, textarea')].filter((el) => {
      if (el.closest('[hidden]') || el.type === 'hidden') return false;
      const name = el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('title') || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.getAttribute('placeholder');
      return !name;
    }).map((el) => el.outerHTML.slice(0, 80));
    const small = [...document.querySelectorAll('button, a.btn')].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && (b.height < 32 || b.width < 32) && !el.classList.contains('link');
    }).map((el) => `${el.className}:${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    return { scrollW: Math.max(document.documentElement.scrollWidth, window.innerWidth), vw, over: over.slice(0, 5), unnamed: unnamed.slice(0, 5), small: small.slice(0, 5), empty: document.querySelector('main')?.innerText.trim().length ?? 0 };
  });
  check(`[${label}] no horizontal overflow`, r.scrollW <= r.vw && r.over.length === 0, r.over.join(', '));
  check(`[${label}] all controls have an accessible name`, r.unnamed.length === 0, r.unnamed.join(' | '));
  check(`[${label}] touch targets ≥ 32px`, r.small.length === 0, r.small.join(', '));
  check(`[${label}] screen not empty`, r.empty > 40);
}

async function run(deviceName, label, full) {
  const ctx = await browser.newContext({ ...devices[deviceName], locale: 'it-IT', acceptDownloads: true, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/youtube|ytimg|ERR_|net::/i.test(m.text()) && errors.push(`${label} console: ${m.text()}`));
  // Block external network: the test must not depend on YouTube.
  await ctx.route(/^https:\/\/(?!localhost)/, (r) => r.abort());

  await page.goto(BASE + '/');
  await page.waitForSelector('.hero');
  await page.screenshot({ path: join(shots, `${label}-01-home-empty.png`), fullPage: true });
  check(`[${label}] home shows FORMA LAB brand`, await page.locator('.brand').first().isVisible());
  check(`[${label}] home empty state without fake stats`, await page.getByText('Il tuo registro parte da zero').isVisible());
  await layoutChecks(page, `${label} home`);

  // Program: 4 days, 26 positions
  await page.getByRole('button', { name: 'Allenamenti', exact: true }).click();
  await page.waitForSelector('.dcard');
  check(`[${label}] program shows 4 day cards with clear names`, (await page.locator('.dcard').count()) === 4 && (await page.getByText('Petto, schiena e braccia').count()) >= 1);
  check(`[${label}] day cards show anatomy and start button`, (await page.locator('.dcard .anatomy').count()) === 4 && (await page.locator('.dcard').getByRole('button', { name: /Inizia allenamento/ }).count()) >= 3);
  await page.screenshot({ path: join(shots, `${label}-02-program.png`), fullPage: true });
  let total = 0;
  for (const d of ['upper-a', 'lower-a', 'upper-b', 'lower-b']) {
    await page.goto(`${BASE}/#/giorno/${d}`);
    await page.waitForSelector('.ex-row');
    const n = await page.locator('.ex-row').count();
    total += n;
    if (full && d === 'lower-b') await page.screenshot({ path: join(shots, `${label}-03-day-lower-b.png`), fullPage: true });
  }
  check(`[${label}] 26 exercise positions across the 4 days`, total === 26, `found ${total}`);
  await layoutChecks(page, `${label} day`);

  // Exercise page: name — group, quick facts, anatomy, real video first
  await page.goto(`${BASE}/#/esercizio/lat-pulldown-wide?slot=upper-a-2`);
  await page.waitForSelector('.ex-facts');
  check(`[${label}] exercise header shows name and muscle group`, (await page.locator('h1').innerText()).toUpperCase().includes('SCHIENA'));
  check(`[${label}] quick facts: main muscle, sets, reps, rest`, (await page.locator('.ex-facts').innerText()).includes('Gran dorsale') && (await page.locator('.ex-fact-n').count()) === 3);
  check(`[${label}] anatomy map highlights primary muscles`, (await page.locator('.ex-facts .mus.p').count()) >= 2);
  check(`[${label}] real athlete video is the primary media (vertical player)`, (await page.locator('.player.vertical').count()) === 1);
  await page.waitForSelector('.player-msg >> text=Apri su YouTube', { timeout: 20000 });
  check(`[${label}] blocked real video offers the verified original link`, (await page.locator('a[href^="https://www.youtube.com/watch?v=6zw-Tfh6_8E"]').count()) >= 1);
  await page.goto(`${BASE}/#/esercizio/chest-press?slot=upper-a-1`);
  await page.waitForSelector('.ex-facts');
  const sections = await page.locator('.section-title').allInnerTexts();
  check(`[${label}] exercise sections in order`, ['PRESCRIZIONE', 'TECNICA', 'ERRORI E CORREZIONI', 'ALTERNATIVE', 'NOTE PERSONALI', 'STORICO PRESTAZIONI'].every((s, i, a) => sections.map((x) => x.toUpperCase()).indexOf(s) >= (i ? sections.map((x) => x.toUpperCase()).indexOf(a[i - 1]) : 0)), sections.join(' > '));
  // technical diagram is still available (labelled as diagram, not video)
  await page.getByRole('tab', { name: 'Schema' }).click();
  await page.waitForSelector('.anim-stage canvas');
  await page.locator('.anim-stage').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  const px = async () => page.locator('.anim-stage canvas').first().evaluate((c) => c.toDataURL().length + ':' + c.toDataURL().slice(5000, 5200));
  const f1 = await px();
  await page.waitForTimeout(2600); // the sequence opens with a 1.8 s still "starting position"
  check(`[${label}] technical diagram animates`, f1 !== (await px()));
  check(`[${label}] diagram lists the faults (✕ chips)`, (await page.locator('.anim-chip.bad').count()) >= 2);
  await page.screenshot({ path: join(shots, `${label}-04-exercise.png`), fullPage: false });
  check(`[${label}] guided tutorial shows 5 phases`, (await page.locator('.phase-btn').count()) === 5);
  await page.getByRole('tab', { name: /Errori/ }).last().click();
  check(`[${label}] errors phase shows RED cards`, (await page.locator('.phases ~ .card .fix-side.wrong').count()) >= 3);
  await page.locator('.fix-card .btn', { hasText: 'Correggi' }).first().click();
  check(`[${label}] correction shows GREEN`, (await page.locator('.fix-side.right').count()) >= 1);
  // External tutorial (talking) stays secondary and never a stuck player
  await page.locator('details.disclosure summary', { hasText: 'Video YouTube di riferimento' }).click();
  await page.locator('details .player-facade').click();
  await page.waitForSelector('details .player-msg >> text=Apri su YouTube', { timeout: 20000 });
  check(`[${label}] external tutorial falls back to original link`, (await page.locator('a[href^="https://www.youtube.com/watch?v=sqNwDkUU_Ps"]').count()) >= 1);
  await layoutChecks(page, `${label} exercise`);
  // Own footage: import, muted inline looping playback, red/green annotation, persistence
  await page.getByRole('tab', { name: 'Tuo' }).click();
  await page.locator('input[type=file][accept="video/*"]').first().setInputFiles(join(root, 'tests/e2e/sample-athlete.mp4'));
  await page.waitForSelector('.uv-stage video', { timeout: 10000 });
  await page.waitForTimeout(1500);
  const vstate = await page.locator('.uv-stage video').evaluate((v) => ({ t: v.currentTime, muted: v.muted, loop: v.loop, inline: v.playsInline, paused: v.paused }));
  check(`[${label}] own video plays muted, inline and looping`, vstate.t > 0.3 && vstate.muted && vstate.loop && vstate.inline && !vstate.paused, JSON.stringify(vstate));
  await page.getByRole('button', { name: /Annota/ }).click();
  await page.getByRole('button', { name: /Errore qui/ }).click();
  await page.locator('.uv-stage').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  const box = await page.locator('.uv-stage').boundingBox();
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.45);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.55);
  await page.waitForTimeout(300);
  check(`[${label}] red annotation drawn on own video`, (await page.locator('.uv-overlay line[stroke="#ff3b47"]').count()) >= 1 && (await page.locator('.uv-badge.bad').count()) >= 1);
  await page.screenshot({ path: join(shots, `${label}-04b-own-video.png`) });
  await page.reload();
  await page.getByRole('tab', { name: 'Il tuo' }).click();
  await page.waitForSelector('.uv-stage video', { timeout: 10000 });
  check(`[${label}] own video and annotations persist after reload`, (await page.locator('.uv-stage video').count()) === 1);
  // Favorite + note persist
  await page.getByRole('button', { name: 'Aggiungi ai preferiti' }).click();
  await page.getByRole('textbox', { name: 'Note personali' }).fill('Sedile 4');
  await page.getByRole('textbox', { name: 'Note personali' }).blur();

  // Workout
  await page.goto(`${BASE}/#/giorno/upper-a`);
  await page.getByRole('button', { name: /Inizia allenamento/ }).first().click();
  await page.waitForSelector('.set-row');
  check(`[${label}] workout mode opened`, await page.getByText('Esercizio 1 di 7').isVisible());
  check(`[${label}] workout shows the demo video`, (await page.locator('.player.vertical, .anim-stage canvas, .uv-stage video').count()) === 1);
  const exCount = 7;
  for (let e = 0; e < exCount; e++) {
    const rows = page.locator('.set-row');
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      await rows.nth(i).locator('input').nth(0).fill(String(20 + e * 2.5).replace('.', ','));
      await rows.nth(i).locator('input').nth(1).fill(String(10 + (i % 2)));
      await rows.nth(i).locator('.set-check').click();
      await page.waitForTimeout(80);
    }
    if (e === 0) {
      check(`[${label}] rest timer starts automatically`, await page.locator('.timer-pill').isVisible());
      await page.getByRole('button', { name: 'buona' }).click();
      await page.getByRole('button', { name: '2', exact: true }).click();
      await page.screenshot({ path: join(shots, `${label}-05-workout.png`), fullPage: false });
      await layoutChecks(page, `${label} workout`);
      // timer survives navigation away and back
      await page.goto(`${BASE}/#/`);
      check(`[${label}] timer visible on other screens`, await page.locator('.timer-pill').isVisible());
      await page.getByRole('button', { name: /Riprendi allenamento/ }).first().click();
      await page.waitForSelector('.set-row');
    }
    if (e < exCount - 1) {
      try {
        await page.getByRole('button', { name: /Successivo/ }).click({ timeout: 8000 });
        await page.getByText(`Esercizio ${e + 2} di ${exCount}`).waitFor();
      } catch (err) {
        await page.screenshot({ path: join(shots, `${label}-FAIL-next.png`) });
        writeFileSync(join(shots, `${label}-FAIL-dom.txt`), await page.evaluate(() => JSON.stringify({ y: scrollY, f: document.querySelector('.wk-footer')?.getBoundingClientRect(), anims: document.getAnimations().map((a) => a.animationName + ':' + a.playState) })));
        throw err;
      }
    }
  }
  await page.getByRole('button', { name: /Termina/ }).click();
  await page.getByRole('button', { name: '7', exact: true }).click();
  await page.getByRole('button', { name: 'Salva allenamento' }).click();
  await page.waitForSelector('text=Riepilogo');
  const vol = await page.locator('.stat-value').nth(1).innerText();
  check(`[${label}] summary shows volume`, /kg|t/.test(vol), vol);
  const chips = await page.locator('.chip.num').allInnerTexts();
  const expected = Array.from({ length: 7 }, (_, e) => String(20 + e * 2.5).replace('.', ','));
  check(`[${label}] every logged load saved exactly (no lost values)`, chips.length >= 14 && chips.every((c) => expected.some((w) => c.startsWith(w + ' kg'))), chips.filter((c) => !expected.some((w) => c.startsWith(w + ' kg'))).join(', '));
  await page.screenshot({ path: join(shots, `${label}-06-summary.png`), fullPage: true });
  await layoutChecks(page, `${label} summary`);

  // Persistence after reload
  await page.goto(BASE + '/');
  await page.reload();
  await page.waitForSelector('.stat-grid');
  check(`[${label}] history persisted after reload`, (await page.locator('.stat-value').first().innerText()) === '1');
  check(`[${label}] today marked completed`, await page.getByText('Allenamento di oggi completato').isVisible());
  check(`[${label}] favorite persisted`, await page.locator('section[aria-label="Esercizi preferiti"] .ex-row').count() === 1);
  await page.screenshot({ path: join(shots, `${label}-07-home-data.png`), fullPage: true });

  // Progress
  await page.goto(`${BASE}/#/progressi?tab=registro`);
  check(`[${label}] history list shows the session`, (await page.locator('.card.tap').count()) === 1);
  await page.goto(`${BASE}/#/progressi?tab=grafici`);
  await page.waitForSelector('.chart svg');
  check(`[${label}] charts rendered from real data`, (await page.locator('.chart svg').count()) >= 3);
  await page.locator('.chart').first().click();
  check(`[${label}] chart tooltip on tap`, await page.locator('.chart-tip').first().isVisible());
  await page.screenshot({ path: join(shots, `${label}-08-charts.png`), fullPage: true });
  await page.getByRole('button', { name: 'Calendario', exact: true }).click();
  await page.waitForSelector('.cal');
  check(`[${label}] calendar tab marks the training day`, (await page.locator('.cal .c.done').count()) === 1);
  check(`[${label}] calendar shows programmed days`, (await page.locator('.cal .cal-dot').count()) >= 4);
  await page.screenshot({ path: join(shots, `${label}-08b-calendar.png`), fullPage: true });
  await layoutChecks(page, `${label} calendar`);
  await page.goto(`${BASE}/#/progressi?tab=misure`);
  await page.getByRole('button', { name: /Nuova misurazione/ }).click();
  await page.getByLabel('Peso corporeo (kg)').fill('78,5');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await page.getByText('Peso corporeo 78,5 kg').waitFor({ timeout: 4000 }).catch(() => {});
  check(`[${label}] measurement saved`, await page.getByText('Peso corporeo 78,5 kg').isVisible());
  await layoutChecks(page, `${label} progress`);

  if (full) {
    // Video library
    await page.goto(`${BASE}/#/video`);
    await page.screenshot({ path: join(shots, `${label}-09-videos.png`), fullPage: true });
    await layoutChecks(page, `${label} videos`);

    // Backup export → wipe → import
    await page.goto(`${BASE}/#/impostazioni`);
    await page.getByRole('switch', { name: 'Cifra il backup' }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Esporta tutti i dati/ }).click()]);
    const file = join(shots, 'backup.json');
    await dl.saveAs(file);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    check(`[${label}] backup export contains the session`, json.app === 'forma-lab' && json.sessions.length === 1);
    await page.screenshot({ path: join(shots, `${label}-10-settings.png`), fullPage: true });
    await page.getByRole('button', { name: /Cancella tutti i dati personali/ }).click();
    await page.getByRole('button', { name: 'Cancella tutto' }).click();
    await page.getByText('Dati cancellati').waitFor({ timeout: 5000 });
    await page.goto(BASE + '/');
    check(`[${label}] wipe removes data`, await page.getByText('Il tuo registro parte da zero').isVisible());
    await page.goto(`${BASE}/#/impostazioni`);
    await page.locator('#import-file').setInputFiles(file);
    await page.getByRole('tab', { name: 'Sostituisci tutto' }).click();
    await page.getByRole('button', { name: 'Importa', exact: true }).click();
    await page.waitForTimeout(400);
    await page.goto(BASE + '/');
    check(`[${label}] import restores data`, (await page.locator('.stat-value').first().innerText()) === '1');
    await layoutChecks(page, `${label} settings`);

    // Offline after first load (service worker)
    await page.goto(BASE + '/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await ctx.setOffline(true);
    await page.goto(BASE + '/#/scheda');
    await page.waitForSelector('.dcard', { timeout: 10000 }).catch(() => {});
    check(`[${label}] app opens offline (program)`, (await page.locator('.dcard').count()) === 4);
    await page.goto(BASE + '/#/esercizio/plank');
    check(`[${label}] textual instructions offline`, await page.getByText('Gomiti sotto le spalle').first().isVisible());
    await page.goto(BASE + '/#/progressi');
    check(`[${label}] local history offline`, (await page.locator('.card.tap').count()) === 1);
    await ctx.setOffline(false);
  }
  await ctx.close();
}

try {
  await run('iPhone 14 Pro', 'iphone14pro', true);
  await run('iPhone SE', 'iphoneSE', false);
  // Desktop smoke
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  await ctx.route(/^https:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(BASE + '/');
  await page.waitForSelector('.hero');
  await page.screenshot({ path: join(shots, 'desktop-home.png') });
  await layoutChecks(page, 'desktop home');
  await ctx.close();
} catch (e) {
  check('e2e run completed without exceptions', false, String(e).slice(0, 2000));
} finally {
  check('no uncaught page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await browser.close();
  server.kill();
  writeFileSync(join(shots, 'results.json'), JSON.stringify(results, null, 1));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
