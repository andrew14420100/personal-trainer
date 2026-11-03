# FORMA LAB 5.0 — Fase 1: audit, inventario, scelte

Base di partenza: versione 4.1 sul ramo `main`. Il lavoro 5.0 è sul ramo `claude/forma-lab-5`. La produzione non viene toccata.

## 1. Audit tecnico della 4.1

| Area | Stato | Decisione 5.0 |
|---|---|---|
| Dati (IndexedDB `forma-lab` v2: `sessions`, `measurements`, `kv`, `media`) | Solido, con migrazione pre-4.0 verificata | **Conservato**. I nuovi campi sono tutti facoltativi, senza conversioni. |
| Scheda (26 posizioni, 25 esercizi, varianti) | Invariata, coperta da test | **Conservata**. Le modifiche ai giorni sono salvate a parte e sempre ripristinabili. |
| Registro (coda `mutate`, serie, superserie, tipi di serie) | Solido | **Esteso**: conferma automatica, annulla, RIR per serie, serie parziali. |
| Timer (orario di fine assoluto, `localStorage`) | Corretto dopo sospensioni o riaperture | **Conservato**. |
| Backup (JSON, AES-GCM, CSV) | Solido | **Conservato**, più promemoria mensile e doppia conferma per la cancellazione. |
| Autenticazione (middleware Pages: PIN/TOTP/Access) | Testata | **Invariata**; i segreti Cloudflare non vengono toccati. |
| Interfaccia 4.x | Funzionale ma "troppo semplice" | **Ricostruita**: design system, navigazione, Home, Agenda, Allenamento. |
| Test (Vitest + Playwright) | 70 unitari + 179 e2e | **Estesi**: 77 unitari + 211 e2e. |
| CI/CD (GitHub Actions → Cloudflare Pages) | Funzionante | **Riusato**: anteprima protetta automatica a ogni push del ramo. |

## 2. Audit UX (cosa mancava rispetto alle app professionali)

| Area | Problema nella 4.1 | Soluzione 5.0 |
|---|---|---|
| Navigazione | Funzioni importanti nascoste nel Profilo | 5 sezioni (Oggi · Agenda · Allenati · Progressi · Altro) e barra configurabile |
| Home | Elenco fisso, non personalizzabile | 15 widget riordinabili e nascondibili |
| Calendario | Mancava una vista giornaliera; spostamenti solo manuali | Agenda giornaliera e riprogrammazione automatica annullabile |
| Seduta | Troppi tocchi | Pannello ± a una mano, conferma automatica, annulla, passaggio automatico |
| Libreria | 68 esercizi | 914, con filtri combinati, preferiti, recenti, archivio |
| Aspetto | Solo tema scuro | Tema automatico chiaro/scuro, 3 dimensioni del testo, modalità Palestra |

## 3. Confronto con le app professionali (funzioni pubbliche)

Fonti: pagine ufficiali di Hevy (`hevyapp.com/features`, `help.hevyapp.com`) e articoli di confronto già citati in `RICERCA_4.0.md`. Non sono stati copiati grafica, testi o codice.

| Funzione | Hevy | Strong | Fitbod | Alpha Progr. | FORMA LAB 5.0 |
|---|---|---|---|---|---|
| Tipi di serie, RPE | ✓ | parziale | parziale | ✓ | ✓ (più RIR e serie parziali) |
| Superserie / giant set | ✓ | ✓ | – | ✓ | ✓ |
| Record in tempo reale | ✓ | ✓ | – | ✓ | ✓ con animazione |
| Calcolatore dischi / riscaldamento | ✓ (Pro) | ✓ | – | ✓ | ✓ gratuito |
| Mappa muscolare | ✓ | – | ✓ | ✓ | ✓ (7/30/90 giorni) |
| Progressione automatica | – | – | ✓ | ✓ | suggerimento + “Usa X kg” |
| Calendario con riprogrammazione | – | – | parziale | parziale | ✓ automatica, annullabile |
| Libreria esercizi | ~400+ con video | ~300 | ~1000 con video | ~600 | 914 (video solo per 25) |
| Nutrizione | – | – | – | – | da sviluppare (fase 6) |
| Sincronizzazione | account | account | account | account | da sviluppare, solo cifrata |

## 4. Scelte progettuali motivate

