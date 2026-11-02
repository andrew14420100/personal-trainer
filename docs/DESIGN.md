# FASE 2 — Design system “Cinematic”

**Idea guida:** la sala pesi di sera. Nero e antracite come fondo, fotografie autentiche in grande con un leggero effetto Ken Burns, tipografia condensata e maiuscola per i titoli, colori usati solo per dire qualcosa.

## Colore (token in `src/styles/app.css`)

| Token | Valore | Ruolo |
|---|---|---|
| `--bg` / `--surface*` | #0a0a0b → #26262b | Fondo e livelli delle card |
| `--action` | #d4ff3a (lime) | Azioni primarie (Inizia, Salva, Riproduci) |
| `--data` | #4fd1ff (ciano) | Numeri e grafici |
| `--progress` | #ffb547 (ambra) | Progressi, record, avvisi |
| `--wrong` / `--right` | #ff4d5a / #2ee59d | Errore tecnico → correzione (sempre con icona ed etichetta, mai solo colore) |
| Accento per giornata | lime, arancio, ciano, viola | Upper A, Lower A, Upper B, Lower B (barra laterale, calendario) |

Solo tema scuro, scelto deliberatamente (luce della palestra, schermi OLED, video al centro). Contrasto dei colori dati ≥ 3:1 sul fondo verificato con lo script di validazione della palette.

## Tipografia

- **Archivo Variable** (asse larghezza 62–125%): titoli condensati in maiuscolo, etichette espanse con spaziatura ampia.
- **Inter Variable**: testo e numeri (cifre tabellari per pesi e tempi).
- Self-hosted, solo sottoinsieme latino (nessuna richiesta a servizi esterni).

## Componenti

Hero fotografico con gradiente e crediti, card giornata con barra colorata, righe esercizio con miniatura del video, player video 16:9 con facciata “clicca per caricare” e controlli esterni (play/pausa, ricomincia, loop, 0,25×–1×), selettore segmentato, stepper serie (kg, ripetizioni, spunta da 52 px), pillola timer, schede di errore con figura schematica che passa dal rosso al verde, grafici SVG con tooltip al tocco e vista tabella, fogli modali dal basso, toast.

## Movimento

Dissolvenza all’ingresso delle schermate, scorrimento leggero dei blocchi, Ken Burns sulle foto, pulsazione del pulsante play, microinterazione di pressione (scala 0,97) sui pulsanti. Tutto disattivato con `prefers-reduced-motion: reduce`. Nessuna animazione blocca l’interazione.

## iPhone

`viewport-fit=cover`, safe area su tutti i lati (Dynamic Island in alto, indicatore Home in basso), barra di navigazione inferiore con sfocatura, target di tocco ≥ 44 px (verificati ≥ 32 px in modo automatico su ogni schermata), campi a 16 px (niente zoom automatico di Safari), layout testato a 320, 393 e 1280 px.
