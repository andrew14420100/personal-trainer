// Unified exercise catalog (4.1): the 25 program exercises + the library + the user's own exercises.
// Program/library entries are merged into EXERCISE_BY_ID / EXERCISE_MUSCLES once at import, so every
// screen that looks exercises up by id keeps working; user exercises are (re)registered whenever the
// settings change (see app/store.ts).
import type { Exercise } from './types';
import { EXERCISES, EXERCISE_BY_ID } from './exercises';
import { EXERCISE_MUSCLES, MUSCLE_LABEL } from './muscles';
import { LIBRARY, LIBRARY_MUSCLES, LIBRARY_PER_SIDE } from './library';
import type { CustomExercise } from '../lib/settings';
import { EXT_IDS } from './ext';

for (const e of LIBRARY) EXERCISE_BY_ID[e.id] = e;
Object.assign(EXERCISE_MUSCLES, LIBRARY_MUSCLES);

const PROGRAM_IDS = new Set(EXERCISES.map((e) => e.id));
let customIds: string[] = [];

export function customToExercise(c: CustomExercise): Exercise {
  return {
    id: c.id,
    name: c.name,
    nameEn: c.name,
    primary: c.primary.map((m) => MUSCLE_LABEL[m]),
    secondary: c.secondary.map((m) => MUSCLE_LABEL[m]),
    equipment: c.equipment || '—',
    category: 'multi-articolare',
    tracking: c.tracking,
    load: c.load,
    increment: 2.5,
    restSec: c.restSec,
    setup: [],
    execution: c.notes ? [c.notes] : [],
    breathing: '',
    errors: [],
    cues: [],
    alternatives: [],
  };
}

export function registerCustomExercises(list: CustomExercise[]) {
  for (const id of customIds) {
    delete EXERCISE_BY_ID[id];
    delete EXERCISE_MUSCLES[id];
  }
  customIds = list.map((c) => c.id);
  for (const c of list) {
    EXERCISE_BY_ID[c.id] = customToExercise(c);
    EXERCISE_MUSCLES[c.id] = { group: c.group, primary: c.primary, secondary: c.secondary };
  }
}

export type Source = 'scheda' | 'libreria' | 'catalogo' | 'tuo';
export const sourceOf = (id: string): Source => (PROGRAM_IDS.has(id) ? 'scheda' : customIds.includes(id) ? 'tuo' : id.startsWith('x-') ? 'catalogo' : 'libreria');

/** Every exercise currently available (program, library, user). */
export function allExercises(): Exercise[] {
  return [...EXERCISES, ...LIBRARY, ...EXT_IDS.map((id) => EXERCISE_BY_ID[id]), ...customIds.map((id) => EXERCISE_BY_ID[id]).filter(Boolean)];
}

export const isPerSideDefault = (id: string) => LIBRARY_PER_SIDE.has(id);

/** Name of an exercise that may have been deleted (old sessions keep working). */
export const exName = (id: string) => EXERCISE_BY_ID[id]?.name ?? 'Esercizio eliminato';

/** Exercise by id, with a neutral placeholder for exercises deleted by the user. */
export function exOrFallback(id: string): Exercise {
  return (
    EXERCISE_BY_ID[id] ?? {
      id,
      name: 'Esercizio eliminato',
      nameEn: '',
      primary: [],
      secondary: [],
      equipment: '—',
      category: 'multi-articolare',
      tracking: 'reps',
      load: 'external',
      increment: 2.5,
      restSec: 90,
      setup: [],
      execution: [],
      breathing: '',
      errors: [],
      cues: [],
      alternatives: [],
    }
  );
}
