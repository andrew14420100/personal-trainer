// Minimal hash router: works on any static host, inside the installed PWA and in the Claude preview.
import { useSyncExternalStore } from 'react';

export interface Route {
  path: string[];
  query: URLSearchParams;
}

function parse(hash?: string): Route {
  const raw = (hash ?? (typeof location !== 'undefined' ? location.hash : '')).replace(/^#/, '') || '/';
  const [p, q = ''] = raw.split('?');
  return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q) };
}

let current = parse();
let currentHash = typeof location !== 'undefined' ? location.hash : '';
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (location.hash === currentHash) return;
    currentHash = location.hash;
    current = parse();
    listeners.forEach((l) => l());
  });
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
    () => current,
  );
}

let depth = 0;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (!opts.replace) depth++;
  const hash = '#' + (to.startsWith('/') ? to : '/' + to);
  try {
    if (opts.replace) history.replaceState(null, '', hash);
    else history.pushState(null, '', hash);
    currentHash = location.hash;
    current = parse(hash);
  } catch {
    // Sandboxed frames (e.g. the Claude preview) may refuse history changes: route in memory.
    if (!opts.replace) depth--;
    current = parse(hash);
  }
  listeners.forEach((l) => l());
  try {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  } catch {
    window.scrollTo(0, 0);
  }
}

/** Go back inside the app; if the page was opened directly, go to `fallback`. */
export function back(fallback = '/') {
  if (depth > 0) history.back();
  else navigate(fallback, { replace: true });
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    depth = Math.max(0, depth - 1);
    currentHash = location.hash;
    current = parse();
    listeners.forEach((l) => l());
  });
}
