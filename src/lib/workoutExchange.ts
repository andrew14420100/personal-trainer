import { allExercises } from '../data/catalog';
import type { Routine, RoutineItem } from './settings';
import { uid } from './db';

/** FORMA LAB Workout Exchange v1. A program is a collection of training days. */
export interface ExchangeExercise {
  exerciseId?: string;
  exerciseName: string;
  sets: number;
  repetitions: { min: number; max: number; unit: 'reps' | 'seconds' | 'minutes' };
  restSeconds?: number;
  perSide?: boolean;
  sideLabel?: string;
  supersetGroup?: string;
  notes?: string;
}
export interface ExchangeDay {
  id: string;
  name: string;
  weekday?: number;
  weekdayLabel?: string;
  focus?: string[];
  exercises: ExchangeExercise[];
}
export interface WorkoutExchange {
  format: 'forma-lab-workout-exchange';
  version: 1;
  program: {
    id: string;
    title: string;
    author: string;
    folder?: string;
    objective?: string;
    level?: string;
    durationWeeks?: number | null;
    notes?: string;
  };
  days: ExchangeDay[];
}
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const string = (v: unknown, max = 256): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const integer = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const optional = (v: unknown, valid: (x: unknown) => boolean) => v === undefined || valid(v);
function fail(message: string): never { throw new Error('File scheda non valido: ' + message); }

/** Parse untrusted JSON and return a clean object with an explicit allow-list. */
export function parseExchange(raw: string): WorkoutExchange {
  if (new TextEncoder().encode(raw).length > 262144) fail('dimensione superiore a 256 KB');
  let root: unknown;
  try { root = JSON.parse(raw); } catch { fail('contenuto non JSON'); }
  if (!object(root) || root.format !== 'forma-lab-workout-exchange' || root.version !== 1) fail('formato o versione non riconosciuti');
  if (!object(root.program)) fail('metadati del programma mancanti');
  const p = root.program;
  if (!string(p.id) || !string(p.title) || !string(p.author)) fail('titolo, autore o id mancanti');
  if (!optional(p.folder, x => typeof x === 'string' && x.length <= 128) ||
      !optional(p.durationWeeks, x => x === null || integer(x, 1, 104)) ||
      !optional(p.objective, x => typeof x === 'string' && x.length <= 256) ||
      !optional(p.notes, x => typeof x === 'string' && x.length <= 5000)) fail('metadati non validi');
  if (!Array.isArray(root.days) || root.days.length === 0 || root.days.length > 14) fail('numero di giornate non valido');
  const ids = new Set<string>();
  const days: ExchangeDay[] = root.days.map((d: unknown, di: number) => {
    if (!object(d) || !string(d.id) || !string(d.name)) fail('giornata ' + (di + 1) + ' incompleta');
    if (ids.has(d.id)) fail('giornata duplicata: ' + d.id);
    ids.add(d.id);
    if (!optional(d.weekday, x => integer(x, 0, 6))) fail('giorno della settimana non valido');
    if (!Array.isArray(d.exercises) || d.exercises.length === 0 || d.exercises.length > 50) fail('elenco esercizi non valido');
    const exercises: ExchangeExercise[] = d.exercises.map((e: unknown, ei: number) => {
      if (!object(e) || !string(e.exerciseName) || !integer(e.sets, 1, 20)) fail('esercizio ' + (ei + 1) + ' non valido');
      if (!object(e.repetitions) || !integer(e.repetitions.min, 1, 3600) ||
          !integer(e.repetitions.max, 1, 3600) ||
          (e.repetitions.min as number) > (e.repetitions.max as number) ||
          !['reps','seconds','minutes'].includes(String(e.repetitions.unit))) fail('ripetizioni non valide: ' + e.exerciseName);
      if (!optional(e.exerciseId, x => string(x)) ||
          !optional(e.restSeconds, x => integer(x, 0, 1200)) ||
          !optional(e.perSide, x => typeof x === 'boolean') ||
          !optional(e.supersetGroup, x => typeof x === 'string' && x.length <= 20) ||
          !optional(e.sideLabel, x => typeof x === 'string' && x.length <= 80) ||
          !optional(e.notes, x => typeof x === 'string' && x.length <= 2000)) fail('campi non validi: ' + e.exerciseName);
      return {
        exerciseId: typeof e.exerciseId === 'string' ? e.exerciseId : undefined,
        exerciseName: e.exerciseName as string,
        sets: e.sets as number,
        repetitions: {
          min: e.repetitions.min as number, max: e.repetitions.max as number,
          unit: e.repetitions.unit as 'reps' | 'seconds' | 'minutes',
        },
        restSeconds: typeof e.restSeconds === 'number' ? e.restSeconds : undefined,
        perSide: e.perSide === true,
        sideLabel: typeof e.sideLabel === 'string' ? e.sideLabel : undefined,
        supersetGroup: typeof e.supersetGroup === 'string' ? e.supersetGroup : undefined,
        notes: typeof e.notes === 'string' ? e.notes : undefined,
      };
    });
    return {
      id: d.id as string, name: d.name as string, exercises,
      weekday: typeof d.weekday === 'number' ? d.weekday : undefined,
      weekdayLabel: typeof d.weekdayLabel === 'string' ? d.weekdayLabel.slice(0, 40) : undefined,
      focus: Array.isArray(d.focus) ? d.focus.filter((x): x is string => string(x, 80)).slice(0, 20) : undefined,
    };
  });
  return {
    format: 'forma-lab-workout-exchange', version: 1,
    program: {
      id: p.id, title: p.title, author: p.author,
      folder: typeof p.folder === 'string' ? p.folder : undefined,
      objective: typeof p.objective === 'string' ? p.objective : undefined,
      level: typeof p.level === 'string' ? p.level.slice(0, 128) : undefined,
      durationWeeks: typeof p.durationWeeks === 'number' ? p.durationWeeks : null,
      notes: typeof p.notes === 'string' ? p.notes : undefined,
    },
    days,
  };
}

