// FORMA LAB Workout Exchange — version 1.
// Open, documented format to import/export multi-day, multi-week programs (e.g. created with
// ChatGPT). Everything here is local and offline: parse → validate → match exercises → editable
// draft → atomic commit. Spec: docs/FORMATO_SCHEDE_v1.md · schema: public/formats/forma-lab-workout-exchange-v1.schema.json
import { EXERCISE_BY_ID } from '../data/exercises';
import { MUSCLE_REGION, type MuscleId } from '../data/muscles';
import { allExercises, sourceOf } from '../data/catalog';
import { uid } from './db';
import type { CustomExercise, Program, ProgramPhase, Routine, RoutineItem, Settings } from './settings';
import { dayAsItems } from './plan';
import { DAYS } from '../data/program';

export const FORMAT_ID = 'forma-lab-workout-exchange';
export const FORMAT_VERSION = 1;
export const MAX_BYTES = 512 * 1024;
export const IMPORT_FOLDER = 'Schede create con ChatGPT';
export const GOALS = ['massa', 'forza', 'ricomposizione', 'dimagrimento', 'resistenza', 'salute', 'altro'] as const;
export const LEVELS = ['principiante', 'intermedio', 'avanzato'] as const;
export const WEEKDAYS = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'] as const;

// ── Exchange types ──────────────────────────────────────────────────────────────
export interface ExRange {
  min: number;
  max: number;
}
export interface ExExercise {
  exerciseId?: string;
  name: string;
  nameEn?: string;
  equipment?: string;
  sets: number;
  reps?: ExRange;
  durationSec?: ExRange;
  perSide?: boolean;
  restSec: number;
  load?: { value: number; unit: 'kg' | 'lb' | '%1RM' };
  rpe?: number;
  rir?: number;
  group?: string;
  warmupSets?: number;
  notes?: string;
  alternatives?: string[];
}
export interface ExDay {
  id: string;
  name: string;
  weekday?: (typeof WEEKDAYS)[number];
  muscleGroups?: string[];
  notes?: string;
  exercises: ExExercise[];
}
export interface ExPhase {
  name: string;
  fromWeek: number;
  toWeek: number;
  deload?: boolean;
  setsDelta?: number;
  rpe?: number;
  rir?: number;
  notes?: string;
}
export interface ExProgram {
  name: string;
  description?: string;
  author?: string;
  goal: (typeof GOALS)[number];
  level: (typeof LEVELS)[number];
  durationWeeks: number;
  daysPerWeek: number;
  recommendedWeekdays?: (typeof WEEKDAYS)[number][];
  progression?: string;
  phases?: ExPhase[];
  days: ExDay[];
}
export interface ExFile {
  $schema?: string;
  format: typeof FORMAT_ID;
  version: number;
  generator?: string;
  exportedAt?: string;
  program: ExProgram;
}

export interface Issue {
  path: string;
  message: string;
}

// ── Safety + validation ─────────────────────────────────────────────────────────
const DANGEROUS = /<\s*(script|iframe|object|embed|svg|img|link|style|meta)\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|\bon[a-z]+\s*=|\{\{|\$\{/i;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Structural safety scan: depth, forbidden keys, executable-looking strings, sizes. */
export function safetyScan(v: unknown, path = '$', depth = 0, out: Issue[] = []): Issue[] {
  if (out.length > 20) return out;
  if (depth > 10) {
    out.push({ path, message: 'Struttura troppo annidata' });
    return out;
  }
  if (typeof v === 'string') {
    if (v.length > 2000) out.push({ path, message: 'Testo troppo lungo (massimo 2000 caratteri)' });
    if (DANGEROUS.test(v)) out.push({ path, message: 'Contenuto non sicuro (codice o markup) non ammesso' });
  } else if (Array.isArray(v)) {
    if (v.length > 200) out.push({ path, message: 'Elenco troppo lungo' });
    v.forEach((x, i) => safetyScan(x, `${path}[${i}]`, depth + 1, out));
  } else if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) {
      if (BAD_KEYS.has(k)) out.push({ path: `${path}.${k}`, message: 'Campo non sicuro' });
      else safetyScan((v as Record<string, unknown>)[k], `${path}.${k}`, depth + 1, out);
    }
  } else if (typeof v === 'number' && !Number.isFinite(v)) out.push({ path, message: 'Numero non valido' });
  return out;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

function checkKeys(o: Obj, allowed: string[], path: string, issues: Issue[]) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) issues.push({ path: `${path}.${k}`, message: `Campo sconosciuto “${k}” (non previsto dal formato v1)` });
}
function str(o: Obj, k: string, path: string, issues: Issue[], req = false, max = 200): string | undefined {
  const v = o[k];
  if (v == null) {
    if (req) issues.push({ path: `${path}.${k}`, message: 'Campo obbligatorio mancante' });
    return undefined;
  }
  if (typeof v !== 'string') return void issues.push({ path: `${path}.${k}`, message: 'Deve essere un testo' });
  const t = v.trim();
  if (req && !t) issues.push({ path: `${path}.${k}`, message: 'Non può essere vuoto' });
  if (t.length > max) issues.push({ path: `${path}.${k}`, message: `Massimo ${max} caratteri` });
  return t;
}
function int(o: Obj, k: string, path: string, issues: Issue[], min: number, max: number, req = false): number | undefined {
  const v = o[k];
  if (v == null) {
    if (req) issues.push({ path: `${path}.${k}`, message: 'Campo obbligatorio mancante' });
    return undefined;
  }
  if (typeof v !== 'number' || !Number.isInteger(v)) return void issues.push({ path: `${path}.${k}`, message: 'Deve essere un numero intero' });
  if (v < min || v > max) issues.push({ path: `${path}.${k}`, message: `Deve essere tra ${min} e ${max}` });
  return v;
}
function num(o: Obj, k: string, path: string, issues: Issue[], min: number, max: number): number | undefined {
  const v = o[k];
  if (v == null) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v)) return void issues.push({ path: `${path}.${k}`, message: 'Deve essere un numero' });
  if (v < min || v > max) issues.push({ path: `${path}.${k}`, message: `Deve essere tra ${min} e ${max}` });
  return v;
}
function range(o: Obj, k: string, path: string, issues: Issue[], max: number): ExRange | undefined {
  const v = o[k];
  if (v == null) return undefined;
  if (!isObj(v)) return void issues.push({ path: `${path}.${k}`, message: 'Deve essere { "min": numero, "max": numero }' });
  checkKeys(v, ['min', 'max'], `${path}.${k}`, issues);
  const min = int(v, 'min', `${path}.${k}`, issues, 1, max, true);
  const mx = int(v, 'max', `${path}.${k}`, issues, 1, max, true);
  if (min != null && mx != null && min > mx) issues.push({ path: `${path}.${k}`, message: '“min” non può superare “max”' });
  return min != null && mx != null ? { min, max: mx } : undefined;
}
function oneOf<T extends string>(o: Obj, k: string, list: readonly T[], path: string, issues: Issue[], req = false): T | undefined {
  const v = o[k];
  if (v == null) {
    if (req) issues.push({ path: `${path}.${k}`, message: `Campo obbligatorio: uno tra ${list.join(', ')}` });
    return undefined;
  }
  if (typeof v !== 'string' || !list.includes(v as T)) return void issues.push({ path: `${path}.${k}`, message: `Valore non ammesso: usa uno tra ${list.join(', ')}` });
  return v as T;
}
function strList(o: Obj, k: string, path: string, issues: Issue[], max = 20): string[] | undefined {
  const v = o[k];
  if (v == null) return undefined;
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) return void issues.push({ path: `${path}.${k}`, message: 'Deve essere un elenco di testi' });
  if (v.length > max) issues.push({ path: `${path}.${k}`, message: `Massimo ${max} elementi` });
  return (v as string[]).map((x) => x.trim()).filter(Boolean);
}

