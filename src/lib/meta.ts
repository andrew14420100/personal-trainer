// Display name / colour of any session: plan day, custom routine or free workout.
import { DAY_BY_ID } from '../data/program';
import type { DayId } from '../data/types';
import type { Session } from './db';
import type { Settings } from './settings';

export const FREE_ACCENT = '#9aa3b2';
export const ROUTINE_ACCENTS = ['#5ac8fa', '#ffd60a', '#bf5af2', '#30d158', '#ff6b35', '#ff375f'];

export interface Meta {
  name: string;
  code: string;
  accent: string;
  isPlan: boolean;
}

export function sessionMeta(s: Pick<Session, 'dayId' | 'title'>, settings?: Settings): Meta {
  const d = DAY_BY_ID[s.dayId as DayId];
  if (d) return { name: d.name, code: d.code, accent: d.accent, isPlan: true };
  if (s.dayId === 'free') return { name: s.title || 'Allenamento libero', code: 'Libero', accent: FREE_ACCENT, isPlan: false };
  const r = settings?.routines.find((x) => `r:${x.id}` === s.dayId);
  return { name: r?.name ?? s.title ?? 'Scheda personale', code: 'Scheda personale', accent: r?.accent ?? ROUTINE_ACCENTS[0], isPlan: false };
}
