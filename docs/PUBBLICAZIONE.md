> **Senza installare nulla sul PC:** compilazione, test e pubblicazione avvengono online con GitHub Actions. Segui [PUBBLICAZIONE_ONLINE.md](PUBBLICAZIONE_ONLINE.md).

# Pubblicazione privata e installazione su iPhone

Obiettivo: aprire un indirizzo HTTPS in Safari, autenticarti, scegliere **Aggiungi alla schermata Home** e usare FORMA LAB come un’app.

> **Stato:** l’app **non è stata pubblicata**. In questo ambiente non ho un account Cloudflare né credenziali per farlo, quindi non esiste ancora un indirizzo attivo. Tutto il necessario è pronto e testato in locale nel runtime di Cloudflare (`wrangler pages dev`): segui i passi sotto.

## 0. Scegli il sistema di accesso

| | **Modalità B — passphrase + codice (più sicura)** | **Modalità C — PIN personale** | **Modalità A — Cloudflare Access** |
|---|---|---|---|
| Come accedi | Passphrase + codice a 6 cifre dall’app Password di iOS (TOTP) | Un PIN che scegli tu, uguale su tutti i dispositivi | Email + codice temporaneo inviato via email |
| Costo | Gratis | Gratis | Gratis fino a 50 utenti (piano Zero Trust Free) |
| Carta di credito | Non richiesta | Non richiesta | All’attivazione di Zero Trust Cloudflare può chiedere un metodo di pagamento anche per il piano gratuito: verificalo al momento dell’iscrizione |
| Durata accesso | 30 giorni (fino a 365) | 365 giorni | Impostata in Access |
| Dove sta la protezione | `functions/_middleware.ts`, sui server Cloudflare prima di servire qualsiasi file | Come B | Davanti al sito (Cloudflare) + verifica della firma JWT nel middleware |

In entrambi i casi l’app **non viene servita** se l’accesso non è configurato (il middleware risponde 503: “fail closed”). Nessun segreto è nel codice del browser.

## 1. Prepara il progetto (sul tuo computer)

```bash
git clone https://github.com/andrew14420100/personal-trainer.git
```

```bash
cd personal-trainer && npm ci
```

```bash
npm test && npm run build
```

## 2. Crea il progetto su Cloudflare Pages (gratuito)

1. Crea un account su <https://dash.cloudflare.com/sign-up> (piano Free).
2. Accedi da terminale:

```bash
npx wrangler login
```

```bash
npx wrangler pages project create forma-lab --production-branch main
```

Cloudflare assegna un indirizzo del tipo `https://<nome-progetto>.pages.dev`; se `forma-lab` è già preso, il nome effettivo sarà diverso. **Usa quello che stampa Wrangler.**

## 3. Configura l’accesso — Modalità B (passphrase + TOTP)

Genera i segreti (sul tuo computer, non condividerli):

```bash
npm run totp:new
```

Inseriscili come **segreti** del progetto (per Production e, se usi le anteprime, anche Preview):

```bash
npx wrangler pages secret put AUTH_MODE --project-name forma-lab
```

(valore `totp`), poi allo stesso modo `AUTH_PASSWORD`, `AUTH_TOTP_SECRET`, `AUTH_SESSION_SECRET` e, facoltativa, `AUTH_SESSION_DAYS` (1–90, predefinito 30). In alternativa: dashboard → Workers & Pages → forma-lab → Settings → Variables and Secrets.

Sull’iPhone aggiungi il codice di verifica: **Impostazioni → Password → (+) nuovo elemento** per il dominio `.pages.dev` del progetto → **Imposta codice di verifica → Inserisci chiave di configurazione** → incolla `AUTH_TOTP_SECRET`. Salva anche la passphrase nello stesso elemento: Safari proporrà passphrase e codice in automatico.

## 3-ter. Configura l’accesso — Modalità C (PIN personale, valido su tutti i dispositivi)

