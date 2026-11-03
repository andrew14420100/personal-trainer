import { kvGet, kvSet } from './db';
import type { MuscleId } from '../data/muscles';

/** One exercise inside a routine or an edited plan day (4.1). */
export interface RoutineItem {
  id: string;
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  unit: 'reps' | 'sec' | 'min';
  perSide: boolean;
  sideLabel?: string;
  /** Rest override in seconds. */
  restSec?: number;
  /** Superset letter: consecutive items with the same letter are alternated. */
  group?: string;
}

export interface Routine {
  id: string;
  name: string;
  /** Folder name (4.1); '' = no folder. */
  folder?: string;
  accent: string;
  items: RoutineItem[];
  createdAt: number;
}

/** Exercise created by the user (no video or technical page beyond what they write). */
export interface CustomExercise {
  id: string;
  name: string;
  group: string;
  primary: MuscleId[];
  secondary: MuscleId[];
  equipment: string;
  tracking: 'reps' | 'time' | 'cardio';
  load: 'external' | 'bodyweight';
  restSec: number;
  notes?: string;
}

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
  /** 4.1: custom routines, edited plan days, user exercises, goals, reminder times. */
  routines: Routine[];
  dayEdits: Partial<Record<'upper-a' | 'lower-a' | 'upper-b' | 'lower-b', RoutineItem[]>>;
  customExercises: CustomExercise[];
  goals: { weeklySessions: number; targetWeight: number | null; lifts: { exerciseId: string; weight: number }[] };
  /** Weight unit for display and input; data is always stored in kg. */
  unit: 'kg' | 'lb';
  /** Warm-up generator: % of the work load × reps. */
  warmup: { pct: number; reps: number }[];
  /** Log RPE per set. */
  rpePerSet: boolean;
  /** Superset: jump to the next exercise of the group after each set. */
  smartSuperset: boolean;
  // ── 5.0 ──
  theme: 'auto' | 'light' | 'dark';
  textSize: 's' | 'm' | 'l';
  gymMode: boolean;
  /** Bottom bar layout (ids of the 5 tabs). */
  tabs: string[];
  /** Home widgets in order; hidden ones are kept with visible=false. */
  homeWidgets: { id: string; visible: boolean }[];
  /** Confirm a set automatically when weight + reps are valid (after leaving the reps field). */
  autoConfirm: boolean;
  /** Automatic rescheduling of missed workouts to the next free day. */
  autoReschedule: boolean;
  /** Personal agenda events (yyyy-mm-dd). blocks=true: no workout can be moved onto that day. */
  events: AgendaEvent[];
  /** Log of automatic reschedules (shown with an "Annulla" action). */
  autoMoves: { from: string; to: string; at: number }[];
  /** Missed dates the user chose NOT to reschedule (never touched again). */
  dismissedMisses: string[];
  recentExercises: string[];
  archivedExercises: string[];
  tourDone: boolean;
  /** First day automatic rescheduling was active ('' = not yet). */
  rescheduleSince: string;
  /** Last time a backup file was exported (ms). */
  lastBackupAt: number;
  reminders: { time: string; minutesBefore: number };
  /** Plates available in the gym (kg, per side) and bar weight, for the plate calculator. */
  plates: { bar: number; available: number[] };
}

export interface AgendaEvent {
  id: string;
  date: string;
  time?: string;
  title: string;
  blocks: boolean;
}

export const ALL_HOME_WIDGETS = ['agenda', 'week', 'goal', 'weekProgress', 'last', 'compare', 'records', 'muscles', 'volume', 'time', 'bodyweight', 'goals', 'badges', 'tips', 'quick'] as const;
export const DEFAULT_TABS = ['', 'agenda', 'allenati', 'progressi', 'altro'];


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
  routines: [],
  dayEdits: {},
  customExercises: [],
  goals: { weeklySessions: 4, targetWeight: null, lifts: [] },
  unit: 'kg',
  warmup: [
    { pct: 40, reps: 5 },
    { pct: 60, reps: 5 },
    { pct: 80, reps: 3 },
  ],
  rpePerSet: true,
  smartSuperset: true,
  theme: 'auto',
  textSize: 'm',
  gymMode: false,
  tabs: DEFAULT_TABS,
  homeWidgets: ALL_HOME_WIDGETS.map((id) => ({ id, visible: true })),
  autoConfirm: true,
  autoReschedule: true,
  events: [],
  autoMoves: [],
  dismissedMisses: [],
  recentExercises: [],
  archivedExercises: [],
  tourDone: false,
  rescheduleSince: '',
  lastBackupAt: 0,
  reminders: { time: '18:30', minutesBefore: 30 },
  plates: { bar: 20, available: [25, 20, 15, 10, 5, 2.5, 1.25] },
};

export async function loadSettings(): Promise<Settings> {
  const stored = await kvGet<Partial<Settings>>('settings');
  return {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
    video: { ...DEFAULT_SETTINGS.video, ...(stored?.video ?? {}) },
    goals: { ...DEFAULT_SETTINGS.goals, ...(stored?.goals ?? {}) },
    warmup: stored?.warmup?.length ? stored.warmup : DEFAULT_SETTINGS.warmup,
    reminders: { ...DEFAULT_SETTINGS.reminders, ...(stored?.reminders ?? {}) },
    plates: { ...DEFAULT_SETTINGS.plates, ...(stored?.plates ?? {}) },
    // keep the user's order, add widgets introduced by newer versions at the end
    homeWidgets: mergeWidgets(stored?.homeWidgets),
  };
}

export async function saveSettings(s: Settings): Promise<void> {
  await kvSet('settings', s);
}

export async function updateSettings(patch: (s: Settings) => Settings): Promise<Settings> {
  const next = patch(await loadSettings());
  await saveSettings(next);
  return next;
}

function mergeWidgets(stored?: { id: string; visible: boolean }[]) {
  const list = (stored ?? []).filter((w) => (ALL_HOME_WIDGETS as readonly string[]).includes(w.id));
  for (const id of ALL_HOME_WIDGETS) if (!list.some((w) => w.id === id)) list.push({ id, visible: true });
  return list;
}
