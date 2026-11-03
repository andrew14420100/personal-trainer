// 4.1 exports: CSV of every logged set, calendar reminders (.ics), share image of a session.
import { EXERCISE_MUSCLES } from '../data/muscles';
import { exOrFallback } from '../data/catalog';
import { planDaysFor } from './library';
import type { Session } from './db';
import { completed, sessionDurationMin, sessionSets, sessionVolume, doneSets } from './stats';
import { sessionMeta } from './meta';
import type { Settings } from './settings';
import { kg, volume } from './format';

const q = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV with one row per set (semicolon-separated, decimal comma: opens correctly in Italian Excel/Numbers). */
export function setsCsv(sessions: Session[], settings: Settings): string {
  const head = ['data', 'ora', 'allenamento', 'esercizio', 'gruppo', 'serie', 'tipo', 'kg', 'ripetizioni_o_minuti', 'km', 'kcal', 'rpe_serie', 'completata', 'rpe_seduta', 'durata_min', 'note_esercizio'];
  const rows = [head.join(';')];
  for (const s of completed(sessions)) {
    const d = new Date(s.startedAt);
    const date = d.toLocaleDateString('it-IT');
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const name = sessionMeta(s, settings).name;
    for (const l of s.exercises)
      l.sets.forEach((x, i) =>
        rows.push(
          [date, time, name, exOrFallback(l.exerciseId).name, EXERCISE_MUSCLES[l.exerciseId]?.group ?? '', i + 1, x.type ?? 'normale', x.weight ?? '', x.reps ?? '', x.distanceKm ?? '', x.kcal ?? '', x.rpe ?? '', x.done ? 'sì' : 'no', s.rpe ?? '', sessionDurationMin(s), l.note]
            .map((v) => (typeof v === 'number' ? String(v).replace('.', ',') : q(v)))
            .join(';'),
        ),
      );
  }
  return '﻿' + rows.join('\r\n');
}

const pad = (n: number) => String(n).padStart(2, '0');
const RRULE_DAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Weekly calendar events for the days of the default program, with an alarm, to import into the phone calendar. */
export function remindersIcs(settings: Settings, now = new Date()): string {
  const [h, m] = settings.reminders.time.split(':').map(Number);
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FORMA LAB//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const d of planDaysFor(settings)) {
    const first = new Date(now);
    first.setDate(first.getDate() + ((d.weekday - first.getDay() + 7) % 7));
    const start = `${first.getFullYear()}${pad(first.getMonth() + 1)}${pad(first.getDate())}T${pad(h)}${pad(m)}00`;
    const endD = new Date(first);
    endD.setHours(h, m + 75);
    const end = `${endD.getFullYear()}${pad(endD.getMonth() + 1)}${pad(endD.getDate())}T${pad(endD.getHours())}${pad(endD.getMinutes())}00`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:forma-lab-${d.id.replace(/[^a-zA-Z0-9-]/g, '-')}@forma-lab`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DAY[d.weekday]}`,
      `SUMMARY:FORMA LAB · ${d.name}`,
      `DESCRIPTION:${d.code ?? d.name} — apri FORMA LAB e tocca Inizia allenamento.`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:Allenamento: ${d.name}`,
      `TRIGGER:-PT${Math.max(0, settings.reminders.minutesBefore)}M`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** 1080×1350 PNG summary of a session (drawn locally, no server). */
export async function shareImage(s: Session, settings: Settings): Promise<Blob> {
  const meta = sessionMeta(s, settings);
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b0c0f';
  g.fillRect(0, 0, W, H);
  g.fillStyle = meta.accent;
  g.fillRect(0, 0, W, 14);
  const font = (w: number, px: number) => `${w} ${px}px "Manrope Variable", "Inter Variable", system-ui, sans-serif`;
  g.fillStyle = '#8b93a1';
  g.font = font(700, 32);
  g.fillText(new Date(s.startedAt).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), 72, 120);
  g.fillStyle = '#f2f4f7';
  g.font = font(800, 68);
  wrap(g, meta.name, 72, 210, W - 144, 78);
  const stats: [string, string][] = [
    ['Durata', `${sessionDurationMin(s)} min`],
    ['Volume', volume(sessionVolume(s))],
    ['Serie', String(sessionSets(s))],
    ['RPE', s.rpe ? `${s.rpe}/10` : '—'],
  ];
  stats.forEach(([k, v], i) => {
    const x = 72 + (i % 2) * 468;
    const y = 360 + Math.floor(i / 2) * 150;
    g.fillStyle = '#15171c';
    roundRect(g, x, y, 444, 128, 24);
    g.fillStyle = '#8b93a1';
    g.font = font(700, 26);
    g.fillText(k.toUpperCase(), x + 28, y + 46);
    g.fillStyle = '#f2f4f7';
    g.font = font(800, 48);
    g.fillText(v, x + 28, y + 104);
  });
  let y = 700;
  g.font = font(700, 34);
  for (const l of s.exercises) {
    const sets = doneSets(l);
    if (!sets.length) continue;
    if (y > H - 140) {
      g.fillStyle = '#8b93a1';
      g.fillText('…', 72, y);
      break;
    }
    const best = l.unit === 'reps' ? sets.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a)) : null;
    g.fillStyle = '#f2f4f7';
    g.fillText(trim(g, exOrFallback(l.exerciseId).name, 640), 72, y);
    g.fillStyle = '#5ac8fa';
    g.textAlign = 'right';
    g.fillText(best ? `${sets.length} × ${kg(best.weight ?? 0)}` : `${sets.length} serie`, W - 72, y);
    g.textAlign = 'left';
    y += 58;
  }
  g.fillStyle = '#8b93a1';
  g.font = font(700, 28);
  g.fillText('FORMA LAB', 72, H - 64);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.fill();
}
function trim(g: CanvasRenderingContext2D, t: string, max: number) {
  if (g.measureText(t).width <= max) return t;
  while (t.length > 3 && g.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}
function wrap(g: CanvasRenderingContext2D, t: string, x: number, y: number, max: number, lh: number) {
  const words = t.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > max && line) {
      g.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  g.fillText(line, x, y);
}
