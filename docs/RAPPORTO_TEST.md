# Rapporto di verifica — FORMA LAB 3.0

Aggiornamento del 2 novembre 2026 (versione 3.0). Le sezioni successive riportano anche le verifiche della 2.0, ancora valide.

| Suite | Risultato |
|---|---|
| Test unitari (`npm test`) | **51/51** (+5 sulle animazioni: copertura 25/25, errori coerenti con le schede, ❌/✅ per esercizio, scheletro valido in ~2.700 fotogrammi) |
| End-to-end (`npm run test:e2e`) — iPhone 14 Pro, iPhone SE 320 px, desktop | **133/133** |
| Accesso con PIN nel runtime Cloudflare locale + browser | Superato (PIN errato rifiutato, PIN corretto → app, sessione 365 giorni) |
| Sito pubblicato `forma-lab.pages.dev` | Verificato da qui: risponde con la pagina di accesso PIN (la build attualmente online è la 2.0: va ripubblicata la 3.0) |

**Nuove verifiche superate (e2e):** l’animazione tecnica parte da sola e cambia fotogramma; la modalità “Errori e correzioni” elenca gli errori e permette di saltarci; la dimostrazione è visibile subito nella modalità allenamento; il video personale importato si riproduce muto, inline e in loop; un’annotazione rossa disegnata sul video compare con il badge ❌; video e annotazioni restano dopo il ricaricamento; la scheda Calendario mostra giorni programmati ed eseguiti; nessuno scorrimento orizzontale né controlli senza nome su tutte le schermate.

**Corretti durante lo sviluppo 3.0:** contrasto del giorno eseguito nel calendario; durata della sequenza errori ridotta da ~44 s a 16–22 s per avvicinarsi ai riferimenti; il volume del petto del manichino era disegnato sul lato della schiena.

**Ancora da verificare sul tuo iPhone (non eseguibile qui):**
1. Apri 3–4 esercizi: l’animazione deve partire da sola, senza audio, e ripetersi. Prova ½× e lo schermo intero.
2. “Aggiungi il tuo video” → registra 10 s con la Fotocamera → deve riprodursi muto e in loop dentro la pagina (non a schermo intero forzato). Aggiungi un ❌ e una linea, chiudi l’app, riaprila: devono esserci ancora.
3. Modalità aereo: le animazioni funzionano; il video personale anche (è salvato sul telefono); i riferimenti YouTube no (atteso).
4. Guarda gli MP4 esportati inviati in chat: devono aprirsi e ripetersi nell’app File/Foto.

**Funzioni incomplete o non verificabili (dichiarate):**
- Video di **atleti reali** con annotazioni: la funzione è pronta, ma i filmati vanno registrati da te (0/50); nessun filmato di terzi con licenza modificabile è stato trovato.
- Le animazioni sono **schematiche** (2D): non sono un atleta reale; serve una revisione biomeccanica da parte di un professionista.
- Notifiche a fine recupero: non supportate da iOS per le app web senza server push; il segnale suona solo con l’app aperta.
- I video personali **non** sono inclusi nel backup JSON (troppo grandi): restano sul dispositivo.
- Test su Safari/WebKit e su iPhone reale non eseguibili in questo ambiente.

---

# Rapporto di verifica — versione 2.0

Data: 2 novembre 2026. Ambiente: Linux, Node 22, Chromium (Playwright) con emulazione di iPhone 14 Pro (viewport 393×660 con barre di Safari, touch, DPR 3), iPhone SE 1ª gen. (320×568) e desktop 1280×860; runtime Cloudflare locale (`wrangler pages dev`, workerd).

**Non disponibili:** un iPhone reale, Safari/WebKit e un account Cloudflare. Tutto ciò che dipende da questi è nella sezione “Non eseguibili”, con la checklist da completare sul dispositivo.

## Riepilogo

| Suite | Risultato |
|---|---|
| Test unitari (`npm test`) | **42/42 superati** |
| End-to-end iPhone 14 Pro + iPhone SE + desktop (`npm run test:e2e`) | **113/113 superati** |
| Flusso di accesso nel runtime Cloudflare + browser (`tests/e2e/auth-flow.mjs`) | **Superato** |
| Verifica video oEmbed (`npm run verify:videos`) | **57/57 video esistenti e incorporabili** |
| Type-check TypeScript (app + service worker) | **Superato** |
| `npm audit --omit=dev` (dipendenze dell’app) | **0 vulnerabilità** |

## Superati

**Interfaccia** — su ogni schermata (Oggi, Scheda, Giorno, Esercizio, Allenamento, Riepilogo, Progressi, Videoteca, Profilo) e su entrambi gli iPhone: nessuno scorrimento orizzontale né elementi fuori schermo; ogni controllo ha un nome accessibile; target di tocco ≥ 32 px; nessuna schermata vuota; nessun errore JavaScript. Ordine delle sezioni della pagina esercizio conforme al brief.

