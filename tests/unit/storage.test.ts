import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { kvGet, kvSet, listMeasurements, listSessions, restore, saveMeasurement, saveSession, snapshot, wipeAll, deleteSession, subscribe } from '../../src/lib/db';
import { buildSession } from '../../src/lib/workout';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../src/lib/settings';
import { decryptBackup, encryptBackup, isEncrypted, makeBackup, validateBackup } from '../../src/lib/backup';

beforeEach(async () => {
  await wipeAll();
});

describe('IndexedDB storage', () => {
  it('persists sessions, measurements and settings', async () => {
    const s = buildSession('upper-a', DEFAULT_SETTINGS, false, []);
    s.exercises[0].sets[0] = { weight: 50, reps: 10, done: true };
    await saveSession(s);
    await saveMeasurement({ id: 'm1', date: '2026-11-01', bodyWeight: 80 });
    await saveSettings({ ...DEFAULT_SETTINGS, name: 'Andrea' });
    const list = await listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].exercises[0].sets[0]).toEqual({ weight: 50, reps: 10, done: true });
    expect((await listMeasurements())[0].bodyWeight).toBe(80);
    expect((await loadSettings()).name).toBe('Andrea');
  });

  it('notifies subscribers on change', async () => {
    let n = 0;
    const off = subscribe(() => n++);
    await kvSet('x', 1);
    off();
    await kvSet('x', 2);
    expect(n).toBe(1);
    expect(await kvGet('x')).toBe(2);
  });

  it('deletes and wipes', async () => {
    const s = buildSession('lower-a', DEFAULT_SETTINGS, false, []);
    await saveSession(s);
    await deleteSession(s.id);
    expect(await listSessions()).toHaveLength(0);
    await saveSession(s);
    await kvSet('settings', { name: 'x' });
    await wipeAll();
    const snap = await snapshot();
    expect(snap.sessions.length + snap.kv.length + snap.measurements.length).toBe(0);
  });

  it('round-trips a backup with replace and merge', async () => {
    const s = buildSession('upper-b', DEFAULT_SETTINGS, false, []);
    await saveSession(s);
    await saveSettings({ ...DEFAULT_SETTINGS, name: 'A' });
    const backup = makeBackup(await snapshot());
    await wipeAll();
    await restore(validateBackup(JSON.parse(JSON.stringify(backup))), 'replace');
    expect((await listSessions())[0].id).toBe(s.id);
    expect((await loadSettings()).name).toBe('A');
    const other = buildSession('lower-b', DEFAULT_SETTINGS, false, []);
    await restore({ sessions: [other], measurements: [], kv: [] }, 'merge');
    expect(await listSessions()).toHaveLength(2);
  });
});

describe('backup encryption', () => {
  it('encrypts and decrypts with the right passphrase only', async () => {
    const b = makeBackup({ sessions: [], measurements: [{ id: 'm', date: '2026-01-01', bodyWeight: 70 }], kv: [] });
    const e = await encryptBackup(b, 'una passphrase lunga');
    expect(isEncrypted(e)).toBe(true);
    expect(JSON.stringify(e)).not.toContain('bodyWeight');
    const d = await decryptBackup(e, 'una passphrase lunga');
    expect(d.measurements[0].bodyWeight).toBe(70);
    await expect(decryptBackup(e, 'sbagliata!!')).rejects.toThrow(/Passphrase errata/);
  });
  it('rejects short passphrases and foreign files', async () => {
    await expect(encryptBackup(makeBackup({ sessions: [], measurements: [], kv: [] }), 'corta')).rejects.toThrow();
    expect(() => validateBackup({ app: 'altro' })).toThrow(/non è un backup/);
    expect(() => validateBackup({ app: 'forma-lab', version: 1, sessions: [{}], measurements: [], kv: [] })).toThrow(/Sessione non valida/);
  });
});

describe('concurrent workout writes', () => {
  it('serializes updates so a fast blur + tap never loses data', async () => {
    const { mutate, updateSet } = await import('../../src/lib/workout');
    const { getSession } = await import('../../src/lib/db');
    const s = buildSession('upper-a', DEFAULT_SETTINGS, false, []);
    await saveSession(s);
    // fired in the same tick, like onBlur(weight), onBlur(reps) and the tap on ✓
    await Promise.all([
      mutate(s.id, (x) => updateSet(x, 0, 0, { weight: 27.5 })),
      mutate(s.id, (x) => updateSet(x, 0, 0, { reps: 10 })),
      mutate(s.id, (x) => updateSet(x, 0, 0, { done: true })),
    ]);
    const saved = await getSession(s.id);
    expect(saved!.exercises[0].sets[0]).toMatchObject({ weight: 27.5, reps: 10, done: true });
  });
});

describe('4.0 migration', () => {
  it('keeps every previous record and stores a verified safety copy, idempotently', async () => {
    const { ensureMigration } = await import('../../src/lib/migration');
    const { kvGet, listSessions } = await import('../../src/lib/db');
    const s = buildSession('upper-a', DEFAULT_SETTINGS, false, []);
    s.status = 'completed';
    await saveSession(s);
    await saveMeasurement({ id: 'm1', date: '2026-10-01', bodyWeight: 80 });
    const r = await ensureMigration();
    expect(r?.verified).toBe(true);
    expect(r?.sessions).toBe(1);
    expect((await listSessions())[0].id).toBe(s.id); // untouched
    const copy = await kvGet<{ data: { sessions: { id: string }[] } }>('backup:pre-4.0');
    expect(copy?.data.sessions[0].id).toBe(s.id);
    const again = await ensureMigration();
    expect(again?.sessions).toBe(1);
  });
});