Scegli tu un PIN definitivo: lo inserisci una volta su ogni dispositivo (iPhone, PC, tablet) e la sessione resta valida per 365 giorni.

```bash
npx wrangler pages secret put AUTH_PIN --project-name forma-lab
```

(scrivi il tuo PIN: **almeno 6 caratteri**; con meno di 6 l’app non viene servita). Poi imposta la modalità:

```bash
npx wrangler pages secret put AUTH_MODE --project-name forma-lab
```

(valore `pin`). `AUTH_SESSION_SECRET` resta necessario (già impostato al passo 3). Ripubblica con `npm run deploy`: i segreti valgono solo dal deployment successivo.

- **Cambiare il PIN**: ripeti il primo comando e ripubblica. Tutti i dispositivi vengono disconnessi e dovranno usare il nuovo PIN (utile se perdi un telefono).
- Safari propone di salvare il PIN nel Portachiavi iCloud: così lo ritrovi su tutti i tuoi dispositivi Apple.
- **Sicurezza**: un PIN è più debole di passphrase + codice temporaneo. Il server non contiene i tuoi dati di allenamento (sono solo sui dispositivi), ma usa preferibilmente 8 o più caratteri, anche lettere, e attiva la regola di rate limiting gratuita descritta al passo 5.

## 3-bis. Configura l’accesso — Modalità A (Cloudflare Access)

1. Dashboard → **Zero Trust** → scegli il piano Free.
2. Access → Applications → **Add an application → Self-hosted**. Dominio: quello `.pages.dev` del progetto, e aggiungi anche `*.<nome-progetto>.pages.dev` per proteggere le anteprime.
3. Policy: **Allow**, Include → **Emails** → la tua email. Metodo di login: **One-time PIN**.
4. Copia l’**Application Audience (AUD) Tag** e il **team domain** (`<team>.cloudflareaccess.com`).
5. Segreti del progetto Pages: `AUTH_MODE=access`, `AUTH_ACCESS_TEAM_DOMAIN=<team>.cloudflareaccess.com`, `AUTH_ACCESS_AUD=<tag>`.

Il middleware verifica la firma RS256 del token di Access: se Access venisse rimosso per errore, l’app risponde 403 invece di aprirsi.

## 4. Pubblica

```bash
npm run deploy
```

Wrangler carica `dist/` e la cartella `functions/` e stampa l’URL. In alternativa puoi collegare il repository GitHub dal dashboard (Workers & Pages → Create → Pages → Connect to Git) con: build command `npm run build`, output `dist`, variabile `NODE_VERSION=22`.

## 5. Controlli prima dell’uso (privacy)

Da un browser **non** autenticato (finestra privata):

- [ ] `https://<progetto>.pages.dev/` reindirizza a `/__auth/login` (o alla pagina di Cloudflare Access).
- [ ] `https://<progetto>.pages.dev/assets/` di qualsiasi file JS restituisce 401/403, non il codice.
- [ ] Solo `manifest.webmanifest`, `/icons/*` e `robots.txt` sono pubblici (servono a iOS per l’icona; non contengono dati).
- [ ] Gli header includono `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`.
- [ ] Una passphrase o un codice errati vengono rifiutati; dopo 5 tentativi errati compare “Troppi tentativi”.

Consigliato (gratuito): una regola di **Rate limiting** in Security → WAF sul percorso `/__auth/login`, perché il limite interno è per singola istanza.

## 6. Installa su iPhone

1. Apri l’URL in **Safari** e accedi.
2. Tocca **Condividi** (quadrato con la freccia) → **Aggiungi alla schermata Home** → **Aggiungi**.
3. Apri FORMA LAB **dall’icona**. iOS tiene separati cookie e dati dell’app installata da quelli di Safari: ti verrà chiesto di accedere una volta anche lì. Da quel momento registra gli allenamenti sempre dall’icona.
4. Al primo avvio online l’app si salva per l’uso offline (compare “Pronta per l’uso offline”).

Quando la sessione di accesso scade (30 giorni predefiniti), online ti verrà richiesto di accedere di nuovo; offline l’app continua a funzionare con i dati locali.

