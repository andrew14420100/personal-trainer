# FORMA LAB Workout Exchange — versione 1

Formato aperto per scambiare **programmi di allenamento** (anche di più giornate e più settimane) tra FORMA LAB e altri strumenti, per esempio ChatGPT.

- **Identificatore del formato:** `forma-lab-workout-exchange`.
- **Versione:** `1`.
- **JSON Schema ufficiale:** [`public/formats/forma-lab-workout-exchange-v1.schema.json`](../public/formats/forma-lab-workout-exchange-v1.schema.json) (JSON Schema draft 2020-12).
- **Esempi:**
  - [`esempio-8-settimane.json`](../public/formats/esempio-8-settimane.json): 4 giornate, 4 fasi, scarico, superserie e giant set;
  - [`esempio-scheda-4-giorni.json`](../public/formats/esempio-scheda-4-giorni.json): la scheda FORMA LAB originale, 26 posizioni.

## Come si usa con ChatGPT

1. Copia in ChatGPT le **istruzioni** riportate qui sotto. Le trovi anche in FORMA LAB → Allenati → Importa scheda → "Come farlo creare a ChatGPT".
2. Chiedi la scheda che desideri, per esempio: *"Programma di 8 settimane, 4 giorni, obiettivo massa, macchine e manubri"*.
3. Salva la risposta come file `.json`, oppure copiala.
4. In FORMA LAB scegli **Allenati → Importa scheda**, poi seleziona il file o incolla il testo.
5. Controlla l'anteprima, scegli le varianti dove richiesto e tocca **Conferma e importa programma**.

Per far migliorare una scheda: aprila in FORMA LAB → **Esporta scheda per ChatGPT**, carica il file in ChatGPT e chiedi le modifiche. Reimportando il file aggiornato, l'app mostra l'elenco delle differenze e propone **Aggiorna** o **Duplica**.

### Istruzioni da dare a ChatGPT

```text
Crea il programma di allenamento nel formato "FORMA LAB Workout Exchange — versione 1".
Rispondi SOLO con un blocco JSON valido, senza testo prima o dopo, rispettando queste regole:
- "format": "forma-lab-workout-exchange", "version": 1, e un oggetto "program".
- program: name, goal (massa|forza|ricomposizione|dimagrimento|resistenza|salute|altro), level (principiante|intermedio|avanzato), durationWeeks (1–52), daysPerWeek (1–7), days (almeno 1). Facoltativi: description, author ("ChatGPT"), recommendedWeekdays (lunedi…domenica, senza accenti), progression, phases.
- phases: { name, fromWeek, toWeek, deload (true per lo scarico), setsDelta (serie in più/meno), rpe, rir, notes }, in ordine e senza sovrapporsi.
- days: { id (minuscole e trattini, es. "giorno-1"), name, weekday, muscleGroups, notes, exercises }.
- exercises: { name (in italiano), exerciseId (solo se conosci l'identificatore FORMA LAB), nameEn, equipment, sets (1–10), reps {min,max} OPPURE durationSec {min,max}, perSide, restSec (0–600), load {value, unit: kg|lb|%1RM} solo se lo specifichi davvero, rpe (5–10), rir (0–6), group (lettera maiuscola uguale su esercizi consecutivi = superserie o giant set), warmupSets (0–5), notes, alternatives [nomi] }.
- Nessun altro campo, nessun HTML o codice nei testi.
```

## Struttura

```json
{
  "format": "forma-lab-workout-exchange",
  "version": 1,
  "generator": "ChatGPT",
  "program": { "name": "…", "goal": "massa", "level": "intermedio", "durationWeeks": 8, "daysPerWeek": 4, "days": [ … ] }
}
```

### Radice

| Campo | Tipo | Obbl. | Regole |
|---|---|---|---|
| `format` | testo | sì | Esattamente `"forma-lab-workout-exchange"` |
| `version` | intero | sì | `1`. Una versione maggiore viene rifiutata con un messaggio chiaro. |
| `program` | oggetto | sì | Vedi sotto |
| `generator` | testo | no | Chi ha prodotto il file (max 100 caratteri) |
| `exportedAt` | testo | no | Data ISO 8601 |
| `$schema` | testo | no | URL dello schema |

### `program`

