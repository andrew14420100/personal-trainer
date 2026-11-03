// Reads the existing Cloudflare Pages project (read-only API call) and writes GitHub step outputs:
//   subdomain (e.g. forma-lab.pages.dev), production_branch, prod_url.
// Safety guards:
//   - preview mode: aborts if the preview alias equals the production branch (would publish to production);
//   - never creates or modifies the project, its variables or its secrets.
// Usage: node scripts/cf-project.mjs <project> <alias|""> <preview|production>
import { appendFileSync } from 'node:fs';

const [project, alias, mode] = process.argv.slice(2);
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const out = (k, v) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
const fail = (m) => {
  console.log(`::error::${m}`);
  process.exit(1);
};

if (!token || !account) fail('CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID mancanti.');
if (!/^[0-9a-f]{32}$/i.test(account.trim())) fail('CLOUDFLARE_ACCOUNT_ID non sembra valido: deve essere l’Account ID di 32 caratteri (Cloudflare → Workers & Pages → Account details).');
if (mode === 'preview' && !/^[a-z0-9][a-z0-9-]{0,27}$/.test(alias)) fail(`Nome anteprima "${alias}" non valido: usa solo lettere minuscole, numeri e trattini.`);

const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account.trim()}/pages/projects/${project}`, { headers: { Authorization: `Bearer ${token.trim()}` } });
const body = await res.json().catch(() => ({}));
if (res.status === 403 || res.status === 401 || body?.errors?.some?.((e) => e.code === 10000 || e.code === 9109))
  fail('Il token Cloudflare non ha accesso: deve avere il permesso "Account → Cloudflare Pages → Edit" su questo account.');
if (res.status === 404 || !body?.result) fail(`Progetto Pages "${project}" non trovato in questo account (HTTP ${res.status}). Controlla l’Account ID.`);

const p = body.result;
const subdomain = p.subdomain || `${project}.pages.dev`;
const prodBranch = p.production_branch || 'main';
console.log(`Progetto: ${p.name} · indirizzo: https://${subdomain} · ramo di produzione: ${prodBranch}`);
if (p.source?.type) console.log(`::warning::Il progetto è collegato a ${p.source.type} (build automatica di Cloudflare). Se Cloudflare rifiuta il caricamento diretto, segui docs/PUBBLICAZIONE_ONLINE.md (sezione "Progetto collegato a Git").`);

if (mode === 'preview' && alias === prodBranch) fail(`L’anteprima "${alias}" coincide con il ramo di produzione: pubblicazione bloccata per non toccare il sito principale.`);

out('subdomain', subdomain);
out('production_branch', prodBranch);
out('prod_url', `https://${subdomain}`);
