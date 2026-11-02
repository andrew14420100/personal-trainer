import { beforeEach, describe, expect, it } from 'vitest';
import { base32Encode, base32Decode, signSession, totp, verifySession, verifyTotp, _resetForTests, COOKIE } from '../../functions/lib/auth';
import { onRequest } from '../../functions/_middleware';

// RFC 6238 test secret "12345678901234567890"
const SECRET = base32Encode(new TextEncoder().encode('12345678901234567890'));
const env = { AUTH_MODE: 'totp', AUTH_PASSWORD: 'correct horse battery staple', AUTH_TOTP_SECRET: SECRET, AUTH_SESSION_SECRET: 'x'.repeat(48) };
const ORIGIN = 'https://forma.example';

const ctx = (req: Request, e: Record<string, string | undefined> = env) => ({ request: req, env: e, next: async () => new Response('APP', { status: 200, headers: { 'Content-Type': 'text/html' } }) });
const nav = (path: string, headers: Record<string, string> = {}) => new Request(ORIGIN + path, { headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html', ...headers } });

async function login(code: string, password = env.AUTH_PASSWORD, ip = '1.1.1.1') {
  const body = new URLSearchParams({ password, code, next: '/' });
  return onRequest(ctx(new Request(ORIGIN + '/__auth/login', { method: 'POST', body, headers: { Origin: ORIGIN, 'CF-Connecting-IP': ip, 'Content-Type': 'application/x-www-form-urlencoded' } })));
}

beforeEach(() => _resetForTests());

describe('TOTP', () => {
  it('matches the RFC 6238 SHA-1 vectors (last 6 digits)', async () => {
    expect(base32Decode(SECRET)).toEqual(new TextEncoder().encode('12345678901234567890'));
    expect(await totp(SECRET, Math.floor(59 / 30))).toBe('287082');
    expect(await totp(SECRET, Math.floor(1111111109 / 30))).toBe('081804');
    expect(await totp(SECRET, Math.floor(1234567890 / 30))).toBe('005924');
  });
  it('accepts ±1 step and rejects others', async () => {
    const now = 1234567890_000;
    const step = Math.floor(now / 30000);
    expect(await verifyTotp(SECRET, await totp(SECRET, step - 1), now)).toBe(step - 1);
    expect(await verifyTotp(SECRET, await totp(SECRET, step - 3), now)).toBeNull();
    expect(await verifyTotp(SECRET, 'abc123', now)).toBeNull();
  });
});

describe('session token', () => {
  it('verifies signature and expiry', async () => {
    const t = await signSession('s'.repeat(40), Date.now() + 1000);
    expect(await verifySession('s'.repeat(40), t)).toBe(true);
    expect(await verifySession('o'.repeat(40), t)).toBe(false);
    expect(await verifySession('s'.repeat(40), t.replace('v1.', 'v1.9'))).toBe(false);
    const old = await signSession('s'.repeat(40), Date.now() - 1);
    expect(await verifySession('s'.repeat(40), old)).toBe(false);
  });
});

describe('middleware', () => {
  it('fails closed when not configured', async () => {
    const r = await onRequest(ctx(nav('/'), {}));
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain('APP');
  });
  it('redirects navigations and blocks assets without a session', async () => {
    const r = await onRequest(ctx(nav('/')));
    expect(r.status).toBe(302);
    expect(r.headers.get('Location')).toBe(`${ORIGIN}/__auth/login?next=%2F`);
    const a = await onRequest(ctx(new Request(ORIGIN + '/assets/index.js', { headers: { Accept: '*/*' } })));
    expect(a.status).toBe(401);
    expect(await a.text()).not.toContain('APP');
  });
  it('serves public install files without login', async () => {
    const r = await onRequest(ctx(new Request(ORIGIN + '/icons/apple-touch-icon.png')));
    expect(r.status).toBe(200);
  });
  it('logs in with passphrase + valid code and then serves the app with security headers', async () => {
    const code = await totp(SECRET, Math.floor(Date.now() / 30000));
    const r = await login(code);
    expect(r.status).toBe(303);
    const cookie = r.headers.get('Set-Cookie')!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const token = cookie.split(';')[0];
    const ok = await onRequest(ctx(nav('/', { Cookie: token })));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('APP');
    expect(ok.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(ok.headers.get('X-Frame-Options')).toBe('DENY');
    // replaying the same code is refused
    expect((await login(code)).status).toBe(401);
    // logout clears the cookie
    const out = await onRequest(ctx(nav('/__auth/logout', { Cookie: token })));
    expect(out.headers.get('Set-Cookie')).toContain(`${COOKIE}=;`);
  });
  it('rejects a wrong passphrase even with a valid code, and rate-limits', async () => {
    const code = await totp(SECRET, Math.floor(Date.now() / 30000));
    expect((await login(code, 'wrong', '2.2.2.2')).status).toBe(401);
    for (let i = 0; i < 4; i++) await login('000000', 'wrong', '2.2.2.2');
    expect((await login(code, env.AUTH_PASSWORD, '2.2.2.2')).status).toBe(429);
  }, 15000);
  it('refuses cross-origin login posts', async () => {
    const body = new URLSearchParams({ password: 'x', code: '123456' });
    const r = await onRequest(ctx(new Request(ORIGIN + '/__auth/login', { method: 'POST', body, headers: { Origin: 'https://evil.example' } })));
    expect(r.status).toBe(403);
  });
  it('access mode rejects requests without a valid Access JWT', async () => {
    const r = await onRequest(ctx(nav('/'), { AUTH_MODE: 'access', AUTH_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', AUTH_ACCESS_AUD: 'aud' }));
    expect(r.status).toBe(403);
  });
});
