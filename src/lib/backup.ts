// Export / import of all personal data. Optional end-to-end encryption with a passphrase
// (AES-GCM 256, key derived with PBKDF2-SHA-256, 310 000 iterations). The passphrase never leaves
// the device and is not stored anywhere: if you lose it, the encrypted backup cannot be opened.
import type { Snapshot } from './db';

export const BACKUP_APP = 'forma-lab';
export const BACKUP_VERSION = 1;
const ITERATIONS = 310_000;

export interface PlainBackup extends Snapshot {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
}

export interface EncryptedBackup {
  app: typeof BACKUP_APP;
  version: number;
  encrypted: true;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  data: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export function makeBackup(snap: Snapshot, now = new Date()): PlainBackup {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), ...snap };
}

export async function encryptBackup(backup: PlainBackup, passphrase: string): Promise<EncryptedBackup> {
  if (passphrase.length < 8) throw new Error('La passphrase deve avere almeno 8 caratteri.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(backup))));
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    encrypted: true,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: b64(salt) },
    cipher: { name: 'AES-GCM', iv: b64(iv) },
    data: b64(ct),
  };
}

export function isEncrypted(x: unknown): x is EncryptedBackup {
  return !!x && typeof x === 'object' && (x as EncryptedBackup).encrypted === true;
}

export async function decryptBackup(e: EncryptedBackup, passphrase: string): Promise<PlainBackup> {
  const key = await deriveKey(passphrase, unb64(e.kdf.salt), e.kdf.iterations);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(e.cipher.iv) }, key, unb64(e.data));
  } catch {
    throw new Error('Passphrase errata o file danneggiato.');
  }
  return validateBackup(JSON.parse(dec.decode(plain)));
}

/** Structural validation of an imported (decrypted) backup. Throws with an Italian message. */
export function validateBackup(x: unknown): PlainBackup {
  if (!x || typeof x !== 'object') throw new Error('File non valido.');
  const b = x as PlainBackup;
  if (b.app !== BACKUP_APP) throw new Error('Questo file non è un backup di FORMA LAB.');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) throw new Error('Versione del backup non supportata.');
  if (!Array.isArray(b.sessions) || !Array.isArray(b.measurements) || !Array.isArray(b.kv)) throw new Error('Backup incompleto.');
  for (const s of b.sessions) {
    if (typeof s?.id !== 'string' || typeof s.startedAt !== 'number' || !Array.isArray(s.exercises)) throw new Error('Sessione non valida nel backup.');
  }
  for (const k of b.kv) if (typeof k?.key !== 'string') throw new Error('Impostazione non valida nel backup.');
  for (const m of b.measurements) if (typeof m?.id !== 'string' || typeof m.date !== 'string') throw new Error('Misurazione non valida nel backup.');
  return b;
}

export function backupFileName(encrypted: boolean, now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `forma-lab-backup-${d}${encrypted ? '.cifrato' : ''}.json`;
}

/** Share (iOS share sheet → "Salva su File") when available, otherwise download. */
export async function deliverFile(name: string, content: string | Blob, type = 'application/json'): Promise<'shared' | 'downloaded'> {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const file = typeof File !== 'undefined' ? new File([blob], name, { type: blob.type || type }) : null;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (file && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') throw new Error('Condivisione annullata.');
      // fall back to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
