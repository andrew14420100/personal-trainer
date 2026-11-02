import type { Day, DayId, Slot } from './types';
import rackMan from '../assets/photos/rack-man.jpg';
import cableRope from '../assets/photos/cable-rope.jpg';
import legPress from '../assets/photos/leg-press.jpg';
import legMachine from '../assets/photos/leg-machine.jpg';

// Program source: the 4-day split provided in the project brief (the Excel file mentioned in the
// brief was NOT attached to the repository, so no cross-check against it was possible — see
// docs/ANALISI.md). Sets are the target sets after the initial adaptation; the first week uses a
// reduced-volume calibration (see lib/plan.ts).

export const DAYS: Day[] = [
  {
    id: 'upper-a',
    weekday: 1,
    weekdayLabel: 'Lunedì',
    name: 'Upper A',
    title: 'Spinta e trazione orizzontale',
    focus: ['Petto', 'Dorso', 'Spalle', 'Braccia'],
    accent: '#d4ff3a',
    photo: rackMan,
    photoPosition: '50% 35%',
  },
  {
    id: 'lower-a',
    weekday: 2,
    weekdayLabel: 'Martedì',
    name: 'Lower A',
    title: 'Quadricipiti, femorali e core',
    focus: ['Quadricipiti', 'Femorali', 'Glutei', 'Polpacci', 'Core'],
    accent: '#ff8a3d',
    photo: legPress,
    photoPosition: '40% 50%',
  },
  {
    id: 'upper-b',
    weekday: 4,
    weekdayLabel: 'Giovedì',
    name: 'Upper B',
    title: 'Petto alto, dorso e braccia',
    focus: ['Petto', 'Dorso', 'Spalle', 'Braccia'],
    accent: '#4fd1ff',
    photo: cableRope,
    photoPosition: '50% 30%',
  },
  {
    id: 'lower-b',
    weekday: 5,
    weekdayLabel: 'Venerdì',
    name: 'Lower B',
    title: 'Glutei, quadricipiti e stabilità',
    focus: ['Quadricipiti', 'Glutei', 'Femorali', 'Polpacci', 'Core'],
    accent: '#b78cff',
    photo: legMachine,
    photoPosition: '60% 50%',
  },
];

type SlotDef = [exerciseId: string, sets: number, repsMin: number, repsMax: number, extra?: Partial<Slot>];

const DEFS: Record<DayId, SlotDef[]> = {
  'upper-a': [
    ['chest-press', 3, 8, 12],
    ['lat-pulldown-wide', 3, 8, 12],
    ['incline-db-press', 2, 8, 12],
    ['cable-row-v', 3, 8, 12],
    ['lateral-raise', 2, 12, 20],
    ['triceps-pushdown', 2, 10, 15],
    ['db-curl', 2, 10, 15],
  ],
  'lower-a': [
    ['leg-press', 3, 8, 12],
    ['db-rdl', 3, 8, 12],
    ['leg-extension', 2, 10, 15],
    ['seated-leg-curl', 3, 10, 15],
    ['calf-raise', 3, 10, 15],
    ['plank', 2, 20, 40, { unit: 'sec' }],
  ],
  'upper-b': [
    ['smith-incline-press', 3, 8, 12],
    ['low-row-machine', 3, 8, 12],
    ['pec-fly', 2, 10, 15],
    ['lat-pulldown-neutral', 3, 8, 12],
    ['shoulder-press-machine', 2, 8, 12],
    ['incline-db-curl', 2, 10, 15],
    ['overhead-cable-triceps', 2, 10, 15],
  ],
  'lower-b': [
    ['hack-squat', 3, 8, 12],
    ['hip-thrust-machine', 3, 8, 12],
    ['assisted-split-squat', 2, 8, 12, { perSide: true, sideLabel: 'per gamba' }],
    ['lying-leg-curl', 3, 10, 15],
    ['calf-raise', 3, 10, 15],
    ['dead-bug', 2, 8, 10, { perSide: true, sideLabel: 'per lato' }],
  ],
};

export const SLOTS: Slot[] = (Object.keys(DEFS) as DayId[]).flatMap((dayId) =>
  DEFS[dayId].map(([exerciseId, sets, repsMin, repsMax, extra], i) => ({
    id: `${dayId}-${i + 1}`,
    dayId,
    order: i + 1,
    exerciseId,
    sets,
    repsMin,
    repsMax,
    unit: 'reps' as const,
    perSide: false,
    ...extra,
  })),
);

/** Program positions where the brief is ambiguous: the user may switch to the listed variant. */
export const SLOT_VARIANTS: Record<string, string[]> = {
  'lower-b-4': ['lying-leg-curl', 'seated-leg-curl'],
};

export const DAY_BY_ID: Record<DayId, Day> = Object.fromEntries(DAYS.map((d) => [d.id, d])) as Record<DayId, Day>;

export function slotsForDay(dayId: DayId): Slot[] {
  return SLOTS.filter((s) => s.dayId === dayId).sort((a, b) => a.order - b.order);
}

export function dayForWeekday(weekday: number): Day | undefined {
  return DAYS.find((d) => d.weekday === weekday);
}

/** Next scheduled day at or after `from` (inclusive when includeToday). */
export function nextScheduledDay(from: Date, includeToday = true): { day: Day; date: Date } {
  for (let i = includeToday ? 0 : 1; i <= 7; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const day = dayForWeekday(d.getDay());
    if (day) return { day, date: d };
  }
  // Unreachable: the program always has training days.
  return { day: DAYS[0], date: from };
}
