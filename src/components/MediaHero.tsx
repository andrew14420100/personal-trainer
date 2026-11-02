// Video-first hero of the exercise page.
// Primary: real-athlete short videos found online (YouTube Shorts, official embed, started muted
// and looping). Secondary: the user's own annotated footage and the technical diagram (a schematic
// animation, clearly labelled as such — not a video).
import { useState } from 'react';
import { Camera, PencilRuler, Video } from 'lucide-react';
import { ANIMATION_BY_EXERCISE } from '../anim/library';
import { AnimPlayer } from '../anim/AnimPlayer';
import { EXERCISE_BY_ID } from '../data/exercises';
import { REAL_VIDEOS } from '../data/realVideos';
import { youtubeWatchUrl } from '../data/videos';
import { useData } from '../app/store';
import { Segmented } from './ui';
import { UserVideo, useMedia } from './UserVideo';
import { VideoPlayer } from './VideoPlayer';
import { VideoReview } from './VideoReview';

type Src = 'v0' | 'v1' | 'own' | 'diagram';

export function MediaHero({ exerciseId, compact = false }: { exerciseId: string; compact?: boolean }) {
  const { settings } = useData();
  const ex = EXERCISE_BY_ID[exerciseId];
  const spec = ANIMATION_BY_EXERCISE[exerciseId];
  const vids = REAL_VIDEOS[exerciseId] ?? [];
  const [own] = useMedia(`${exerciseId}:quick`);
  const [src, setSrc] = useState<Src>(vids.length ? 'v0' : own ? 'own' : 'diagram');
  const real = src === 'v0' ? vids[0] : src === 'v1' ? vids[1] : undefined;

  const options: { value: Src; label: React.ReactNode }[] = [
    ...vids.map((_, i) => ({ value: `v${i}` as Src, label: vids.length > 1 ? `Video ${i + 1}` : 'Video' })),
    { value: 'own', label: own ? 'Il tuo' : 'Tuo' },
    { value: 'diagram', label: 'Schema' },
  ];

  return (
    <div className={`stack${compact ? ' player-compact' : ''}`} style={{ gap: 10 }}>
      {!compact && <Segmented label="Fonte del video" value={src} onChange={setSrc} options={options} />}

      {real && (
        <>
          <VideoPlayer key={real.youtubeId} video={real} label={`${ex.name}: dimostrazione`} vertical startMuted autoLoad={settings.video.autoplay} />
          {!compact && (
            <div className="card tight flat small">
              <div className="row" style={{ gap: 6, fontWeight: 650 }}>
                <Video size={15} /> {real.author}
              </div>
              <div className="tiny text-2" style={{ marginTop: 4 }}>
                {real.title}
              </div>
              <div className="chips" style={{ marginTop: 8 }}>
                <span className={`chip ${real.match === 'esatto' ? 'ok' : 'warn'}`}>{real.match === 'esatto' ? 'Esercizio corrispondente' : 'Variante simile'}</span>
                {real.overlays ? <span className="chip ok">❌ / ✅ sul video</span> : <span className="chip">Senza indicatori ❌/✅</span>}
                <span className="chip">Avvio senza audio</span>
              </div>
              {real.note && (
                <p className="tiny muted" style={{ marginTop: 6 }}>
                  {real.note}
                </p>
              )}
              <VideoReview youtubeId={real.youtubeId} />
              <p className="tiny muted" style={{ marginTop: 6 }}>
                Video di terzi incorporato con il player ufficiale, senza modifiche.{' '}
                <a href={youtubeWatchUrl(real.youtubeId)} target="_blank" rel="noopener noreferrer">
                  Apri l’originale
                </a>
              </p>
            </div>
          )}
        </>
      )}

      {src === 'own' && <UserVideo exerciseId={exerciseId} kind="quick" />}

      {src === 'diagram' && spec && (
        <>
          <AnimPlayer spec={spec} mode="errors" cues={ex.cues} compact={compact} autoPlay={settings.video.autoplay} labels={settings.video.labels} initialSpeed={settings.video.speed} />
          <p className="tiny muted">
            <PencilRuler size={12} style={{ verticalAlign: '-2px' }} /> Schema tecnico disegnato dall’app (non è un video né un atleta reale): mostra in rosso gli errori e in verde la correzione.
          </p>
        </>
      )}

      {compact && vids.length === 0 && (
        <p className="small text-2">
          <Camera size={14} /> Nessun video trovato per questo esercizio.
        </p>
      )}
    </div>
  );
}
