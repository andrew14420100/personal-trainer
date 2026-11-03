// Browser test of the real login flow against Cloudflare's local runtime (workerd).
// 1) cp .dev.vars.example .dev.vars   2) npm run build   3) npx wrangler pages dev dist --port 8790
// 4) node tests/e2e/auth-flow.mjs
import { chromium, devices } from 'playwright';
import crypto from 'node:crypto';
const code = () => { const B='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,v=0,o=[];for(const ch of (process.env.TOTP ?? 'JBSWY3DPEHPK3PXP')){v=(v<<5)|B.indexOf(ch);bits+=5;if(bits>=8){o.push((v>>>(bits-8))&255);bits-=8}}
const m=Buffer.alloc(8);m.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=crypto.createHmac('sha1',Buffer.from(o)).update(m).digest();const off=h[h.length-1]&15;return String((((h[off]&127)<<24)|(h[off+1]<<16)|(h[off+2]<<8)|h[off+3])%1e6).padStart(6,'0'); };
const b = await chromium.launch(); const ctx = await b.newContext({...devices['iPhone 14 Pro']}); const p = await ctx.newPage();
const csp = []; p.on('console', m => /Content Security Policy|Refused/.test(m.text()) && csp.push(m.text()));
await ctx.route(/^https:\/\/(?!localhost)/, (r) => r.abort());
await p.goto('http://127.0.0.1:8790/');
console.log('url after first nav:', p.url());
await p.fill('#p', (process.env.PASS ?? 'change-me-long-passphrase')); await p.fill('#c', code()); await p.click('button[type=submit]');
await p.waitForSelector('.hero', { timeout: 15000 });
console.log('logged in, url:', p.url(), 'brand:', await p.locator('.brand').first().innerText());
const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
console.log('service worker active:', sw);
await p.goto('http://127.0.0.1:8790/#/esercizio/plank'); await p.waitForSelector('.player');
console.log('CSP violations:', csp.length ? csp : 'none');
if (!sw || csp.length) process.exitCode = 1;
await b.close();
