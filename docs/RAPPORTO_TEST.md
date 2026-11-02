# Rapporto di verifica — FORMA LAB 4.0

Data: 2026-11-02 · build di produzione, Chromium (Playwright) con emulazione iPhone 14 Pro, iPhone SE e desktop 1280 px.

## Esito

| Verifica | Esito |
|---|---|
| `tsc` (type-check completo) | ✅ nessun errore |
| Test unitari (`npm test`) | ✅ 57/57 (scheda, calendario settimanale con anni bisestili, cambio anno e ora legale, migrazione 4.0, IndexedDB, backup cifrato, PIN/TOTP, middleware, JWT Access) |
| Test end-to-end (`npm run test:e2e`) | ✅ 130/130 |
| Build di produzione + service worker | ✅ |

## Contenuto dei test end-to-end

**Migrazione dalla 3.0** (database creato nel vecchio formato):
- rapporto verificato e copia `backup:pre-4.0` presente;
- nome, nota dell'esercizio, ultimo carico e riepilogo della seduta invariati;
- un secondo avvio non sovrascrive la copia.

**Home:**
- allenamento di oggi con nome chiaro;
- settimana da lunedì con 7 giorni e oggi evidenziato;
- navigazione alla settimana successiva e ritorno.

**Allenamenti:**
- 4 card con i nomi richiesti;
- **26 posizioni** sommando i 4 giorni;
- anatomia e pulsante di avvio in ogni giorno.

**Esercizio:**
- gruppo e nome in alto;
- player presente;
- con YouTube irraggiungibile compare il link alla fonte o la copertina;
- **comandi sotto il video, non sovrapposti**;
- 5 o più sezioni a scomparsa;
- errori ❌ e correzioni ✅.

**Allenamento:**
- inserimento carico e ripetizioni, spunta della serie;
- recupero automatico con +15 s e "salta";
- pausa e ripresa;
- **dati conservati dopo il ricaricamento**;
- esercizio successivo e precedente;
- chiusura con RPE e riepilogo salvato;
- giorno segnato come completato in Home.

**Calendario:**
- vista settimana;
- vista mese con navigazione e **passaggio d'anno**;
- griglia da lunedì;
- **spostamento** di una seduta (marcatore "spostato") e **ripristino**.

**Progressi:**
- grafici reali;
- grafico del carico per esercizio;
- storico.

**Profilo:**
- link di uscita;
- copia pre-4.0 visibile;
- **esportazione del backup** con 2 sessioni.

**Offline (service worker):**
- la scheda si apre;
- la guida tecnica è disponibile;
- il video mostra il messaggio offline;
- lo storico locale è leggibile.

**In ogni schermata:**
- nessuno scorrimento orizzontale;
- tutti i controlli hanno un nome accessibile;
- aree di tocco ≥ 30 px (gli interruttori sono alti 30 px, dentro righe da 56 px).

## Corretti durante lo sviluppo

- La barra dei comandi del video in modalità compatta era più larga del video: ora si adatta.
- Il pulsante "Termina" nel foglio dell'elenco esercizi poteva finire coperto dalla lista sugli schermi piccoli: ora è in alto nel foglio.

## Non eseguibili qui (da fare sul tuo iPhone)

- **Safari/WebKit reale e app installata in Home:** non disponibili in questo ambiente. L'emulazione usa Chromium.
- **Riproduzione YouTube** dentro la PWA su iPhone (autoplay muto inline): da verificare sul dispositivo.
- **Suono e vibrazione a fine recupero**, e **schermo sempre acceso**.
- **Accesso con PIN sul sito pubblicato:** il middleware è coperto dai test unitari e dal test locale con Wrangler della 3.0, ma l'anteprima 4.0 su Cloudflare va pubblicata da te (vedi PUBBLICAZIONE.md).

---

# Aggiornamento — nomi chiari, anatomia, video reali

| Verifica | Esito |
|---|---|
| Test unitari | **57/57** (+6: nomi delle giornate senza Upper/Lower, muscoli della giornata coerenti con gli esercizi, anatomia valida per tutti i 25 esercizi, video reali per tutte le 26 posizioni, ID unici, varianti annotate) |
| End-to-end iPhone 14 Pro / iPhone SE / desktop | **145/145** (card giornata con anatomia e “Inizia allenamento”, intestazione “nome — gruppo”, scheda rapida, mappa con muscoli principali evidenziati, player verticale del video reale, link all’originale se il video non può caricarsi, schema animato, registro e persistenza) |
| Video reali | **49/49** esistenti e incorporabili (oEmbed), 25/25 esercizi coperti; contenuto controllato sui fotogrammi pubblici di anteprima |

1. **Nomi delle giornate comprensibili:** sì, numerati 1–4, con la sigla tecnica solo come etichetta secondaria. Superato.
2. **Muscoli allenati per ogni giornata:** derivati automaticamente dagli esercizi; il test controlla che tutti i muscoli principali compaiano. Superato.
3. **Anatomia corretta per i 26 esercizi:** principali e secondari in `src/data/muscles.ts`, coerenti con le schede tecniche. Superato. La revisione di un professionista è comunque consigliata.
4. **Video corrispondenti agli esercizi:** verificati su titolo, autore e fotogrammi. 5 video su 49 mostrano una variante simile e sono segnalati come tali: i 2 di split squat senza appoggio, il calf raise su gradino, e le alternative con presa larga e con curl al cavo. L’audio non è verificato e i video partono muti.
5. **Video su iPhone:** la riproduzione inline, muta e in loop sul dispositivo reale va confermata da te. Se il caricamento fallisce compare sempre il link “Apri su YouTube”.
6–7. **Pulsanti e registro:** verificati dagli e2e (serie, carichi, persistenza dopo ricarica, backup).
8. **Interfaccia mobile:** nessuno scorrimento orizzontale e target di tocco adeguati su 320 e 393 px.
9. **Funzioni esistenti:** nessuna rimossa. Gli schemi animati restano disponibili nella scheda “Schema”, i tuoi video in “Tuo”, i tutorial parlati in “Fonti esterne”.

---

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
