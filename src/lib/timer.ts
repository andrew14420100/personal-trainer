// Rest timer based on an absolute end time, persisted in localStorage.
// iOS Safari suspends JavaScript when the app is in the background or the screen is locked, and a
// Home Screen web app cannot schedule a local notification. So the timer does not "run" in the
// background: it stores when the rest ends and, as soon as you come back to the app, shows the
// correct remaining time (or that the rest is over). The sound plays only if the app is open.
import { useEffect, useState, useSyncExternalStore } from 'react';

export interface TimerState {
  endAt: number;
  duration: number;
  label: string;
  /** Set when paused: remaining milliseconds. */
  pausedRemaining?: number;
}

const KEY = 'forma-lab:timer';
const listeners = new Set<() => void>();
let cached: TimerState | null | undefined;

function read(): TimerState | null {
  if (cached !== undefined) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    cached = null;
  }
  return cached;
}

function write(s: TimerState | null) {
  cached = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: timer still works in memory */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cached = undefined;
      listeners.forEach((l) => l());
    }
  });
}

export const timer = {
  start(seconds: number, label: string) {
    unlockAudio();
    write({ endAt: Date.now() + seconds * 1000, duration: seconds, label });
  },
  add(seconds: number) {
    const s = read();
    if (!s) return;
    if (s.pausedRemaining != null) write({ ...s, pausedRemaining: Math.max(0, s.pausedRemaining + seconds * 1000), duration: s.duration + seconds });
    else write({ ...s, endAt: Math.max(Date.now(), s.endAt) + seconds * 1000, duration: s.duration + seconds });
  },
  pause() {
    const s = read();
    if (!s || s.pausedRemaining != null) return;
    write({ ...s, pausedRemaining: Math.max(0, s.endAt - Date.now()) });
  },
  resume() {
    const s = read();
    if (!s || s.pausedRemaining == null) return;
    write({ ...s, endAt: Date.now() + s.pausedRemaining, pausedRemaining: undefined });
  },
  stop() {
    write(null);
  },
  get: read,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function remainingMs(s: TimerState | null, now = Date.now()): number {
  if (!s) return 0;
  if (s.pausedRemaining != null) return s.pausedRemaining;
  return Math.max(0, s.endAt - now);
}

/** React hook: timer state + remaining ms, re-rendering 4×/s while running. */
export function useTimer() {
  const state = useSyncExternalStore(timer.subscribe, read, () => null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    const onVis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [state]);
  const rem = remainingMs(state, now);
  return { state, remaining: rem, done: !!state && rem <= 0, paused: state?.pausedRemaining != null };
}

// ── Sound ───────────────────────────────────────────────────────────────────
// iOS only allows audio after a user gesture: the AudioContext is created/unlocked when you
// start a timer (which always happens from a tap).
let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* ignore */
  }
}

export function beep() {
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime;
    [0, 0.22, 0.44].forEach((offset, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t0 + offset);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.18);
      o.connect(g).connect(ctx!.destination);
      o.start(t0 + offset);
      o.stop(t0 + offset + 0.2);
    });
  } catch {
    /* ignore */
  }
  try {
    navigator.vibrate?.([120, 80, 120]); // not supported on iOS; harmless elsewhere
  } catch {
    /* ignore */
  }
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
