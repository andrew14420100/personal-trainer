# FASE 2 — Design system FORMA LAB 4.0

Il file è `src/styles/v4.css` ed è l'unico foglio di stile dell'app. Sostituisce il design "cinematic" della 3.0.

## Principi

- Tema scuro elegante, con superfici grafite e un solo accento caldo.
- Niente neon e niente titoli enormi.
- Uso con una mano:
  - azioni principali in basso, nella metà raggiungibile dal pollice;
  - aree di tocco di almeno 44 px;
  - barra di navigazione fissa in basso.
- Ogni pulsante fa qualcosa di reale. Se una funzione non è disponibile (ad esempio offline o nell'anteprima), l'app lo dice.

## Colori

| Token | Valore | Uso |
|---|---|---|
| `--bg` | `#0b0c0f` | Sfondo |
| `--s1` / `--s2` / `--s3` | `#15171c` / `#1b1e25` / `#252932` | Superfici: card, campi, pulsanti secondari |
| `--t1` / `--t2` / `--t3` | Testo primario / secondario / terziario | Contrasto AA su `--s1` |
| `--accent` | `#ff6b35` | Azione principale, tab attiva |
| `--ok` | verde | Serie e allenamento completati, correzione ✅ |
| `--bad` | rosso | Errore ❌, giorno saltato |
| `--data` | blu | Numeri e grafici |
| `--warn` | ambra | Spostamenti, avvisi |
| `--day` | Colore del giorno (4 accenti dalla scheda) | Solo puntini ed etichette, mai grandi superfici |

## Tipografia

- **Manrope** per titoli e numeri grandi; **Inter** per testo e tabelle (cifre tabulari). Entrambi i font sono self-hosted e funzionano offline.
- Scala tipografica: 30 (display, solo nella card di oggi) · 24 · 19 · 16 · 13,5 · 12.
- Etichette in maiuscoletto a 12 px con spaziatura aumentata.

## Componenti

Tutti i componenti sono in `src/v4/kit.tsx` e `src/v4/Shell.tsx`.

| Componente | Nome nel codice |
|---|---|
| Barra superiore | `AppBar` / `NavBar` |
| Sezioni | `Section` |
| Pannelli a scomparsa | `Acc` (`<details>` nativo) |
| Controllo segmentato | `Seg` |
| Interruttore | `Switch` |
| Avvisi | `Notice` |
| Stati vuoti | `Empty` |
| Fogli dal basso | `Sheet`, `Confirm` |
| Notifiche brevi | `toast` |
| Barra di navigazione | `TabBar` (Oggi · Allenamenti · Calendario · Progressi · Profilo) |
| Barra del recupero | `RestBar` |
| Video | `Player`: 9:16, controlli sotto il video |
| Settimana | `WeekStrip` |
| Card di un giorno della scheda | `.plan-card` |
| Riga esercizio | `.ex-row` |
| Riquadro statistica | `.stat` |
| Tabella delle serie | `.set-r` |
| Errore e correzione | `.fault` (❌ rosso / ✅ verde) |

## Movimento

Dissolvenza di 0,3 s all'ingresso delle pagine. I fogli dal basso e la barra del recupero salgono dal basso. Con `prefers-reduced-motion` le animazioni sono ridotte.

## iPhone

- Safe area gestita in alto e in basso.
- `viewport-fit=cover`.
- Campi di testo a 16 px, per evitare lo zoom automatico di Safari.
- Testato a 393 px (iPhone 14 Pro), 320–375 px (iPhone SE) e 1280 px (desktop).
