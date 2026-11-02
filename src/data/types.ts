// Shared domain types for FORMA LAB.

export type BodyArea =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'upperBack'
  | 'elbows'
  | 'wrists'
  | 'core'
  | 'lowerBack'
  | 'hips'
  | 'knees'
  | 'ankles';

export type DayId = 'upper-a' | 'lower-a' | 'upper-b' | 'lower-b';

export interface ExerciseError {
  id: string;
  area: BodyArea;
  /** Short label of the fault, e.g. "Gomiti troppo aperti". */
  title: string;
  /** What the fault looks like (shown in RED). */
  wrong: string;
  /** Why it matters. */
  why: string;
  /** How to fix it (shown in GREEN). */
  fix: string;
}

export interface Exercise {
  id: string;
  name: string;
  /** English name, useful to search videos and gym equipment labels. */
  nameEn: string;
  primary: string[];
  secondary: string[];
  equipment: string;
  category: 'multi-articolare' | 'mono-articolare' | 'core';
  tracking: 'reps' | 'time';
  /** Load type: external load in kg, or body weight (load optional). */
  load: 'external' | 'bodyweight';
  /** Suggested minimum load step in kg when progressing. */
  increment: number;
  /** Default rest in seconds (editable in settings / during workout). */
  restSec: number;
  setup: string[];
  execution: string[];
  breathing: string;
  errors: ExerciseError[];
  /** 3–4 short summary cues. */
  cues: string[];
  alternatives: { name: string; note: string }[];
  /** Notes about ambiguous variants in the program, shown as an explicit warning. */
  variantNote?: string;
}

export interface Slot {
  /** Unique id of the program position, e.g. "upper-a-1". */
  id: string;
  dayId: DayId;
  order: number;
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  unit: 'reps' | 'sec';
  perSide: boolean;
  /** Label for unilateral work, e.g. "per gamba" or "per lato". */
  sideLabel?: string;
}

export interface Day {
  id: DayId;
  weekday: number; // 0 = Sunday … 6 = Saturday (JS getDay)
  weekdayLabel: string;
  /** Day number in the week plan (1–4). */
  number: number;
  /** Main, self-explanatory name based on the muscles trained. */
  name: string;
  /** Technical code of the split (secondary label), e.g. "Upper A". */
  code: string;
  /** Short subtitle with the other muscles involved. */
  title: string;
  focus: string[];
  accent: string;
  photo: string;
  photoPosition?: string;
}
