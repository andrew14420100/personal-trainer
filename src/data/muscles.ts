// Muscles involved in each exercise (structured), used by the anatomical maps and by the day cards.
// Primary = prime movers; secondary = synergists / stabilisers. Consistent with the technical pages
// in exercises.ts (standard functional anatomy of each movement).

export type MuscleId =
  | 'pettorali'
  | 'deltoide-ant'
  | 'deltoide-lat'
  | 'deltoide-post'
  | 'bicipiti'
  | 'tricipiti'
  | 'avambracci'
  | 'trapezio'
  | 'dorsali'
  | 'romboidi'
  | 'lombari'
  | 'addominali'
  | 'obliqui'
  | 'glutei'
  | 'quadricipiti'
  | 'femorali'
  | 'adduttori'
  | 'polpacci';

export const MUSCLE_LABEL: Record<MuscleId, string> = {
  pettorali: 'Pettorali',
  'deltoide-ant': 'Deltoide anteriore',
  'deltoide-lat': 'Deltoide laterale',
  'deltoide-post': 'Deltoide posteriore',
  bicipiti: 'Bicipiti',
  tricipiti: 'Tricipiti',
  avambracci: 'Avambracci',
  trapezio: 'Trapezio',
  dorsali: 'Gran dorsale',
  romboidi: 'Romboidi e schiena media',
  lombari: 'Lombari',
  addominali: 'Addominali',
  obliqui: 'Obliqui',
  glutei: 'Glutei',
  quadricipiti: 'Quadricipiti',
  femorali: 'Femorali',
  adduttori: 'Adduttori',
  polpacci: 'Polpacci',
};

/** Broad body region, used for grouping and the day summary. */
export const MUSCLE_REGION: Record<MuscleId, string> = {
  pettorali: 'Petto',
  'deltoide-ant': 'Spalle',
  'deltoide-lat': 'Spalle',
  'deltoide-post': 'Spalle',
  bicipiti: 'Bicipiti',
  tricipiti: 'Tricipiti',
  avambracci: 'Avambracci',
  trapezio: 'Schiena',
  dorsali: 'Schiena',
  romboidi: 'Schiena',
  lombari: 'Lombari',
  addominali: 'Addome',
  obliqui: 'Addome',
  glutei: 'Glutei',
  quadricipiti: 'Quadricipiti',
  femorali: 'Femorali',
  adduttori: 'Adduttori',
  polpacci: 'Polpacci',
};

export interface ExerciseMuscles {
  /** Main muscle group shown in lists, e.g. "Schiena". */
  group: string;
  primary: MuscleId[];
  secondary: MuscleId[];
}

export const EXERCISE_MUSCLES: Record<string, ExerciseMuscles> = {
  'chest-press': { group: 'Petto', primary: ['pettorali'], secondary: ['deltoide-ant', 'tricipiti'] },
  'lat-pulldown-wide': { group: 'Schiena', primary: ['dorsali'], secondary: ['romboidi', 'trapezio', 'bicipiti', 'deltoide-post', 'avambracci'] },
  'incline-db-press': { group: 'Petto alto', primary: ['pettorali'], secondary: ['deltoide-ant', 'tricipiti'] },
  'cable-row-v': { group: 'Schiena', primary: ['dorsali', 'romboidi', 'trapezio'], secondary: ['deltoide-post', 'bicipiti', 'lombari'] },
  'lateral-raise': { group: 'Spalle', primary: ['deltoide-lat'], secondary: ['trapezio', 'deltoide-ant'] },
  'triceps-pushdown': { group: 'Tricipiti', primary: ['tricipiti'], secondary: [] },
  'db-curl': { group: 'Bicipiti', primary: ['bicipiti'], secondary: ['avambracci'] },
  'leg-press': { group: 'Gambe', primary: ['quadricipiti', 'glutei'], secondary: ['adduttori', 'femorali'] },
  'db-rdl': { group: 'Femorali e glutei', primary: ['femorali', 'glutei'], secondary: ['lombari', 'adduttori', 'avambracci'] },
  'leg-extension': { group: 'Quadricipiti', primary: ['quadricipiti'], secondary: [] },
  'seated-leg-curl': { group: 'Femorali', primary: ['femorali'], secondary: ['polpacci'] },
  'calf-raise': { group: 'Polpacci', primary: ['polpacci'], secondary: [] },
  plank: { group: 'Addome', primary: ['addominali', 'obliqui'], secondary: ['glutei', 'deltoide-ant', 'quadricipiti'] },
  'smith-incline-press': { group: 'Petto alto', primary: ['pettorali'], secondary: ['deltoide-ant', 'tricipiti'] },
  'low-row-machine': { group: 'Schiena', primary: ['dorsali', 'romboidi', 'trapezio'], secondary: ['deltoide-post', 'bicipiti'] },
  'pec-fly': { group: 'Petto', primary: ['pettorali'], secondary: ['deltoide-ant'] },
  'lat-pulldown-neutral': { group: 'Schiena', primary: ['dorsali'], secondary: ['romboidi', 'bicipiti', 'avambracci'] },
  'shoulder-press-machine': { group: 'Spalle', primary: ['deltoide-ant', 'deltoide-lat'], secondary: ['tricipiti', 'trapezio'] },
  'incline-db-curl': { group: 'Bicipiti', primary: ['bicipiti'], secondary: ['avambracci'] },
  'overhead-cable-triceps': { group: 'Tricipiti', primary: ['tricipiti'], secondary: [] },
  'hack-squat': { group: 'Gambe', primary: ['quadricipiti', 'glutei'], secondary: ['adduttori'] },
  'hip-thrust-machine': { group: 'Glutei', primary: ['glutei'], secondary: ['femorali', 'adduttori'] },
  'assisted-split-squat': { group: 'Gambe e glutei', primary: ['quadricipiti', 'glutei'], secondary: ['adduttori', 'femorali'] },
  'lying-leg-curl': { group: 'Femorali', primary: ['femorali'], secondary: ['polpacci'] },
  'dead-bug': { group: 'Addome', primary: ['addominali'], secondary: ['obliqui'] },
};

/** Aggregate muscles of a set of exercises: primary wins over secondary. */
export function aggregate(exerciseIds: string[]): { primary: MuscleId[]; secondary: MuscleId[] } {
  const p = new Set<MuscleId>();
  const s = new Set<MuscleId>();
  for (const id of exerciseIds) {
    const m = EXERCISE_MUSCLES[id];
    if (!m) continue;
    m.primary.forEach((x) => p.add(x));
    m.secondary.forEach((x) => s.add(x));
  }
  p.forEach((x) => s.delete(x));
  return { primary: [...p], secondary: [...s] };
}
