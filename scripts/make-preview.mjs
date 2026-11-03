// Builds the Claude-preview page: the single-file build (vite --mode preview) converted into an
// HTML fragment as required by Claude Artifacts (the host adds doctype/head/body itself).
// Output: dist-preview/forma-lab-anteprima.html
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'dist-preview/index.html'), 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = pick(/<script type="module"[\s\S]*?<\/script>/g).map((s) => s.replace(' crossorigin', ''));
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>')).replace(/<script type="module"[\s\S]*?<\/script>/g, '');
const out = [
  '<title>FORMA LAB</title>',
  '<meta name="theme-color" content="#0a0a0b">',
  '<style>:root{color-scheme:dark;background:#0a0a0b}body{background:#0a0a0b;color:#f4f4f1}</style>',
  ...styles,
  body.trim(),
  ...scripts,
].join('\n');
writeFileSync(join(root, 'dist-preview/forma-lab-anteprima.html'), out);
console.log('preview fragment', (out.length / 1024).toFixed(0), 'KB');
