// IndexedDB storage. All personal data stays on this device, inside the browser storage of the
// origin where FORMA LAB is installed (Safari keeps a separate storage for the Home Screen app).
// No server receives training data.

import type { DayId } from '../data/types';

export const DB_NAME = 'forma-lab';
export const DB_VERSION = 2;

export interface SetLog {
  /** kg; null when not entered. For body-weight exercises it is the extra load (0 = body weight only). */
  weight: number | null;
  /** Repetitions (or seconds for time-based exercises). */
  reps: number | null;
  done: boolean;
  completedAt?: number;
  /** Set type (4.1): undefined = normal work set. Warm-up sets are excluded from statistics. */
  type?: SetType;
  /** Optional RPE of the single set (6–10). */
  rpe?: number | null;
  /** Optional reps in reserve of the single set (5.0). */
  rir?: number | null;
  /** Cardio (4.1): distance in km and calories read from the machine. reps = minutes. */
  distanceKm?: number | null;
  kcal?: number | null;
}

export type SetType = 'warmup' | 'drop' | 'failure' | 'partial';

export type Technique = 'buona' | 'discreta' | 'da migliorare';

export interface ExerciseLog {
  slotId: string;
  exerciseId: string;
  targetSets: number;
  repsMin: number;
  repsMax: number;
  unit: 'reps' | 'sec' | 'min';
  perSide: boolean;
  sets: SetLog[];
  note: string;
  technique?: Technique;
  /** Reps in reserve declared on the last set (0 = failure). */
  rir?: number | null;
  /** Superset group letter (4.1): consecutive exercises with the same letter alternate. */
  group?: string;
  /** Rest for this exercise in this session (s), overrides the default. */
  restSec?: number;
}

export interface Session {
  id: string;
  /** Plan day ('upper-a'…), custom routine ('r:<id>') or free workout ('free'). */
  dayId: DayId | `r:${string}` | 'free';
  /** Name shown for custom routines / free workouts (stored at start, survives routine deletion). */
  title?: string;
  startedAt: number;
  endedAt?: number;
  status: 'active' | 'completed';
  calibration: boolean;
  currentIndex: number;
  exercises: ExerciseLog[];
  /** Session RPE 1–10 (perceived difficulty). */
  rpe?: number | null;
  note?: string;
  /** Pause support (4.0): when the session was paused, and total paused time in ms. */
  pausedAt?: number | null;
  pausedMs?: number;
}

export interface Measurement {
  id: string;
  date: string; // yyyy-mm-dd
  bodyWeight?: number | null;
  waist?: number | null;
  chest?: number | null;
  arm?: number | null;
  thigh?: number | null;
  hips?: number | null;
  /** Body fat % if known (4.1). */
  bodyFat?: number | null;
  note?: string;
}

export interface KV<T = unknown> {
  key: string;
  value: T;
}

type StoreName = 'sessions' | 'measurements' | 'kv' | 'media';

let dbPromise: Promise<IDBDatabase> | null = null;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === 'undefined') return channel;
  channel = new BroadcastChannel('forma-lab-db');
  channel.onmessage = () => listeners.forEach((l) => l());
  return channel;
}

/** Subscribe to any data change (this tab and other tabs of the same app). */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  getChannel();
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((l) => l());
  getChannel()?.postMessage('change');
}

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB non disponibile in questo browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id' });
        s.createIndex('startedAt', 'startedAt');
        s.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains('measurements')) {
        db.createObjectStore('measurements', { keyPath: 'id' }).createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
      // v2: the user's own exercise videos (Blob) with their red/green annotations
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Database bloccato da un’altra scheda aperta.'));
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result: T | undefined;
    const r = fn(s);
    if (r) r.onsuccess = () => (result = r.result);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('Transazione annullata'));
  });
}

// ── Generic helpers ─────────────────────────────────────────────────────────

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return reqToPromise(db.transaction(store).objectStore(store).getAll() as IDBRequest<T[]>);
}

export async function put<T>(store: StoreName, value: T): Promise<void> {
  await tx(store, 'readwrite', (s) => s.put(value));
  notify();
}

