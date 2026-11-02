// Cloudflare Pages middleware: every request to FORMA LAB passes through here.
// Fails CLOSED: if authentication is not configured, nothing is served.
import {
  COOKIE,
  acceptStep,
  clearFailures,
  isRateLimited,
  readCookie,
  recordFailure,
  safeStringEqual,
  signSession,
  verifyAccessJwt,
  verifySession,
  verifyTotp,
  type Env,
} from './lib/auth';

interface Ctx {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}

// Public, non-personal files needed by iOS to install the Home Screen icon.
const PUBLIC = [/^\/manifest\.webmanifest$/, /^\/icons\/[\w.-]+$/, /^\/robots\.txt$/];

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.youtube.com https://s.ytimg.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com",
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

function secure(res: Response, extra: Record<string, string> = {}): Response {
  const r = new Response(res.body, res);
  r.headers.set('Content-Security-Policy', CSP);
  r.headers.set('X-Content-Type-Options', 'nosniff');
  r.headers.set('X-Frame-Options', 'DENY');
  r.headers.set('Referrer-Policy', 'no-referrer');
  r.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  r.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  r.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  r.headers.set('X-Robots-Tag', 'noindex, nofollow');
  for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}

const html = (body: string, status = 200, headers: Record<string, string> = {}) =>
  secure(new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers } }));