/** Full validation of a parsed file. Returns typed data only when there are no errors. */
export function validateExchange(raw: unknown): { data?: ExFile; errors: Issue[]; warnings: Issue[] } {
  const errors: Issue[] = safetyScan(raw);
  const warnings: Issue[] = [];
  if (errors.length) return { errors, warnings };
  if (!isObj(raw)) return { errors: [{ path: '$', message: 'Il file deve contenere un oggetto JSON' }], warnings };
  checkKeys(raw, ['$schema', 'format', 'version', 'generator', 'exportedAt', 'program'], '$', errors);
  if (raw.format !== FORMAT_ID) errors.push({ path: '$.format', message: `Deve valere "${FORMAT_ID}"` });
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) errors.push({ path: '$.version', message: 'Versione mancante o non valida' });
  else if (raw.version > FORMAT_VERSION) errors.push({ path: '$.version', message: `Versione ${raw.version} non supportata da questa app (supportata: ${FORMAT_VERSION}). Aggiorna FORMA LAB.` });
  else if (raw.version < 1) errors.push({ path: '$.version', message: 'Versione non valida' });
  str(raw, 'generator', '$', errors, false, 100);
  str(raw, 'exportedAt', '$', errors, false, 40);
  const p = raw.program;
  if (!isObj(p)) {
    errors.push({ path: '$.program', message: 'Campo “program” obbligatorio' });
    return { errors, warnings };
  }
  const P = '$.program';
  checkKeys(p, ['name', 'description', 'author', 'goal', 'level', 'durationWeeks', 'daysPerWeek', 'recommendedWeekdays', 'progression', 'phases', 'days'], P, errors);
  const prog: ExProgram = {
    name: str(p, 'name', P, errors, true, 80) ?? '',
    description: str(p, 'description', P, errors, false, 1000),
    author: str(p, 'author', P, errors, false, 80),
    goal: oneOf(p, 'goal', GOALS, P, errors, true) ?? 'altro',
    level: oneOf(p, 'level', LEVELS, P, errors, true) ?? 'intermedio',
    durationWeeks: int(p, 'durationWeeks', P, errors, 1, 52, true) ?? 1,
    daysPerWeek: int(p, 'daysPerWeek', P, errors, 1, 7, true) ?? 1,
    progression: str(p, 'progression', P, errors, false, 1000),
    days: [],
  };
  const wd = p.recommendedWeekdays;
  if (wd != null) {
    if (!Array.isArray(wd) || wd.some((x) => !WEEKDAYS.includes(x as (typeof WEEKDAYS)[number]))) errors.push({ path: `${P}.recommendedWeekdays`, message: `Elenco di giorni tra: ${WEEKDAYS.join(', ')}` });
    else prog.recommendedWeekdays = wd as ExProgram['recommendedWeekdays'];
  }
  if (p.phases != null) {
    if (!Array.isArray(p.phases)) errors.push({ path: `${P}.phases`, message: 'Deve essere un elenco' });
    else
      prog.phases = p.phases.map((ph, i) => {
        const pp = `${P}.phases[${i}]`;
        if (!isObj(ph)) {
          errors.push({ path: pp, message: 'Deve essere un oggetto' });
          return { name: '', fromWeek: 1, toWeek: 1 };
        }
        checkKeys(ph, ['name', 'fromWeek', 'toWeek', 'deload', 'setsDelta', 'rpe', 'rir', 'notes'], pp, errors);
        const r: ExPhase = { name: str(ph, 'name', pp, errors, true, 60) ?? '', fromWeek: int(ph, 'fromWeek', pp, errors, 1, 52, true) ?? 1, toWeek: int(ph, 'toWeek', pp, errors, 1, 52, true) ?? 1 };
        if (ph.deload != null && typeof ph.deload !== 'boolean') errors.push({ path: `${pp}.deload`, message: 'Deve essere true o false' });
        else if (ph.deload != null) r.deload = ph.deload as boolean;
        r.setsDelta = int(ph, 'setsDelta', pp, errors, -5, 5);
        r.rpe = num(ph, 'rpe', pp, errors, 5, 10);
        r.rir = int(ph, 'rir', pp, errors, 0, 6);
        r.notes = str(ph, 'notes', pp, errors, false, 500);
        if (r.fromWeek > r.toWeek) errors.push({ path: pp, message: '“fromWeek” non può superare “toWeek”' });
        if (r.toWeek > prog.durationWeeks) errors.push({ path: pp, message: `La fase supera la durata del programma (${prog.durationWeeks} settimane)` });
        return r;
      });
    const ph = prog.phases ?? [];
    for (let i = 1; i < ph.length; i++) if (ph[i].fromWeek <= ph[i - 1].toWeek) errors.push({ path: `${P}.phases[${i}]`, message: 'Le fasi non devono sovrapporsi e vanno in ordine di settimana' });
  }
  if (!Array.isArray(p.days) || !p.days.length) errors.push({ path: `${P}.days`, message: 'Serve almeno una giornata' });
  else {
    if (p.days.length > 14) errors.push({ path: `${P}.days`, message: 'Massimo 14 giornate' });
    const ids = new Set<string>();
    prog.days = p.days.map((d, i) => {
      const dp = `${P}.days[${i}]`;
      if (!isObj(d)) {
        errors.push({ path: dp, message: 'Deve essere un oggetto' });
        return { id: `g${i}`, name: '', exercises: [] };
      }
      checkKeys(d, ['id', 'name', 'weekday', 'muscleGroups', 'notes', 'exercises'], dp, errors);
      const day: ExDay = { id: str(d, 'id', dp, errors, true, 40) ?? `g${i}`, name: str(d, 'name', dp, errors, true, 80) ?? '', weekday: oneOf(d, 'weekday', WEEKDAYS, dp, errors), muscleGroups: strList(d, 'muscleGroups', dp, errors), notes: str(d, 'notes', dp, errors, false, 1000), exercises: [] };
      if (day.id && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(day.id)) errors.push({ path: `${dp}.id`, message: 'Solo lettere minuscole, numeri e trattini (es. "giorno-1")' });
      if (ids.has(day.id)) errors.push({ path: `${dp}.id`, message: `Identificatore ripetuto “${day.id}”` });
      ids.add(day.id);
      if (!Array.isArray(d.exercises) || !d.exercises.length) errors.push({ path: `${dp}.exercises`, message: 'Serve almeno un esercizio' });
      else {
        if (d.exercises.length > 30) errors.push({ path: `${dp}.exercises`, message: 'Massimo 30 esercizi per giornata' });
        day.exercises = d.exercises.map((e, j) => validateExercise(e, `${dp}.exercises[${j}]`, errors, warnings));
        // superset groups must be consecutive
        const seen: string[] = [];
        day.exercises.forEach((e, j) => {
          if (!e.group) return;
          const prev = day.exercises[j - 1]?.group;
          if (e.group !== prev && seen.includes(e.group)) errors.push({ path: `${dp}.exercises[${j}].group`, message: `Gli esercizi della superserie “${e.group}” devono essere consecutivi` });
          if (e.group !== prev) seen.push(e.group);
        });
        for (const g of seen) if (day.exercises.filter((e) => e.group === g).length < 2) errors.push({ path: dp, message: `La superserie “${g}” ha un solo esercizio` });
      }
      return day;
    });
    if (prog.daysPerWeek !== prog.days.length) warnings.push({ path: `${P}.daysPerWeek`, message: `Indica ${prog.daysPerWeek} giornate a settimana ma ne contiene ${prog.days.length}` });
  }
  if (errors.length) return { errors, warnings };
  return { data: { format: FORMAT_ID, version: FORMAT_VERSION, generator: raw.generator as string | undefined, exportedAt: raw.exportedAt as string | undefined, program: prog }, errors, warnings };
}

