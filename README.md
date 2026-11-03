# FORMA LAB 4.1

Novità della 4.1 (allenamento in stile app professionali, schede personalizzabili, statistiche, corpo, correzione dei video su iPhone): [docs/NOVITA_4.1.md](docs/NOVITA_4.1.md).

Applicazione personale di allenamento: PWA privata e gratuita, installabile su iPhone e PC, con le funzioni locali disponibili anche offline. La 4.0 ricostruisce da zero interfaccia e navigazione. Restano invariati i dati, la scheda e la protezione d'accesso.

| | |
|---|---|
| **Oggi** | Allenamento del giorno: nome chiaro, foto, muscoli, durata, esercizi, stato e pulsante "Inizia allenamento". Settimana da lunedì, progressi della settimana, ultimo allenamento, storico, scheda, traguardi (solo dati reali) |
| **Allenamenti** | 4 giorni: Lunedì *Petto, schiena e braccia* · Martedì *Gambe: quadricipiti e femorali* · Giovedì *Petto alto, schiena e spalle* · Venerdì *Glutei e gambe*. 26 posizioni, 25 esercizi. Ogni giorno ha anatomia, serie/ripetizioni/recupero, durata e stato |
| **Esercizio** | Video reale grande in alto. Sotto: muscoli e anatomia, serie, recupero, ultimo carico, tecnica a scomparsa (regolazione, esecuzione, errori ❌ e correzioni ✅, alternative), grafico personale, storico, note |
| **Allenamento** | Tabella serie *prec. · kg · rip · ✓*, recupero automatico (±15 s, pausa, salta), pausa della seduta, note/tecnica/RIR, avanti/indietro, chiusura con RPE |
| **Calendario** | Settimana e mese con stati completato / programmato / saltato / spostato. Sposta una seduta o ripristinala; naviga tra settimane, mesi e anni |
| **Progressi** | Carico, ripetizioni, volume, frequenza, serie per settimana, confronto settimanale, RPE, 1RM stimato, storico, misure |
| **Video** | 49 Shorts di atleti reali, player ufficiale YouTube con controls=0, avvio muto e loop, comandi sotto il video — [docs/VIDEO_4.0.md](docs/VIDEO_4.0.md) |
| **Dati** | Solo sul dispositivo (IndexedDB). Backup cifrato AES-256, ripristino, copia di sicurezza verificata della versione precedente — [docs/MIGRAZIONE_4.0.md](docs/MIGRAZIONE_4.0.md) |
| **Accesso** | Middleware Cloudflare Pages: PIN personale, passphrase + TOTP, oppure Cloudflare Access |

Schermate: [`docs/screenshots/`](docs/screenshots) (i file `4.0-*.png` contengono dati di prova dei test).

## Avvio rapido

Requisiti: Node.js 20+ (testato con 22).

```bash
npm ci
```

```bash
npm run dev
```

