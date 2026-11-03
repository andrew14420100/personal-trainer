# FASE 1 — Analisi

## Stato iniziale del repository

Il repository `personal-trainer` conteneva soltanto un `README.md` di una riga: nessun codice frontend, nessun dato, nessun file Excel. Non c’era quindi nulla da “mantenere” oltre al nome del progetto; FORMA LAB 2.0 è stata scritta da zero.

**Il file Excel citato nel brief non era allegato.** La fonte usata è la scheda trascritta nel brief (4 giorni, 26 posizioni). Il confronto con l’Excel richiesto dal brief non è stato possibile: va fatto da te (vedi l’elenco sotto, che indica i punti dove una differenza è più probabile). Un test automatico (`tests/unit/program.test.ts`) verifica che nomi, ordine, serie e ripetizioni coincidano esattamente con il brief.

## Incongruenze e ambiguità trovate

| # | Punto | Cosa ho fatto | Da confermare con l’Excel |
|---|---|---|---|
| 1 | **Tempi di recupero** non indicati nel brief | Valori predefiniti: 120 s multi-articolari, 90 s mono-articolari, 60 s core. Modificabili per esercizio in Profilo → Scheda e recuperi | Sì |
| 2 | **Leg Curl del venerdì** senza variante, mentre il martedì è “Leg Curl seduto” | Predefinito: leg curl **sdraiato** (stimolo diverso); selettore di variante per passare al seduto. Storico separato per le due varianti | Sì |
| 3 | **Calf Raise** presente martedì e venerdì | Stesso esercizio: una sola pagina tecnica e uno storico condiviso → 26 posizioni, 25 esercizi distinti | — |
| 4 | **“Estensioni tricipiti al cavo”** senza posizione | Variante **sopra la testa** (overhead), perché in Upper A c’è già il pushdown. Segnalata nella pagina esercizio | Sì |
| 5 | **Calf Raise**: macchina non indicata | Versione in piedi alla macchina, alternative: leg press, Multipower, seduto | Sì |
| 6 | **Low Row Machine**: modello non indicato | Indicazioni generali; il video mostra una Technogym, segnalato | — |
| 7 | **Lat machine presa neutra**: larghezza non indicata | Maniglia stretta/media, segnalato | Sì |
| 8 | **Pushdown tricipiti**: attrezzo (barra o corda) non indicato | Tecnica valida per entrambi; nota personale per annotarlo | Sì |
| 9 | **Plank 20–40 secondi** | Registrazione a tempo (secondi), escluso dal volume | — |
| 10 | **Split Squat “per gamba”** e **Dead Bug “per lato”** | Ripetizioni registrate per lato; nel volume contano ×2 | — |
| 11 | **Settimana di calibrazione** “con volume ridotto” senza regola precisa | Regola dell’app: per le prime 4 sedute completate gli esercizi da 3 serie si fanno con 2 (gli altri invariati); indicazione di lasciare 2–3 ripetizioni di margine. Attivabile/disattivabile, serie e carichi sempre modificabili | Sì |
| 12 | **Giorni** | Lunedì, martedì, giovedì, venerdì come da brief; il giorno di allenamento può essere avviato in qualsiasi data | — |

Nessun esercizio, serie o intervallo di ripetizioni del brief è stato modificato.

## Cosa è stato riscritto

Tutto il frontend (era assente): design system, 9 schermate, motore allenamenti, archiviazione locale, service worker, autenticazione lato server, test, documentazione.

## Decisioni principali

- **PWA, non app nativa**: nessun costo (l’Apple Developer Program costa 99 $/anno), installabile dalla schermata Home.
- **Dati solo sul dispositivo**: nessun server di dati personali da proteggere, zero costi. Conseguenza dichiarata: niente sincronizzazione automatica tra dispositivi; backup manuale (cifrato).
- **Accesso**: protezione vera lato server (Cloudflare), mai un PIN nel JavaScript.
- **Video**: solo incorporamento ufficiale YouTube (licenza standard); errori/correzioni rosso/verde in un pannello separato; nessuna modifica dei filmati.