**Allenamenti** — 4 giornate, 26 posizioni, nomi/ordine/serie/ripetizioni identici al brief (test unitario riga per riga); calibrazione (3→2 serie per 4 sedute) e override; precompilazione dei carichi dalla sessione precedente; registrazione di 7 esercizi con verifica che **ogni** carico salvato coincida con quello inserito; timer avviato automaticamente e visibile su altre schermate; riepilogo con durata, serie, ripetizioni, volume e confronto; cronologia persistente dopo ricaricamento; preferiti e note persistenti; storico, calendario e misure; grafici generati solo dai dati registrati (stato iniziale senza numeri finti).

**Video** — demo e tutorial distinti per tutti i 25 esercizi; ID unici e ben formati; ogni corrispondenza non esatta ha una nota; fasi tutorial (5) con errori in rosso e correzioni in verde; con YouTube irraggiungibile il player non resta bloccato e mostra il collegamento alla fonte originale.

**Offline** (service worker, dopo il primo caricamento) — si aprono scheda, istruzioni testuali e cronologia locale; il registro e il timer non richiedono rete.

**Privacy e accesso** — senza configurazione l’app non viene servita (503); senza sessione: navigazione → login, file dell’app → 401; icone/manifest pubblici; login con passphrase + TOTP corretto → cookie `__Host-` HttpOnly/Secure/SameSite; codice riutilizzato rifiutato; passphrase errata rifiutata anche con codice valido; blocco dopo 5 tentativi; POST da altra origine rifiutato; token Cloudflare Access verificato (firma, audience, scadenza, emittente, manomissione); header CSP/HSTS/X-Frame-Options presenti; nel browser reale: login → app → service worker attivo → **zero violazioni CSP**. Nessun segreto nel bundle client (verificato con una ricerca su `dist/`: i segreti esistono solo come variabili Cloudflare). Backup: export, cancellazione totale e reimportazione verificati; cifratura AES-GCM con passphrase errata rifiutata.

## Falliti durante lo sviluppo e corretti

| Problema trovato dai test | Correzione |
|---|---|
| Il pulsante “Successivo” della modalità allenamento non era fisso in basso: l’animazione d’ingresso con `transform` rendeva il footer relativo alla pagina | Animazione del contenitore solo in opacità |
| Su schermi stretti la pillola del timer copriva le spunte delle serie | Timer integrato nell’intestazione fissa della modalità allenamento |
| **Perdita di dati**: digitando velocemente, salvataggi concorrenti potevano sovrascrivere il carico appena inserito | Coda di scrittura serializzata, aggiornamenti dello store in ordine, validazione sullo stato più recente; test di regressione unitario ed e2e |
| **Login impossibile nei browser reali**: con `Referrer-Policy: no-referrer` il form invia `Origin: null` e il controllo anti-CSRF lo bloccava | `Referrer-Policy: same-origin` + controllo `Sec-Fetch-Site` |
| La CSP avrebbe impedito al service worker di memorizzare le miniature | `connect-src` esteso a `i.ytimg.com` |
| Scorrimento orizzontale a 320 px (barra serie, controlli video, pulsante tutorial) | Etichette accorciate, righe che vanno a capo |
| Target di tocco < 32 px su alcuni collegamenti | Altezza minima 44 px |

## Non eseguibili qui (da fare sul tuo iPhone)

| Verifica | Perché non eseguita | Come farla |
|---|---|---|
| Safari iOS / motore WebKit | Disponibile solo Chromium | Usa l’app per una seduta completa |
| Aggiungi alla schermata Home, icona, avvio a schermo intero, safe area con Dynamic Island | Serve un iPhone | Segui PUBBLICAZIONE.md §6; controlla che nulla finisca sotto la Dynamic Island o l’indicatore Home |
| Riproduzione video incorporata, rallentatore, loop | YouTube bloccato nei test; anteprima Claude non consente iframe | Apri 3–4 esercizi, prova 0,5× e loop; se un video non parte usa “Apri su YouTube” e segnalalo |
| Contenuto tecnico dei video | Nessun professionista ha visionato ogni filmato | Guarda ogni video e premi Approva/Non adatto |
| Suono a fine recupero, schermo sempre acceso | Dipendono da iOS | Prova “Prova il timer (5 s)” in Profilo; schermo acceso richiede iOS 18.4+ nell’app installata |
| Comportamento del timer con app in background/schermo bloccato | Serve iOS | Avvia un recupero, blocca lo schermo, riapri: il tempo deve essere corretto (nessuna notifica: iOS non lo consente) |
| Offline sull’iPhone | Serve iOS | Modalità aereo dopo un avvio online: scheda, registro e cronologia devono funzionare |
| Pubblicazione reale su Cloudflare, Cloudflare Access | Nessun account/credenziale | PUBBLICAZIONE.md §2–5, compresa la checklist privacy |
| Persistenza dati a lungo termine su iOS | Richiede settimane d’uso | Backup settimanale cifrato |

## Ricerca di video con licenza libera

Per poter disegnare le annotazioni rosso/verde direttamente sul filmato serve un video con licenza che consenta modifiche. Una ricerca su Wikimedia Commons (limitata dal rate-limit del servizio) ha restituito solo esercizi generici (es. squat con bilanciere, kettlebell), non le macchine e le varianti della scheda. Per questo le annotazioni sono in un pannello separato e la Videoteca include una guida per realizzare riprese originali.
