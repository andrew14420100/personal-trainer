# FORMA LAB 3.0

Applicazione personale di allenamento per iPhone: PWA installabile dalla schermata Home, privata, offline dove possibile, gratuita.

| | |
|---|---|
| **Scheda** | 4 giorni (Lun Upper A · Mar Lower A · Gio Upper B · Ven Lower B), 26 posizioni, 25 esercizi distinti |
| **Video** | Animazioni tecniche originali per tutti i 25 esercizi (❌ rosso → ✅ verde sul movimento, loop silenzioso, offline) + i tuoi video reali annotabili nell’app; 57 video YouTube verificati come fonte esterna secondaria — vedi [docs/VIDEO_3.0.md](docs/VIDEO_3.0.md) |
| **Tecnica** | Pagina completa per ogni esercizio: preparazione, esecuzione, respirazione, errori in ROSSO → correzioni in VERDE, alternative |
| **Allenamento** | Un esercizio alla volta, carichi/ripetizioni/RIR/tecnica/note, timer di recupero automatico, riepilogo con confronti |
| **Progressi** | Storico, grafici interattivi, calendario, confronti settimanali, misure corporee, suggerimenti di progressione |
| **Dati** | Solo sul dispositivo (IndexedDB). Backup cifrato AES-256, importazione, cancellazione totale |
| **Accesso** | Middleware Cloudflare Pages: PIN personale, oppure passphrase + codice temporaneo TOTP, oppure Cloudflare Access (email + OTP) |

Anteprime: [`docs/screenshots/`](docs/screenshots). Anteprima interattiva in Claude: vedi la consegna (è una copia di prova, non l’app pubblicata).

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
| `npm test` | 51 test unitari (scheda vs brief, animazioni, statistiche, progressione, IndexedDB, backup cifrato, PIN/TOTP, middleware, JWT Access) |
| `npm run test:e2e` | Test end-to-end Playwright sulla build (viewport iPhone 14 Pro, iPhone SE, desktop; offline; backup) |
| `npm run verify:videos` | Riverifica tutti i video via oEmbed e rigenera `docs/VERIFICA_VIDEO.md` |
| `npm run totp:new` | Genera passphrase, segreto TOTP e chiave di sessione per l’accesso privato |
| `npm run build:preview` | Build a file singolo per l’anteprima in Claude (`dist-preview/`) |
| `npm run deploy` | Build + pubblicazione su Cloudflare Pages con Wrangler |
| `npm run icons` | Rigenera le icone PNG da `public/icons/icon.svg` |
| `node scripts/export-animations.mjs out <id…>` | Esporta animazioni in MP4 H.264 (con `npx vite --port 5190` attivo) |

I test e2e e lo script delle icone usano Playwright con Chromium (`npm i -D playwright` se non è già disponibile nel sistema).

## Struttura

```
src/
  app/          App, routing delle schermate, store reattivo sui dati locali
  anim/         motore delle animazioni tecniche: rig cinematico, renderer, timeline A·B·C·D, libreria 25 scene
  components/   UI, MediaHero, UserVideo (video personali annotati), VideoPlayer (YouTube), BodyMap, Charts, Technique, Shell
  screens/      Home, Program/Day, ExerciseDetail, Workout, Summary, Progress, Calendar, Videos, Settings
  data/         program.ts (scheda), exercises.ts (contenuti tecnici), videos.ts (videoteca + verifica), media.ts (foto e licenze)
  lib/          db (IndexedDB), workout (registro), stats, progression, plan (calibrazione/override), timer,
                backup (export/import cifrato), settings, router, wakelock, format
  preview/      solo anteprima Claude: banner e dati d’esempio marcati
  sw.ts         service worker (Workbox): precache, navigazioni network-first, cache miniature
  styles/       design system (token, componenti, animazioni, reduced-motion)
functions/      middleware Cloudflare Pages (autenticazione, header di sicurezza)
tests/unit      Vitest        tests/e2e   Playwright
scripts/        icone, verifica video, generazione segreti, anteprima
docs/           analisi, pubblicazione, privacy, verifica video, rapporto test, screenshot
```

## Documentazione

- [docs/ANALISI.md](docs/ANALISI.md) — stato iniziale, decisioni, incongruenze della scheda
- [docs/DESIGN.md](docs/DESIGN.md) — design system “cinematic”
- [docs/PUBBLICAZIONE.md](docs/PUBBLICAZIONE.md) — pubblicazione privata su HTTPS e installazione su iPhone, passo per passo
- [docs/PRIVACY.md](docs/PRIVACY.md) — dove sono i dati, accesso, backup
- [docs/VIDEO_3.0.md](docs/VIDEO_3.0.md) — analisi dei video di riferimento, fonti, animazioni, video personali
- [docs/VERIFICA_VIDEO.md](docs/VERIFICA_VIDEO.md) — scheda di verifica dei riferimenti YouTube
- [docs/RAPPORTO_TEST.md](docs/RAPPORTO_TEST.md) — verifiche superate, fallite (e corrette) e non eseguibili

## Stack e motivazioni

React 18 + TypeScript + Vite; CSS con design token invece di Tailwind (nessuna dipendenza in più, controllo fine di safe area e animazioni); animazioni CSS invece di una libreria (più leggere, rispettano `prefers-reduced-motion`); grafici SVG fatti a mano (funzionano offline, ~5 KB); IndexedDB nativo; Workbox per il service worker; Lucide per le icone; font Inter e Archivo self-hosted. Hosting: Cloudflare Pages (gratuito, HTTPS, Functions per l’accesso). Nessun servizio a pagamento, nessuna API a consumo.

Le indicazioni tecniche sono informative e non sostituiscono il parere di un medico o di un professionista dell’esercizio.
