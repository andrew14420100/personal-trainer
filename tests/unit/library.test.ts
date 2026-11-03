import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020';
import '../../src/data/catalog';
import { loadExtendedCatalog } from '../../src/data/ext';
import { buildDraft, parseText, validateExchange } from '../../src/lib/exchange';
import { allSchede, applyImport, assignWeekdays, blockingSession, defaultName, deleteSchede, duplicateProgram, NONE, ORIGINAL, planDaysFor, previousDefault, restoreOriginal, setArchived, setDefault } from '../../src/lib/library';
import { planFor, setPlanSchedule } from '../../src/lib/schedule';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../../src/lib/settings';
import { DAYS } from '../../src/data/program';
import type { Session } from '../../src/lib/db';

const read = (f: string) => readFileSync(`public/formats/${f}`, 'utf8');
const USER_FILE = 'chatgpt-ripartenza-8-settimane.json';
const base = (): Settings => structuredClone({ ...DEFAULT_SETTINGS, routines: [{ id: 'mine', name: 'La mia scheda', accent: '#000', items: [], createdAt: 1 }] });
const NOW = new Date('2026-11-04T10:00:00').getTime(); // a Wednesday

function draftOf(f = USER_FILE) {
  const p = parseText(read(f));
  const v = validateExchange(p.raw);
  if (!v.data) throw new Error(JSON.stringify(v.errors));
  const d = buildDraft(v.data);
  d.days.forEach((day) => day.items.forEach((it) => {
    if (!it.chosenId) {
      if (it.match.status === 'ambiguous') it.chosenId = it.match.candidates[0];
      else it.createCustom = true;
    }
  }));
  return d;
}
const withProgram = (action: Parameters<typeof applyImport>[2] = 'add-default', s = base()) => applyImport(draftOf(), s, action, 'new', NOW);

describe('the user’s 8-week Upper/Lower program', () => {
  it('is valid for the JSON Schema and the app validator, and every exercise is recognized', async () => {
    await loadExtendedCatalog();
    const raw = JSON.parse(read(USER_FILE));
    const check = new Ajv2020({ allErrors: true, strict: false }).compile(JSON.parse(read('forma-lab-workout-exchange-v1.schema.json')));
    expect(check(raw), JSON.stringify(check.errors)).toBe(true);
    expect(validateExchange(raw).errors).toEqual([]);
    const d = buildDraft(validateExchange(raw).data!);
    expect(d.days.map((x) => x.id)).toEqual(['upper-a', 'lower-a', 'upper-b', 'lower-b']);
    expect(d.durationWeeks).toBe(8);
    const unknown = d.days.flatMap((x) => x.items).filter((it) => it.match.status !== 'ok');
    expect(unknown.map((x) => x.src.name)).toEqual([]);
  });
  it('imports and becomes the default: Mon/Tue/Thu/Fri', () => {
    const { settings, programId } = withProgram();
    expect(settings.activeProgramId).toBe(programId);
    const days = planDaysFor(settings);
    expect(days.map((d) => d.weekday)).toEqual([1, 2, 4, 5]);
    expect(days.every((d) => d.id.startsWith('r:'))).toBe(true);
    expect(defaultName(settings)).toMatch(/Ripartenza/);
  });
});

describe('default program', () => {
  it('the calendar uses ONLY the default program, from the activation day', () => {
    const { settings } = withProgram();
    setPlanSchedule(planDaysFor(settings), settings.planSince);
    expect(settings.planSince).toBe('2026-11-04');
    expect(planFor('2026-11-05', {}).plan?.name).toBe(settings.programs[0].days[2].name); // Thursday = 3rd day
    expect(planFor('2026-11-05', {}).plan?.id.startsWith('r:')).toBe(true);
    expect(planFor('2026-11-04', {}).plan).toBeUndefined(); // Wednesday: rest day
    expect(planFor('2026-11-02', {}).plan).toBeUndefined(); // before activation: no invented missed day
    setPlanSchedule(DAYS, '');
  });
  it('switching default keeps past moves, drops future ones and remembers the previous', () => {
    const s = { ...base(), moves: { '2026-10-01': '2026-10-02', '2026-11-10': '2026-11-11' } };
    const { settings } = withProgram('add-default', s);
    expect(settings.moves).toEqual({ '2026-10-01': '2026-10-02' });
    expect(previousDefault(settings)).toBe(ORIGINAL);
    const back = setDefault(settings, previousDefault(settings), NOW);
    expect(back.activeProgramId).toBe(ORIGINAL);
    expect(planDaysFor(back)).toBe(DAYS);
  });
  it('"Aggiungi" never changes the default', () => {
    const { settings } = withProgram('add');
    expect(settings.activeProgramId).toBe(ORIGINAL);
  });
  it('assignWeekdays: explicit, recommended, then spread', () => {
    expect(assignWeekdays({ days: [{ weekday: 'lunedi' }, {}, {}] as never, recommendedWeekdays: ['martedi', 'giovedi'] as never })).toEqual([1, 2, 4]);
    expect(assignWeekdays({ days: [{}, {}] as never, recommendedWeekdays: [] })).toEqual([1, 2]);
  });
});

