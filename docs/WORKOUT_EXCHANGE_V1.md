# FORMA LAB Workout Exchange v1

Formato JSON locale per scambiare **programmi di allenamento** fra ChatGPT e FORMA LAB, senza API e senza invio di dati personali a servizi esterni.

## Esempio pronto

Aprire [Scheda Upper/Lower, quattro giorni](Scheda_Upper_Lower_4_giorni_CHATGPT.json), poi usare il pulsante **Download raw file** di GitHub o copiare il testo.

Nella nuova interfaccia: **Allenamenti → Importa scheda → seleziona JSON / incolla JSON → Controlla → Conferma e importa**.

**Non usare "Importa backup"** per questo formato: è un tipo di file diverso.

## Struttura

```json
{
  "format": "forma-lab-workout-exchange",
  "version": 1,
  "program": {
    "id": "programma-univoco",
    "title": "Massa muscolare 4 giorni",
    "author": "ChatGPT",
    "folder": "Schede create con ChatGPT",
    "durationWeeks": 8,
    "objective": "Ipertrofia",
    "level": "Intermedio"
  },
  "days": [
    {
      "id": "upper-a",
      "name": "Petto e schiena",
      "weekday": 1,
      "weekdayLabel": "Lunedì",
      "exercises": [
        {
          "exerciseId": "chest-press",
          "exerciseName": "Chest Press",
          "sets": 3,
          "repetitions": { "min": 8, "max": 12, "unit": "reps" },
          "restSeconds": 90,
          "perSide": false,
          "notes": "Movimento controllato"
        }
      ]
    }
  ]
}
```

## Requisiti e limiti

- Il campo `format` deve essere esattamente `forma-lab-workout-exchange`; la versione è `1`.
- `program.id`, `program.title`, `program.author`, `days[].id`, `days[].name`, `exerciseName`, `sets`, `repetitions` sono obbligatori.
- `repetitions.unit` può essere `reps`, `seconds`, `minutes`. Limiti: 1–20 serie, 1–3600 ripetizioni/secondi/minuti per intervallo e min <= max.
- Massimo 14 giornate, 50 esercizi per giornata, file JSON fino a 256 KB; `weekday` opzionale 0–6.
- `exerciseId` permette corrispondenza esatta con il catalogo. In alternativa, il programma confronta i nomi italiano/inglese normalizzati. Un nome sconosciuto o ambiguo deve essere associato manualmente, **mai indovinato**.
- Ogni giornata viene aggiunta come **nuova routine** nella cartella indicata. Le quattro giornate originali, i risultati e gli allenamenti passati non vengono sovrascritti.
- Importazioni ripetute creano copie nuove, con avviso.
- `durationWeeks`, `objective`, `level`, `notes`, `focus` sono metadati che servono alla visualizzazione o a versioni successive. **Questa prima patch non applica cicli da 8 settimane al calendario**.
- `notes` sugli esercizi non viene ancora conservato dentro `RoutineItem` (che non ha un campo dedicato); il campo si preserva nel JSON durante il parsing ma si perde nella conversione a routine. Da ampliare in futuro.
- Non vengono copiati né scaricati video di terzi: gli esercizi associati usano i contenuti già disponibili nella libreria.
- Le schede vengono salvate localmente nel database dell'app; i dati di allenamento esistenti restano separati.

## Integrazione tecnica

File nuovi:
- `src/lib/workoutExchange.ts`: parser con lista esplicita di proprietà, matching e conversione.
- `src/v4/ImportExchange.tsx`: selezione file, incolla, anteprima, mapping, import/export.
- `tests/unit/workoutExchange.test.ts`: verifiche automatiche.

File modificato:
- `src/v4/Plan.tsx`: aggiunta dei pulsanti nella sezione “Le mie schede”.

**Test da completare prima del merge:** build TypeScript/Vite, unit test e test end-to-end su browser mobile; prova reale sul Suo iPhone. La presenza del codice non equivale a dire che il deployment sia già funzionante.

## Istruzione per ChatGPT

“Crea una scheda nel formato FORMA LAB Workout Exchange v1 seguendo `docs/WORKOUT_EXCHANGE_V1.md`. Restituisci un JSON con tutte le giornate, nomi in italiano, serie, range ripetizioni, unità e recuperi. Mantieni gli ID degli esercizi della libreria quando sono noti; non inventare identificatori.”
