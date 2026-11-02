import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';

/** Lets the user approve or reject a third-party video after watching it (stored locally). */
export function VideoReview({ youtubeId }: { youtubeId: string }) {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const r = settings.videoReviews[youtubeId];
  const set = (status: 'approvato' | 'non adatto' | null) =>
    update((s) => {
      const v = { ...s.videoReviews };
      if (status) v[youtubeId] = { status, date: new Date().toISOString().slice(0, 10) };
      else delete v[youtubeId];
      return { ...s, videoReviews: v };
    });
  return (
    <div className="row wrap t-xs" style={{ marginTop: 8, gap: 8 }}>
      {r ? (
        <>
          <span className={`chip ${r.status === 'approvato' ? 'ok' : 'bad'}`}>
            {r.status === 'approvato' ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {r.status === 'approvato' ? 'Approvato da te' : 'Segnato come non adatto'} il {r.date}
          </span>
          <button className="link" onClick={() => set(null)}>
            Annulla
          </button>
        </>
      ) : (
        <>
          <span className="c3" style={{ flexBasis: '100%' }}>
            <AlertTriangle size={13} style={{ verticalAlign: '-2px' }} /> Contenuto non ancora revisionato da te:
          </span>
          <button className="btn sm" onClick={() => set('approvato')}>
            Approva
          </button>
          <button className="btn sm ghost" onClick={() => set('non adatto')}>
            Non adatto
          </button>
        </>
      )}
    </div>
  );
}
