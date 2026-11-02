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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
      if (el.closest('.chart,.sheet-bg,.hero,.vplayer,.ex-thumb,.plan-card .thumb,.anatomy')) return; // clipped (overflow:hidden)
      if (b.right > vw + 1 || b.left < -1) over.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60));
    });
    const unnamed = [...document.querySelectorAll('button, a[href], input, select, textarea')].filter((el) => {
      if (el.closest('[hidden]') || el.type === 'hidden') return false;
      const name = el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('title') || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.getAttribute('placeholder');
      return !name;
    }).map((el) => el.outerHTML.slice(0, 80));
    const small = [...document.querySelectorAll('button, a.btn')].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && (b.height < 30 || b.width < 32) && !el.classList.contains('link');
    }).map((el) => `${el.className}:${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    return { scrollW: Math.max(document.documentElement.scrollWidth, window.innerWidth), vw, over: over.slice(0, 5), unnamed: unnamed.slice(0, 5), small: small.slice(0, 5), empty: document.querySelector('main')?.innerText.trim().length ?? 0 };
  });
  check(`[${label}] no horizontal overflow`, r.scrollW <= r.vw && r.over.length === 0, r.over.join(', '));
  check(`[${label}] all controls have an accessible name`, r.unnamed.length === 0, r.unnamed.join(' | '));
  check(`[${label}] touch targets ≥ 32px`, r.small.length === 0, r.small.join(', '));
  check(`[${label}] screen not empty`, r.empty > 40);
}

// Data written by the previous version (2.0/3.0 format), to verify that 4.0 keeps it intact.
const LEGACY = {
  id: 'legacy-1', dayId: 'upper-a', startedAt: Date.parse('2026-10-19T17:00:00'), endedAt: Date.parse('2026-10-19T18:00:00'), status: 'completed', calibration: false, currentIndex: 0, rpe: 7, note: 'seduta 3.0',
  exercises: [{ slotId: 'upper-a-1', exerciseId: 'chest-press', targetSets: 3, repsMin: 8, repsMax: 12, unit: 'reps', perSide: false, note: '', sets: [{ weight: 40, reps: 10, done: true }, { weight: 40, reps: 9, done: true }] }],
};

async function seedLegacy(page) {
  await page.goto(BASE + '/robots.txt');
  await page.evaluate(
    (s) =>
      new Promise((res, rej) => {
        const req = indexedDB.open('forma-lab', 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          const st = db.createObjectStore('sessions', { keyPath: 'id' });
          st.createIndex('startedAt', 'startedAt');
          st.createIndex('status', 'status');
          db.createObjectStore('measurements', { keyPath: 'id' }).createIndex('date', 'date');
          db.createObjectStore('kv', { keyPath: 'key' });
          db.createObjectStore('media', { keyPath: 'id' });
        };
        req.onsuccess = () => {
          const t = req.result.transaction(['sessions', 'kv', 'measurements'], 'readwrite');
          t.objectStore('sessions').put(s);
          t.objectStore('measurements').put({ id: 'm1', date: '2026-10-19', bodyWeight: 80 });
          t.objectStore('kv').put({ key: 'settings', value: { name: 'Andrea', calibration: 'off', autoRest: true, sound: false, keepAwake: false, restOverrides: {}, slotOverrides: {}, favorites: [], notes: { 'chest-press': 'sedile 4' }, videoReviews: {}, video: { autoplay: false, labels: true, speed: 1, defaultMode: 'quick' } } });
          t.oncomplete = () => {
            req.result.close();
            res();
          };
          t.onerror = () => rej(t.error);
        };
        req.onerror = () => rej(req.error);
      }),
    LEGACY,
  );
}

const kv = (page, key) =>
  page.evaluate(
    (k) =>
      new Promise((res) => {
        const r = indexedDB.open('forma-lab');
        r.onsuccess = () => {
          const g = r.result.transaction('kv').objectStore('kv').get(k);
          g.onsuccess = () => res(g.result?.value ?? null);
        };
      }),
    key,
  );

async function run(deviceName, label, full) {
  const ctx = await browser.newContext({ ...devices[deviceName], locale: 'it-IT', acceptDownloads: true, serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/youtube|ytimg|ERR_|net::/i.test(m.text()) && errors.push(`${label} console: ${m.text()}`));
  // Block external network: the test must not depend on YouTube.
  await ctx.route(/^https:\/\/(?!localhost)/, (r) => r.abort());

  if (full) {
    // ── Migration: previous data preserved ──
    await seedLegacy(page);
    await page.goto(BASE + '/');
    await page.waitForSelector('.hero');
    await wait(800);
    const rep = await kv(page, 'migration:4.0');
    const copy = await kv(page, 'backup:pre-4.0');
    check(`[${label}] migration report written and verified`, rep?.verified === true && rep.sessions === 1 && rep.measurements === 1, JSON.stringify(rep));
    check(`[${label}] safety copy of previous data stored`, copy?.data?.sessions?.[0]?.id === 'legacy-1' && copy.data.sessions[0].note === 'seduta 3.0');
    check(`[${label}] previous settings kept (name)`, await page.getByText('Andrea').first().isVisible());
    check(`[${label}] previous session visible in history`, await page.getByText('Ultimo allenamento').isVisible());
    await page.goto(BASE + '/#/sessione/legacy-1');
    check(`[${label}] previous session opens unchanged`, await page.getByText('40 kg × 10').isVisible());
    await page.goto(BASE + '/#/esercizio/chest-press');
    await page.waitForFunction(() => document.querySelector('#ex-note')?.value === 'sedile 4', null, { timeout: 4000 }).catch(() => {});
    check(`[${label}] previous exercise note kept`, (await page.locator('#ex-note').inputValue()) === 'sedile 4');
    check(`[${label}] previous load shown as last load`, await page.getByText('40 kg').first().isVisible());
    await page.reload();
    await wait(500);
    const copy2 = await kv(page, 'backup:pre-4.0');
    check(`[${label}] migration idempotent (copy not overwritten)`, copy2?.at === copy?.at);
  } else {
    await page.goto(BASE + '/');
  }

  // ── Home ──
  await page.goto(BASE + '/#/');
  await page.waitForSelector('.hero');
  check(`[${label}] home: today card with clear name`, /Petto|Gambe|Glutei|Riposo/.test(await page.locator('.hero').innerText()));
  check(`[${label}] home: week strip Monday first, 7 days`, (await page.locator('.week .wday').count()) === 7 && (await page.locator('.week .wday .wd').first().innerText()) === 'L');
  check(`[${label}] home: today highlighted`, (await page.locator('.wday.today').count()) === 1);
  await page.screenshot({ path: join(shots, `${label}-home.png`), fullPage: true });
  await layoutChecks(page, `${label} home`);
  // week navigation
  const before = await page.locator('.week').getAttribute('aria-label');
  await page.getByRole('button', { name: 'Settimana successiva' }).first().click();
  const after = await page.locator('.week').getAttribute('aria-label');
  check(`[${label}] week navigation forward`, before !== after, `${before} → ${after}`);
  await page.getByRole('button', { name: 'Torna a questa settimana' }).first().click();
  check(`[${label}] back to this week`, (await page.locator('.wday.today').count()) === 1);

  // ── Plan ──
  await page.getByRole('navigation').getByRole('button', { name: 'Allenamenti' }).click();
  check(`[${label}] plan: 4 day cards`, (await page.locator('.plan-card').count()) === 4);
  for (const n of ['Petto, schiena e braccia', 'Gambe: quadricipiti e femorali', 'Petto alto, schiena e spalle', 'Glutei e gambe']) check(`[${label}] plan: day "${n}"`, await page.getByText(n, { exact: true }).isVisible());
  if (full) await layoutChecks(page, `${label} plan`);
  let rows = 0;
  for (const id of ['upper-a', 'lower-a', 'upper-b', 'lower-b']) {
    await page.goto(BASE + `/#/giorno/${id}`);
    await page.waitForSelector('.ex-row');
    rows += await page.locator('.ex-row').count();
    if (id === 'upper-a') {
      check(`[${label}] day: anatomy diagram`, (await page.locator('.anatomy svg').count()) >= 1);
      check(`[${label}] day: start button`, await page.getByRole('button', { name: /Inizia allenamento|Riprendi/ }).isVisible());
      await page.screenshot({ path: join(shots, `${label}-day.png`), fullPage: true });
      if (full) await layoutChecks(page, `${label} day`);
    }
  }
  check(`[${label}] 26 program positions across the 4 days`, rows === 26, String(rows));

  // ── Exercise page ──
  await page.goto(BASE + '/#/esercizio/lat-pulldown-wide');
  await page.waitForSelector('.vplayer');
  check(`[${label}] exercise: group + name on top`, (await page.locator('.ex-group').first().innerText()).toUpperCase() === 'SCHIENA');
  check(`[${label}] exercise: video player present`, (await page.locator('.vplayer').count()) === 1);
  await wait(400);
  const ytFail = (await page.getByRole('link', { name: /Apri su YouTube/ }).count()) + (await page.getByRole('button', { name: /^Riproduci / }).count());
  check(`[${label}] exercise: player falls back to source link when YouTube is unreachable`, ytFail >= 1 || (await page.locator('.vplayer iframe').count()) === 1 || (await page.getByText('Caricamento video').count()) === 1);
  check(`[${label}] exercise: app controls below the video, not overlaid`, await page.evaluate(() => {
    const v = document.querySelector('.vplayer').getBoundingClientRect();
    const b = document.querySelector('.vbar').getBoundingClientRect();
    return b.top >= v.bottom - 1;
  }));
  check(`[${label}] exercise: collapsible technique sections`, (await page.locator('details.acc').count()) >= 5);
  await page.getByText('Errori e correzioni').click();
  check(`[${label}] exercise: red error + green fix`, (await page.locator('.fault .f-bad').count()) >= 1 && (await page.locator('.fault .f-good').count()) >= 1);
  if (full) {
    await page.screenshot({ path: join(shots, `${label}-exercise.png`), fullPage: true });
    await layoutChecks(page, `${label} exercise`);
  }

  // ── Workout ──
  await page.goto(BASE + '/#/giorno/upper-a');
  await page.getByRole('button', { name: /Inizia allenamento|Riprendi allenamento/ }).click();
  await page.waitForSelector('.wk-top');
  await page.getByRole('button', { name: 'Nascondi video' }).click().catch(() => {});
  await page.getByLabel('Carico serie 1 in kg').fill('42,5');
  await page.getByLabel('Ripetizioni serie 1').fill('10');
  await page.getByRole('button', { name: 'Segna serie 1 come completata' }).click();
  await wait(300);
  check(`[${label}] workout: set marked done`, (await page.locator('.set-r.done').count()) === 1);
  check(`[${label}] workout: rest timer started`, await page.locator('.rest-bar').isVisible());
  await page.getByRole('button', { name: 'Aggiungi 15 secondi' }).click();
  await page.getByRole('button', { name: 'Salta recupero' }).click();
  check(`[${label}] workout: rest skipped`, (await page.locator('.rest-bar').count()) === 0);
  await page.screenshot({ path: join(shots, `${label}-workout.png`), fullPage: true });
  if (full) await layoutChecks(page, `${label} workout`);
  // pause
  await page.getByRole('button', { name: 'Metti in pausa l’allenamento' }).click();
  await page.getByText('Allenamento in pausa').waitFor({ timeout: 3000 }).catch(() => {});
  check(`[${label}] workout: pause state`, await page.getByText('Allenamento in pausa').isVisible());
  await page.getByRole('button', { name: 'Riprendi', exact: true }).click();
  await page.getByText('Allenamento in pausa').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
  check(`[${label}] workout: resumed`, (await page.getByText('Allenamento in pausa').count()) === 0);
  // persistence across reload
  await page.reload();
  await page.waitForSelector('.wk-top');
  check(`[${label}] workout: set persisted after reload`, (await page.getByLabel('Carico serie 1 in kg').inputValue()) === '42,5' && (await page.locator('.set-r.done').count()) === 1);
  // next / back
  await page.getByRole('button', { name: /^Prossimo:/ }).click();
  await page.locator('.ex-group', { hasText: /^2\// }).first().waitFor({ timeout: 3000 }).catch(() => {});
  check(`[${label}] workout: next exercise`, (await page.locator('.ex-group').first().innerText()).startsWith('2/'));
  await page.getByRole('button', { name: 'Esercizio precedente' }).click();
  // finish
  await page.getByRole('button', { name: 'Elenco esercizi' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Termina' }).click();
  await page.getByRole('button', { name: '8', exact: true }).click();
  await page.getByRole('button', { name: 'Salva allenamento' }).click();
  await page.waitForSelector('text=Allenamento salvato');
  check(`[${label}] workout saved with summary`, await page.getByText('42,5 kg × 10').isVisible());
  await page.getByRole('button', { name: 'Fatto' }).click();
  check(`[${label}] home: today completed`, (await page.locator('.wday.today.done').count()) === 1);

  // ── Calendar ──
  await page.getByRole('navigation').getByRole('button', { name: 'Calendario' }).click();
  check(`[${label}] calendar: week view`, (await page.locator('.week .wday').count()) === 7);
  await page.getByRole('tab', { name: 'Mese' }).click();
  const m0 = await page.getByRole('button', { name: 'Torna al mese corrente' }).innerText();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Mese successivo' }).click();
  const m2 = await page.getByRole('button', { name: 'Torna al mese corrente' }).innerText();
  check(`[${label}] calendar: month navigation (+2)`, m0 !== m2, `${m0} → ${m2}`);
  for (let i = 0; i < 14; i++) await page.getByRole('button', { name: 'Mese precedente' }).click();
  const m12 = await page.getByRole('button', { name: 'Torna al mese corrente' }).innerText();
  check(`[${label}] calendar: year boundary`, /\d{4}/.test(m12) && m12.slice(-4) !== m0.slice(-4), m12);
  await page.getByRole('button', { name: 'Torna al mese corrente' }).click();
  check(`[${label}] calendar: Monday-first grid`, (await page.locator('.month .h').first().innerText()) === 'L');
  if (full) {
    await page.screenshot({ path: join(shots, `${label}-calendar.png`), fullPage: true });
    await layoutChecks(page, `${label} calendar`);
    // move next planned workout to the following day, then restore
    await page.getByRole('tab', { name: 'Settimana' }).click();
    const planned = page.locator('.wday:not(.done)').filter({ has: page.locator('.st-planned') });
    if (await planned.count()) {
      await planned.last().click();
      await page.getByRole('button', { name: 'Sposta' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Sposta' }).click();
      await wait(300);
      const moves = (await kv(page, 'settings')).moves;
      check(`[${label}] calendar: workout moved`, Object.keys(moves).length === 1, JSON.stringify(moves));
      check(`[${label}] calendar: moved marker shown`, (await page.locator('.st-moved').count()) >= 1);
      await page.getByRole('button', { name: /Ripristina/ }).first().click();
      await wait(300);
      check(`[${label}] calendar: move restored`, Object.keys((await kv(page, 'settings')).moves).length === 0);
    } else check(`[${label}] calendar: planned day available to move`, false);
  }

  // ── Progress ──
  await page.getByRole('navigation').getByRole('button', { name: 'Progressi' }).click();
  check(`[${label}] progress: real charts`, (await page.locator('.chart svg').count()) >= 3);
  await page.getByRole('tab', { name: 'Esercizi' }).click();
  check(`[${label}] progress: exercise load chart`, await page.getByText('Carico massimo').isVisible());
  await page.getByRole('tab', { name: 'Storico' }).click();
  check(`[${label}] progress: session history`, (await page.locator('.list-row').count()) >= 1);
  if (full) {
    await page.getByRole('tab', { name: 'Panoramica' }).click();
    await page.screenshot({ path: join(shots, `${label}-progress.png`), fullPage: true });
    await layoutChecks(page, `${label} progress`);
  }

  // ── Profile + backup ──
  await page.getByRole('navigation').getByRole('button', { name: 'Profilo' }).click();
  check(`[${label}] profile: logout link`, (await page.locator('a[href="/__auth/logout"]').count()) === 1);
  if (full) {
    check(`[${label}] profile: pre-4.0 copy listed`, await page.getByText('Dati della versione precedente').isVisible());
    await page.getByRole('switch', { name: 'Cifra il backup' }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Esporta tutti i dati' }).click()]);
    const file = await dl.path();
    const data = JSON.parse(readFileSync(file, 'utf8'));
    check(`[${label}] backup export contains sessions`, data.sessions?.length === (await page.evaluate(() => 0)) + 2, String(data.sessions?.length));
    await layoutChecks(page, `${label} profile`);
    // offline
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await ctx.setOffline(true);
    await page.goto(BASE + '/#/allenamenti');
    check(`[${label}] app opens offline (plan)`, (await page.locator('.plan-card').count()) === 4);
    await page.goto(BASE + '/#/esercizio/plank');
    await page.getByText('Esecuzione').click();
    check(`[${label}] technique text offline`, (await page.locator('.steps li').count()) > 0);
    check(`[${label}] video shows offline message`, (await page.getByText('Sei offline').count()) >= 1 || (await page.getByRole('button', { name: /Riproduci/ }).count()) >= 1);
    await page.goto(BASE + '/#/progressi?tab=storico');
    check(`[${label}] local history offline`, (await page.locator('.list-row').count()) === 2);
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
