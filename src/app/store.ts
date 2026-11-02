// React bindings for the local database: components re-render on every data change.
import { useCallback, useEffect, useState } from 'react';
import { listMeasurements, listSessions, subscribe, type Measurement, type Session } from '../lib/db';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../lib/settings';
import { isCalibration } from '../lib/plan';

export interface AppData {
  ready: boolean;
  error: string | null;
  sessions: Session[];
  measurements: Measurement[];
  settings: Settings;
  calibration: boolean;
  active: Session | null;
}

const EMPTY: AppData = {
  ready: false,
  error: null,
  sessions: [],
  measurements: [],
  settings: DEFAULT_SETTINGS,
  calibration: true,
  active: null,
};

let snapshot: AppData = EMPTY;
const subs = new Set<(d: AppData) => void>();
let loading: Promise<void> | null = null;
let started = false;

let seq = 0;
let applied = 0;

async function load() {
  const my = ++seq;
  try {
    const [sessions, measurements, settings] = await Promise.all([listSessions(), listMeasurements(), loadSettings()]);
    // Loads can resolve out of order: never replace a newer snapshot with an older one.
    if (my < applied) return;
    applied = my;
    snapshot = {
      ready: true,
      error: null,
      sessions,
      measurements,
      settings,
      calibration: isCalibration(settings, sessions),
      active: sessions.find((s) => s.status === 'active') ?? null,
    };
  } catch (e) {
    snapshot = { ...snapshot, ready: true, error: (e as Error).message || 'Errore di archiviazione locale' };
  }
  subs.forEach((f) => f(snapshot));
}

function ensureStarted() {
  if (started) return;
  started = true;
  loading = load();
  subscribe(() => {
    loading = load();
  });
}

export function useData(): AppData {
  ensureStarted();
  const [d, setD] = useState(snapshot);
  useEffect(() => {
    subs.add(setD);
    setD(snapshot);
    return () => {
      subs.delete(setD);
    };
  }, []);
  return d;
}

export function useSettingsUpdater() {
  return useCallback(async (patch: (s: Settings) => Settings) => {
    await saveSettings(patch(await loadSettings()));
  }, []);
}

export function whenLoaded() {
  ensureStarted();
  return loading ?? Promise.resolve();
}
