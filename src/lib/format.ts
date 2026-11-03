const DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export const weekdayName = (d: Date) => DAYS[d.getDay()];
export const fullDate = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const shortDate = (d: Date | number) => {
  const x = new Date(d);
  return `${x.getDate()} ${MONTHS_SHORT[x.getMonth()]}`;
};
export const monthName = (m: number) => MONTHS[m];
export const time = (d: Date | number) => new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

export function num(n: number, digits = 0): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

// Weight unit (4.1): data is ALWAYS stored in kg; only display and input are converted.
export const LB = 2.20462;
let UNIT: 'kg' | 'lb' = 'kg';
export const setWeightUnit = (u: 'kg' | 'lb') => (UNIT = u);
export const unitLabel = () => UNIT;
/** kg → value in the display unit. */
export const toUnit = (kgVal: number) => (UNIT === 'lb' ? Math.round(kgVal * LB * 10) / 10 : kgVal);
/** value typed in the display unit → kg (stored). */
export const fromUnit = (v: number) => (UNIT === 'lb' ? Math.round((v / LB) * 1000) / 1000 : v);

export function kg(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${num(toUnit(n), UNIT === 'lb' ? 1 : 2)} ${UNIT}`;
}

/** Compact volume, e.g. 12.450 kg → "12,5 t". */
export function volume(n: number): string {
  if (UNIT === 'lb') {
    const v = n * LB;
    return v >= 10000 ? `${num(v / 1000, 1)}k lb` : `${num(Math.round(v))} lb`;
  }
  if (n >= 10000) return `${num(n / 1000, 1)} t`;
  return `${num(Math.round(n))} kg`;
}

export function greeting(d: Date, name: string): string {
  const h = d.getHours();
  const base = h < 5 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
  return name ? `${base}, ${name}` : base;
}

export function relativeDays(ts: number, now = Date.now()): string {
  const a = new Date(ts);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (diff === 0) return 'oggi';
  if (diff === 1) return 'ieri';
  if (diff === -1) return 'domani';
  if (diff > 0) return `${diff} giorni fa`;
  return `tra ${-diff} giorni`;
}

/** Parse a decimal typed with comma or dot. */
export function parseDecimal(s: string): number | null {
  const t = s.replace(',', '.').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