function page(title: string, inner: string): string {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0a0a0b"><meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<title>${title}</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0a0a0b;color:#f4f4f1;
font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:calc(env(safe-area-inset-top) + 24px) 20px calc(env(safe-area-inset-bottom) + 24px)}
main{width:100%;max-width:380px}.b{font-weight:900;letter-spacing:.28em;font-size:15px}.b i{color:#d4ff3a;font-style:normal}
h1{font-size:34px;line-height:1;margin:18px 0 6px;text-transform:uppercase;font-weight:900}p{color:#b9b9bf;margin:0 0 20px;font-size:14px}
label{display:block;font-size:12.5px;color:#85858d;font-weight:600;margin:14px 0 6px}
input{width:100%;min-height:52px;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:#101012;color:#f4f4f1;font-size:17px;outline:none}
input:focus{border-color:#d4ff3a}input.code{letter-spacing:.4em;text-align:center;font-size:24px;font-weight:800}
button{margin-top:20px;width:100%;min-height:56px;border:0;border-radius:16px;background:#d4ff3a;color:#0b0d02;font-weight:900;font-size:16px;letter-spacing:.08em;text-transform:uppercase}
.e{background:rgba(255,77,90,.1);border:1px solid rgba(255,77,90,.4);color:#ffc7cb;padding:12px 14px;border-radius:14px;font-size:14px;margin-bottom:8px}
small{display:block;color:#85858d;margin-top:18px;font-size:12px}</style></head><body><main><div class="b">FORMA<i>·</i>LAB</div>${inner}</main></body></html>`;
}

function loginPage(error?: string, next = '/'): string {
  return page(
    'Accesso — FORMA LAB',
    `<h1>Accesso privato</h1><p>Inserisci la passphrase e il codice a 6 cifre della tua app di autenticazione.</p>
${error ? `<div class="e" role="alert">${error}</div>` : ''}
<form method="post" action="/__auth/login" autocomplete="on">
<input type="hidden" name="next" value="${next.replace(/[^\w/?=&#-]/g, '')}">
<label for="u">Utente</label><input id="u" name="username" value="forma-lab" autocomplete="username" readonly>
<label for="p">Passphrase</label><input id="p" name="password" type="password" autocomplete="current-password" required>
<label for="c">Codice temporaneo</label><input id="c" class="code" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required>
<button type="submit">Entra</button></form>
<small>Connessione HTTPS. Dopo l’accesso la sessione resta valida su questo dispositivo per un periodo limitato.</small>`,
  );
}

const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/__auth') ? n : '/');

function wantsHtml(req: Request): boolean {
  return req.headers.get('Sec-Fetch-Mode') === 'navigate' || (req.headers.get('Accept') ?? '').includes('text/html');
}

export async function onRequest(ctx: Ctx): Promise<Response> {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const mode = env.AUTH_MODE;

  if (PUBLIC.some((r) => r.test(url.pathname))) return secure(await ctx.next());

  // ── Mode A: Cloudflare Access (email + one-time PIN) in front of the site ──
  if (mode === 'access') {
    const ok = await verifyAccessJwt(request.headers.get('Cf-Access-Jwt-Assertion') ?? readCookie(request, 'CF_Authorization'), env);
    if (!ok) return html(page('Accesso negato', '<h1>Accesso negato</h1><p>Questa applicazione è privata. Accedi tramite Cloudflare Access.</p>'), 403);
    if (url.pathname === '/__auth/logout') return Response.redirect(`${url.origin}/cdn-cgi/access/logout`, 302);
    return secure(await ctx.next());
  }

  // ── Mode B: passphrase + TOTP handled here ──
  const configured = mode === 'totp' && env.AUTH_PASSWORD && env.AUTH_TOTP_SECRET && (env.AUTH_SESSION_SECRET?.length ?? 0) >= 32;
  if (!configured) {
    return html(
      page('Non configurato', '<h1>Accesso non configurato</h1><p>Per sicurezza l’app non viene servita finché l’autenticazione non è configurata (vedi docs/PUBBLICAZIONE.md).</p>'),
      503,
    );
  }
  const secret = env.AUTH_SESSION_SECRET!;
  const days = Math.min(90, Math.max(1, Number(env.AUTH_SESSION_DAYS) || 30));

  if (url.pathname === '/__auth/logout') {
    return secure(
      new Response(null, {
        status: 303,
        headers: { Location: '/__auth/login', 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`, 'Cache-Control': 'no-store' },
      }),
    );
  }

  if (url.pathname === '/__auth/login') {
    const next = safeNext(url.searchParams.get('next'));
    if (request.method === 'GET') {
      if (await verifySession(secret, readCookie(request, COOKIE))) return secure(Response.redirect(`${url.origin}${next}`, 303));
      return html(loginPage(undefined, next));
    }
    if (request.method !== 'POST') return secure(new Response('Method not allowed', { status: 405 }));
    // CSRF: the form must be posted from this origin.
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return secure(new Response('Forbidden', { status: 403 }));
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (isRateLimited(ip)) return html(loginPage('Troppi tentativi. Riprova tra 15 minuti.', next), 429, { 'Retry-After': '900' });

    const form = await request.formData();
    const password = String(form.get('password') ?? '');
    const code = String(form.get('code') ?? '').replace(/\s/g, '');
    const nextPost = safeNext(String(form.get('next') ?? '/'));
    const passOk = await safeStringEqual(password, env.AUTH_PASSWORD!, secret);
    const step = await verifyTotp(env.AUTH_TOTP_SECRET!, code);
    if (!passOk || step == null || !acceptStep(step)) {
      recordFailure(ip);
      await new Promise((r) => setTimeout(r, 400));
      return html(loginPage('Passphrase o codice non validi.', nextPost), 401);
    }
    clearFailures(ip);
    const token = await signSession(secret, Date.now() + days * 86400_000);
    return secure(
      new Response(null, {
        status: 303,
        headers: {
          Location: nextPost,
          'Set-Cookie': `${COOKIE}=${token}; Path=/; Max-Age=${days * 86400}; HttpOnly; Secure; SameSite=Lax`,
          'Cache-Control': 'no-store',
        },
      }),
    );
  }

  if (await verifySession(secret, readCookie(request, COOKIE))) return secure(await ctx.next());

  // Not authenticated: navigations go to the login page; asset/API requests get 401 so the service
  // worker never caches the login page in place of an app file.
  if (wantsHtml(request) && request.method === 'GET') {
    return secure(Response.redirect(`${url.origin}/__auth/login?next=${encodeURIComponent(url.pathname + url.search)}`, 302));
  }
  return secure(new Response('Autenticazione richiesta', { status: 401, headers: { 'Cache-Control': 'no-store' } }));
}