## Aggiornamenti

Pubblica di nuovo con `npm run deploy`. All’apertura successiva l’app mostra “Nuova versione disponibile → Aggiorna”. I dati locali non vengono toccati.

## Schermata nera / “L’app non si è avviata”

La pagina arriva ma il JavaScript dell’app no. Quasi sempre è stato pubblicato il **codice sorgente** (cartella del repository o ZIP) invece della **build** `dist/`: in quel caso il browser riceve `/src/main.tsx`, che non può eseguire.

**Se hai collegato GitHub** (Workers & Pages → forma-lab → Settings → Build):

| Campo | Valore |
|---|---|
| Framework preset | `None` (oppure `Vite`) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | vuoto (radice del repository) |
| Variabile d’ambiente | `NODE_VERSION` = `22` |

Poi Deployments → **Retry deployment** e controlla nel log che compaiano `✓ built` e `precache … entries`.

**Non usare il caricamento manuale (“Upload assets”, trascinare una cartella o lo ZIP)**: oltre a non compilare l’app, non pubblica la cartella `functions/`, quindi il sito sarebbe **senza protezione di accesso**. Usa il collegamento GitHub oppure `npm run deploy` dal tuo computer.

Verifica rapida: aprendo l’indirizzo in una finestra privata devi vedere la pagina **“Accesso privato”** (o quella di Cloudflare Access). Se vedi direttamente l’app o la schermata nera senza login, `functions/` non è stata pubblicata.

Se compare “Accesso non configurato” (errore 503) mancano i segreti del passo 3: dopo averli aggiunti serve un nuovo deployment.

## Aggiornare a FORMA LAB 3.0

Il progetto Cloudflare e i segreti (PIN) restano gli stessi: basta ripubblicare dalla cartella del progetto.

```bash
git pull
```

```bash
npm ci && npm run deploy
```

All’apertura successiva l’app mostra “Nuova versione disponibile → Aggiorna”. I dati restano sul dispositivo; il database locale passa alla versione 2 (aggiunge l’archivio dei video personali) senza perdere nulla.

## FORMA LAB 4.0: prima l'anteprima, poi la produzione

Il sito pubblicato (`forma-lab.pages.dev`) **non è stato toccato**. La 4.0 è sul ramo `claude/forma-lab-2-rebuild-qsdfkt`. Procedi così.

**1. Esporta un backup dalla versione attuale.** Apri l'app che usi oggi → Profilo → Esporta tutti i dati, e salva il file.

**2. Pubblica un'anteprima separata.** È protetta dallo stesso PIN, ma ha un indirizzo diverso:

```bash
git fetch origin claude/forma-lab-2-rebuild-qsdfkt && git checkout claude/forma-lab-2-rebuild-qsdfkt
```

```bash
npm ci && npm run build
```

```bash
npx wrangler pages deploy dist --project-name forma-lab --branch preview-4
```

L'anteprima sarà su `https://preview-4.forma-lab.pages.dev`.
- I segreti di "Preview" sono separati da quelli di "Production". Se l'anteprima risponde "Accesso non configurato", aggiungi `AUTH_MODE`, `AUTH_PIN` e `AUTH_SESSION_SECRET` anche in Settings → Variables and Secrets → **Preview**.
- Se hai collegato GitHub, Cloudflare crea l'anteprima da sola a ogni push sul ramo.

**3. Prova l'anteprima.** È un indirizzo diverso, quindi parte **senza i tuoi dati**: puoi importare il backup del passo 1 (Profilo → Importa).

**4. Solo dopo la tua approvazione:** unisci il ramo nel ramo di produzione oppure esegui `npm run deploy`. All'apertura dell'app compare "Nuova versione disponibile → Aggiorna". Al primo avvio la 4.0 salva una copia verificata dei dati esistenti (vedi [MIGRAZIONE_4.0.md](MIGRAZIONE_4.0.md)); non converte né cancella nulla.