**Tipografia**
- Opzioni confrontate: Manrope, Inter, Plus Jakarta Sans, Geist.
- Scelta: **Plus Jakarta Sans** per i titoli, con forme morbide ed eleganti anche a pesi alti, più **Inter** per testi e numeri, molto leggibile su iPhone e con cifre tabulari.
- Geist è stato scartato: ha un carattere più "tecnico" e non era già incluso nel progetto.
- Entrambi i font sono incorporati nell'app e funzionano offline.

**Palette**
- Colore principale: blu elettrico `#2f6bff` (scuro) / `#1f5bff` (chiaro), con gradiente verso il ciano.
- Verde solo per i completamenti, rosso solo per errori.
- Contrasto calcolato secondo WCAG su entrambi i temi: testi principali 16–18:1, secondari ≥ 7,5:1, terziari e blu ≥ 5:1, testo bianco sui pulsanti ≥ 4,5:1. Il gradiente con il ciano è solo decorativo (logo, anelli).

**Logo:** monogramma "F" con fulmine, disegnato da zero (`public/icons/icon.svg`).

**Dynamic Island:** **non fattibile** in una PWA, perché iOS non consente alle app web di creare Live Activities. Al suo posto: barra del recupero e pillola "Allenamento in corso" sempre visibili nell'app. Con l'app sospesa iOS non garantisce l'avviso esattamente allo scadere del recupero.

**Sincronizzazione (Cloudflare D1)**
- Tecnicamente possibile sul piano gratuito: 5 GB e 5 milioni di letture al giorno bastano ampiamente per un solo utente.
- Requisiti di sicurezza:
  - cifratura lato client con chiave derivata da una passphrase che non arriva mai al server;
  - record cifrati con identificativo e versione;
  - risoluzione dei conflitti per record (vince la versione più recente, con registro delle modifiche).
- **Non attivata in questa fase:** prima va scritta e testata. Fino ad allora restano backup e ripristino manuali.

**Apple Salute e Apple Watch**
- Nessun accesso diretto da una PWA.
- Fattibile in futuro: l'importazione manuale del file di esportazione di Salute (peso, frequenza cardiaca).

**Face ID**
- Fattibile con passkey WebAuthn, ma richiede la verifica crittografica nel middleware, da sviluppare.
- Nessun pulsante finto è stato aggiunto.

**Catalogo esercizi**
- Il dataset `free-exercise-db` (876 esercizi, dichiarato di pubblico dominio – Unlicense) è stato importato **solo nei dati strutturati**:
  - nome inglese;
  - muscoli;
  - attrezzatura;
  - livello;
  - tipo di movimento.
- Testi e immagini **non** sono stati importati: derivano da un dataset precedente di provenienza non verificabile.
- I nomi italiani sono tradotti con regole trasparenti e segnalati come automatici nell'app.

## 5. Dati da preservare (verificato)

**Formato**
- Database `forma-lab` versione 2: nessun cambio di schema.
- Copia `backup:pre-4.0` mantenuta.
- Nuove impostazioni unite ai valori predefiniti (`loadSettings`), senza mai sovrascrivere quelle esistenti.

**Safari e app installata**
- Su iPhone l'app installata nella schermata Home e Safari hanno archivi separati.
- La 5.0, pubblicata sullo stesso indirizzo, legge l'archivio dell'app installata dall'utente.
- Per spostare dati tra i due archivi: Esporta → Importa.

## 6. Piano di ritorno alla versione precedente

1. **Prima della produzione:** l'anteprima 5.0 ha un indirizzo separato, quindi la produzione resta la 4.1.
2. **Dopo la pubblicazione:** Cloudflare → Workers & Pages → forma-lab → Deployments → deployment 4.1 → **Rollback**. Richiede un clic, nessun software.
3. **Dati:** il formato è compatibile all'indietro. La 4.1 ignora i campi nuovi, quindi un rollback non perde le sedute; si perdono solo le impostazioni introdotte dalla 5.0.

## 7. Fasi successive (non ancora realizzate)

| Fase | Contenuto |
|---|---|
| 3b | Cicli forza/ipertrofia e settimane di scarico; trascinamento nell'editor schede; storico delle modifiche alla scheda |
| 4b | Contenuti tecnici in italiano per gli esercizi più usati del catalogo; ricerca di video aggiuntivi con licenza |
| 5 | Diario di energia, sonno e recupero; foto per vista; slider prima/dopo; assistente "Consigli" consultabile; timeline |
| 6 | Diario nutrizionale con alimenti personali e, previa verifica della licenza, dati USDA FoodData Central (pubblico dominio) |
| 7 | Passkey, Web Push (da valutare), sincronizzazione cifrata D1, importazione da Salute, backup dei media |