function normalized(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
export type ExerciseMatch = { id?: string; candidates: { id: string; name: string }[]; status: 'matched' | 'missing' | 'ambiguous' };
export function matchExchangeExercise(e: ExchangeExercise, selectedId?: string): ExerciseMatch {
  const catalog = allExercises();
  if (selectedId) {
    const exact = catalog.find(x => x.id === selectedId);
    return exact
      ? { id: exact.id, candidates: [{ id: exact.id, name: exact.name }], status: 'matched' }
      : { candidates: [], status: 'missing' };
  }
  if (e.exerciseId) {
    const exact = catalog.find(x => x.id === e.exerciseId);
    if (exact) return { id: exact.id, candidates: [{ id: exact.id, name: exact.name }], status: 'matched' };
  }
  const value = normalized(e.exerciseName);
  const matches = catalog.filter(x => normalized(x.name) === value || normalized(x.nameEn) === value).map(x => ({ id: x.id, name: x.name }));
  return {
    id: matches.length === 1 ? matches[0].id : undefined,
    candidates: matches,
    status: matches.length === 1 ? 'matched' : matches.length ? 'ambiguous' : 'missing',
  };
}

export function exchangeToRoutines(p: WorkoutExchange, selections: Record<string, string> = {}): Routine[] {
  const folder = (p.program.folder?.trim() || ('ChatGPT · ' + p.program.title)).slice(0, 128);
  const createdAt = Date.now();
  return p.days.map((day, di) => ({
    id: uid(), name: day.name, folder, accent: '#2F6BFF', createdAt,
    items: day.exercises.map((ex, ei): RoutineItem => {
      const match = matchExchangeExercise(ex, selections[di + ':' + ei]);
      if (!match.id) throw new Error('Associa l’esercizio ' + ex.exerciseName + ' nella giornata ' + day.name);
      return {
        id: uid(), exerciseId: match.id, sets: ex.sets,
        repsMin: ex.repetitions.min, repsMax: ex.repetitions.max,
        unit: ex.repetitions.unit === 'seconds' ? 'sec' : ex.repetitions.unit === 'minutes' ? 'min' : 'reps',
        perSide: !!ex.perSide, sideLabel: ex.sideLabel, restSec: ex.restSeconds, group: ex.supersetGroup,
      };
    }),
  }));
}

export function routinesToExchange(routines: Routine[]): WorkoutExchange {
  const catalog = allExercises();
  const title = routines[0]?.folder || 'Schede personali FORMA LAB';
  return {
    format: 'forma-lab-workout-exchange', version: 1,
    program: { id: uid(), title, author: 'FORMA LAB', folder: title },
    days: routines.map(r => ({
      id: r.id, name: r.name,
      exercises: r.items.map(item => {
        const exercise = catalog.find(x => x.id === item.exerciseId);
        return {
          exerciseId: item.exerciseId, exerciseName: exercise?.name || item.exerciseId, sets: item.sets,
          repetitions: { min: item.repsMin, max: item.repsMax,
            unit: item.unit === 'sec' ? 'seconds' as const : item.unit === 'min' ? 'minutes' as const : 'reps' as const },
          restSeconds: item.restSec, perSide: item.perSide, sideLabel: item.sideLabel, supersetGroup: item.group,
        };
      }),
    })),
  };
}