function validateExercise(e: unknown, path: string, errors: Issue[], warnings: Issue[]): ExExercise {
  if (!isObj(e)) {
    errors.push({ path, message: 'Deve essere un oggetto' });
    return { name: '', sets: 1, restSec: 60 };
  }
  checkKeys(e, ['exerciseId', 'name', 'nameEn', 'equipment', 'sets', 'reps', 'durationSec', 'perSide', 'restSec', 'load', 'rpe', 'rir', 'group', 'warmupSets', 'notes', 'alternatives'], path, errors);
  const x: ExExercise = {
    exerciseId: str(e, 'exerciseId', path, errors, false, 80),
    name: str(e, 'name', path, errors, true, 100) ?? '',
    nameEn: str(e, 'nameEn', path, errors, false, 100),
    equipment: str(e, 'equipment', path, errors, false, 80),
    sets: int(e, 'sets', path, errors, 1, 10, true) ?? 1,
    reps: range(e, 'reps', path, errors, 100),
    durationSec: range(e, 'durationSec', path, errors, 7200),
    restSec: int(e, 'restSec', path, errors, 0, 600, true) ?? 60,
    rpe: num(e, 'rpe', path, errors, 5, 10),
    rir: int(e, 'rir', path, errors, 0, 6),
    warmupSets: int(e, 'warmupSets', path, errors, 0, 5),
    notes: str(e, 'notes', path, errors, false, 1000),
    alternatives: strList(e, 'alternatives', path, errors, 10),
  };
  if (e.perSide != null) {
    if (typeof e.perSide !== 'boolean') errors.push({ path: `${path}.perSide`, message: 'Deve essere true o false' });
    else x.perSide = e.perSide;
  }
  if (!!x.reps === !!x.durationSec) errors.push({ path, message: 'Indica “reps” oppure “durationSec” (uno dei due, non entrambi)' });
  if (e.group != null) {
    if (typeof e.group !== 'string' || !/^[A-Z]$/.test(e.group)) errors.push({ path: `${path}.group`, message: 'Lettera maiuscola singola (A, B, C…) per superserie e giant set' });
    else x.group = e.group;
  }
  if (e.load != null) {
    const l = e.load;
    if (!isObj(l)) errors.push({ path: `${path}.load`, message: 'Deve essere { "value": numero, "unit": "kg" | "lb" | "%1RM" }' });
    else {
      checkKeys(l, ['value', 'unit'], `${path}.load`, errors);
      const value = num(l, 'value', `${path}.load`, errors, 0, 1000);
      const unit = oneOf(l, 'unit', ['kg', 'lb', '%1RM'] as const, `${path}.load`, errors, true);
      if (value != null && unit) x.load = { value, unit };
    }
  }
  if (x.rpe != null && x.rir != null) warnings.push({ path, message: 'RPE e RIR entrambi indicati: verranno mostrati entrambi' });
  return x;
}

