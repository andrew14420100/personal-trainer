// 4.0 migration: the local database format does not change, so nothing is converted or deleted.
// Before the first 4.0 start we keep a verified safety copy of the previous data inside the same
// database (kv 'backup:pre-4.0'), so it can always be exported/restored from Profilo.
import { kvGet, kvSet, snapshot, type Snapshot } from './db';

export const APP_DATA_VERSION = 4;

export interface MigrationReport {
  ran: boolean;
  sessions: number;
  measurements: number;
  settingsKeys: number;
  verified: boolean;
  at: string;
}

function counts(s: Snapshot) {
  return { sessions: s.sessions.length, measurements: s.measurements.length, kv: s.kv.length };
}

export async function ensureMigration(): Promise<MigrationReport | null> {
  const ver = await kvGet<number>('appDataVersion');
  if (ver != null && ver >= APP_DATA_VERSION) return (await kvGet<MigrationReport>('migration:4.0')) ?? null;
  const snap = await snapshot();
  const c = counts(snap);
  let verified = true;
  if (c.sessions + c.measurements + c.kv > 0) {
    const copy: Snapshot = JSON.parse(JSON.stringify(snap));
    // integrity: same counts, same session ids, every session readable
    verified =
      copy.sessions.length === c.sessions &&
      copy.measurements.length === c.measurements &&
      copy.sessions.every((s, i) => s.id === snap.sessions[i].id && Array.isArray(s.exercises));
    if (!verified) return null; // never mark as migrated if the copy is not identical
    // never overwrite an existing safety copy (e.g. after restoring an old backup)
    if (!(await kvGet('backup:pre-4.0'))) await kvSet('backup:pre-4.0', { at: new Date().toISOString(), data: copy });
  }
  const report: MigrationReport = { ran: c.sessions + c.measurements > 0, sessions: c.sessions, measurements: c.measurements, settingsKeys: c.kv, verified, at: new Date().toISOString() };
  await kvSet('migration:4.0', report);
  await kvSet('appDataVersion', APP_DATA_VERSION);
  return report;
}
