import { kvGet, kvSet } from './db';

export interface SlotOverride {
  sets?: number;
  repsMin?: number;
  repsMax?: number;
  exerciseId?: string;
}

export interface Settings {
  name: string;
  /** 'auto' = reduced volume until 4 sessions have been completed (≈ first week). */
  calibration: 'auto' | 'on' | 'off';
  autoRest: boolean;
  sound: boolean;
  keepAwake: boolean;
  restOverrides: Record<string, number>;
  slotOverrides: Record<string, SlotOverride>;
  favorites: string[];
  /** Exercise-specific personal notes. */
  notes: Record<string, string>;
  /** Video reviews by the user after watching: youtubeId → status. */
  videoReviews: Record<string, { status: 'approvato' | 'non adatto'; date: string }>;
  /** Video / animation preferences. */
  video: { autoplay: boolean; labels: boolean; speed: number; defaultMode: 'quick' | 'errors' };
  /** Rescheduled workouts: original planned date → new date (yyyy-mm-dd). */
  moves: Record<string, string>;
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  calibration: 'auto',
  autoRest: true,
  sound: true,
  keepAwake: true,
  restOverrides: {},
  slotOverrides: {},
  favorites: [],
  notes: {},
  videoReviews: {},
  video: { autoplay: true, labels: true, speed: 1, defaultMode: 'quick' },
  moves: {},
};

export async function loadSettings(): Promise<Settings> {
  const stored = await kvGet<Partial<Settings>>('settings');
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}), video: { ...DEFAULT_SETTINGS.video, ...(stored?.video ?? {}) } };
}

export async function saveSettings(s: Settings): Promise<void> {
  await kvSet('settings', s);
}

export async function updateSettings(patch: (s: Settings) => Settings): Promise<Settings> {
  const next = patch(await loadSettings());
  await saveSettings(next);
  return next;
}
