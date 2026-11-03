// 5.0 local, rule-based advice engine (no AI, works offline). Every tip states the rule that produced
// it and uses only the user's own data. Suggestions never change the plan by themselves.
import { EXERCISE_BY_ID } from '../data/exercises';
import { MUSCLE_LABEL, type MuscleId } from '../data/muscles';
import type { Measurement, Session } from './db';
import type { Settings } from './settings';
import { completed, exerciseHistory, lastLog, weekStart } from './stats';
import { muscleSets } from './records';
import { progressionHint } from './progression';
import { kg } from './format';

export interface Tip {
  id: string;
  kind: 'progressione' | 'stagnazione' | 'recupero' | 'costanza' | 'dati';
  title: string;
  body: string;
  rule: string;
  action?: { label: string; to: string };
}

const DAY = 86400000;
const PROGRAM_MUSCLES: MuscleId[] = ['pettorali', 'dorsali', 'deltoide-lat', 'bicipiti', 'tricipiti', 'quadricipiti', 'femorali', 'glutei', 'polpacci', 'addominali'];

export function computeTips(sessions: Session[], measurements: Measurement[], settings: Settings, now = Date.now()): Tip[] {
  const tips: Tip[] = [];
  const done = completed(sessions);
  if (!done.length) {
    tips.push({ id: 'start', kind: 'costanza', title: 'Inizia dalla prima seduta', body: 'Dopo il primo allenamento qui troverai suggerimenti sui carichi, sul recupero e sulla costanza basati sui tuoi dati.', rule: 'Nessuna seduta registrata.' });
    return tips;
  }
  const recentIds = [...new Set(done.filter((s) => s.startedAt > now - 42 * DAY).flatMap((s) => s.exercises.map((l) => l.exerciseId)))];

  // 1. ready to increase (double progression)
  for (const id of recentIds) {
    const ex = EXERCISE_BY_ID[id];
    const last = lastLog(sessions, id);
    if (!ex || !last || ex.tracking !== 'reps') continue;
    const h = progressionHint(ex, { repsMin: last.log.repsMin, repsMax: last.log.repsMax, sets: last.log.targetSets }, last.log);
    if (h.kind === 'increase' && h.suggestedWeight)
      tips.push({ id: `inc-${id}`, kind: 'progressione', title: `${ex.name}: pronto ad aumentare`, body: `Hai raggiunto il limite alto delle ripetizioni. Prova ${kg(h.suggestedWeight)} la prossima volta.`, rule: 'Doppia progressione: tutte le serie al massimo del range con tecnica buona.', action: { label: 'Apri esercizio', to: `/esercizio/${id}` } });
  }
  // 2. stagnation: 3+ recent sessions without improving top weight or total reps
  for (const id of recentIds) {
    const h = exerciseHistory(sessions, id).filter((p) => p.date > now - 56 * DAY);
    if (h.length < 4) continue;
    const base = h[h.length - 4];
    const tail = h.slice(-3);
    const better = tail.some((p) => p.topWeight > base.topWeight || (p.topWeight === base.topWeight && p.totalReps > base.totalReps));
    if (!better && EXERCISE_BY_ID[id])
      tips.push({ id: `stag-${id}`, kind: 'stagnazione', title: `${EXERCISE_BY_ID[id].name}: fermo da 3 sedute`, body: 'Puoi ridurre il carico di circa il 10% e risalire, cambiare range di ripetizioni o provare un’alternativa equivalente. Controlla anche sonno e recupero.', rule: 'Ultime 3 sedute senza aumento di carico massimo o di ripetizioni totali rispetto alla quarta precedente.', action: { label: 'Vedi alternative', to: `/esercizio/${id}` } });
  }
  // 3. recovery: muscles with many sets in the last 48 h
  const recent = muscleSets(sessions, now - 2 * DAY, now);
  const heavy = (Object.keys(recent) as MuscleId[]).filter((m) => recent[m] >= 8);
  if (heavy.length)
    tips.push({ id: 'recovery', kind: 'recupero', title: 'Muscoli ancora sotto carico', body: `Nelle ultime 48 ore: ${heavy.map((m) => MUSCLE_LABEL[m]).join(', ')}. Se oggi li alleni di nuovo, riduci il volume o scegli esercizi per altri gruppi.`, rule: '8 o più serie per muscolo nelle ultime 48 ore.' });
  // 4. neglected muscles in 10 days
  const ten = muscleSets(sessions, now - 10 * DAY, now);
  const missing = PROGRAM_MUSCLES.filter((m) => !ten[m]);
  if (missing.length && missing.length < PROGRAM_MUSCLES.length)
    tips.push({ id: 'neglected', kind: 'recupero', title: 'Gruppi non allenati da 10 giorni', body: missing.map((m) => MUSCLE_LABEL[m]).join(', ') + '.', rule: 'Nessuna serie negli ultimi 10 giorni per muscoli della scheda.' });
  // 5. weekly goal
  const wk = weekStart(now);
  const thisWeek = done.filter((s) => weekStart(s.startedAt) === wk).length;
  const dayIdx = (new Date(now).getDay() + 6) % 7;
  const left = settings.goals.weeklySessions - thisWeek;
  if (left > 0 && left >= 7 - dayIdx)
    tips.push({ id: 'goal', kind: 'costanza', title: 'Obiettivo settimanale a rischio', body: `Mancano ${left} allenamenti e ${7 - dayIdx} giorni alla fine della settimana.`, rule: 'Allenamenti mancanti ≥ giorni rimasti.', action: { label: 'Apri agenda', to: '/agenda' } });
  // 6. data hygiene
  if (!settings.lastBackupAt || now - settings.lastBackupAt > 30 * DAY)
    tips.push({ id: 'backup', kind: 'dati', title: 'Fai un backup', body: settings.lastBackupAt ? 'L’ultimo backup ha più di 30 giorni.' : 'Non hai ancora esportato un backup. I dati sono solo su questo dispositivo.', rule: 'Promemoria mensile del backup.', action: { label: 'Backup', to: '/profilo' } });
  const lastM = [...measurements].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!lastM || now - new Date(lastM.date + 'T12:00:00').getTime() > 14 * DAY)
    tips.push({ id: 'measure', kind: 'dati', title: 'Aggiorna peso e misure', body: lastM ? 'Ultima misurazione oltre 14 giorni fa.' : 'Registra peso e circonferenze per seguire i progressi del corpo.', rule: 'Promemoria misure ogni 14 giorni.', action: { label: 'Misure', to: '/progressi?tab=corpo' } });
  return tips;
}

