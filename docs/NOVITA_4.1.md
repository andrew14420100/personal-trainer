# FORMA LAB 4.1: cosa c'è di nuovo

Sviluppata sulle risposte alle domande e dopo aver studiato le funzioni pubbliche di Hevy: pagine ufficiali hevyapp.com/features e help.hevyapp.com. Non ho copiato grafica né codice: ho ripreso solo i principi di funzionamento. In Hevy molte di queste funzioni sono a pagamento; qui sono tutte gratuite e locali.

## Video sul telefono (correzione)

**Problema:** i video non si vedevano su `preview-4`. Il sito inviava `Referrer-Policy: same-origin`, sia come intestazione del server sia come meta nella pagina. Dal 2025 YouTube rifiuta i player incorporati che non ricevono la provenienza (errore 153).

**Correzione:**
- la policy ora è `strict-origin-when-cross-origin`: a YouTube arriva solo il dominio, mai percorsi o dati;
- il player crea l'iframe con la stessa policy esplicita;
- se YouTube rifiuta comunque, l'app mostra il codice d'errore.

**Comandi e marchio di YouTube:** non li posso togliere né coprire, per le regole di YouTube. Non ho nemmeno scaricato video di YouTube: non è consentito senza l'autorizzazione degli autori. Senza YouTube, i video si possono avere in due modi, entrambi con il player dell'app:
- video registrati da te;
- file che un autore ti autorizza a usare.

## Allenamento

- **Tipi di serie:** tocca il numero della serie per scegliere:
  - Normale;
  - Riscaldamento (R): esclusa da statistiche e record;
  - Drop set (D): il recupero non parte prima;
  - A cedimento (C).
- **RPE per serie** (6–10, anche a mezzi punti). Si disattiva nel Profilo.
- **Superserie e giant set:**
  - colleghi 2 o più esercizi;
  - dopo una serie l'app passa da sola al successivo del gruppo;
  - il recupero parte solo a fine giro.
- **Record in tempo reale:** medaglia "PR" sulla serie e avviso quando batti carico massimo, 1RM stimato, ripetizioni o volume di una serie. Il confronto è con lo storico precedente; non scatta la prima volta.
- **Calcolatori in seduta** (menu ⋯):
  - dischi da caricare, con il peso del bilanciere e i dischi della tua palestra;
  - massimale (1RM) con tabella delle percentuali;
  - pulsante **Riscaldamento**, che genera le serie di avvicinamento (default 40%×5, 60%×5, 80%×3, modificabili).
- **Carico suggerito con un tocco** ("Usa X kg"), dalla doppia progressione. Decidi sempre tu.
- **Recupero automatico per esercizio**, modificabile al volo (±15 s dal menu).
- **Modifica durante la seduta:**
  - aggiungi, sostituisci, rimuovi e riordina esercizi;
  - a fine seduta l'app chiede se aggiornare la scheda con le modifiche.
- **Allenamento libero:** parti vuoto e aggiungi gli esercizi; alla fine puoi salvarlo come nuova scheda.
- **Cardio:** tapis roulant, cyclette, ellittica, vogatore, stepper. Si registrano minuti, km e kcal.

## Schede ed esercizi

- **Modificare i 4 giorni:** aggiungi, togli, sostituisci, riordina, superserie, serie, ripetizioni, recupero. "Ripristina la scheda originale" è sempre disponibile.
- **Schede personali**, con cartelle, colore, duplicazione ed eliminazione.
- **Libreria di 68 esercizi**, con ricerca e filtro per muscolo:
  - i 25 della scheda, con video reali;
  - 38 esercizi da palestra con pagina tecnica scritta per l'app (preparazione, esecuzione, errori ❌ e correzioni ✅);
  - 5 attrezzi cardio.
- **Esercizi creati da te**, eliminabili dal Profilo. Le sedute vecchie restano leggibili.

## Statistiche (Progressi)

| Scheda | Contenuto |
|---|---|
| Panoramica | Settimane di fila, griglia di attività di 17 settimane, confronto settimanale, volume, serie, frequenza, ripetizioni, durata, RPE |
| Muscoli | Mappa del corpo e serie per muscolo su 7 giorni, 30 giorni o 3 mesi (muscolo principale = 1 serie, secondario = 0,5) |
| Record | Record recenti e migliori valori per ogni esercizio, con la data |
| Report | Report mensile e annuale: sedute, giorni, ore, serie, volume, record, esercizio più fatto |
| Esercizi | Grafici di carico, 1RM, ripetizioni e volume per esercizio |
| Storico | Tutte le sedute |
| Corpo | Obiettivi, peso e misure (anche % di massa grassa) con grafici, foto dei progressi con confronto prima/dopo |

## Oggi (Home)

- anello dell'obiettivo settimanale e settimane di fila;
- accesso rapido: allenamento libero, schede, misure, foto;
- mappa muscolare degli ultimi 7 giorni;
- record recenti.

## Altro

- **Obiettivi:** sedute a settimana, peso corporeo, carico obiettivo su esercizi a scelta.
- **Promemoria:** un'app web su iPhone non può inviare notifiche senza un server. Il pulsante "Aggiungi al calendario" crea un file `.ics` con i 4 allenamenti settimanali ricorrenti e un avviso prima dell'orario.
- **Condividi il riepilogo** come immagine PNG, disegnata sul telefono senza server (WhatsApp, Instagram…).
- **Esporta tutte le serie in CSV**, apribile con Excel o Numbers, con separatore ";" e decimali con la virgola.
- **kg / lb:** i dati restano salvati in kg; cambia solo come li vedi e li inserisci.

## Cosa non si può fare (dichiarato)

- **Apple Watch e Apple Health:** non sono accessibili da una PWA.
- **Notifiche push:** servirebbe un server; al loro posto ci sono gli eventi nel calendario.
- **Foto dei progressi:** non sono nel backup (sono file binari): restano solo sul dispositivo.
- **Esercizi della libreria:** non hanno video verificato; puoi caricare il tuo.
- **Verifica su un iPhone reale:** non è stata possibile. In particolare vanno provati:
  - l'importazione del file calendario;
  - il foglio di condivisione dell'immagine;
  - la riproduzione YouTube dopo la correzione.

## Dati

**Compatibilità:** i nuovi campi sono tutti facoltativi.
- Serie: `type`, `rpe`, `distanceKm`, `kcal`.
- Esercizio nella seduta: `group`, `restSec`.
- Seduta: `title`.
- Impostazioni: schede, modifiche ai giorni, esercizi personali, obiettivi, unità, schema di riscaldamento.

Le sedute della 3.0 e della 4.0 restano valide senza conversioni. Resta attiva la copia di sicurezza pre-4.0.

## Verifiche

- `tsc` senza errori.
- 70/70 test unitari, 13 dei quali nuovi:
  - record;
  - serie per muscolo;
  - costanza;
  - report;
  - riscaldamento;
  - dischi;
  - kg/lb;
  - CSV;
  - calendario;
  - catalogo;
  - superserie.
- **179/179** controlli end-to-end su iPhone 14 Pro, iPhone SE e desktop. Coprono, tra l'altro:
  - libreria e ricerca;
  - creazione di una scheda con superserie;
  - passaggio automatico nella superserie e recupero a fine giro;
  - tipo di serie;
  - riscaldamento;
  - cardio;
  - allenamento libero salvato come scheda;
  - modifica e ripristino di un giorno;
  - tutte le schede dei Progressi;
  - anello obiettivo e mappa in Home;
  - calcolatori;
  - libbre;
  - esportazione CSV.
