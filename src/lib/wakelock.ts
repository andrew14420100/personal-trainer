// Screen Wake Lock (Safari iOS 16.4+; inside Home Screen apps it works from iOS 18.4).
// If unsupported the toggle is hidden/marked as unavailable: no fake behaviour.
type WakeLockSentinelLike = { release: () => Promise<void>; released: boolean };

let sentinel: WakeLockSentinelLike | null = null;
let wanted = false;

export const wakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

async function acquire() {
  if (!wanted || !wakeLockSupported() || document.visibilityState !== 'visible') return;
  try {
    sentinel = await (navigator as unknown as { wakeLock: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock.request('screen');
  } catch {
    sentinel = null;
  }
}

export async function setKeepAwake(on: boolean) {
  wanted = on;
  if (on) await acquire();
  else if (sentinel) {
    try {
      await sentinel.release();
    } catch {
      /* ignore */
    }
    sentinel = null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wanted && (!sentinel || sentinel.released)) void acquire();
  });
}
