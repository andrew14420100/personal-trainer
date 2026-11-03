import { describe, expect, it } from 'vitest';
import { exchangeToRoutines, matchExchangeExercise, parseExchange, routinesToExchange } from '../../src/lib/workoutExchange';

const program = {
  format: 'forma-lab-workout-exchange',
  version: 1,
  program: { id: 'test', title: 'Test quattro giorni', author: 'ChatGPT', folder: 'Schede create con ChatGPT' },
  days: [
    { id: 'd1', name: 'Petto', exercises: [
      { exerciseId: 'chest-press', exerciseName: 'Chest Press', sets: 3, repetitions: { min: 8, max: 12, unit: 'reps' }, restSeconds: 90 }] },
    { id: 'd2', name: 'Core', exercises: [
      { exerciseId: 'plank', exerciseName: 'Plank', sets: 2, repetitions: { min: 20, max: 40, unit: 'seconds' } }] },
    { id: 'd3', name: 'Schiena', exercises: [
      { exerciseId: 'lat-pulldown-wide', exerciseName: 'Lat Machine presa prona', sets: 3, repetitions: { min: 8, max: 12, unit: 'reps' } }] },
    { id: 'd4', name: 'Gambe', exercises: [
      { exerciseId: 'leg-press', exerciseName: 'Leg Press', sets: 3, repetitions: { min: 8, max: 12, unit: 'reps' } }] },
  ],
};
const raw = JSON.stringify(program);

describe('FORMA LAB Workout Exchange v1', () => {
  it('accetta quattro giornate', () => expect(parseExchange(raw).days).toHaveLength(4));
  it('rifiuta JSON errato', () => expect(() => parseExchange('{')).toThrow('non JSON'));
  it('rifiuta versioni sconosciute', () => expect(() => parseExchange(raw.replace('"version":1', '"version":20'))).toThrow());
  it('rifiuta giornate duplicate', () => {
    const data = structuredClone(program);
    data.days[1].id = 'd1';
    expect(() => parseExchange(JSON.stringify(data))).toThrow('duplicata');
  });
  it('rifiuta ripetizioni invertite', () => {
    const data = structuredClone(program);
    data.days[0].exercises[0].repetitions = { min: 15, max: 12, unit: 'reps' };
    expect(() => parseExchange(JSON.stringify(data))).toThrow();
  });
  it('non diffonde proprietà inattese', () => {
    const data = { ...program, extra: { unsafe: true }, program: { ...program.program, accessToken: 'do-not-copy' } };
    const imported = parseExchange(JSON.stringify(data)) as unknown as Record<string, unknown>;
    expect(imported).not.toHaveProperty('extra');
    expect(imported.program).not.toHaveProperty('accessToken');
  });
  it('associa gli esercizi esistenti per ID', () => {
    expect(matchExchangeExercise(parseExchange(raw).days[0].exercises[0]).id).toBe('chest-press');
  });
  it('segnala un esercizio non presente senza inventare un abbinamento', () => {
    const unknown = { exerciseName: 'Esercizio inesistente xyz', sets: 3, repetitions: { min: 8, max: 12, unit: 'reps' as const } };
    expect(matchExchangeExercise(unknown).status).toBe('missing');
    expect(() => exchangeToRoutines({ ...parseExchange(raw), days: [{ ...parseExchange(raw).days[0], exercises: [unknown] }] })).toThrow();
  });
  it('genera quattro routine senza modificare le originali', () => {
    const routines = exchangeToRoutines(parseExchange(raw));
    expect(routines).toHaveLength(4);
    expect(routines[0].folder).toBe('Schede create con ChatGPT');
    expect(routines[0].items[0].sets).toBe(3);
    expect(routines[0].items[0].restSec).toBe(90);
    expect(routines[1].items[0].unit).toBe('sec');
    expect(new Set(routines.map(r => r.id)).size).toBe(4);
  });
  it('esporta e reimporta le routine', () => {
    const source = exchangeToRoutines(parseExchange(raw));
    const result = exchangeToRoutines(parseExchange(JSON.stringify(routinesToExchange(source))));
    expect(result.map(r => r.items[0].exerciseId)).toEqual(source.map(r => r.items[0].exerciseId));
  });
});
