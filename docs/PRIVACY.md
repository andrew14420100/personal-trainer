# Privacy, dati e backup

## Dove sono salvati i dati

| Dato | Dove | Chi lo vede |
|---|---|---|
| Allenamenti, serie, carichi, note, RPE, misure, preferiti, impostazioni, approvazioni video | **IndexedDB del browser, sul tuo iPhone**, nell’archivio dell’app installata (diverso da quello di Safari) | Solo tu, sul dispositivo |
| Timer di recupero in corso | `localStorage` dello stesso archivio | Solo tu |
| Codice dell’app, foto, font | Cloudflare Pages (protetto da autenticazione) e cache del service worker sul dispositivo | Nessun dato personale |
| Segreti di accesso | Variabili cifrate di Cloudflare (lato server) | Non arrivano mai al browser |

**Nessun server riceve i tuoi dati di allenamento.** Di conseguenza **non c’è sincronizzazione automatica** tra iPhone e PC: per spostare i dati usa esporta/importa.

iOS cifra i dati dell’app con la protezione dati del dispositivo quando l’iPhone è bloccato. Una cifratura aggiuntiva dentro l’app non aumenterebbe la sicurezza in modo significativo (la chiave dovrebbe stare sullo stesso dispositivo), quindi la cifratura è applicata dove serve davvero: ai **file di backup** che escono dal telefono.

## Servizi esterni

- **YouTube** (modalità privacy avanzata `youtube-nocookie.com`): contattato **solo quando premi play** su un video. Le miniature dei video vengono caricate da `i.ytimg.com`.
- Nessun’altra terza parte: niente analytics, pubblicità, tracciamento, font esterni, CDN.
- Header: `Referrer-Policy: same-origin` (nessun referrer inviato a siti esterni), CSP restrittiva, `X-Robots-Tag: noindex`.

## Accesso

Vedi [PUBBLICAZIONE.md](PUBBLICAZIONE.md). Il controllo avviene sui server Cloudflare prima che qualsiasi file venga servito; la sessione è un cookie `__Host-` firmato (HMAC-SHA256), `HttpOnly`, `Secure`, `SameSite=Lax`. Codici TOTP monouso, confronto a tempo costante, limite di tentativi, protezione CSRF sul form di accesso. Nessun PIN o segreto nel JavaScript.

## Backup consigliato (gratuito)

1. Profilo → I tuoi dati → **Cifra con passphrase** (attivo per impostazione predefinita) → **Esporta tutti i dati**.
2. Nel foglio di condivisione scegli **Salva su File** → iCloud Drive (o un’altra posizione).
3. Ripeti una volta a settimana. Il file cifrato (AES-256-GCM, chiave derivata con PBKDF2-SHA-256 a 310 000 iterazioni) può stare anche su un cloud di terze parti.
4. Senza la passphrase il backup non è recuperabile: conservala nel portachiavi.

Ripristino: Profilo → Importa backup → scegli il file → **Unisci** (aggiunge) o **Sostituisci tutto**.

## Cancellazione

Profilo → **Cancella tutti i dati personali** elimina sessioni, misure, note, preferiti e impostazioni da questo dispositivo. Rimuovendo l’icona dalla schermata Home iOS elimina anche l’archivio dell’app. Per chiudere l’accesso: Profilo → **Esci**.

## Rischi residui dichiarati

- Se iOS libera spazio o l’app viene rimossa, i dati non salvati in un backup vanno persi.
- Il limite di tentativi di accesso è per singola istanza Cloudflare: aggiungi la regola WAF consigliata.
- Chi ha accesso fisico al tuo iPhone sbloccato vede i dati dell’app.
