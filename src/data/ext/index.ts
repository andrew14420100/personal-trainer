// 5.0: extended catalog (821 exercises) — structured data of free-exercise-db (public domain,
// Unlicense). Loaded once at startup and merged into the exercise registry. No instruction texts
// or images are bundled: their original provenance could not be verified.
import type { Exercise } from '../types';
import { EXERCISE_BY_ID } from '../exercises';
import { EXERCISE_MUSCLES, MUSCLE_LABEL, type MuscleId } from '../muscles';

interface Row {
  id: string;
  it: string;
  en: string;
  g: string;
  p: MuscleId[];
  s: MuscleId[];
  eq: string;
  lv: 'principiante' | 'intermedio' | 'avanzato';
  mv: string;
  c: string;
}

export const EXT_IDS: string[] = [];

export async function loadExtendedCatalog(): Promise<number> {
  if (EXT_IDS.length) return EXT_IDS.length;
  const rows = (await import('./catalog.json')).default as Row[];
  for (const r of rows) {
    if (EXERCISE_BY_ID[r.id]) continue;
    const ex: Exercise = {
      id: r.id,
      name: r.it,
      nameEn: r.en,
      primary: r.p.map((m) => MUSCLE_LABEL[m]),
      secondary: r.s.map((m) => MUSCLE_LABEL[m]),
      equipment: r.eq,
      category: r.c === 'Stretching' ? 'core' : r.mv.includes('mono') ? 'mono-articolare' : 'multi-articolare',
      tracking: r.c === 'Cardio' ? 'cardio' : r.c === 'Stretching' ? 'time' : 'reps',
      load: r.eq === 'Corpo libero' || r.eq === 'Nessuno' ? 'bodyweight' : 'external',
      increment: r.eq === 'Manubri' ? 1 : 2.5,
      restSec: r.c === 'Stretching' ? 30 : r.mv.includes('multi') ? 120 : 90,
      setup: [],
      execution: [],
      breathing: '',
      errors: [],
      cues: [],
      alternatives: [],
      level: r.lv,
      movement: r.mv,
      kind: r.c,
      source: { name: 'free-exercise-db', url: 'https://github.com/yuhonas/free-exercise-db', license: 'Unlicense (pubblico dominio dichiarato)', verified: 'dati di catalogo', autoName: true },
    };
    EXERCISE_BY_ID[r.id] = ex;
    EXERCISE_MUSCLES[r.id] = { group: r.g, primary: r.p, secondary: r.s };
    EXT_IDS.push(r.id);
  }
  return EXT_IDS.length;
}
