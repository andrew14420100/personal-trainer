// Post-deploy check of a Cloudflare Pages deployment of FORMA LAB (no dependencies, Node 22).
//
//   node scripts/verify-deploy.mjs https://preview-4.forma-lab.pages.dev [--allow-unconfigured]
//
// 1. PRIVACY (always): without a session the app must NOT be served:
//    - "/" redirects to /__auth/login (or answers 503 "Accesso non configurato" = fail-closed);
//    - app files (/index.html, /sw.js, JS bundle paths) answer 401/302/503, never the real file;
//    - the login page is served with the security headers.
// 2. WORKS (only if the env var FORMA_LAB_PIN is set, PIN mode): logs in like a browser, checks that
//    the app HTML, its JavaScript bundle and the service worker load correctly, then logs out.
//    The PIN is read from the environment (GitHub secret), never printed.
const url = (process.argv[2] || '').replace(/\/+$/, '');
const allowUnconfigured = process.argv.includes('--allow-unconfigured');
if (!/^(https:\/\/[\w.-]+|http:\/\/(localhost|127\.0\.0\.1):\d+)$/.test(url)) {
  console.error('Uso: node scripts/verify-deploy.mjs https://<indirizzo>');
  process.exit(2);
}

let failed = 0;
const ok = (name, cond, info = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`);
  if (!cond) failed++;
};
const get = (path, init = {}) => fetch(url + path, { redirect: 'manual', ...init, headers: { 'User-Agent': 'forma-lab-deploy-check', ...(init.headers || {}) } });

// The deployment can take a few seconds to propagate.
async function waitUp() {
  for (let i = 0; i < 20; i++) {
    try {
      const r = await get('/robots.txt');
      if (r.status === 200) return;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}
await waitUp();

// ── 1. Privacy ──────────────────────────────────────────────────────────────
const home = await get('/', { headers: { Accept: 'text/html', 'Sec-Fetch-Mode': 'navigate' } });
const homeBody = await home.text();
const unconfigured = home.status === 503 && homeBody.includes('Accesso non configurato');
if (unconfigured) {
  console.log('ℹ️  Il sito risponde "Accesso non configurato" (503): i segreti di accesso non sono impostati per questo ambiente. Il sito resta chiuso (fail-closed).');
  ok('Ambiente configurato con i segreti di accesso', allowUnconfigured, allowUnconfigured ? 'accettato per l’anteprima: aggiungi i segreti nell’ambiente Preview di Cloudflare per poterla aprire' : 'mancano i segreti AUTH_* in Cloudflare');
} else {
  ok('"/" senza accesso porta alla pagina di login', home.status === 302 && (home.headers.get('location') || '').includes('/__auth/login'), `HTTP ${home.status}`);
}
ok('"/" senza accesso non contiene l’app', !homeBody.includes('id="root"'));

for (const p of ['/index.html', '/sw.js', '/assets/index.js', '/registerSW.js']) {
  const r = await get(p);
  const body = await r.text();
  ok(`${p} non accessibile senza login`, [302, 401, 503].includes(r.status) && !body.includes('id="root"') && !/function|import\s/.test(body.slice(0, 400)), `HTTP ${r.status}`);
}

if (!unconfigured) {
  const login = await get('/__auth/login');
  const lb = await login.text();
  ok('Pagina di login servita', login.status === 200 && lb.includes('Accesso privato'), `HTTP ${login.status}`);
  ok('Header di sicurezza: CSP', (login.headers.get('content-security-policy') || '').includes("default-src 'self'"));
  ok('Header di sicurezza: Referrer-Policy compatibile con YouTube', login.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', login.headers.get('referrer-policy') || 'assente');
  ok('Header di sicurezza: nosniff', login.headers.get('x-content-type-options') === 'nosniff');
  const bad = await get('/__auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://example.com' },
    body: 'password=x&next=/',
  });
  ok('Login da un altro sito rifiutato (CSRF)', bad.status === 403, `HTTP ${bad.status}`);
}

// ── 2. Works (authenticated smoke test, optional) ───────────────────────────
const pin = process.env.FORMA_LAB_PIN;
if (!pin) {
  console.log('ℹ️  Prova con accesso saltata: aggiungi il segreto GitHub FORMA_LAB_PIN (facoltativo) per verificare anche il funzionamento dopo il login.');
} else if (unconfigured) {
  console.log('ℹ️  Prova con accesso saltata: ambiente senza segreti di accesso.');
} else {
  const r = await get('/__auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: url, 'Sec-Fetch-Site': 'same-origin' },
    body: new URLSearchParams({ password: pin, next: '/' }).toString(),
  });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  ok('Accesso con il PIN', r.status === 303 && cookie.startsWith('__Host-fl_session='), `HTTP ${r.status}`);
  if (cookie) {
    const H = { Cookie: cookie };
    const app = await get('/', { headers: { ...H, Accept: 'text/html' } });
    const html = await app.text();
    ok('App servita dopo il login', app.status === 200 && html.includes('id="root"'), `HTTP ${app.status}`);
    const js = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
    if (js) {
      const b = await get(js, { headers: H });
      const code = await b.text();
      ok('Codice dell’app caricato', b.status === 200 && code.length > 50000 && /javascript/.test(b.headers.get('content-type') || ''), `${js} HTTP ${b.status}`);
      ok('Versione 4.1 pubblicata (nuove funzioni presenti)', code.includes('Superserie') && code.includes('Allenamento libero'));
    } else ok('Riferimento al codice dell’app trovato', false);
    const sw = await get('/sw.js', { headers: H });
    ok('Service worker (offline) servito', sw.status === 200, `HTTP ${sw.status}`);
    const out = await get('/__auth/logout', { headers: H });
    ok('Logout', out.status === 303);
  }
}

console.log(failed ? `\n${failed} verifiche NON superate` : '\nTutte le verifiche superate');
process.exit(failed ? 1 : 0);