// ── Parsing (JSON, ChatGPT code fences, CSV) ────────────────────────────────────
export function parseText(text: string, nameForCsv = 'Scheda importata'): { raw?: unknown; kind: 'json' | 'csv'; errors: Issue[] } {
  if (new Blob([text]).size > MAX_BYTES) return { kind: 'json', errors: [{ path: '$', message: `File troppo grande (massimo ${MAX_BYTES / 1024} KB)` }] };
  let t = text.replace(/^﻿/, '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      return { raw: JSON.parse(t), kind: 'json', errors: [] };
    } catch (e) {
      return { kind: 'json', errors: [{ path: '$', message: `JSON non valido: ${(e as Error).message}` }] };
    }
  }
  return csvToExchange(t, nameForCsv);
}

const splitCsv = (line: string, sep: string) => {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === sep && !q) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
};

/** CSV with header: giorno;esercizio;serie;ripetizioni;recupero[;superserie;note;id_esercizio;rpe;rir]. */
export function csvToExchange(text: string, name: string): { raw?: unknown; kind: 'csv'; errors: Issue[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { kind: 'csv', errors: [{ path: 'riga 1', message: 'Il CSV deve avere un’intestazione e almeno una riga' }] };
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const head = splitCsv(lines[0], sep).map((h) => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_'));
  const col = (n: string[]) => head.findIndex((h) => n.includes(h));
  const C = { day: col(['giorno', 'giornata', 'day']), ex: col(['esercizio', 'exercise', 'nome']), sets: col(['serie', 'sets']), reps: col(['ripetizioni', 'rip', 'reps', 'durata']), rest: col(['recupero', 'recupero_s', 'rest', 'rest_sec']), group: col(['superserie', 'gruppo', 'group']), notes: col(['note', 'notes']), id: col(['id_esercizio', 'exerciseid', 'id']), rpe: col(['rpe']), rir: col(['rir']) };
  const errors: Issue[] = [];
  for (const [k, label] of [['day', 'giorno'], ['ex', 'esercizio'], ['sets', 'serie'], ['reps', 'ripetizioni'], ['rest', 'recupero']] as const) if (C[k] < 0) errors.push({ path: 'intestazione', message: `Colonna obbligatoria mancante: “${label}”` });
  if (errors.length) return { kind: 'csv', errors };
  const days: ExDay[] = [];
  lines.slice(1).forEach((l, i) => {
    const r = splitCsv(l, sep);
    const row = `riga ${i + 2}`;
    const dn = r[C.day];
    if (!dn) return void errors.push({ path: row, message: 'Giorno mancante' });
    let day = days.find((d) => d.name === dn);
    if (!day) {
      day = { id: `giorno-${days.length + 1}`, name: dn, exercises: [] };
      days.push(day);
    }
    const reps = (r[C.reps] ?? '').toLowerCase().replace(/\s/g, '');
    const m = reps.match(/^(\d+)(?:[-–](\d+))?(s|sec|secondi)?$/);
    if (!m) return void errors.push({ path: row, message: `Ripetizioni non leggibili “${r[C.reps]}” (usa 8-12 oppure 30s)` });
    const rg = { min: Number(m[1]), max: Number(m[2] ?? m[1]) };
    const n = (v: string | undefined) => (v == null || v === '' ? undefined : Number(v.replace(',', '.')));
    const ex: ExExercise = { name: r[C.ex] ?? '', sets: n(r[C.sets]) as number, restSec: n(r[C.rest]) as number, ...(m[3] ? { durationSec: rg } : { reps: rg }) };
    if (C.group >= 0 && r[C.group]) ex.group = r[C.group].toUpperCase();
    if (C.notes >= 0 && r[C.notes]) ex.notes = r[C.notes];
    if (C.id >= 0 && r[C.id]) ex.exerciseId = r[C.id];
    if (C.rpe >= 0 && r[C.rpe]) ex.rpe = n(r[C.rpe]);
    if (C.rir >= 0 && r[C.rir]) ex.rir = n(r[C.rir]);
    day.exercises.push(ex);
  });
  if (errors.length) return { kind: 'csv', errors };
  return { kind: 'csv', errors, raw: { format: FORMAT_ID, version: 1, generator: 'CSV', program: { name, goal: 'altro', level: 'intermedio', durationWeeks: 4, daysPerWeek: Math.min(7, days.length), days } } };
}

// ── Exercise matching ───────────────────────────────────────────────────────────
const STOP = new Set(['con', 'al', 'alla', 'alle', 'ai', 'agli', 'il', 'lo', 'la', 'le', 'i', 'gli', 'di', 'da', 'del', 'della', 'dei', 'a', 'e', 'in', 'su', 'sul', 'per', 'the', 'with', 'on', 'of', 'and']);
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .join(' ');

/** Common Italian/English names of the program exercises (exact synonyms only, no generic names). */
export const SYNONYMS: Record<string, string[]> = {
  'chest-press': ['chest press macchina', 'distensioni petto macchina', 'machine chest press'],
  'lat-pulldown-wide': ['lat machine presa larga', 'lat machine prona', 'lat pulldown presa larga', 'wide grip lat pulldown', 'lat machine avanti presa prona'],
  'lat-pulldown-neutral': ['lat machine presa stretta neutra', 'lat machine triangolo', 'lat pulldown presa neutra', 'neutral grip lat pulldown'],
  'incline-db-press': ['panca inclinata manubri', 'distensioni panca inclinata manubri', 'incline dumbbell bench press'],
  'cable-row-v': ['pulley triangolo', 'pulley basso triangolo', 'rematore cavo basso triangolo', 'seated cable row', 'pulley'],
  'lateral-raise': ['alzate laterali manubri', 'dumbbell lateral raise', 'side lateral raise'],
  'triceps-pushdown': ['pushdown tricipiti', 'push down tricipiti', 'spinte basso tricipiti cavo', 'triceps pushdown', 'tricipiti cavo alto'],
  'db-curl': ['curl manubri', 'curl bicipiti manubri', 'dumbbell curl', 'dumbbell biceps curl'],
  'leg-press': ['pressa', 'pressa 45', 'leg press 45'],
  'db-rdl': ['stacco rumeno manubri', 'dumbbell romanian deadlift', 'rdl manubri'],
  'leg-extension': ['leg extension', 'estensioni gambe', 'leg extensions'],
  'seated-leg-curl': ['leg curl seduto', 'seated leg curl'],
  'lying-leg-curl': ['leg curl sdraiato', 'leg curl prono', 'lying leg curl'],
  'calf-raise': ['calf raise', 'calf in piedi', 'polpacci in piedi', 'standing calf raise'],
  plank: ['plank', 'plank addominale', 'front plank'],
  'smith-incline-press': ['panca inclinata multipower', 'panca inclinata smith', 'smith machine incline press'],
  'low-row-machine': ['low row', 'low row macchina', 'rematore macchina', 'seated row machine'],
  'pec-fly': ['pec fly', 'pec deck', 'croci macchina', 'butterfly'],
  'shoulder-press-machine': ['shoulder press', 'shoulder press macchina', 'lento avanti macchina', 'machine shoulder press'],
  'incline-db-curl': ['curl panca inclinata', 'curl manubri panca inclinata', 'incline dumbbell curl'],
  'overhead-cable-triceps': ['estensioni tricipiti cavo', 'french press cavo', 'overhead cable triceps extension', 'estensioni tricipiti sopra testa cavo'],
  'hack-squat': ['hack squat'],
  'hip-thrust-machine': ['hip thrust machine', 'hip thrust macchina'],
  'assisted-split-squat': ['split squat assistito', 'split squat appoggio', 'assisted split squat'],
  'dead-bug': ['dead bug', 'dead bug addome'],
};

let index: Map<string, Set<string>> | null = null;
let indexSize = 0;
function getIndex() {
  const all = allExercises();
  if (index && indexSize === all.length) return index;
  index = new Map();
  indexSize = all.length;
  const add = (k: string, id: string) => {
    const n = normalize(k);
    if (!n) return;
    if (!index!.has(n)) index!.set(n, new Set());
    index!.get(n)!.add(id);
  };
  for (const e of all) {
    add(e.name, e.id);
    if (e.nameEn) add(e.nameEn, e.id);
  }
  for (const [id, list] of Object.entries(SYNONYMS)) if (EXERCISE_BY_ID[id]) list.forEach((s) => add(s, id));
  return index;
}

export type Match = { status: 'ok'; id: string; how: 'id' | 'nome' } | { status: 'ambiguous'; candidates: string[] } | { status: 'unknown'; suggestions: string[] };

const rank = (id: string) => (sourceOf(id) === 'scheda' ? 0 : sourceOf(id) === 'tuo' ? 1 : sourceOf(id) === 'libreria' ? 2 : 3);

/** Never guesses: only an official id or an exact (normalized) name/synonym is accepted automatically. */
export function matchExercise(e: { exerciseId?: string; name: string; nameEn?: string }): Match {
  if (e.exerciseId && EXERCISE_BY_ID[e.exerciseId]) return { status: 'ok', id: e.exerciseId, how: 'id' };
  const idx = getIndex();
  const ids = new Set<string>();
  for (const n of [e.name, e.nameEn].filter(Boolean) as string[]) idx.get(normalize(n))?.forEach((id) => ids.add(id));
  if (ids.size === 1) return { status: 'ok', id: [...ids][0], how: 'nome' };
  if (ids.size > 1) {
    // identical names in several sources: the program exercise (then the curated library) is the
    // canonical entry, but only when exactly one entry has that top priority
    const sorted = [...ids].sort((a, b) => rank(a) - rank(b));
    const top = sorted.filter((id) => rank(id) === rank(sorted[0]));
    if (top.length === 1 && rank(sorted[0]) <= 2) return { status: 'ok', id: top[0], how: 'nome' };
    return { status: 'ambiguous', candidates: sorted };
  }
  // variants: every word of the query appears in the candidate name (e.g. "lat machine" → both grips)
  const q = normalize(e.name).split(' ').filter(Boolean);
  if (q.length) {
    const cand = new Set<string>();
    for (const [k, set] of idx) {
      const words = k.split(' ');
      if (q.every((w) => words.includes(w))) set.forEach((id) => cand.add(id));
    }
    if (cand.size) return { status: 'ambiguous', candidates: [...cand].sort((a, b) => rank(a) - rank(b)).slice(0, 12) };
    // suggestions only (never applied automatically)
    const scored: [string, number][] = [];
    for (const [k, set] of idx) {
      const words = k.split(' ');
      const hit = q.filter((w) => words.includes(w)).length / q.length;
      if (hit >= 0.5) set.forEach((id) => scored.push([id, hit]));
    }
    const sug = [...new Set(scored.sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0])).map((x) => x[0]))].slice(0, 6);
    return { status: 'unknown', suggestions: sug };
  }
  return { status: 'unknown', suggestions: [] };
}

