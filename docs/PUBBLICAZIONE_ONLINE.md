# Pubblicazione online, senza installare nulla sul PC

Tutto avviene sui server di GitHub e di Cloudflare. Sul tuo computer servono solo il **browser** e l'accesso a github.com e dash.cloudflare.com: niente Node.js, npm, Git o PowerShell.

## Come funziona

| Workflow (GitHub → Actions) | Quando parte | Cosa fa |
|---|---|---|
| **CI** | Ad ogni modifica su `main` e ad ogni pull request | Node 22 → `npm ci` → `npm run build` → test unitari → test end-to-end (iPhone 14 Pro, iPhone SE, desktop). Non pubblica niente. |
| **Pubblica anteprima** | Ad ogni modifica su un ramo diverso da `main`, oppure a mano | Stessa compilazione e stessi test. Poi pubblica `dist` + Pages Functions su **un'anteprima protetta** (`https://anteprima.forma-lab.pages.dev`) e verifica che senza PIN il sito sia chiuso. **Non tocca mai la produzione**: si ferma da solo se il nome dell'anteprima coincide con il ramo di produzione. |
| **Pubblica in produzione** | **Solo a mano** | Chiede di scrivere `PUBBLICA`, aspetta **la tua approvazione** e ricompila e ritesta tutto. Poi pubblica sul sito principale `forma-lab.pages.dev` e verifica che sia privato e funzionante. |

**Garanzie di sicurezza**

- **Segreti di autenticazione:** la pubblicazione avviene da una cartella che contiene solo `dist` e `functions`, senza `wrangler.toml`. Così la configurazione del progetto Cloudflare (variabili e segreti `AUTH_*`) **non viene mai letta, modificata o cancellata**. I workflow usano l'API Cloudflare solo in lettura, per conoscere il ramo di produzione.
- **Dati degli allenamenti:** sono nel browser di ogni dispositivo, non su Cloudflare, quindi nessuna pubblicazione li cancella. La produzione resta sullo stesso indirizzo e la 4.1 al primo avvio salva una copia verificata dei dati precedenti. L'anteprima ha un indirizzo diverso: parte vuota e non vede né modifica i dati del sito principale.
- **Accesso privato:** le Pages Functions (`functions/_middleware.ts`) vengono pubblicate insieme a `dist`. Se nell'ambiente non ci sono i segreti di accesso, il sito resta chiuso (errore 503 "Accesso non configurato") e non serve mai l'app.
- **Repository pubblico:** il codice è visibile a tutti, ma non contiene segreti. I segreti stanno solo in GitHub Actions Secrets e nella configurazione Cloudflare, e i log dei workflow non li stampano mai.

---

## Passo 1 — Crea il token Cloudflare (una volta sola)

1. Apri **dash.cloudflare.com** → icona del profilo in alto a destra → **My Profile** → **API Tokens** → **Create Token**.
2. In fondo scegli **Custom token** → **Get started**.
3. **Token name:** `GitHub Actions forma-lab`.
4. **Permissions:** `Account` → `Cloudflare Pages` → `Edit`. È l'unico permesso necessario.
5. **Account Resources:** `Include` → il tuo account.
6. (Facoltativo) **TTL:** una data di scadenza, per esempio tra un anno.
7. **Continue to summary** → **Create Token**. Copia il token: compare una sola volta.
   - **Non incollarlo in chat** e non salvarlo in file: va solo nel passo 3.

## Passo 2 — Trova l'Account ID

In Cloudflare apri **Workers & Pages**: l'**Account ID** (32 caratteri) è nella colonna di destra, sotto *Account details*. Lo trovi anche nell'indirizzo della dashboard: `dash.cloudflare.com/<ACCOUNT_ID>/…`.

## Passo 3 — Inserisci i segreti in GitHub (solo lì)

1. Apri **github.com/andrew14420100/personal-trainer** → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**:
   - Name `CLOUDFLARE_API_TOKEN`, Secret: il token del passo 1 → **Add secret**.
3. **New repository secret**:
   - Name `CLOUDFLARE_ACCOUNT_ID`, Secret: l'ID del passo 2 → **Add secret**.
