// Generates the secrets for FORMA LAB's built-in access control (mode "totp").
// Run it on YOUR computer, never commit the output. Usage: npm run totp:new
import { randomBytes } from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(buf) {
  let bits = 0, value = 0, out = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
const words = randomBytes(18).toString('base64url'); // ~144 bit passphrase
const totp = base32(randomBytes(20)); // 160-bit TOTP secret (RFC 4226 recommendation)
const session = randomBytes(48).toString('base64url');
const uri = `otpauth://totp/FORMA%20LAB:personale?secret=${totp}&issuer=FORMA%20LAB&algorithm=SHA1&digits=6&period=30`;

console.log(`
FORMA LAB — segreti per l'accesso privato (NON condividerli, NON metterli nel repository)
────────────────────────────────────────────────────────────────────────────────
Variabili da impostare in Cloudflare Pages → Settings → Variables and Secrets
(tipo "Secret", ambiente Production):

  AUTH_MODE            = totp            (può essere una variabile normale)
  AUTH_PASSWORD        = ${words}
  AUTH_TOTP_SECRET     = ${totp}
  AUTH_SESSION_SECRET  = ${session}
  AUTH_SESSION_DAYS    = 30              (facoltativa, 1–90)

Codice temporaneo sull'iPhone (app Password di iOS 17+, oppure qualsiasi app TOTP):
  Impostazioni → Password → (nuovo elemento per il tuo dominio) → "Imposta codice di verifica"
  → "Inserisci chiave di configurazione" e incolla:  ${totp}
  oppure usa questo URI (es. in un generatore di QR offline):
  ${uri}

Salva la passphrase nel portachiavi/gestore password.
`);
