# Video in FORMA LAB 4.0: cosa fa il player e cosa non può fare

## Cosa contengono i video

- **Solo video reali già esistenti**, con persone reali nelle palestre.
  - Nessun video generato dall'intelligenza artificiale.
  - Nessun manichino, scheletro o modello 3D.
  - Gli schemi animati della 3.0 sono stati **rimossi** dall'app.
- 49 YouTube Shorts per 25/25 esercizi (26 posizioni della scheda). L'elenco completo, con autore, corrispondenza e stato, è in [VIDEO_REALI.md](VIDEO_REALI.md).
- **Varianti dichiarate:** 5 video su 49 mostrano una variante simile ma non identica all'esercizio della scheda.
  - Curl al cavo invece che con manubri.
  - Calf raise su gradino con manubri.
  - Lat machine a presa larga, mostrato per l'esercizio a presa neutra.
  - Due split squat senza appoggio.

  L'app lo scrive sotto il video.
- **Senza ❌/✅ sul video:** 11 video su 49. Sono quasi tutti alternative ("Video 2"). La guida tecnica con errori in rosso e correzioni in verde resta comunque nella pagina dell'esercizio.

## Come vengono riprodotti

Uso il player ufficiale di YouTube, tramite l'IFrame Player API sul dominio `youtube-nocookie.com`, con queste impostazioni:

| Parametro | Valore | Effetto |
|---|---|---|
| `controls` | 0 | Nasconde la barra dei controlli di YouTube |
| `playsinline` | 1 | Su iPhone il video resta nella pagina e non apre lo schermo intero |
| `mute` | 1 | Avvio senza audio (l'audio si riattiva con il pulsante) |
| `autoplay` | 1 | Partenza automatica (si disattiva nel Profilo) |
| `loop` | 1, con `playlist` uguale all'id del video | Ripetizione continua |
| `rel` | 0 | Nessun video consigliato alla fine |
| `iv_load_policy` | 3 | Nessuna annotazione |
| `disablekb` | 1 | Scorciatoie da tastiera disattivate |
| `fs` | 0 | Nessun pulsante schermo intero di YouTube |

I comandi dell'app stanno **sotto** il video, mai sopra:
- play/pausa;
- ricomincia;
- rallenta a ½×;
- audio sì/no;
- schermo intero dell'app;
- apri la fonte originale.

Tutti usano l'API ufficiale.

## Cosa NON è stato nascosto, e perché

Per rispetto delle regole di YouTube non ho usato CSS, sovrapposizioni o ritagli per coprire marchio, titolo, autore o link.

- Con i video **Shorts** il player incorporato mostra comunque una propria interfaccia: logo "Shorts", nome del canale, titolo, contatore e "Condividi". `controls=0` non la rimuove. È visibile negli screenshot di prova ed è un limite di YouTube, non un errore dell'app.
- Il pulsante "Apri la fonte originale" porta sempre al video su YouTube.

## Video con licenza propria

Il player nativo, senza YouTube, è disponibile solo per i **video registrati da te**: Esercizio → "Il tuo video".
- Il file resta sul dispositivo.
- Si apre con controlli propri, senza audio all'avvio, e con le tue annotazioni rosso/verde.

Non ho scaricato né ripubblicato video di terzi: non ne ho l'autorizzazione.

## Verifica dei contenuti

**Verificato per ogni video:**
- esistenza e incorporabilità (oEmbed ufficiale);
- titolo e autore;
- tre fotogrammi pubblici di anteprima.

**Non verificato:**
- il **contenuto secondo per secondo**: lo strumento che lo avrebbe permesso è stato bloccato in questo ambiente, perché equivale ad aggirare le protezioni anti-bot di YouTube, e non ho insistito;
- l'**audio**, per questo i video partono muti.

Per questo, sotto ogni video, puoi segnare **Approva** o **Non adatto**. Lo stato di tutti i video è in Profilo → Videoteca.

**Limiti di ambiente:**
- Offline i video non sono disponibili: l'app mostra "Sei offline" e il link alla fonte, e la guida tecnica testuale resta disponibile.
- Nell'anteprima dentro Claude YouTube potrebbe non caricarsi: in quel caso compare il link alla fonte.