// ── Draft (editable preview) → atomic commit ────────────────────────────────────
export interface DraftItem {
  key: string;
  src: ExExercise;
  match: Match;
  /** Chosen library exercise, or null when a new custom exercise will be created. */
  chosenId: string | null;
  createCustom: boolean;
  customMuscle: MuscleId;
  sets: number;
  repsMin: number;
  repsMax: number;
  unit: 'reps' | 'sec';
  restSec: number;
}
export interface Draft {
  file: ExFile;
  name: string;
  goal: string;
  durationWeeks: number;
  days: { id: string; name: string; weekday?: string; muscleGroups: string[]; notes?: string; items: DraftItem[] }[];
  sourceKey: string;
}

const REGION_TO_MUSCLE: Record<string, MuscleId> = { petto: 'pettorali', schiena: 'dorsali', dorso: 'dorsali', spalle: 'deltoide-lat', bicipiti: 'bicipiti', tricipiti: 'tricipiti', gambe: 'quadricipiti', quadricipiti: 'quadricipiti', femorali: 'femorali', glutei: 'glutei', polpacci: 'polpacci', addome: 'addominali', addominali: 'addominali', core: 'addominali', braccia: 'bicipiti', lombari: 'lombari' };
const guessMuscle = (groups: string[]) => {
  for (const g of groups) {
    const m = REGION_TO_MUSCLE[normalize(g).split(' ')[0]];
    if (m) return m;
  }
  return 'pettorali' as MuscleId;
};

