# Migrazione dei dati alla 4.0

## Strategia

Il formato del database locale **non cambia** rispetto alla 3.0:

- database IndexedDB `forma-lab`, versione 2;
- archivi `sessions`, `measurements`, `kv` e `media`.

Per questo non serve convertire nulla, e nessun record esistente viene modificato o cancellato.

Al primo avvio della 4.0 (`src/lib/migration.ts`, `ensureMigration()`) l'app esegue questi passi:

1. Legge `appDataVersion`. Se vale già 4, non fa nulla (l'operazione è idempotente).
2. Fa una fotografia completa dei dati: sessioni, misure, impostazioni.
3. **Verifica l'integrità della copia**:
   - stessi conteggi;
   - stessi identificativi delle sessioni, nello stesso ordine;
   - ogni sessione leggibile, con l'elenco degli esercizi.

   Se la verifica fallisce, la migrazione si ferma e non segna nulla come migrato.
4. Salva la copia nel database stesso, alla chiave `backup:pre-4.0`. Una copia già presente non viene mai sovrascritta, nemmeno dopo il ripristino di un vecchio backup.
5. Scrive il rapporto `migration:4.0` (conteggi, esito della verifica, data) e imposta `appDataVersion = 4`.

## Campi nuovi, tutti facoltativi

| Dove | Campo | Effetto |
|---|---|---|
| Sessione | `pausedAt`, `pausedMs` | Pausa dell'allenamento. Le sessioni vecchie non hanno questi campi e valgono 0. |
| Impostazioni | `moves` | Sedute spostate nel calendario. Il valore predefinito è `{}`, unito alle impostazioni esistenti. |

Le vecchie sessioni restano compatibili senza conversioni.

Anche gli indirizzi della 3.0 continuano a funzionare: `#/scheda`, `#/impostazioni`, `#/riepilogo/…` e `#/video` portano alle nuove schermate.

## Dove la trovi

Profilo → I tuoi dati → **Dati della versione precedente**. Da lì puoi:

- **esportare la copia pre-4.0** come file JSON (lo stesso formato dei backup, importabile);
- **ripristinarla in unione**: gli elementi mancanti tornano, quelli con lo stesso identificativo riprendono la versione della copia.

## Verifiche eseguite

**Test unitario** (`tests/unit/storage.test.ts`):
- copia identica;
- nessun record modificato;
- seconda esecuzione senza effetti.

**Test end-to-end** (`tests/e2e/run.mjs`): crea un database nel formato 3.0 (sessione, misura, impostazioni con nome e nota) e poi apre la 4.0. Controlla che:
- il rapporto risulti verificato;
- la copia contenga la sessione;
- nome, nota dell'esercizio, ultimo carico e riepilogo della seduta siano visibili e invariati;
- un ricaricamento non sovrascriva la copia.

**Prima di aggiornare il sito pubblicato:** esporta comunque un backup dalla 3.0, dal Profilo dell'app che usi oggi. È la garanzia più semplice.

**Limite:** i dati sono legati al dispositivo e all'indirizzo. La 4.0 vede i dati della 3.0 solo se è pubblicata **sullo stesso indirizzo** (`forma-lab.pages.dev`). Un'anteprima su un indirizzo diverso (`preview-4.forma-lab.pages.dev`) parte vuota: puoi importare lì un backup per provarla.