describe('deleting schede', () => {
  it('deleting the original: it never comes back by itself, only with "Ripristina modello originale"', async () => {
    const s = deleteSchede(base(), { original: true });
    expect(s.activeProgramId).toBe(NONE);
    expect(planDaysFor(s)).toEqual([]);
    await saveSettings(s);
    const again = await loadSettings();
    expect(again.originalHidden).toBe(true);
    expect(again.activeProgramId).toBe(NONE);
    const r = restoreOriginal(again);
    expect(r.originalHidden).toBe(false);
    expect(r.activeProgramId).toBe(NONE); // restored to the list, not made default
  });
  it('deleting the default program leaves "none" (no fallback to the original)', () => {
    const { settings, programId } = withProgram();
    const s = deleteSchede(settings, { programs: [programId] });
    expect(s.activeProgramId).toBe(NONE);
    expect(s.routines.some((r) => r.name.includes('Ripartenza'))).toBe(false);
    expect(planDaysFor(s)).toEqual([]);
  });
  it('"Elimina tutte" empties the app; history, calibration and body data are not in scope', () => {
    const { settings } = withProgram();
    const s = deleteSchede(settings, allSchede(settings));
    expect(s.programs).toEqual([]);
    expect(s.routines).toEqual([]);
    expect(s.originalHidden).toBe(true);
    expect(s.activeProgramId).toBe(NONE);
    expect(allSchede(s)).toEqual({ original: false, programs: [], routines: [] });
    // import after "Elimina tutte"
    const again = applyImport(draftOf(), s, 'add-default', 'new', NOW);
    expect(planDaysFor(again.settings)).toHaveLength(4);
  });
  it('"Sostituisci predefinita" removes only the previous default', () => {
    const { settings } = withProgram('replace-default');
    expect(settings.originalHidden).toBe(true);
    expect(settings.routines.some((r) => r.id === 'mine')).toBe(true);
  });
  it('"Sostituisci tutte" keeps only the imported program', () => {
    const { settings, programId } = withProgram('replace-all');
    expect(settings.programs.map((p) => p.id)).toEqual([programId]);
    expect(settings.routines.some((r) => r.id === 'mine')).toBe(false);
    expect(settings.originalHidden).toBe(true);
  });
  it('an open workout on a scheda blocks its deletion', () => {
    const { settings, programId } = withProgram();
    const rid = settings.programs[0].days[0].routineId;
    const active = { id: 'x', dayId: `r:${rid}`, status: 'active' } as unknown as Session;
    expect(blockingSession(active, settings, { programs: [programId] })).toBe(true);
    expect(blockingSession(active, settings, { routines: ['mine'] })).toBe(false);
    expect(blockingSession({ ...active, dayId: 'upper-a' } as Session, settings, { original: true })).toBe(true);
    expect(blockingSession(null, settings, { original: true })).toBe(false);
  });
});

describe('archive and duplicate', () => {
  it('archiving the default leaves "none"; restoring keeps it non-default', () => {
    const { settings, programId } = withProgram();
    const a = setArchived(settings, { programs: [programId], routines: ['mine'] }, true);
    expect(a.activeProgramId).toBe(NONE);
    expect(a.routines.find((r) => r.id === 'mine')?.archived).toBe(true);
    const r = setArchived(a, { programs: [programId] }, false);
    expect(r.programs[0].archived).toBe(false);
    expect(r.activeProgramId).toBe(NONE);
  });
  it('duplicating a program copies its routines with new ids', () => {
    const { settings, programId } = withProgram();
    const d = duplicateProgram(settings, programId, NOW);
    expect(d.programs).toHaveLength(2);
    const [a, b] = d.programs;
    expect(new Set([...a.days, ...b.days].map((x) => x.routineId)).size).toBe(8);
    expect(d.activeProgramId).toBe(programId);
  });
});

describe('migration from 4.1/5.0', () => {
  it('settings without activeProgramId use the original plan', async () => {
    const old = structuredClone(DEFAULT_SETTINGS) as Partial<Settings>;
    delete old.activeProgramId;
    delete old.originalHidden;
    await saveSettings(old as Settings);
    const s = await loadSettings();
    expect(s.activeProgramId).toBe(ORIGINAL);
    expect(s.originalHidden).toBe(false);
    expect(planDaysFor(s)).toBe(DAYS);
  });
});