/** FNV-1a hash of the training content (name excluded) — detects re-imports of the same program. */
export function contentKey(p: ExProgram): string {
  const s = JSON.stringify(p.days.map((d) => d.exercises.map((e) => [normalize(e.name), e.sets, e.reps?.min, e.reps?.max, e.durationSec?.min, e.restSec, e.group ?? ''])));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function buildDraft(file: ExFile): Draft {
  const p = file.program;
  return {
    file,
    name: p.name,
    goal: p.goal,
    durationWeeks: p.durationWeeks,
    sourceKey: contentKey(p),
    days: p.days.map((d) => ({
      id: d.id,
      name: d.name,
      weekday: d.weekday,
      muscleGroups: d.muscleGroups ?? [],
      notes: d.notes,
      items: d.exercises.map((e, i) => {
        const m = matchExercise(e);
        return {
          key: `${d.id}-${i}`,
          src: e,
          match: m,
          chosenId: m.status === 'ok' ? m.id : null,
          createCustom: false,
          customMuscle: guessMuscle(d.muscleGroups ?? []),
          sets: e.sets,
          repsMin: (e.reps ?? e.durationSec)!.min,
          repsMax: (e.reps ?? e.durationSec)!.max,
          unit: e.durationSec ? 'sec' : 'reps',
          restSec: e.restSec,
        };
      }),
    })),
  };
}

/** What still blocks the import (unresolved exercises). */
export function draftProblems(d: Draft): string[] {
  const out: string[] = [];
  if (!d.name.trim()) out.push('Il programma deve avere un nome');
  for (const day of d.days)
    for (const it of day.items) if (!it.chosenId && !it.createCustom) out.push(`${day.name}: “${it.src.name}” ${it.match.status === 'ambiguous' ? 'corrisponde a più esercizi: scegli quello giusto' : 'non è nella libreria: crea un esercizio o sostituiscilo'}`);
  return out;
}

/** Pure: computes the new settings with the imported program. Applied with ONE settings write (atomic). */
export function commitDraft(d: Draft, s: Settings, mode: 'new' | { replace: string }, now = Date.now()): Settings {
  const problems = draftProblems(d);
  if (problems.length) throw new Error(problems[0]);
  const p = d.file.program;
  const customs: CustomExercise[] = [];
  const replacing = typeof mode === 'object' ? s.programs.find((x) => x.id === mode.replace) : undefined;
  const programId = replacing?.id ?? uid();
  const routines: Routine[] = d.days.map((day, di) => {
    const items: RoutineItem[] = day.items.map((it) => {
      let id = it.chosenId;
      if (!id) {
        const c: CustomExercise = { id: `u-${uid()}`, name: it.src.name, group: MUSCLE_REGION[it.customMuscle], primary: [it.customMuscle], secondary: [], equipment: it.src.equipment ?? '', tracking: it.unit === 'sec' ? 'time' : 'reps', load: 'external', restSec: it.restSec, notes: it.src.notes };
        customs.push(c);
        id = c.id;
      }
      const e = it.src;
      return {
        id: uid(),
        exerciseId: id,
        sets: it.sets,
        repsMin: Math.min(it.repsMin, it.repsMax),
        repsMax: Math.max(it.repsMin, it.repsMax),
        unit: it.unit,
        perSide: !!e.perSide,
        ...(e.perSide ? { sideLabel: 'per lato' } : {}),
        restSec: it.restSec,
        ...(e.group ? { group: e.group } : {}),
        ...(e.rpe != null ? { rpe: e.rpe } : {}),
        ...(e.rir != null ? { rir: e.rir } : {}),
        ...(e.load ? { load: e.load } : {}),
        ...(e.warmupSets ? { warmupSets: e.warmupSets } : {}),
        ...(e.notes ? { notes: e.notes } : {}),
        ...(e.alternatives?.length ? { alternatives: e.alternatives } : {}),
      };
    });
    const old = replacing?.days[di];
    return { id: old?.routineId ?? uid(), name: `${d.name} · ${day.name}`, folder: IMPORT_FOLDER, accent: ['#4f80ff', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899'][di % 7], items, createdAt: now };
  });
  const program: Program = {
    id: programId,
    name: d.name.trim(),
    description: p.description ?? '',
    author: p.author ?? '',
    goal: d.goal,
    level: p.level,
    durationWeeks: d.durationWeeks,
    daysPerWeek: p.daysPerWeek,
    recommendedWeekdays: p.recommendedWeekdays ?? [],
    progression: p.progression ?? '',
    phases: (p.phases ?? []).map((ph): ProgramPhase => ({ name: ph.name, fromWeek: ph.fromWeek, toWeek: ph.toWeek, deload: !!ph.deload, setsDelta: ph.setsDelta ?? 0, rpe: ph.rpe, rir: ph.rir, notes: ph.notes })),
    days: d.days.map((day, i) => ({ id: day.id, name: day.name, weekday: day.weekday, muscleGroups: day.muscleGroups, notes: day.notes, routineId: routines[i].id })),
    folder: IMPORT_FOLDER,
    archived: false,
    createdAt: replacing?.createdAt ?? now,
    updatedAt: now,
    sourceKey: d.sourceKey,
    activatedAt: replacing?.activatedAt,
  };
  const oldRoutineIds = new Set(replacing?.days.map((x) => x.routineId) ?? []);
  return {
    ...s,
    customExercises: [...s.customExercises, ...customs],
    routines: [...s.routines.filter((r) => !oldRoutineIds.has(r.id)), ...routines],
    programs: replacing ? s.programs.map((x) => (x.id === replacing.id ? program : x)) : [...s.programs, program],
  };
}

/** Existing program that looks like the same import (same content or same name). */
export const findDuplicate = (d: Draft, s: Settings) => s.programs.find((p) => p.sourceKey === d.sourceKey) ?? s.programs.find((p) => normalize(p.name) === normalize(d.name));

// ── Export (no personal data: no history, loads, measurements, photos) ──────────
function itemToEx(it: RoutineItem): ExExercise {
  const ex = EXERCISE_BY_ID[it.exerciseId];
  const rg = { min: it.repsMin, max: it.repsMax };
  return {
    exerciseId: it.exerciseId,
    name: ex?.name ?? 'Esercizio',
    ...(ex?.nameEn && ex.nameEn !== ex.name ? { nameEn: ex.nameEn } : {}),
    ...(ex?.equipment ? { equipment: ex.equipment.slice(0, 80) } : {}),
    sets: it.sets,
    ...(it.unit === 'reps' ? { reps: rg } : { durationSec: it.unit === 'min' ? { min: rg.min * 60, max: rg.max * 60 } : rg }),
    ...(it.perSide ? { perSide: true } : {}),
    restSec: it.restSec ?? ex?.restSec ?? 90,
    ...(it.load ? { load: it.load } : {}),
    ...(it.rpe != null ? { rpe: it.rpe } : {}),
    ...(it.rir != null ? { rir: it.rir } : {}),
    ...(it.group ? { group: it.group } : {}),
    ...(it.warmupSets ? { warmupSets: it.warmupSets } : {}),
    ...(it.notes ? { notes: it.notes } : {}),
    ...(it.alternatives?.length ? { alternatives: it.alternatives } : {}),
  };
}
const fileOf = (program: ExProgram): ExFile => ({ $schema: 'https://forma-lab.pages.dev/formats/forma-lab-workout-exchange-v1.schema.json', format: FORMAT_ID, version: FORMAT_VERSION, generator: 'FORMA LAB 5.0', exportedAt: new Date().toISOString(), program });

export function exportProgram(p: Program, s: Settings): ExFile {
  return fileOf({
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    ...(p.author ? { author: p.author } : {}),
    goal: (GOALS as readonly string[]).includes(p.goal) ? (p.goal as ExProgram['goal']) : 'altro',
    level: (LEVELS as readonly string[]).includes(p.level) ? (p.level as ExProgram['level']) : 'intermedio',
    durationWeeks: p.durationWeeks,
    daysPerWeek: p.days.length,
    ...(p.recommendedWeekdays.length ? { recommendedWeekdays: p.recommendedWeekdays as ExProgram['recommendedWeekdays'] } : {}),
    ...(p.progression ? { progression: p.progression } : {}),
    ...(p.phases.length ? { phases: p.phases.map((ph) => ({ name: ph.name, fromWeek: ph.fromWeek, toWeek: ph.toWeek, ...(ph.deload ? { deload: true } : {}), ...(ph.setsDelta ? { setsDelta: ph.setsDelta } : {}), ...(ph.rpe != null ? { rpe: ph.rpe } : {}), ...(ph.rir != null ? { rir: ph.rir } : {}), ...(ph.notes ? { notes: ph.notes } : {}) })) } : {}),
    days: p.days.map((d) => ({
      id: d.id,
      name: d.name,
      ...(d.weekday ? { weekday: d.weekday as ExDay['weekday'] } : {}),
      ...(d.muscleGroups.length ? { muscleGroups: d.muscleGroups } : {}),
      ...(d.notes ? { notes: d.notes } : {}),
      exercises: (s.routines.find((r) => r.id === d.routineId)?.items ?? []).map(itemToEx),
    })),
  });
}

/** A single routine as a 1-day program. */
export function exportRoutine(r: Routine): ExFile {
  return fileOf({ name: r.name.slice(0, 80), goal: 'altro', level: 'intermedio', durationWeeks: 4, daysPerWeek: 1, days: [{ id: 'giorno-1', name: r.name.slice(0, 80), exercises: r.items.map(itemToEx) }] });
}

/** The original 4-day plan (with the user's edits to the days, if any). */
export function exportOriginalPlan(s: Settings): ExFile {
  const wd = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'] as const;
  return fileOf({
    name: 'Scheda FORMA LAB (4 giorni)',
    description: 'Upper/Lower su 4 giorni: Lunedì, Martedì, Giovedì, Venerdì.',
    goal: 'ricomposizione',
    level: 'principiante',
    durationWeeks: 8,
    daysPerWeek: 4,
    recommendedWeekdays: ['lunedi', 'martedi', 'giovedi', 'venerdi'],
    days: DAYS.map((d) => ({ id: d.id, name: d.name, weekday: wd[d.weekday] as ExDay['weekday'], muscleGroups: d.focus, exercises: dayAsItems(d.id, s).map(itemToEx) })),
  });
}

// ── Differences (re-import of an exported/updated program) ──────────────────────
export function diffPrograms(before: ExProgram, after: ExProgram): string[] {
  const out: string[] = [];
  if (before.durationWeeks !== after.durationWeeks) out.push(`Durata: ${before.durationWeeks} → ${after.durationWeeks} settimane`);
  if ((before.phases?.length ?? 0) !== (after.phases?.length ?? 0)) out.push(`Fasi: ${before.phases?.length ?? 0} → ${after.phases?.length ?? 0}`);
  const key = (e: ExExercise) => e.exerciseId ?? normalize(e.name);
  for (const d of after.days) {
    const old = before.days.find((x) => x.id === d.id) ?? before.days.find((x) => normalize(x.name) === normalize(d.name));
    if (!old) {
      out.push(`Nuova giornata: ${d.name}`);
      continue;
    }
    for (const e of d.exercises) {
      const o = old.exercises.find((x) => key(x) === key(e));
      if (!o) out.push(`${d.name}: aggiunto ${e.name}`);
      else {
        const ch: string[] = [];
        if (o.sets !== e.sets) ch.push(`serie ${o.sets} → ${e.sets}`);
        const or = o.reps ?? o.durationSec;
        const nr = e.reps ?? e.durationSec;
        if (or && nr && (or.min !== nr.min || or.max !== nr.max)) ch.push(`ripetizioni ${or.min}–${or.max} → ${nr.min}–${nr.max}`);
        if (o.restSec !== e.restSec) ch.push(`recupero ${o.restSec}s → ${e.restSec}s`);
        if ((o.group ?? '') !== (e.group ?? '')) ch.push(`superserie ${o.group ?? '—'} → ${e.group ?? '—'}`);
        if (ch.length) out.push(`${d.name} · ${e.name}: ${ch.join(', ')}`);
      }
    }
    for (const o of old.exercises) if (!d.exercises.some((e) => key(e) === key(o))) out.push(`${d.name}: rimosso ${o.name}`);
  }
  for (const o of before.days) if (!after.days.some((d) => d.id === o.id || normalize(d.name) === normalize(o.name))) out.push(`Giornata rimossa: ${o.name}`);
  return out;
}

// ── Program phases ─────────────────────────────────────────────────────────────
export function currentWeek(p: Program, now = Date.now()): number {
  if (!p.activatedAt) return 1;
  return Math.max(1, Math.min(p.durationWeeks, Math.floor((now - p.activatedAt) / (7 * 86400000)) + 1));
}
export const phaseOf = (p: Program, week: number) => p.phases.find((ph) => week >= ph.fromWeek && week <= ph.toWeek);
/** Sets for a given week: phase delta, deload = 60% of the sets (at least 1). */
export function setsForWeek(sets: number, ph?: ProgramPhase): number {
  if (!ph) return sets;
  const s = Math.max(1, sets + (ph.setsDelta ?? 0));
  return ph.deload ? Math.max(1, Math.round(s * 0.6)) : s;
}

