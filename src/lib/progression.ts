// Load-progression hint based on the "double progression" principle:
// stay in the prescribed rep range; when every work set reaches the top of the range with good
// declared technique and at least 1 rep in reserve, consider a small load increase.
// This is an indicative training suggestion, NOT a medical or postural assessment.
import type { Exercise } from '../data/types';
import type { ExerciseLog } from './db';
import { doneSets } from './stats';

export type HintKind = 'start' | 'increase' | 'hold' | 'reduce' | 'technique';

export interface ProgressionHint {
  kind: HintKind;
  title: string;
  detail: string;
  suggestedWeight?: number;
}

export function progressionHint(ex: Exercise, target: { repsMin: number; repsMax: number; sets: number }, last: ExerciseLog | null): ProgressionHint {
  if (!last) {
    return {
      kind: 'start',
      title: 'Prima registrazione',
      detail:
        ex.tracking === 'time'
          ? 'Mantieni la posizione corretta per la durata minima e fermati quando la tecnica peggiora.'
          : 'Scegli un carico che ti lasci 2–3 ripetizioni di margine al limite superiore del range.',
    };
  }
  const sets = doneSets(last);
  if (last.technique === 'da migliorare') {
    return {
      kind: 'technique',
      title: 'Consolida la tecnica',
      detail: 'L’ultima volta hai indicato una tecnica da migliorare: mantieni lo stesso carico finché l’esecuzione è pulita.',
    };
  }
  const reachedSets = sets.length >= Math.min(target.sets, last.targetSets);
  const allTop = reachedSets && sets.every((s) => (s.reps ?? 0) >= target.repsMax);
  const anyBelow = sets.some((s) => (s.reps ?? 0) < target.repsMin);
  const margin = last.rir == null || last.rir >= 1;

  if (ex.tracking === 'time') {
    if (allTop) return { kind: 'increase', title: 'Valuta una progressione', detail: `Hai raggiunto ${target.repsMax} s in tutte le serie: valuta qualche secondo in più o una variante più impegnativa.` };
    return { kind: 'hold', title: 'Mantieni', detail: `Punta ad aumentare gradualmente la durata fino a ${target.repsMax} s per serie.` };
  }

  const lastWeight = Math.max(0, ...sets.map((s) => s.weight ?? 0));
  if (allTop && margin) {
    const inc = ex.increment || 0;
    return {
      kind: 'increase',
      title: inc > 0 ? `Valuta +${formatKg(inc)} kg` : 'Valuta una progressione',
      detail:
        inc > 0
          ? `Tutte le serie hanno raggiunto ${target.repsMax} ripetizioni con margine e tecnica dichiarata buona. Prova ${formatKg(lastWeight + inc)} kg e riparti dal basso del range.`
          : `Tutte le serie hanno raggiunto ${target.repsMax} ripetizioni: valuta una variante più impegnativa o un carico aggiuntivo.`,
      suggestedWeight: inc > 0 ? lastWeight + inc : undefined,
    };
  }
  if (allTop && !margin) {
    return { kind: 'hold', title: 'Mantieni il carico', detail: 'Hai raggiunto il massimo del range ma senza margine: ripeti lo stesso carico finché ti resta almeno 1 ripetizione di riserva.' };
  }
  if (anyBelow) {
    return {
      kind: 'reduce',
      title: 'Mantieni o riduci leggermente',
      detail: `Alcune serie sono sotto le ${target.repsMin} ripetizioni: mantieni il carico o riducilo leggermente per restare nel range.`,
    };
  }
  return { kind: 'hold', title: 'Mantieni il carico', detail: 'Sei nel range: punta ad aggiungere 1 ripetizione per serie prima di aumentare il carico.' };
}

export function formatKg(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}
