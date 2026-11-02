// Video-first hero of the exercise page: technical animation (always available, offline) or the
// user's own annotated footage, in two modes: quick demo / errors & corrections.
import { useState } from 'react';
import { Clapperboard, Film } from 'lucide-react';
import { ANIMATION_BY_EXERCISE } from '../anim/library';
import { AnimPlayer } from '../anim/AnimPlayer';
import { EXERCISE_BY_ID } from '../data/exercises';
import { useData } from '../app/store';
import { Segmented } from './ui';
import { UserVideo, useMedia } from './UserVideo';

export function MediaHero({ exerciseId, compact = false }: { exerciseId: string; compact?: boolean }) {
  const { settings } = useData();
  const ex = EXERCISE_BY_ID[exerciseId];
  const spec = ANIMATION_BY_EXERCISE[exerciseId];
  const [mode, setMode] = useState<'quick' | 'errors'>(compact ? 'quick' : settings.video.defaultMode);
  const [own] = useMedia(`${exerciseId}:${mode}`);
  const [source, setSource] = useState<'anim' | 'own' | null>(null);
  const src = source ?? (own ? 'own' : 'anim');

  return (
    <div className="stack" style={{ gap: 10 }}>
      {!compact && (
        <Segmented
          label="Modalità video"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setSource(null);
          }}
          options={[
            { value: 'quick', label: 'Dimostrazione' },
            { value: 'errors', label: 'Errori e correzioni' },
          ]}
        />
      )}
      {src === 'anim' && spec ? (
        <AnimPlayer key={`${exerciseId}-${mode}`} spec={spec} mode={mode} cues={ex.cues} compact={compact} autoPlay={settings.video.autoplay} labels={settings.video.labels} initialSpeed={settings.video.speed} />
      ) : (
        <UserVideo key={`${exerciseId}-${mode}`} exerciseId={exerciseId} kind={mode} />
      )}
      {!compact && (
        <div className="row between small text-2" style={{ gap: 8 }}>
          <span className="row" style={{ gap: 6 }}>
            {src === 'anim' ? <Clapperboard size={15} /> : <Film size={15} />}
            {src === 'anim' ? `Animazione tecnica · vista ${spec?.view.toLowerCase()}` : 'Il tuo video · solo su questo dispositivo'}
          </span>
          <button className="link" onClick={() => setSource(src === 'anim' ? 'own' : 'anim')}>
            {src === 'anim' ? (own ? 'Il tuo video' : 'Aggiungi il tuo video') : 'Animazione tecnica'}
          </button>
        </div>
      )}
    </div>
  );
}