Apre l’app in sviluppo su `http://localhost:5173` (senza autenticazione: il middleware gira solo su Cloudflare o con `wrangler pages dev`).

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run build` | Type-check + build di produzione in `dist/` (PWA con service worker) |
| `npm test` | 70 test unitari (scheda, calendario, migrazione 4.0, statistiche, progressione, IndexedDB, backup cifrato, PIN/TOTP, middleware, JWT Access) |
| `npm run test:e2e` | 179 controlli end-to-end Playwright sulla build (iPhone 14 Pro, iPhone SE, desktop; migrazione, calendario, registro, offline, backup) |
| `npm run verify:videos` | Riverifica i tutorial esterni e rigenera `docs/VERIFICA_VIDEO.md` |
| `npx vite-node scripts/verify-real-videos.ts` | Riverifica i video reali e rigenera `docs/VIDEO_REALI.md` |
| `npm run totp:new` | Genera passphrase, segreto TOTP e chiave di sessione per l’accesso privato |
| `npm run build:preview` | Build a file singolo per l’anteprima in Claude (`dist-preview/`) |
| `npm run deploy` | Build + pubblicazione su Cloudflare Pages con Wrangler |
| `npm run icons` | Rigenera le icone PNG da `public/icons/icon.svg` |

I test e2e e lo script delle icone usano Playwright con Chromium (`npm i -D playwright` se non è già disponibile nel sistema).

## Struttura

```
src/
  app/          App (routing), store reattivo sui dati locali
  v4/           interfaccia 4.0: kit (componenti), Shell (tab bar, recupero), Player (YouTube), Week,
                Home, Plan (Allenamenti + giorno), Exercise, Workout, SessionView, Calendar, Progress, Profile, Videos
  components/   Anatomy, Charts, UserVideo (video personali annotati), VideoReview, UpdatePrompt, ErrorBoundary
  data/         program.ts (scheda), exercises.ts (tecnica), muscles.ts, realVideos.ts (video reali), videos.ts (tutorial esterni), media.ts (foto)
  lib/          db (IndexedDB), migration (copia verificata pre-4.0), schedule (calendario e spostamenti), workout, stats,
                progression, plan, timer, backup, settings, router, wakelock, format
  preview/      solo anteprima Claude: banner e dati d’esempio marcati
  sw.ts         service worker (Workbox)
  styles/v4.css design system 4.0
functions/      middleware Cloudflare Pages (autenticazione, header di sicurezza)
tests/unit      Vitest        tests/e2e   Playwright
scripts/        icone, verifica video, generazione segreti, anteprima
docs/           ricerca, design, migrazione, video, pubblicazione, privacy, rapporto test, screenshot
```

## Documentazione

- [docs/RICERCA_4.0.md](docs/RICERCA_4.0.md) — confronto Hevy, Fitbod, Strong, Alpha Progression ed elementi adottati
- [docs/DESIGN.md](docs/DESIGN.md) — design system 4.0
- [docs/MIGRAZIONE_4.0.md](docs/MIGRAZIONE_4.0.md) — conservazione e verifica dei dati della versione precedente
- [docs/VIDEO_4.0.md](docs/VIDEO_4.0.md) — player video, limiti di YouTube, varianti
- [docs/ANALISI.md](docs/ANALISI.md) — stato iniziale, decisioni, incongruenze della scheda
- [docs/PUBBLICAZIONE.md](docs/PUBBLICAZIONE.md) — pubblicazione privata su HTTPS e installazione su iPhone, passo per passo
- [docs/PRIVACY.md](docs/PRIVACY.md) — dove sono i dati, accesso, backup
- [docs/VIDEO_REALI.md](docs/VIDEO_REALI.md) — video reali scelti per ogni esercizio, con scheda di verifica
- [docs/VIDEO_3.0.md](docs/VIDEO_3.0.md) — (storico 3.0) analisi dei video di riferimento; gli schemi animati sono stati rimossi nella 4.0
- [docs/VERIFICA_VIDEO.md](docs/VERIFICA_VIDEO.md) — scheda di verifica dei riferimenti YouTube
- [docs/RAPPORTO_TEST.md](docs/RAPPORTO_TEST.md) — verifiche superate, fallite (e corrette) e non eseguibili

## Stack e motivazioni

React 18 + TypeScript + Vite; CSS con design token invece di Tailwind (nessuna dipendenza in più, controllo fine di safe area e animazioni); animazioni CSS invece di una libreria (più leggere, rispettano `prefers-reduced-motion`); grafici SVG fatti a mano (funzionano offline, ~5 KB); IndexedDB nativo; Workbox per il service worker; Lucide per le icone; font Manrope e Inter self-hosted. Hosting: Cloudflare Pages (gratuito, HTTPS, Functions per l’accesso). Nessun servizio a pagamento, nessuna API a consumo.

Le indicazioni tecniche sono informative e non sostituiscono il parere di un medico o di un professionista dell’esercizio.
