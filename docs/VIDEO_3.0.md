# FORMA LAB 3.0 — Video tecnici

## 1. Analisi dei tre video di riferimento

| | Video “Lat Machine” (@dmitrij.fit) | Video “Stacco 3D” (@gymvibesdaily3) | Video “Confronti” (@tiboinshape) |
|---|---|---|---|
| Formato | Verticale 9:16, ~19 s | Verticale 9:16, ~14 s | Verticale 9:16, ~18 s |
| Soggetto | Atleta reale alla lat machine | Manichino anatomico 3D grigio | Atleta reale, più esercizi |
| Inquadrature | Laterale, posteriore, primi piani (polso, schiena) | Frontale, piedi, laterale, ¾ | Frontale e laterale, campo intero |
| Segnali | ❌ rosso / ✅ verde in alto al centro; linee tratteggiate curve sul corpo | ❌ / ✅ in alto a destra; linee rosse/verdi luminose su schiena, piedi, bilanciere | ❌ / ✅ alternati ogni ~1 s |
| Ritmo | 1–2 s per errore/correzione | 1–2 s per inquadratura | Alternanza rapidissima |
| Audio | Nessuna voce | Nessuna voce | Nessuna voce |

**Regole estratte:** verticale/immersivo, nessuna voce, badge ❌/✅ grande e sempre nella stessa posizione, linea tratteggiata rossa sulla zona sbagliata che diventa verde nella correzione, confronto immediato, durata 15–20 s, loop.

I tre video sono stati usati **solo come riferimento**: non sono inclusi nell’app (diritti di terzi).

## 2. Fonti cercate per filmati reali modificabili

| Fonte | Esito |
|---|---|
| Pexels, Pixabay | Non accessibili senza chiave API dall’ambiente di sviluppo; le clip di palestra disponibili sono comunque generiche |
| Mixkit (licenza gratuita) | Solo clip generiche (squat, affondi, corde, panca); nessuna delle macchine della scheda, nessun errore dimostrato |
| Wikimedia Commons | Video CC di esercizi generici (squat con bilanciere, kettlebell); nessuna macchina della scheda |
| YouTube / TikTok | Ottimi contenuti, ma licenza standard: solo incorporamento, nessuna annotazione sovrapposta consentita |
| Repository open source di esercizi | Immagini statiche o GIF, spesso con licenze non chiare: esclusi (richiesta: niente GIF/immagini statiche) |

**Conclusione onesta:** non esistono, tra le fonti verificabili, filmati di atleti reali su queste macchine con licenza che permetta di annotarli. Non li ho inventati né sostituiti con esercizi diversi.

## 3. Soluzione realizzata

### A. Animazioni tecniche originali — 25/25 esercizi, 26/26 posizioni (completo)
- Motore proprietario (`src/anim/`): manichino con cinematica inversa a due segmenti (mani e piedi agganciati a maniglie, pedane, pavimento), macchinari disegnati, vista laterale o frontale secondo l’esercizio.
- Sequenza “Errori e correzioni”: **A** posizione iniziale → **B** errore con ❌ e linea/cerchio/freccia rossa → **C** transizione rosso→verde con ✅ → **D** ripetizioni corrette. 63 errori animati in totale (2–3 per esercizio), presi dalle schede tecniche.
- “Dimostrazione rapida”: ripetizioni corrette in loop con i cue a rotazione.
- Silenziosa, in loop, inline, avvio automatico (disattivabile), rallentatore ½×, schermo intero, salto diretto a ogni errore. Disegnata in tempo reale: **funziona offline e su qualsiasi Safari**, nessun formato video da decodificare.
- Durata della sequenza errori: 16–22 s (media 18,8 s), come i riferimenti.
- Esportabile in MP4 H.264 (720×900, muto, faststart) con `scripts/export-animations.mjs`.
- **Limite dichiarato:** è un modello schematico 2D, non un atleta reale né una motion capture. Le pose sono costruite secondo le indicazioni tecniche delle schede; vanno fatte validare da un professionista qualificato per i casi delicati.

### B. Video reali dell’utente, annotati nell’app (funzione completa, contenuti da girare)
- In ogni esercizio: “Aggiungi il tuo video” → registra o scegli dalla libreria dell’iPhone (una per “Dimostrazione”, una per “Errori e correzioni”).
- Riproduzione `muted` `loop` `playsinline` `autoplay`, ½×, scorrimento.
- Editor: “Errore qui” / “Corretto qui” al tempo corrente, didascalia scelta tra gli errori/cue dell’esercizio, disegno di linee, cerchi e frecce toccando il video; durata regolabile. Le annotazioni compaiono sincronizzate in rosso o verde con ❌/✅.
- Salvati solo sul dispositivo (IndexedDB). Il filmato è tuo: annotarlo è legale.
- La Videoteca contiene per ogni esercizio uno **storyboard** (inquadratura, errori da mostrare a carico leggero, correzioni, ripetizioni finali) per registrare il video nello stile dei riferimenti.
- **Stato:** 0/50 video reali registrati (dipende da te). Non dichiaro disponibili filmati che non esistono.

### C. Riferimenti YouTube (secondari)
I 57 video verificati restano nella sezione “Fonti esterne” di ogni esercizio, chiusa per impostazione predefinita: non sono più la soluzione principale.

### MediaPipe
Valutato e non integrato: tracciare i punti del corpo sul video dell’utente richiederebbe ~10 MB di modello e non permette di stabilire automaticamente se una postura è corretta. Le annotazioni restano manuali e dichiarate come tali.

## 4. Verifiche eseguite

| Verifica | Esito |
|---|---|
| 25 animazioni, ogni errore animato esiste nella scheda tecnica | ✅ test unitario |
| ❌ rosso negli errori, ✅ verde dopo la correzione, per ogni esercizio | ✅ test unitario |
| Scheletro valido in ogni fotogramma (lunghezze costanti, nessun valore non finito, dentro la scena) | ✅ test unitario su ~2.700 fotogrammi |
| Avvio automatico e animazione effettiva nell’app | ✅ e2e (confronto pixel tra fotogrammi) |
| Video utente: muto, inline, loop, in riproduzione; annotazione rossa; persistenza dopo ricarica | ✅ e2e (Chromium, file H.264) |
| MP4 esportati: H.264 High, yuv420p, faststart, senza audio | ✅ ffprobe |
| Riproduzione su Safari iPhone reale | ⚠️ non eseguibile qui: checklist in RAPPORTO_TEST.md |
| Validazione biomeccanica da parte di un professionista | ⚠️ da fare |
