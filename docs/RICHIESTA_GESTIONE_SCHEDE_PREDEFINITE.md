# FORMA LAB 5.0 — Gestione completa delle schede e programma predefinito

**Richiesta dell'utente:** «Quando importo nuove schede, voglio poter eliminare tutte le schede presenti, comprese le vecchie/originali, e rendere predefinita quella che scelgo».

## Comportamento richiesto
1. **Allenati → Gestisci schede:** mostrare TUTTI i programmi (importati, precedenti, originali), le routine personali, gli elementi archiviati. Filtri, ricerca, selezione multipla, Seleziona tutte, Elimina selezionate, Archivia, Ripristina, Duplica, Modifica, Rendi predefinita, Elimina tutte.
2. **Scheda originale:** l'utente deve poterla rimuovere dall'elenco e dalla pianificazione. Il modello hardcoded può restare solo come template interno per il pulsante esplicito «Ripristina modello originale», ma non deve riapparire al reload, all'aggiornamento o dopo un'importazione.
3. **Predefinito reale:** l'utente sceglie UN programma da rendere predefinito. Home / Inizia oggi / Agenda / Calendario / promemoria / riprogrammazione automatica / widget devono utilizzare esclusivamente quel programma, i suoi giorni e le sue fasi. Non usare più il vecchio calendario hardcoded se un altro programma è predefinito.
4. **Zero schede è uno stato valido:** dopo Elimina tutte, Home mostra «Nessuna scheda attiva» con Importa / Crea; non ripristina automaticamente quella originale.
5. **Importazione:** dopo l'anteprima, offrire «Aggiungi», «Aggiungi e rendi predefinita», «Sostituisci predefinita» e «Sostituisci tutte le schede», con spiegazione e conferma esplicita per le sostituzioni distruttive. Per i doppioni: Aggiorna / Duplica / Annulla. Nessun cambio automatico del predefinito senza scelta.
6. **Cancellazioni:** devono includere programmi vecchi, importati e singole routine; rimozione dall'interfaccia e dal calendario, senza residui. Prima di «Elimina tutte», mostrare conteggi, offrire backup, richiedere DOPPIA conferma, consentire annullamento quando fattibile. Cancellare una scheda NON deve cancellare le sedute già registrate, carichi storici, misure, foto o note personali.
7. **Allenamento in corso:** prima di eliminare il programma collegato, chiedere di concludere o salvare la sessione, mai perderla.
8. **Modalità offline:** tutto deve funzionare localmente su PWA iPhone; backup, migrazione e ripristino coerenti.
9. **Attivazione:** cambiare predefinito non deve riscrivere i dati passati; mostrare anteprima della nuova settimana e possibilità di ritorno ai programmi ancora esistenti.
10. **Sicurezza:** distinguere «Elimina scheda» da «Elimina tutti i dati personali», senza confonderli.

## Analisi concreta del repository (ramo claude/forma-lab-5)
- src/lib/settings.ts: activeProgramId === '' significa oggi *scheda originale*; progettare stato distinto «nessun programma» e migrazione retrocompatibile.
- src/v4/Home.tsx: usa DAYS / todayPlan / nextPlanned della scheda originale indipendentemente dal programma attivo.
- src/lib/schedule.ts: basePlan calcola con DAYS fissi; renderlo dipendente dal programma selezionato.
- src/v4/Plan.tsx: mostra sempre le quattro giornate originali e i loro pulsanti.
- src/v4/Programs.tsx: ha già attivazione, ma è necessario sincronizzarla con tutta l'app; non far ricomparire la scheda originale quando si elimina o si archivia il predefinito.
- Controllare anche Agenda, Calendar, autoReschedule, promemoria, routine e importatore.

## Test obbligatori
- Importa un programma → sceglie se attivarlo.
- Programma nuovo predefinito → Home, Agenda, Inizia oggi, Calendario coerenti anche dopo riavvio.
- Elimina originale → non riappare dopo refresh, reinstallazione con dati preservati, aggiornamento.
- Elimina tutte → elenco vuoto, nessun fallback alle quattro giornate originali.
- Importa dopo Elimina tutte → nuova scheda attivabile.
- Elimina predefinito → sceglie un altro programma o stato Nessuno; niente attivazione automatica del vecchio.
- Archivia, duplica, ripristina, selezione multipla, eliminazione massiva con doppia conferma.
- Storico sedute / progressi / misure / foto invariati dopo eliminazioni.
- Ripresa sessione ancora possibile, niente programmi orfani o collisioni di calendario.
- Migrazione dalla 4.1 retrocompatibile e backup verificato.
- Test unitari ed end-to-end iPhone emulato, prova reale quando possibile.

## Programma da offrire
Il file public/formats/chatgpt-ripartenza-8-settimane.json è già nel formato Workout Exchange v1 di Claude: 4 giorni, 8 settimane, adattamento e scarico. Deve essere importabile e selezionabile come predefinito. **Non usare la vecchia Pull Request #4**, che ha un altro schema incompatibile.

**Non pubblicare sul sito principale senza approvazione dell'utente.**
