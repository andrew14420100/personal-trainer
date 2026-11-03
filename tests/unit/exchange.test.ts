import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020';
import '../../src/data/catalog';
import { loadExtendedCatalog } from '../../src/data/ext';
import { buildDraft, commitDraft, contentKey, csvToExchange, diffPrograms, draftProblems, exportProgram, findDuplicate, matchExercise, parseText, phaseOf, setsForWeek, validateExchange, type ExFile } from '../../src/lib/exchange';
import { DEFAULT_SETTINGS, type Settings } from '../../src/lib/settings';

const read = (f: string) => readFileSync(`public/formats/${f}`, 'utf8');
const schema = JSON.parse(read('forma-lab-workout-exchange-v1.schema.json'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const schemaCheck = ajv.compile(schema);
const ok = (text: string) => {
  const p = parseText(text);
  const v = validateExchange(p.raw);
  if (!v.data) throw new Error(JSON.stringify([...p.errors, ...v.errors]));
  return v.data;
};
const base = (): Settings => structuredClone({ ...DEFAULT_SETTINGS, routines: [{ id: 'mine', name: 'La mia scheda', accent: '#000', items: [], createdAt: 1 }], dayEdits: { 'upper-a': [] } });
const resolveAll = (d: ReturnType<typeof buildDraft>) => {
  d.days.forEach((day) => day.items.forEach((it) => {
    if (!it.chosenId) {
      if (it.match.status === 'ambiguous') it.chosenId = it.match.candidates[0];
      else it.createCustom = true;
    }
  }));
  return d;
};

describe('Workout Exchange v1 — schema and examples', () => {
  it('both official examples are valid for the JSON Schema AND the app validator', async () => {
    await loadExtendedCatalog();
    for (const f of ['esempio-scheda-4-giorni.json', 'esempio-8-settimane.json']) {
      const raw = JSON.parse(read(f));
      expect(schemaCheck(raw), JSON.stringify(schemaCheck.errors)).toBe(true);
      expect(validateExchange(raw).errors).toEqual([]);
    }
  });
  it('schema and validator agree on invalid files', () => {
    const good = JSON.parse(read('esempio-8-settimane.json'));
    const variants: [string, (x: any) => void][] = [
      ['wrong format', (x) => (x.format = 'altro')],
      ['newer version', (x) => (x.version = 2)],
      ['unknown field', (x) => (x.program.colore = 'blu')],
      ['missing sets', (x) => delete x.program.days[0].exercises[0].sets],
      ['reps and duration', (x) => (x.program.days[1].exercises[2].reps = { min: 1, max: 2 })],
      ['bad weekday', (x) => (x.program.days[0].weekday = 'lun')],
      ['bad group', (x) => (x.program.days[0].exercises[2].group = 'a1')],
      ['sets out of range', (x) => (x.program.days[0].exercises[0].sets = 50)],
    ];
    for (const [name, mut] of variants) {
      const x = structuredClone(good);
      mut(x);
      expect(schemaCheck(x), name).toBe(false);
      expect(validateExchange(x).errors.length, name).toBeGreaterThan(0);
    }
  });
});

describe('Workout Exchange v1 — import', () => {
  it('1. imports the 4-day program: 26 positions, all recognised by id', () => {
    const d = buildDraft(ok(read('esempio-scheda-4-giorni.json')));
    expect(d.days).toHaveLength(4);
    expect(d.days.flatMap((x) => x.items)).toHaveLength(26);
    expect(d.days.flatMap((x) => x.items).every((i) => i.match.status === 'ok')).toBe(true);
    const s = commitDraft(d, base(), 'new');
    expect(s.programs).toHaveLength(1);
    expect(s.programs[0].days).toHaveLength(4);
    expect(s.routines.filter((r) => r.folder === 'Schede create con ChatGPT').reduce((a, r) => a + r.items.length, 0)).toBe(26);
  });
  it('2. imports an 8-week program with phases and deload', () => {
    const s = commitDraft(resolveAll(buildDraft(ok(read('esempio-8-settimane.json')))), base(), 'new');
    const p = s.programs[0];
    expect(p.durationWeeks).toBe(8);
    expect(p.phases).toHaveLength(4);
    expect(setsForWeek(3, phaseOf(p, 2))).toBe(3);
    expect(setsForWeek(3, phaseOf(p, 5))).toBe(4); // +1 set
    expect(setsForWeek(3, phaseOf(p, 7))).toBe(2); // deload 60%
  });
  it('3. keeps supersets and giant sets', () => {
    const s = commitDraft(resolveAll(buildDraft(ok(read('esempio-8-settimane.json')))), base(), 'new');
    const day1 = s.routines.find((r) => r.id === s.programs[0].days[0].routineId)!;
    const day3 = s.routines.find((r) => r.id === s.programs[0].days[2].routineId)!;
    expect(day1.items.filter((i) => i.group === 'A')).toHaveLength(2);
    expect(day3.items.filter((i) => i.group === 'B')).toHaveLength(3);
  });
  it('4. recognises exercises already in the library by Italian name and synonyms', () => {
    expect(matchExercise({ name: 'Lat Machine presa prona' })).toEqual({ status: 'ok', id: 'lat-pulldown-wide', how: 'nome' });
    expect(matchExercise({ name: 'Pulley triangolo' })).toMatchObject({ status: 'ok', id: 'cable-row-v' });
    expect(matchExercise({ name: 'panca inclinata al Multipower' })).toMatchObject({ status: 'ok', id: 'smith-incline-press' });
    expect(matchExercise({ name: 'Qualcosa', exerciseId: 'leg-press' })).toMatchObject({ status: 'ok', id: 'leg-press', how: 'id' });
  });
  it('5. unknown exercise blocks the import until it is created or replaced', () => {
    const f = ok(read('esempio-8-settimane.json'));
    f.program.days[0].exercises[0] = { name: 'Esercizio inventato XYZ', sets: 3, reps: { min: 8, max: 10 }, restSec: 90 };
    const d = buildDraft(f);
    expect(d.days[0].items[0].match.status).toBe('unknown');
    expect(draftProblems(d).some((p) => p.includes('Esercizio inventato XYZ'))).toBe(true);
    expect(() => commitDraft(d, base(), 'new')).toThrow();
    d.days[0].items[0].createCustom = true;
    resolveAll(d);
    const s = commitDraft(d, base(), 'new');
    expect(s.customExercises.some((c) => c.name === 'Esercizio inventato XYZ')).toBe(true);
  });
  it('6. ambiguous names ask for a choice and are never replaced automatically', () => {
    const m = matchExercise({ name: 'Lat machine' });
    expect(m.status).toBe('ambiguous');
    if (m.status === 'ambiguous') expect(m.candidates).toEqual(expect.arrayContaining(['lat-pulldown-wide', 'lat-pulldown-neutral']));
    const m2 = matchExercise({ name: 'Alzate laterali' });
    expect(m2.status).toBe('ambiguous');
  });
  it('7. rejects invalid files with readable errors', () => {
    expect(parseText('{ non è json').errors[0].message).toMatch(/JSON non valido/);
    expect(validateExchange({ format: 'forma-lab-workout-exchange', version: 1 }).errors[0].message).toMatch(/program/);
    expect(validateExchange([]).errors.length).toBeGreaterThan(0);
  });
  it('8. rejects unsafe content', () => {
    const f = JSON.parse(read('esempio-8-settimane.json'));
    const a = structuredClone(f);
    a.program.days[0].notes = '<script>alert(1)</script>';
    expect(validateExchange(a).errors[0].message).toMatch(/non sicuro/);
    const b = JSON.parse(read('esempio-8-settimane.json').replace('"program": {', '"program": { "__proto__": { "x": 1 },'));
    expect(validateExchange(b).errors.some((e) => /non sicuro/.test(e.message))).toBe(true);
    const c = structuredClone(f);
    c.program.description = 'javascript:alert(1)';
    expect(validateExchange(c).errors.length).toBeGreaterThan(0);
    expect(parseText('x'.repeat(600 * 1024)).errors[0].message).toMatch(/troppo grande/);
  });
  it('9. detects a duplicate import and can update it in place', () => {
    const f = ok(read('esempio-8-settimane.json'));
    const s1 = commitDraft(resolveAll(buildDraft(f)), base(), 'new');
    const again = resolveAll(buildDraft(f));
    const dup = findDuplicate(again, s1)!;
    expect(dup.id).toBe(s1.programs[0].id);
    again.days[0].items[0].sets = 5;
    const s2 = commitDraft(again, s1, { replace: dup.id });
    expect(s2.programs).toHaveLength(1);
    expect(s2.routines.filter((r) => r.folder === 'Schede create con ChatGPT')).toHaveLength(4);
    expect(s2.routines.find((r) => r.id === s2.programs[0].days[0].routineId)!.items[0].sets).toBe(5);
  });
  it('10. export → re-import keeps every training detail', () => {
    const f = ok(read('esempio-8-settimane.json'));
    const s = commitDraft(resolveAll(buildDraft(f)), base(), 'new');
    const out: ExFile = exportProgram(s.programs[0], s);
    expect(schemaCheck(JSON.parse(JSON.stringify(out)))).toBe(true);
    const back = ok(JSON.stringify(out));
    expect(back.program.phases).toEqual(f.program.phases);
    expect(back.program.days.map((d) => d.exercises.map((e) => [e.sets, e.reps, e.durationSec, e.restSec, e.group, e.rpe, e.rir, e.load, e.warmupSets, e.notes, e.perSide, e.alternatives]))).toEqual(
      f.program.days.map((d) => d.exercises.map((e) => [e.sets, e.reps, e.durationSec, e.restSec, e.group, e.rpe, e.rir, e.load, e.warmupSets, e.notes, e.perSide, e.alternatives])),
    );
    expect(diffPrograms(f.program, back.program).filter((x) => !x.includes('aggiunto') && !x.includes('rimosso'))).toEqual([]);
    expect(JSON.stringify(out)).not.toMatch(/weight|bodyWeight|photo|sessions/);
  });
  it('11. never touches the original plan, other routines or history', () => {
    const before = base();
    const s = commitDraft(resolveAll(buildDraft(ok(read('esempio-8-settimane.json')))), before, 'new');
    expect(s.dayEdits).toEqual(before.dayEdits);
    expect(s.routines.find((r) => r.id === 'mine')).toEqual(before.routines[0]);
    expect(Object.keys(s)).toEqual(Object.keys(before)); // only settings, never sessions
  });
  it('reads ChatGPT answers wrapped in ```json fences and CSV files', () => {
    const fenced = 'Ecco la scheda:\n```json\n' + read('esempio-8-settimane.json') + '\n```\nBuon allenamento!';
    expect(ok(fenced).program.days).toHaveLength(4);
    const csv = 'giorno;esercizio;serie;ripetizioni;recupero;superserie\nGiorno A;Leg Press;3;8-12;120;\nGiorno A;Plank;2;30-45s;60;\nGiorno B;Curl con manubri;2;10-15;60;A\nGiorno B;Pushdown tricipiti;2;10-15;60;A';
    const c = csvToExchange(csv, 'Da CSV');
    const v = validateExchange(c.raw);
    expect(v.errors).toEqual([]);
    expect(v.data!.program.days[0].exercises[1].durationSec).toEqual({ min: 30, max: 45 });
    expect(csvToExchange('a;b\n1;2', 'x').errors[0].message).toMatch(/Colonna obbligatoria/);
  });
  it('content key ignores the name (same program renamed is still a duplicate)', () => {
    const f = ok(read('esempio-8-settimane.json'));
    const g = structuredClone(f);
    g.program.name = 'Altro nome';
    expect(contentKey(g.program)).toBe(contentKey(f.program));
  });
});
