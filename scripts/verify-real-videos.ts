// Re-verifies the real-athlete videos (YouTube Shorts) via oEmbed and writes docs/VIDEO_REALI.md.
// Usage: npx vite-node scripts/verify-real-videos.ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REAL_VIDEOS } from '../src/data/realVideos';
import { EXERCISES } from '../src/data/exercises';
import { SLOTS, DAY_BY_ID } from '../src/data/program';
import { EXERCISE_MUSCLES } from '../src/data/muscles';

const rows: string[] = [];
let ok = 0;
let total = 0;
for (const ex of EXERCISES) {
  const days = SLOTS.filter((s) => s.exerciseId === ex.id).map((s) => `G${DAY_BY_ID[s.dayId].number}`).join(', ');
  const vids = REAL_VIDEOS[ex.id] ?? [];
  if (!vids.length) rows.push(`| ${ex.name} | ${days} | — | — | — | — | — | ❌ **mancante** |`);
  for (const [i, v] of vids.entries()) {
    total++;
    let status = 0;
    for (let k = 0; k < 3 && !status; k++) {
      try {
        status = (await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/shorts/' + v.youtubeId)}`)).status;
      } catch {
        /* retry */
      }
    }
    if (status === 200) ok++;
    rows.push(
      `| ${i === 0 ? `**${ex.name}** (${EXERCISE_MUSCLES[ex.id].group})` : '↳ alternativa'} | ${days} | ${v.author.replace(/\|/g, '/')} | [${v.youtubeId}](https://www.youtube.com/shorts/${v.youtubeId}) | ${v.match}${v.note ? ` — ${v.note.replace(/\|/g, '/')}` : ''} | ${v.overlays ? '✅ visibili' : 'no'} | Player ufficiale, inline, avvio muto, loop | ${status === 200 ? '✅ verificato' : `⚠️ HTTP ${status}`} |`,
    );
  }
}
const md = `# Video reali — scheda di verifica

Ultima verifica: **${new Date().toISOString().slice(0, 10)}** · ${ok}/${total} video esistenti e incorporabili · ${EXERCISES.filter((e) => REAL_VIDEOS[e.id]?.length).length}/${EXERCISES.length} esercizi coperti (tutte le ${SLOTS.length} posizioni).

**Fonte:** YouTube (Shorts verticali, 15–60 s). **Licenza:** licenza standard di YouTube — solo incorporamento con il player ufficiale; nessun download, modifica o ripubblicazione. Nell’app il video parte **senza audio** (impostazione del player, l’audio si può riattivare) e in **loop**.

**Metodo di verifica (senza scaricare i video):**
1. ricerca su YouTube per esercizio (“… mistakes shorts”, “wrong vs right”);
2. oEmbed ufficiale: esistenza, incorporabilità, titolo e autore;
3. controllo visivo dei tre fotogrammi pubblici di anteprima (25%, 50%, 75% del video): persona reale, esercizio e macchina corrispondenti, presenza di ❌ rossi / ✅ verdi. Esclusi i video in 3D/CGI, gli scheletri animati e le varianti diverse.

**Limiti dichiarati:** l’audio originale non è stato verificato (molti Shorts hanno musica o voce): per questo l’app li avvia muti. Le indicazioni dei creatori non sono state validate da un professionista: guardali e segna “Approva”/“Non adatto” sotto ogni video nella pagina esercizio. Senza connessione i video non sono disponibili: resta il link all’originale e la guida tecnica testuale. TikTok e Instagram non sono stati usati: da questo ambiente le loro ricerche non sono accessibili senza account, quindi non era possibile verificarne i contenuti.

| Esercizio | Giorni | Autore | Video | Corrispondenza | ❌/✅ | iPhone | Stato |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
writeFileSync(join(__dirname, '..', 'docs/VIDEO_REALI.md'), md);
console.log(`${ok}/${total} ok`);
process.exit(ok === total ? 0 : 1);