| Campo | Tipo | Obbl. | Regole |
|---|---|---|---|
| `name` | testo | sì | 1–80 caratteri |
| `description` | testo | no | Max 1000 |
| `author` | testo | no | Es. `"ChatGPT"` |
| `goal` | enum | sì | `massa`, `forza`, `ricomposizione`, `dimagrimento`, `resistenza`, `salute`, `altro` |
| `level` | enum | sì | `principiante`, `intermedio`, `avanzato` |
| `durationWeeks` | intero | sì | 1–52 |
| `daysPerWeek` | intero | sì | 1–7. Se è diverso dal numero di giornate compare un avviso, non un errore. |
| `recommendedWeekdays` | elenco | no | `lunedi`, `martedi`, `mercoledi`, `giovedi`, `venerdi`, `sabato`, `domenica` (senza accenti) |
| `progression` | testo | no | Regola di progressione, max 1000 |
| `phases` | elenco di fasi | no | Max 20, in ordine, senza sovrapposizioni, entro `durationWeeks` |
| `days` | elenco di giornate | sì | 1–14 |

### `phases[]` — settimane e fasi di progressione

| Campo | Tipo | Obbl. | Regole |
|---|---|---|---|
| `name` | testo | sì | Es. "Accumulo", "Scarico" |
| `fromWeek`, `toWeek` | intero | sì | 1–52, con `fromWeek ≤ toWeek` |
| `deload` | booleano | no | `true` = settimana di scarico: l'app propone il **60%** delle serie (minimo 1) |
| `setsDelta` | intero | no | −5…+5 serie per ogni esercizio nella fase |
| `rpe` | numero | no | 5–10, obiettivo indicativo |
| `rir` | intero | no | 0–6, obiettivo indicativo |
| `notes` | testo | no | Max 500 |

### `days[]`

| Campo | Tipo | Obbl. | Regole |
|---|---|---|---|
| `id` | testo | sì | Univoco nel file: minuscole, numeri e trattini (es. `giorno-1`), max 40 |
| `name` | testo | sì | 1–80 caratteri |
| `weekday` | enum | no | Come `recommendedWeekdays` |
| `muscleGroups` | elenco di testi | no | Es. `["Petto", "Schiena"]` |
| `notes` | testo | no | Max 1000 |
| `exercises` | elenco | sì | 1–30 esercizi |

### `exercises[]`

| Campo | Tipo | Obbl. | Regole |
|---|---|---|---|
| `name` | testo | sì | **Nome italiano**, 1–100 caratteri |
| `exerciseId` | testo | no | Identificatore FORMA LAB, solo se noto (vedi tabella sotto) |
| `nameEn` | testo | no | Nome inglese, aiuta il riconoscimento |
| `equipment` | testo | no | Attrezzatura |
| `sets` | intero | sì | 1–10 serie di lavoro |
| `reps` | `{min,max}` | uno dei due | Ripetizioni, interi 1–100, `min ≤ max` |
| `durationSec` | `{min,max}` | uno dei due | Secondi (esercizi a tempo e cardio), 1–7200 |
| `perSide` | booleano | no | Ripetizioni per lato |
| `restSec` | intero | sì | 0–600 secondi |
| `load` | `{value, unit}` | no | **Solo se il programma indica davvero un carico**. `unit`: `kg`, `lb` o `%1RM` |
| `rpe` | numero | no | 5–10 |
| `rir` | intero | no | 0–6 |
| `group` | lettera | no | Una lettera maiuscola (A–Z). Esercizi **consecutivi** con la stessa lettera formano una **superserie** (2 esercizi) o un **giant set** (3 o più). Un gruppo con un solo esercizio è un errore. |
| `warmupSets` | intero | no | 0–5 serie di riscaldamento, aggiunte in seduta |
| `notes` | testo | no | Note tecniche, max 1000 |
| `alternatives` | elenco di testi | no | Max 10 nomi |

Va indicato esattamente uno tra `reps` e `durationSec`.

## Regole di validazione e sicurezza

L'app applica queste regole sul dispositivo, prima di qualsiasi salvataggio:

- **Dimensione:** massimo 512 KB per file o testo incollato.
- **Struttura:**
  - solo i campi elencati: ogni campo sconosciuto viene segnalato con il suo percorso (es. `$.program.days[0].colore`);
  - tipi e intervalli controllati campo per campo;
  - profondità massima 10, testi massimo 2000 caratteri, elenchi massimo 200 elementi.
