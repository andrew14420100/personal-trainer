// FORMA LAB — server-side access control helpers (Cloudflare Pages Functions, Web Crypto only).
// Nothing here is shipped to the browser: secrets live in Cloudflare environment variables.

export interface Env {
  /** 'totp' (passphrase + 6-digit code from an authenticator app) or 'access' (Cloudflare Access in front). */
  AUTH_MODE?: string;
  AUTH_PASSWORD?: string;
  AUTH_TOTP_SECRET?: string;
  AUTH_SESSION_SECRET?: string;
  AUTH_SESSION_DAYS?: string;
  /** Cloudflare Access: team domain, e.g. "myteam.cloudflareaccess.com", and the application AUD tag. */
  AUTH_ACCESS_TEAM_DOMAIN?: string;
  AUTH_ACCESS_AUD?: string;
}

const enc = new TextEncoder();

// ── encoding ────────────────────────────────────────────────────────────────
export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64url(s: string): Uint8Array {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    value = (value << 5) | B32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

// ── HMAC / constant time ────────────────────────────────────────────────────
async function hmac(alg: 'SHA-1' | 'SHA-256', key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: alg }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

/** Constant-time string comparison (both sides are HMAC'd first so lengths do not leak). */
export async function safeStringEqual(a: string, b: string, secret: string): Promise<boolean> {
  const k = enc.encode(secret);
  const [x, y] = await Promise.all([hmac('SHA-256', k, enc.encode(a)), hmac('SHA-256', k, enc.encode(b))]);
  return timingSafeEqual(x, y);
}

// ── TOTP (RFC 6238, SHA-1, 30 s, 6 digits) ──────────────────────────────────
export async function totp(secretB32: string, counter: number): Promise<string> {
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const h = await hmac('SHA-1', base32Decode(secretB32), msg);
  const off = h[h.length - 1] & 0xf;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}

/** Returns the matching time-step counter, or null. Accepts ±1 step for clock drift. */
export async function verifyTotp(secretB32: string, code: string, nowMs = Date.now()): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(nowMs / 1000 / 30);
  for (const d of [0, -1, 1]) {
    const expected = await totp(secretB32, step + d);
    if (timingSafeEqual(enc.encode(expected), enc.encode(code))) return step + d;
  }
  return null;
}

// ── Session cookie ──────────────────────────────────────────────────────────
export const COOKIE = '__Host-fl_session';

export async function signSession(secret: string, expMs: number): Promise<string> {
  const payload = `v1.${expMs}`;
  const sig = await hmac('SHA-256', enc.encode(secret), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(secret: string, token: string | null, nowMs = Date.now()): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < nowMs) return false;
  const expected = await hmac('SHA-256', enc.encode(secret), enc.encode(`v1.${parts[1]}`));
  let got: Uint8Array;
  try {
    got = unb64url(parts[2]);
  } catch {
    return false;
  }
  return timingSafeEqual(expected, got);
}

export function readCookie(req: Request, name: string): string | null {
  const h = req.headers.get('Cookie');
  if (!h) return null;
  for (const part of h.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

// ── Cloudflare Access JWT verification (RS256) ──────────────────────────────
interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
}
let certCache: { at: number; keys: Jwk[] } | null = null;

export async function verifyAccessJwt(token: string | null, env: Env, fetchImpl: typeof fetch = fetch, nowMs = Date.now()): Promise<boolean> {
  if (!token || !env.AUTH_ACCESS_TEAM_DOMAIN || !env.AUTH_ACCESS_AUD) return false;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return false;
  let header: { kid?: string; alg?: string };
  let payload: { aud?: string | string[]; exp?: number; nbf?: number; iss?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(unb64url(h)));
    payload = JSON.parse(new TextDecoder().decode(unb64url(p)));
  } catch {
    return false;
  }
  if (header.alg !== 'RS256') return false;
  const team = env.AUTH_ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (payload.iss !== `https://${team}`) return false;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.AUTH_ACCESS_AUD)) return false;
  const now = nowMs / 1000;
  if (!payload.exp || payload.exp < now || (payload.nbf && payload.nbf > now + 60)) return false;
  if (!certCache || nowMs - certCache.at > 3600_000) {
    const r = await fetchImpl(`https://${team}/cdn-cgi/access/certs`);
    if (!r.ok) return false;
    certCache = { at: nowMs, keys: ((await r.json()) as { keys: Jwk[] }).keys };
  }
  const jwk = certCache.keys.find((k) => k.kid === header.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64url(s), enc.encode(`${h}.${p}`));
}

export function _resetAccessCache() {
  certCache = null;
}

// ── Rate limiting (best effort, per isolate) ────────────────────────────────
const attempts = new Map<string, { n: number; first: number }>();
const WINDOW = 15 * 60_000;
const MAX = 5;

export function isRateLimited(ip: string, nowMs = Date.now()): boolean {
  const a = attempts.get(ip);
  if (!a) return false;
  if (nowMs - a.first > WINDOW) {
    attempts.delete(ip);
    return false;
  }
  return a.n >= MAX;
}
export function recordFailure(ip: string, nowMs = Date.now()) {
  const a = attempts.get(ip);
  if (!a || nowMs - a.first > WINDOW) attempts.set(ip, { n: 1, first: nowMs });
  else a.n++;
}
export function clearFailures(ip: string) {
  attempts.delete(ip);
}

/** Last accepted TOTP step: a code can be used only once (best effort, per isolate). */
let lastStep = -1;
export function acceptStep(step: number): boolean {
  if (step <= lastStep) return false;
  lastStep = step;
  return true;
}
export function _resetForTests() {
  attempts.clear();
  lastStep = -1;
}
