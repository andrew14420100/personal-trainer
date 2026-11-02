// Re-verifies every video of the library against YouTube's public oEmbed endpoint and writes
// docs/VERIFICA_VIDEO.md (one verification sheet per exercise).
//   HTTP 200 → the video exists and its owner allows embedding
//   HTTP 401 → embedding disabled by the owner     HTTP 404/400 → removed / private / invalid
// Usage: npm run verify:videos   (runs with vite-node, imports the real TypeScript data)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VIDEO_LIBRARY, VIDEO_CHECK, type VideoSource } from '../src/data/videos';
import { EXERCISE_BY_ID } from '../src/data/exercises';
import { SLOTS } from '../src/data/program';

const root = join(__dirname, '..');
type Res = { status: number; meta: { title: string; author_name: string } | null };
const results: Record<string, Res> = {};

for (const ex of VIDEO_LIBRARY) {
  for (const v of [ex.demo, ex.tutorial, ...ex.extra].filter(Boolean) as VideoSource[]) {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + v.youtubeId)}&format=json`;
    let res: Res = { status: 0, meta: null };
    for (let i = 0; i < 3 && !res.status; i++) {
      try {
        const r = await fetch(url);
        res = { status: r.status, meta: r.ok ? await r.json() : null };
      } catch {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    results[v.youtubeId] = res;
    console.log(res.status, v.youtubeId, res.meta?.author_name ?? '');
  }
}

const today = new Date().toISOString().slice(0, 10);
const kindLabel = { demo: 'Dimostrazione rapida (A)', tutorial: 'Tutorial completo (B)', extra: 'Approfondimento errori' } as const;
const statusLabel = (s?: number) =>
  s === 200 ? '✅ Link verificato (esiste, incorporabile)' : s === 401 ? '⛔ Incorporamento disabilitato' : s ? `❌ Non disponibile (HTTP ${s})` : '⚠️ Verifica non riuscita (rete)';
const cell = (s: string) => s.replace(/\|/g, '/');
const all = Object.values(results);

let md = `# Verifica videoteca FORMA LAB\n\nUltima verifica automatica: **${today}** (\`npm run verify:videos\`). Prima selezione e verifica: ${VIDEO_CHECK.date}.\n\n`;
md += `**Metodo.** ${VIDEO_CHECK.method} Titolo e canale riportati sotto provengono dalla risposta oEmbed.\n\n`;
md += `**Limiti dichiarati**\n\n`;
md += `- Nessun professionista ha visionato integralmente ogni filmato: la corrispondenza è valutata su titolo, canale, durata e attrezzo citato. Nell’app puoi segnare ogni video come *Approvato* o *Non adatto* dopo averlo guardato.\n`;
md += `- ${VIDEO_CHECK.license} Gli errori/correzioni ROSSO/VERDE sono quindi in un pannello didattico separato dal filmato.\n`;
md += `- Nessun video è disponibile offline (FORMA LAB non possiede i file).\n`;
md += `- ${VIDEO_CHECK.iphone}\n\n`;
md += `**Riepilogo:** ${all.filter((r) => r.status === 200).length}/${all.length} video verificati · `;
md += `${VIDEO_LIBRARY.filter((e) => e.demo && e.tutorial).length}/${VIDEO_LIBRARY.length} esercizi con dimostrazione + tutorial · `;
md += `${SLOTS.length} posizioni coperte · ${VIDEO_LIBRARY.reduce((a, e) => a + e.missing.length, 0)} lacune dichiarate.\n\n`;

for (const ex of VIDEO_LIBRARY) {
  const vids = [ex.demo, ex.tutorial, ...ex.extra].filter(Boolean) as VideoSource[];
  const e = EXERCISE_BY_ID[ex.exerciseId];
  md += `## ${e.name}\n\n`;
  if (e.variantNote) md += `> ⚠️ Variante: ${e.variantNote}\n\n`;
  md += `| Campo | ${vids.map((v) => kindLabel[v.kind]).join(' | ')} |\n|---|${vids.map(() => '---').join('|')}|\n`;
  const row = (label: string, f: (v: VideoSource) => string) => (md += `| ${label} | ${vids.map((v) => cell(f(v))).join(' | ')} |\n`);
  row('Fonte', () => 'YouTube');
  row('Autore', (v) => results[v.youtubeId]?.meta?.author_name ?? v.author);
  row('Titolo', (v) => results[v.youtubeId]?.meta?.title ?? v.title);
  row('URL', (v) => `https://www.youtube.com/watch?v=${v.youtubeId}`);
  row('Tipo di contenuto', (v) => `${kindLabel[v.kind]}, ${v.duration}, ${v.language === 'IT' ? 'italiano' : 'inglese'}`);
  row('Licenza / autorizzazione', () => 'Licenza standard YouTube: solo incorporamento');
  row('Corrispondenza all’esercizio', (v) => v.match + (v.matchNote ? ` — ${v.matchNote}` : ''));
  row('Errori / correzioni', (v) => `${v.errorsShown}; rosso/verde nel pannello dell’app`);
  row('Compatibilità iPhone', () => 'player ufficiale incorporabile (playsinline) · da confermare sul dispositivo');
  row('Stato della verifica', (v) => statusLabel(results[v.youtubeId]?.status) + ' · contenuto da visionare');
  if (ex.missing.length) md += `\n**Mancanze segnalate:** ${ex.missing.join(' ')}\n`;
  md += '\n';
}
writeFileSync(join(root, 'docs/VERIFICA_VIDEO.md'), md);
const bad = all.filter((r) => r.status !== 200).length;
console.log(`\n${all.length - bad}/${all.length} verificati → docs/VERIFICA_VIDEO.md`);
process.exit(bad ? 1 : 0);