- **Contenuti rifiutati:** markup o codice nei testi (`<script>`, `<iframe>`, `javascript:`, attributi `on…=`, `${…}`, `{{…}}`), le chiavi `__proto__`, `constructor`, `prototype` e i numeri non finiti.
- **Errori:** un file con errori **non modifica nulla**. L'elenco degli errori indica il punto esatto del file.
- **Testo di ChatGPT:** se il JSON è dentro un blocco ```` ```json ```` (come risponde spesso ChatGPT), viene estratto automaticamente.

## Riconoscimento degli esercizi

Per ogni esercizio l'app cerca nella propria libreria (oltre 900 esercizi) in quest'ordine:

1. `exerciseId` ufficiale → collegamento diretto.
2. **Nome identico**, dopo aver normalizzato maiuscole, accenti, punteggiatura e parole come "con", "al", "alla": nome italiano, nome inglese o sinonimo documentato (es. "Pulley triangolo", "Panca inclinata al Multipower").
3. Se più esercizi hanno lo stesso nome, vale quello della scheda (poi quello della libreria interna), ma solo se è uno solo. Altrimenti si chiede di **scegliere**.
4. **Varianti:** se il nome è generico (es. "Lat machine"), l'app elenca le varianti (presa prona, presa neutra…) e chiede di scegliere.
5. **Non trovato:** l'app propone esercizi simili da scegliere manualmente, oppure **Crea come esercizio mio** o **Sostituisci…**.

**Un esercizio con un nome solo simile non viene mai sostituito automaticamente.** Gli esercizi riconosciuti sono collegati alla loro pagina, ai muscoli e ai video già presenti nell'app.

## Importazione

- **Anteprima modificabile:** nome, obiettivo, durata, serie, ripetizioni, recupero, scelta delle varianti, creazione o sostituzione degli esercizi.
- **Salvataggio atomico:** l'intero programma viene scritto con un'unica operazione. Se fallisce, non resta nulla di parziale.
- **Copia di sicurezza:** prima di salvare viene creata `backup:pre-import`; subito dopo l'importazione compare **Annulla**.
- **Doppioni:** stesso contenuto (anche rinominato) o stesso nome → **Aggiorna** (con elenco delle differenze) o **Duplica**. In alternativa si può annullare.
- **Dove finisce:** cartella **"Schede create con ChatGPT"**. La scheda originale, le altre schede e lo storico delle sedute non vengono mai modificati.

## Esportazione

**Esporta scheda per ChatGPT** è disponibile:
- sulla pagina di un programma;
- su una scheda personale;
- sulla scheda originale (pulsante ↓ in Allenati).

Il file contiene solo la struttura dell'allenamento. **Non** contiene storico, carichi registrati, misure, foto, note personali sulle sedute o dati di accesso. Esportazione e reimportazione conservano serie, ripetizioni, durata, recuperi, superserie, RPE, RIR, carico indicato, riscaldamento, note, alternative e fasi (verificato da test automatico).

## CSV (alternativa semplice)

Accettato se riconducibile al modello. Requisiti:
- prima riga di intestazione;
- separatore `;` oppure `,`;
- **colonne obbligatorie:** `giorno`, `esercizio`, `serie`, `ripetizioni` (`8-12` oppure `30s` per la durata), `recupero` (secondi);
- **colonne facoltative:** `superserie` (lettera), `note`, `id_esercizio`, `rpe`, `rir`.

Il CSV non contiene fasi né metadati del programma: nell'anteprima puoi impostare nome, obiettivo e durata.

## Compatibilità e versioni

- Le versioni future aumenteranno `version`. FORMA LAB rifiuta le versioni che non conosce, invece di interpretarle male.
- I campi della v1 non cambieranno significato.
- **Excel e PDF:** non ancora supportati. Sono previsti con anteprima e correzione, senza servizi a pagamento.

## Identificatori ufficiali degli esercizi

Usarli in `exerciseId` garantisce il collegamento esatto. Il catalogo esteso (`x-…`, oltre 800 voci) si riconosce anche per nome inglese.

### Esercizi della scheda (con video)

| exerciseId | Nome italiano | Nome inglese |
|---|---|---|
| `chest-press` | Chest Press | Machine Chest Press |
| `lat-pulldown-wide` | Lat Machine presa prona | Wide-Grip Lat Pulldown |
| `incline-db-press` | Panca inclinata con manubri | Incline Dumbbell Press |
| `cable-row-v` | Pulley triangolo | Seated Cable Row (V-grip) |
| `lateral-raise` | Alzate laterali con manubri | Dumbbell Lateral Raise |
| `triceps-pushdown` | Pushdown tricipiti | Cable Triceps Pushdown |
| `db-curl` | Curl con manubri | Dumbbell Biceps Curl |
| `leg-press` | Leg Press | Leg Press |
| `db-rdl` | Stacco rumeno con manubri | Dumbbell Romanian Deadlift |
| `leg-extension` | Leg Extension | Leg Extension |
| `seated-leg-curl` | Leg Curl seduto | Seated Leg Curl |
| `calf-raise` | Calf Raise | Standing Calf Raise |
| `plank` | Plank | Forearm Plank |
| `smith-incline-press` | Panca inclinata 30° al Multipower | Smith Machine Incline Bench Press (30°) |
| `low-row-machine` | Low Row Machine | Machine Low Row |
| `pec-fly` | Pec Fly Machine | Pec Deck / Machine Fly |
| `lat-pulldown-neutral` | Lat Machine presa neutra | Neutral-Grip Lat Pulldown |
| `shoulder-press-machine` | Shoulder Press Machine | Machine Shoulder Press |
| `incline-db-curl` | Curl su panca inclinata | Incline Dumbbell Curl |
| `overhead-cable-triceps` | Estensioni tricipiti al cavo | Overhead Cable Triceps Extension |
| `hack-squat` | Hack Squat | Machine Hack Squat |
| `hip-thrust-machine` | Hip Thrust Machine | Machine Hip Thrust |
| `assisted-split-squat` | Split Squat assistito | Assisted (Supported) Split Squat |
| `lying-leg-curl` | Leg Curl | Lying (Prone) Leg Curl |
| `dead-bug` | Dead Bug | Dead Bug |

### Libreria interna (con pagina tecnica)

| exerciseId | Nome italiano | Nome inglese |
|---|---|---|
| `bench-press` | Panca piana con bilanciere | Barbell Bench Press |
| `db-bench-press` | Panca piana con manubri | Dumbbell Bench Press |
| `incline-barbell-press` | Panca inclinata con bilanciere | Incline Barbell Press |
| `cable-crossover` | Croci ai cavi | Cable Crossover |
| `push-up` | Piegamenti sulle braccia | Push-up |
| `dips` | Dip alle parallele (anche assistiti) | Dips |
| `pull-up` | Trazioni alla sbarra (anche assistite) | Pull-up |
| `barbell-row` | Rematore con bilanciere | Barbell Row |
| `db-row` | Rematore con manubrio | One-arm Dumbbell Row |
| `t-bar-row` | Rematore T-bar con appoggio | Chest-supported T-bar Row |
| `straight-arm-pulldown` | Pulldown a braccia tese | Straight-arm Pulldown |
| `face-pull` | Face pull | Face Pull |
| `back-extension` | Iperestensioni | Back Extension |
| `db-shoulder-press` | Lento avanti con manubri | Seated Dumbbell Shoulder Press |
| `rear-delt-fly` | Reverse fly (pec-deck inversa) | Reverse Pec Deck |
| `cable-lateral-raise` | Alzate laterali al cavo | Cable Lateral Raise |
| `shrug` | Scrollate | Shrug |
| `barbell-curl` | Curl con bilanciere | Barbell Curl |
| `hammer-curl` | Curl a martello | Hammer Curl |
| `preacher-curl` | Curl alla panca Scott | Preacher Curl |
| `cable-curl` | Curl al cavo | Cable Curl |
| `skull-crusher` | French press (skull crusher) | Skull Crusher |
| `cable-kickback` | Kickback tricipiti al cavo | Cable Triceps Kickback |
| `back-squat` | Squat con bilanciere | Back Squat |
| `goblet-squat` | Goblet squat | Goblet Squat |
| `bulgarian-split-squat` | Bulgarian split squat | Bulgarian Split Squat |
| `walking-lunge` | Affondi in camminata | Walking Lunge |
| `barbell-rdl` | Stacco rumeno con bilanciere | Barbell Romanian Deadlift |
| `barbell-hip-thrust` | Hip thrust con bilanciere | Barbell Hip Thrust |
| `glute-kickback` | Slanci glutei al cavo | Cable Glute Kickback |
| `hip-abduction` | Abductor machine | Hip Abduction Machine |
| `hip-adduction` | Adductor machine | Hip Adduction Machine |
| `seated-calf-raise` | Calf raise da seduto | Seated Calf Raise |
| `step-up` | Step-up | Step-up |
| `cable-crunch` | Crunch al cavo | Cable Crunch |
| `hanging-knee-raise` | Sollevamento ginocchia alla sbarra | Hanging Knee Raise |
| `side-plank` | Plank laterale | Side Plank |
| `pallof-press` | Pallof press | Pallof Press |
| `ab-wheel` | Ab wheel (ruota addominale) | Ab Wheel Rollout |
| `treadmill` | Tapis roulant | Treadmill |
| `bike` | Cyclette | Stationary Bike |
| `elliptical` | Ellittica | Elliptical |
| `rower` | Vogatore | Rowing Machine |
| `stairmaster` | Stepper / scale | Stair Climber |