export async function del(store: StoreName, key: string): Promise<void> {
  await tx(store, 'readwrite', (s) => s.delete(key));
  notify();
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function listSessions(): Promise<Session[]> {
  const all = await getAll<Session>('sessions');
  return all.sort((a, b) => a.startedAt - b.startedAt);
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await openDb();
  return reqToPromise(db.transaction('sessions').objectStore('sessions').get(id) as IDBRequest<Session | undefined>);
}

export const saveSession = (s: Session) => put('sessions', s);
export const deleteSession = (id: string) => del('sessions', id);

// ── Measurements ────────────────────────────────────────────────────────────

export async function listMeasurements(): Promise<Measurement[]> {
  const all = await getAll<Measurement>('measurements');
  return all.sort((a, b) => a.date.localeCompare(b.date));
}
export const saveMeasurement = (m: Measurement) => put('measurements', m);
export const deleteMeasurement = (id: string) => del('measurements', id);

// ── Key/value ───────────────────────────────────────────────────────────────

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const row = await reqToPromise(db.transaction('kv').objectStore('kv').get(key) as IDBRequest<KV<T> | undefined>);
  return row?.value;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await put<KV<T>>('kv', { key, value });
}

export async function kvDelete(key: string): Promise<void> {
  await del('kv', key);
}

export async function kvAll(): Promise<KV[]> {
  return getAll<KV>('kv');
}

// ── Bulk operations (backup / wipe) ─────────────────────────────────────────

export interface Snapshot {
  sessions: Session[];
  measurements: Measurement[];
  kv: KV[];
}

export async function snapshot(): Promise<Snapshot> {
  const [sessions, measurements, kv] = await Promise.all([listSessions(), listMeasurements(), kvAll()]);
  return { sessions, measurements, kv };
}

export async function restore(data: Snapshot, mode: 'replace' | 'merge'): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(['sessions', 'measurements', 'kv'], 'readwrite');
    const S = t.objectStore('sessions');
    const M = t.objectStore('measurements');
    const K = t.objectStore('kv');
    if (mode === 'replace') {
      S.clear();
      M.clear();
      K.clear();
    }
    data.sessions.forEach((s) => S.put(s));
    data.measurements.forEach((m) => M.put(m));
    data.kv.forEach((k) => K.put(k));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  notify();
}

export async function wipeAll(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(['sessions', 'measurements', 'kv', 'media'], 'readwrite');
    t.objectStore('sessions').clear();
    t.objectStore('measurements').clear();
    t.objectStore('kv').clear();
    t.objectStore('media').clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  try {
    localStorage.removeItem('forma-lab:timer');
  } catch {
    /* ignore */
  }
  notify();
}

/** For tests: reset the cached connection. */
export function _resetForTests() {
  dbPromise = null;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── User videos (own footage, annotated in the app) ─────────────────────────

export interface Shape {
  type: 'line' | 'circle' | 'arrow';
  /** Normalised coordinates (0–1) relative to the video frame. */
  p: [number, number][];
}

export interface Marker {
  id: string;
  /** Start time in seconds. */
  t: number;
  /** Duration in seconds. */
  dur: number;
  kind: 'bad' | 'good';
  label: string;
  shapes: Shape[];
}

export interface MediaItem {
  id: string; // `${exerciseId}:${kind}`
  exerciseId: string;
  kind: 'quick' | 'errors' | 'photo';
  blob: Blob;
  type: string;
  createdAt: number;
  markers: Marker[];
}

export async function getMedia(id: string): Promise<MediaItem | undefined> {
  const db = await openDb();
  return reqToPromise(db.transaction('media').objectStore('media').get(id) as IDBRequest<MediaItem | undefined>);
}

/** Metadata only (no blobs) is not possible with a plain getAll, so list ids via keys. */
export async function listMediaIds(): Promise<string[]> {
  const db = await openDb();
  return reqToPromise(db.transaction('media').objectStore('media').getAllKeys() as IDBRequest<string[]>);
}

export const saveMedia = (m: MediaItem) => put('media', m);
export const deleteMedia = (id: string) => del('media', id);