4. (Facoltativo) **New repository secret**:
   - Name `FORMA_LAB_PIN`, Secret: il tuo PIN.
   - Serve solo per far verificare automaticamente anche **il funzionamento dopo il login** (accesso, caricamento dell'app, service worker, logout).
   - Senza questo segreto viene verificato solo che il sito sia chiuso senza PIN; il funzionamento lo controlli tu aprendo l'indirizzo.

GitHub cifra i segreti: dopo averli salvati nessuno può rileggerli, nemmeno tu. Puoi solo sostituirli.

## Passo 4 — Proteggi la produzione con la tua approvazione

1. Nel repository: **Settings** → **Environments** → **New environment** → nome `production` → **Configure environment**.
2. Spunta **Required reviewers**, aggiungi **andrew14420100** → **Save protection rules**.
3. (Consigliato) Lascia disattivata **Allow administrators to bypass configured protection rules**.

Da ora ogni pubblicazione in produzione si ferma su "Waiting for review" finché non premi **Approve and deploy**.

## Passo 5 — Abilita l'accesso all'anteprima (facoltativo ma consigliato)

Su Cloudflare i segreti di *Production* e di *Preview* sono separati. Questo passo **aggiunge** quelli dell'anteprima e non tocca quelli di produzione.

1. Cloudflare → **Workers & Pages** → **forma-lab** → **Settings** → **Variables and Secrets**.
2. Se c'è la scelta dell'ambiente, seleziona **Preview** (non Production).
3. Aggiungi tre valori, di tipo **Secret** (cifrato):
   - `AUTH_MODE` = `pin`
   - `AUTH_PIN` = il tuo PIN (anche lo stesso della produzione)
   - `AUTH_SESSION_SECRET` = una frase casuale di almeno 32 caratteri
4. Salva.

Senza questo passo l'anteprima viene pubblicata lo stesso ma resta **chiusa per tutti** ("Accesso non configurato"). È sicuro, ma non puoi provarla.

## Passo 6 — Pubblica l'anteprima e provala

1. GitHub → **Actions** → **Pubblica anteprima** → **Run workflow**.
2. **Branch:** `claude/forma-lab-2-rebuild-qsdfkt`; nome: `anteprima`.
3. **Run workflow**. In 6–10 minuti l'app viene compilata, testata, pubblicata e verificata.
4. Nella pagina del run, la sezione **Riepilogo** mostra gli indirizzi. Apri **https://anteprima.forma-lab.pages.dev** dal telefono, accedi con il PIN e prova.
   - L'anteprima è vuota perché ha un indirizzo diverso. Per provarla con i tuoi dati: sul sito principale Profilo → Esporta tutti i dati, poi sull'anteprima Profilo → Importa.

Il workflow parte da solo anche ad ogni nuova modifica sul ramo.

## Passo 7 — Pubblica in produzione (solo quando approvi)

1. GitHub → **Actions** → **Pubblica in produzione** → **Run workflow**.
2. **Branch:** `claude/forma-lab-2-rebuild-qsdfkt`, cioè la versione che hai provato in anteprima.
3. Nel campo di conferma scrivi `PUBBLICA` → **Run workflow**.
4. Dopo compilazione e test il run si ferma su **Waiting for review** → **Review deployments** → spunta `production` → **Approve and deploy**.
5. Al termine controlla che la verifica sia verde: sito chiuso senza PIN e, con il segreto facoltativo, app funzionante dopo il login.
6. Sul telefono apri FORMA LAB: comparirà "Nuova versione disponibile → Aggiorna". I tuoi allenamenti restano dove sono.

**Tornare indietro:** Cloudflare → Workers & Pages → forma-lab → **Deployments** → deployment precedente → **⋯** → **Rollback to this deployment**.

## Aggiornamenti futuri

Ogni modifica, fatta da Claude o dall'editor web di GitHub (tasto `.` o la matita su un file), arriva su un ramo. Il resto è automatico:

1. **Pubblica anteprima** compila, testa e pubblica l'anteprima.
2. Tu la provi.
3. Avvii **Pubblica in produzione** e approvi.

## Se qualcosa va storto

| Messaggio | Soluzione |
|---|---|
| "Segreti mancanti" (avviso giallo) | Mancano i segreti del passo 3: compilazione e test sono stati fatti, la pubblicazione è stata saltata. |
| "Il token Cloudflare non ha accesso" | Ricrea il token con il permesso **Account → Cloudflare Pages → Edit** sull'account giusto. |
| "Progetto Pages forma-lab non trovato" | L'Account ID è di un altro account. |
| **Progetto collegato a Git**: l'avviso dice che il progetto è collegato a GitHub e Cloudflare rifiuta il caricamento | In questo caso è Cloudflare a compilare da solo a ogni push. Controlla in Settings → Builds: comando `npm run build`, cartella `dist`, variabile `NODE_VERSION=22`. In "Branch control" il ramo di produzione deve essere `main` e le anteprime attive per gli altri rami. La produzione si aggiorna solo quando il codice arriva su `main`, cioè quando unisci la pull request: anche quella è un'approvazione esplicita dal browser. |
| Test falliti | Nella pagina del run, scarica **schermate-test** per vedere le schermate. Niente viene pubblicato se un test fallisce. |
| La verifica finale fallisce in produzione | Fai subito il Rollback (vedi sopra) e scrivimi l'errore mostrato nel run. |
