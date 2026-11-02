# FASE 1 — Ricerca: Hevy, Fitbod, Strong, Alpha Progression

Ho studiato il funzionamento delle quattro app a partire da articoli di confronto e dalla documentazione pubblica. Non ho copiato grafica, testi o codice: ho ripreso solo **principi di interazione** largamente diffusi nel settore.

**Fonti consultate**
- boostcamp.app/alternatives/hevy
- sensai.fit/blog/hevy-vs-strong-vs-fitbod
- jefit.com/blog/fitbod-vs-strong-vs-jefit-vs-hevy
- fitbod.me/blog/fitbod-vs-hevy-9-reasons-fitbod-beats-hevy

Attenzione: quasi tutti questi articoli sono scritti da aziende concorrenti, quindi non sono neutrali. Su **Alpha Progression** non ho trovato fonti indipendenti affidabili. Le informazioni su questa app sono quelle generali sul suo modello (progressione guidata, suggerimento del carico): vanno prese come indicative.

**Documentazione tecnica sui video:** developers.google.com/youtube/js_api_reference, developers.google.com/youtube/players/support (YouTube IFrame Player API e regole del player).

## Confronto sintetico

| | Punto forte | Punto debole per il tuo caso |
|---|---|---|
| **Hevy** | Registro serie velocissimo: tabella *serie · precedente · kg · ripetizioni · ✓*, timer di recupero automatico, storico per esercizio | Parte social non utile; molte funzioni a pagamento |
| **Strong** | Interfaccia minimale, pochi tocchi, scorciatoie chiare per riprendere un allenamento | Grafici avanzati a pagamento; poca guida tecnica |
| **Fitbod** | Mappa muscolare e stato di recupero dei muscoli, allenamento del giorno già pronto in apertura | Generazione automatica della scheda: tu hai già una scheda fissa da rispettare |
| **Alpha Progression** | Suggerimento del carico successivo (progressione doppia) e calendario settimanale | Fonti indipendenti scarse; modello in abbonamento |

## Elementi adottati in FORMA LAB 4.0

1. **Tabella delle serie in stile registro** (Hevy, Strong): colonne `# · Prec. · kg · rip · ✓`. Se tocchi ✓ su una riga vuota, la serie viene registrata con i valori della seduta precedente: si fa con un tocco.
2. **Recupero automatico** dopo ogni serie, nella barra in basso: ±15 s, pausa, salta (Hevy, Strong).
3. **Allenamento di oggi già pronto** in cima alla Home, con un unico pulsante grande (Fitbod).
4. **Mappa anatomica** dei muscoli coinvolti per giornata ed esercizio (Fitbod). È uno schema statico, non un indicatore di recupero.
5. **Suggerimento per la prossima volta** con progressione doppia (Alpha Progression). È dichiarato come indicazione orientativa.
6. **Calendario settimanale da lunedì**, con stati completato / programmato / saltato / spostato e la possibilità di spostare una seduta (Alpha Progression, Strong).
7. **Grafici per esercizio**: carico, ripetizioni, volume, 1RM stimato (tutte e quattro).

## Elementi esclusi

- funzioni social e classifiche;
- scheda generata dall'algoritmo (la tua scheda resta quella dei 4 giorni);
- abbonamenti e cloud;
- "punteggi di recupero" muscolare senza dati reali che li giustifichino.
