# FORMA LAB 5.0 — Matrice dei 128 requisiti

Aggiornata al 3 novembre 2026 (fasi 1–3 e parte della 4). Uno stato "completato" significa che la funzione esiste **e** ha un test automatico o una verifica dichiarata. Le verifiche sono su browser emulati (Chromium/Playwright con iPhone 14 Pro, iPhone SE, desktop), **non su un iPhone fisico**.

**Riepilogo:** 80 completati · 36 parziali · 9 non iniziati · 3 non fattibili.

| N. | Preferenza | Funzionalità | File o componente | Test | Stato | Limitazione |
|---|---|---|---|---|---|---|
| 1 | Stile come le migliori app fitness | Nuovo design system 5.0 (token, card con profondità, gradienti) | src/styles/v4.css | e2e run.mjs (layout su ogni schermata) | parziale | Valutazione estetica soggettiva: da approvare in anteprima |
| 2 | Tema automatico chiaro/scuro | Segue il dispositivo, scelta manuale Chiaro/Scuro in Altro → Aspetto | v4.css (:root, data-theme), app/effects.tsx | e2e run.mjs “5.0: light theme applied” | completato |  |
| 3 | Colore principale blu elettrico | Token --accent #2f6bff, gradiente blu → ciano | v4.css | e2e run.mjs (screenshot) | completato |  |
| 4 | Font eleganti | Plus Jakarta Sans (titoli) + Inter (testi), offline | v4.css @font-face | e2e run.mjs (screenshot) | completato | Confronto con Geist/Manrope in docs/AUDIT_5.0.md |
| 5 | Card con sfumature e profondità | Ombre, bordo sottile e gradiente su card, liste, statistiche | v4.css (5.0 depth) | e2e run.mjs | completato |  |
| 6 | Animazioni ricche ma fluide | Entrata a cascata delle sezioni, microinterazioni, celebrazione record; rispetto di prefers-reduced-motion | v4.css, kit.tsx (CelebrationHost) | e2e run.mjs | parziale | Mancano transizioni condivise tra schermate |
| 7 | Barra inferiore stile iPhone | Tab bar a 5 sezioni con safe area | v4/Shell.tsx (TabBar) | e2e run.mjs “5.0: 5-section bottom bar” | completato |  |
| 8 | Logo completamente nuovo | Monogramma F con fulmine in gradiente blu, originale | public/icons/icon.svg + PNG | e2e run.mjs (manifest) | completato |  |
| 9 | Prima sezione: allenamento di oggi | Card fotografica di oggi in cima alla Home | v4/Home.tsx | e2e run.mjs “home: today card” | completato |  |
| 10 | Dashboard molto ricca | 15 widget (agenda, settimana, obiettivo, progressi, ultima seduta, confronto, record, muscoli, volume, tempo, peso, obiettivi, traguardi, consigli, accesso rapido) | v4/Home.tsx (WIDGETS) | e2e run.mjs | completato |  |
| 11 | Foto su ogni giornata | Foto CC BY per i 4 giorni della scheda | data/program.ts, data/media.ts | e2e run.mjs | parziale | Le schede personali non hanno foto |
| 12 | Più indicatori insieme | Anello obiettivo, settimane di fila, sedute, serie, volume, tempo | Home.tsx | e2e run.mjs | completato |  |
| 13 | Calendario ampio e visibile | Widget settimana in Home + Agenda con settimana sempre visibile | Home.tsx, Agenda.tsx | e2e run.mjs | completato |  |
| 14 | Ultimo allenamento con grafico | Widget con grafico del volume delle ultime sedute dello stesso allenamento | Home.tsx (LastWidget) | e2e run.mjs | completato | Il grafico compare dalla 2ª seduta dello stesso allenamento |
| 15 | Widget spostabili | Riordino a trascinamento + frecce accessibili, mostra/nascondi, salvati | kit.tsx (SortableList), Home.tsx (WidgetEditor) | e2e run.mjs “widget hidden and reordered” | completato | Trascinamento verificato su browser emulato |
| 16 | Pulsante "Inizia oggi" | Pulsante principale della card di oggi | Home.tsx | e2e run.mjs | completato |  |
| 17 | Vista predefinita: giorno con agenda | Agenda apre sul giorno, settimana visibile sopra | v4/Agenda.tsx | e2e run.mjs “agenda day navigation” | completato |  |
| 18 | Scorrimento, frecce, selettore data | Swipe orizzontale, frecce giorno/settimana, campo data | Agenda.tsx | e2e run.mjs | completato | Lo swipe non è coperto da test automatici |
| 19 | Riprogrammazione automatica | Motore a regole, nessun trascinamento | lib/schedule.ts (computeAutoMoves), app/effects.tsx | unit schedule.test.ts (7 casi) | completato |  |
| 20 | Saltato → giorno successivo | Primo giorno libero successivo, senza conflitti con allenamenti o impegni bloccanti, mai oltre la settimana dopo; annullabile | schedule.ts, Agenda.tsx (RescheduleNotices) | unit schedule.test.ts | completato |  |
| 21 | Card dei giorni di riposo | Card dedicata con prossimo allenamento | Agenda.tsx | e2e run.mjs (screenshot) | completato |  |
| 22 | Impegni personali | Impegni con orario e opzione “blocca la giornata” | Agenda.tsx, settings.events | e2e run.mjs “personal event saved” | completato |  |
| 23 | Spunta verde se completato | Spunta verde in agenda e calendario | Agenda.tsx, Week.tsx | e2e run.mjs | completato |  |
| 24 | Confronto settimanale completo | 7 indicatori: sedute, giorni, serie, ripetizioni, volume, tempo, record | Agenda.tsx (WeekCompare) | e2e run.mjs | completato |  |
| 25 | Schede in cartelle | Cartelle per le schede personali | v4/Routines.tsx, Plan.tsx | e2e run.mjs (4.1) | completato |  |
| 26 | Esercizi completamente modificabili | Aggiungi, sostituisci, rimuovi, serie/rip/recupero, superserie | Routines.tsx (ItemsEditor) | e2e run.mjs “plan day edited” | completato |  |
| 27 | Durata dei programmi libera | Schede senza limite di durata | Routines.tsx | e2e run.mjs | parziale | Non esiste ancora un “programma a settimane” con data di inizio/fine |
| 28 | Cicli suggeriti automaticamente | — | — | — | non iniziato | Da sviluppare (fase 3b): mesocicli forza/ipertrofia |
| 29 | Settimane di scarico | — | — | — | non iniziato | Da sviluppare insieme ai cicli |
| 30 | Card fotografiche degli esercizi | Miniature dei video reali per i 25 esercizi della scheda | Plan.tsx (ExerciseThumb) | e2e run.mjs | parziale | Gli altri esercizi non hanno immagini autorizzate |
| 31 | Modelli salvabili e duplicabili | Duplica scheda, salva seduta come scheda | Routines.tsx, Workout.tsx | e2e run.mjs “free workout saved as routine” | completato |  |
| 32 | Riordino a trascinamento | Trascinamento nella dashboard; frecce nelle schede e in seduta | kit.tsx, Routines.tsx | e2e run.mjs | parziale | Editor schede: frecce su/giù, non ancora trascinamento |
| 33 | Oltre 500 esercizi | 914 esercizi: 25 scheda + 43 libreria con pagina tecnica + 821 catalogo free-exercise-db + tuoi | data/ext/catalog.json, scripts/import-exercises.mjs | e2e run.mjs “library has more than 500 exercises” | parziale | Per gli 821 del catalogo: solo dati strutturati, nome italiano automatico, nessuna istruzione/video (provenienza testi non verificabile) |
| 34 | Filtri combinati muscolo/attrezzo/difficoltà | Ricerca istantanea + filtri combinabili | Routines.tsx (Filters) | e2e run.mjs “combined filters” | completato |  |
| 35 | Illustrazione dell’esercizio | — | — | — | non iniziato | Nessuna illustrazione con licenza verificata trovata; le immagini del dataset non sono incluse |
| 36 | Esercizi personalizzati completi | Crea, usa, elimina esercizi tuoi | Routines.tsx (CustomExerciseSheet), Profile.tsx | e2e run.mjs (4.1) | completato |  |
| 37 | Alternative se la macchina è occupata | Alternative con stesso muscolo principale, prima con attrezzo diverso | Exercise.tsx (AltList) | e2e run.mjs | completato |  |
| 38 | Difficoltà principiante/intermedio/avanzato | Livello dal catalogo; filtro | Routines.tsx (levelOf) | e2e run.mjs | parziale | Per i 68 esercizi interni il livello è una stima, non un dato di fonte |
| 39 | Preferiti e recenti | Stella sull’esercizio, filtri Preferiti/Recenti | Exercise.tsx, Routines.tsx | e2e run.mjs “favourites filter” | completato |  |
| 40 | Archiviare esercizi inutilizzati | Archivia/ripristina, filtro Archiviati | Exercise.tsx, Routines.tsx | e2e run.mjs | completato |  |
| 41 | Video subito sotto il titolo | Player sotto nome e gruppo | Exercise.tsx | e2e run.mjs | completato |  |
| 42 | Formato verticale 9:16 | Player 9:16 | v4/Player.tsx, v4.css | e2e run.mjs | completato |  |
| 43 | Prima errore, poi correzione | Video scelti con ❌/✅ | data/realVideos.ts | verifica oEmbed + fotogrammi (docs/VIDEO_REALI.md) | parziale | Dipende dai video esistenti; 11/49 senza indicazioni sul video |
| 44 | Più angolazioni | Video 1 / Video 2 per i 25 esercizi | Exercise.tsx | e2e run.mjs | parziale | Massimo 2 video, non sempre angolazioni diverse |
| 45 | Nessuna approvazione manuale | Pulsanti Approva/Non adatto rimossi; stato del video mostrato | Exercise.tsx | e2e run.mjs | completato |  |
| 46 | Tutte le alternative se un video non va | Video 2 + link alla fonte + tuo video | Player.tsx, Exercise.tsx | e2e run.mjs “player falls back…” | parziale | Nessun passaggio automatico al video successivo |
| 47 | Consigli tecnici espandibili | Sezioni a scomparsa | Exercise.tsx | e2e run.mjs | completato |  |
| 48 | Velocità 0,5× e 0,75× | 0,5× (API YouTube) | Player.tsx | e2e run.mjs | parziale | 0,75× non ancora aggiunto |
| 49 | Schermata dedicata all’esercizio attivo | Modalità allenamento | v4/Workout.tsx | e2e run.mjs | completato |  |
| 50 | Conferma automatica della serie | Conferma all’uscita dal campo ripetizioni con dati validi, con Annulla; disattivabile | Workout.tsx (SetRow) | e2e run.mjs “set auto-confirmed on leaving reps” | completato |  |
| 51 | Peso da tastiera e +/− | Campi numerici + pannello rapido ± carico/ripetizioni | Workout.tsx (QuickEntry) | e2e run.mjs “quick entry confirms set” | completato |  |
| 52 | Passaggio automatico al prossimo esercizio | Dopo l’ultima serie (e nelle superserie) | Workout.tsx | e2e run.mjs | completato |  |
| 53 | Riprendere alla riapertura | Richiesta “Riprendere l’allenamento?” solo per sedute già aperte | app/effects.tsx | e2e run.mjs “resume prompt on reopening” | completato |  |
| 54 | Riepilogo finale con grafici e confronti | Riepilogo con confronti, record, condivisione | v4/SessionView.tsx | e2e run.mjs | parziale | Il riepilogo ha confronti numerici, non ancora grafici per esercizio |
| 55 | Tutti i tipi di serie, giant set | Normale, riscaldamento, drop, cedimento, parziale; superserie e giant set | Workout.tsx | e2e run.mjs “set type changed”, “smart superset” | completato |  |
| 56 | Allenamento libero personalizzabile | Seduta vuota, aggiungi/sostituisci/riordina, salva come scheda | Workout.tsx | e2e run.mjs | completato |  |
| 57 | Suggerimento aumento carichi | Doppia progressione + “Usa X kg” | lib/progression.ts, Workout.tsx | e2e run.mjs | completato |  |
| 58 | Peso precedente in ogni serie | Colonna “Prec.” | Workout.tsx | e2e run.mjs | completato |  |
| 59 | RPE e RIR | RPE e RIR per serie, RIR ultima serie | Workout.tsx | e2e run.mjs | completato |  |
| 60 | Animazione per i record | Celebrazione con medaglia e coriandoli | kit.tsx (celebrate) | e2e run.mjs (layout) | completato | Ridotta con prefers-reduced-motion |
| 61 | 1RM stimato | Epley ≤12 rip., calcolatore | lib/stats.ts, Tools.tsx | unit features41.test.ts | completato | Stima, non misura |
| 62 | Serie parziali | Tipo di serie “Parziale” | Workout.tsx, db.ts | e2e run.mjs | completato |  |
| 63 | Calcolatore dischi | Con bilanciere e dischi della palestra | Tools.tsx | unit features41.test.ts | completato |  |
| 64 | Miglioramenti con tutti gli indicatori | Record su carico, 1RM, ripetizioni, volume; grafici | lib/records.ts, Progress.tsx | unit features41.test.ts | parziale | Manca un punteggio di progresso complessivo |
| 65 | Dynamic Island | — | — | — | non fattibile | Una PWA non può creare Live Activities: si usa il mini timer integrato |
| 66 | Recupero automatico dopo la serie | Timer basato su orari reali (non su contatori) | lib/timer.ts, Shell.tsx | e2e run.mjs “rest timer started” | completato |  |
| 67 | Avviso sonoro e visivo | Suono, vibrazione (dove supportata), barra | Shell.tsx (RestBar) | e2e run.mjs | completato | Il suono funziona solo con l’app aperta (limite iOS) |
| 68 | Riscaldamento nella seduta | Serie di avvicinamento automatiche | Workout.tsx | e2e run.mjs “warm-up sets generated” | parziale | Routine di mobilità per giornata non ancora presenti |
| 69 | Controlli +15/−15 | In barra recupero e menu esercizio | Shell.tsx, Workout.tsx | e2e run.mjs | completato |  |
| 70 | Tempo attivo e pause separati | Pause escluse dalla durata | lib/stats.ts (activeElapsed), workout.ts | e2e run.mjs “pause state” | parziale | Il tempo totale di pausa è registrato ma non ancora mostrato nel riepilogo |
| 71 | Mini timer sempre visibile | Barra recupero + pillola “Allenamento in corso” | Shell.tsx (RestBar, LivePill) | e2e run.mjs | completato |  |
| 72 | Recuperi per tipo di esercizio | Recupero predefinito per esercizio e per scheda | exercises.ts, plan.ts | e2e run.mjs | completato |  |
| 73 | Peso corporeo quando voglio | Misure con data | v4/Body.tsx | e2e run.mjs | completato |  |
| 74 | Grafici multipli del peso | Grafico in Corpo + widget Home | Body.tsx, Home.tsx | e2e run.mjs | parziale | Manca media mobile / intervalli |
| 75 | Tutte le circonferenze | Vita, torace, fianchi, braccio, coscia | Body.tsx | e2e run.mjs | parziale | Mancano polpacci e misure personalizzabili |
| 76 | Foto fronte, lato, retro | Foto locali con data | Body.tsx | e2e run.mjs | parziale | Le foto non sono ancora classificate per vista |
| 77 | % grasso manuale | Campo massa grassa (stima) | Body.tsx | e2e run.mjs | completato |  |
| 78 | Obiettivi fisici multipli | Sedute, peso, carichi | Body.tsx (Goals) | e2e run.mjs | completato |  |
| 79 | Slider prima/dopo | Confronto affiancato | Body.tsx | e2e run.mjs | parziale | Non ancora a slider |
| 80 | Diario energia, sonno, recupero | — | — | — | non iniziato | Da sviluppare (fase 5) |
| 81 | Progressi in schede specializzate | 7 schede | v4/Progress.tsx | e2e run.mjs “progress tab …” | completato |  |
| 82 | Grafici interattivi | Linee e barre con valore al tocco e vista tabella | components/Charts.tsx | e2e run.mjs | completato |  |
| 83 | Confronto tra tutti gli intervalli | 7/30/90 giorni, mensile, annuale | Progress.tsx | e2e run.mjs | parziale | Manca un intervallo personalizzato |
| 84 | Mappa muscolare con periodo | 7 giorni / 30 giorni / 3 mesi | Progress.tsx (Muscles) | e2e run.mjs | completato |  |
| 85 | Grafici separati volume e carico | Sì | Progress.tsx | e2e run.mjs | completato |  |
| 86 | Resoconti settimanali e mensili | Confronto settimanale, report mensile/annuale | Progress.tsx, Agenda.tsx | unit features41.test.ts | completato |  |
| 87 | Storico in calendario, timeline e lista | Calendario e lista | Calendar.tsx, Progress.tsx | e2e run.mjs | parziale | Vista timeline non ancora presente |
| 88 | Esportazione grafici e statistiche | CSV di tutte le serie, immagine della seduta | lib/exports.ts | e2e run.mjs “CSV export” | parziale | Esportazione dei singoli grafici non ancora presente |
| 89 | Suggerimenti dallo storico | Motore di regole locali | lib/tips.ts, Home.tsx | e2e run.mjs | completato |  |
| 90 | Alternative per stessi muscoli | Sì | Exercise.tsx | e2e run.mjs | completato |  |
| 91 | Recupero in base ai muscoli | Regola: ≥8 serie in 48 ore | tips.ts | e2e run.mjs | completato |  |
| 92 | Assistente testuale per la scheda | — | — | — | non iniziato | Da sviluppare (fase 5): domande/risposte a regole, proposte senza modifiche automatiche |
| 93 | Motore a regole offline | Regole trasparenti, ognuna dichiara la sua condizione | tips.ts | e2e run.mjs | parziale | Manca l’interfaccia di consultazione/domande |
| 94 | Avvisi di stagnazione | Regola: 3 sedute senza miglioramenti | tips.ts | e2e run.mjs | completato |  |
| 95 | Recupero delle sedute mancate | Riprogrammazione automatica con Annulla | schedule.ts, Agenda.tsx | unit schedule.test.ts | completato |  |
| 96 | Sezione “Consigli” | Widget Consigli in Home | Home.tsx (TipsWidget) | e2e run.mjs | parziale | Sezione dedicata non ancora separata |
| 97 | Promemoria calendario e notifiche | File .ics con avviso | lib/exports.ts | unit features41.test.ts | parziale | Web Push non implementato (richiede server e consenso) |
| 98 | Motivazione con statistiche e traguardi | Traguardi, record, settimane di fila | Home.tsx, records.ts | e2e run.mjs | completato |  |
| 99 | Obiettivi settimanali multipli | Obiettivo sedute + obiettivi peso/carico | Body.tsx | e2e run.mjs | parziale | Un solo obiettivo settimanale (sedute) |
| 100 | Badge e traguardi completi | Traguardi base | Home.tsx (Milestones) | e2e run.mjs | parziale | Sistema di badge completo da sviluppare |
| 101 | Settimane consecutive | Streak | records.ts (weekStreak) | unit features41.test.ts | completato |  |
| 102 | Promemoria misure personalizzabili | Consiglio ogni 14 giorni | tips.ts | e2e run.mjs | parziale | Intervallo non ancora configurabile |
| 103 | Condivisione come immagine | PNG del riepilogo | lib/exports.ts | e2e run.mjs “share image button” | completato |  |
| 104 | Comunicazione amichevole | Testi in italiano, toni misurati | tutte le schermate | — | completato |  |
| 105 | Tre dimensioni del testo | Piccolo/Normale/Grande | v4.css, More.tsx | e2e run.mjs | completato |  |
| 106 | Densità automatica | Layout fluido, più largo in orizzontale | v4.css | e2e run.mjs | parziale | Nessuna densità adattiva oltre al layout |
| 107 | Orizzontale per tutte le schermate | Larghezza maggiore in orizzontale | v4.css | e2e run.mjs | parziale | Non verificato su iPhone fisico |
| 108 | Configurazioni della barra | 3 preset | Shell.tsx (TAB_PRESETS), More.tsx | e2e run.mjs | completato |  |
| 109 | Widget attivabili e riordinabili | Sì | Home.tsx | e2e run.mjs | completato |  |
| 110 | Modalità Palestra | Contrasto alto, controlli grandi | v4.css, More.tsx | e2e run.mjs “gym mode” | completato |  |
| 111 | Niente comandi vocali | Non implementati | — | — | completato |  |
| 112 | Tour iniziale | Tour a passi, saltabile, riapribile da Altro | v4/Tour.tsx | e2e run.mjs “first-run tour shown” | completato |  |
| 113 | Più modalità di backup | JSON, JSON cifrato, CSV, copia pre-4.0 | Profile.tsx, backup.ts | e2e run.mjs “backup export” | completato |  |
| 114 | Sincronizzazione sicura e gratuita | — | — | — | non iniziato | Disattivata finché non è pronto un modello cifrato lato client (vedi AUDIT_5.0.md) |
| 115 | Offline dove possibile | Service worker, catalogo e dati locali | sw.ts | e2e run.mjs “app opens offline” | parziale | Video non disponibili offline |
| 116 | Accesso attuale mantenuto | Middleware PIN invariato | functions/_middleware.ts | unit auth.test.ts, scripts/verify-deploy.mjs | completato |  |
| 117 | Face ID | — | — | — | non iniziato | Richiede passkey WebAuthn con verifica server: da sviluppare |
| 118 | Promemoria mensile del backup | Consiglio dopo 30 giorni | tips.ts, Profile.tsx | e2e run.mjs | completato |  |
| 119 | Importazione guidata dei vecchi dati | Import backup + copia pre-4.0 | Profile.tsx, migration.ts | e2e run.mjs (migrazione) | parziale | Manca la procedura guidata Safari → app installata |
| 120 | Cancellazione con doppia conferma | Conferma + scrivere CANCELLA | Profile.tsx | e2e run.mjs “deletion blocked until CANCELLA” | completato |  |
| 121 | Apple Salute | — | — | — | non fattibile | Una PWA non accede a HealthKit; possibile solo importazione manuale dell’export (non iniziata) |
| 122 | Apple Watch | — | — | — | non fattibile | Nessuna app Watch da una PWA; solo eventuali notifiche |
| 123 | Cardio con frequenza cardiaca | Cardio con minuti, km, kcal | Workout.tsx (CardioRow) | e2e run.mjs “cardio block logged” | parziale | Frequenza cardiaca non ancora registrabile |
| 124 | Diario nutrizionale | — | — | — | non iniziato | Da sviluppare (fase 6) |
| 125 | Riscaldamento, mobilità, stretching | Serie di avvicinamento + 100+ esercizi di stretching nel catalogo | Workout.tsx, catalog.json | e2e run.mjs | parziale | Routine per giornata da sviluppare |
| 126 | Catalogo macchinari con foto | — | — | — | non iniziato | Da sviluppare; servono foto con licenza |
| 127 | iPhone principale, PC secondario | Mobile-first, layout desktop | tutta l’app | e2e run.mjs (iPhone 14 Pro, iPhone SE, desktop emulati) | completato | Non provato su iPhone fisico |
| 128 | Massimo numero di funzionalità | Fasi 1–3 + parte della 4 | — | — | parziale | Vedi elenco funzioni incomplete |
