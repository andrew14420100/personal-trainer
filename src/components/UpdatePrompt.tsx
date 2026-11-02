// Service worker registration with an explicit "update available" prompt (production build only).
import { useEffect, useState } from 'react';

export function UpdatePrompt() {
  const [update, setUpdate] = useState<null | (() => void)>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    if (__PREVIEW__ || import.meta.env.DEV || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    import('virtual:pwa-register').then(({ registerSW }) => {
      if (cancelled) return;
      const updateSW = registerSW({
        onNeedRefresh: () => setUpdate(() => () => updateSW(true)),
        onOfflineReady: () => {
          setOfflineReady(true);
          setTimeout(() => setOfflineReady(false), 4000);
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (update)
    return (
      <div className="toast row" role="status" style={{ gap: 12 }}>
        Nuova versione disponibile
        <button className="btn sm primary" onClick={update}>
          Aggiorna
        </button>
      </div>
    );
  if (offlineReady)
    return (
      <div className="toast" role="status">
        Pronta per l’uso offline
      </div>
    );
  return null;
}
