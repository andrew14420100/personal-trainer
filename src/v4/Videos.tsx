import { AlertTriangle, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { useData } from '../app/store';
import { EXERCISES } from '../data/exercises';
import { EXERCISE_MUSCLES } from '../data/muscles';
import { REAL_VIDEOS } from '../data/realVideos';
import { navigate } from '../lib/router';
import { NavBar, Notice } from './kit';
import { ExerciseThumb } from './Plan';

/** Status of every real video: source, match with the program, user review. */
export function Videos() {
  const { settings } = useData();
  const all = Object.values(REAL_VIDEOS).flat();
  const approved = all.filter((v) => settings.videoReviews[v.youtubeId]?.status === 'approvato').length;
  const rejected = all.filter((v) => settings.videoReviews[v.youtubeId]?.status === 'non adatto').length;
  const similar = all.filter((v) => v.match === 'variante simile').length;
  return (
    <main className="page">
      <NavBar title="Videoteca" fallback="/profilo" />
      <h1 className="t-h1">Videoteca</h1>
      <p className="t-sm c2" style={{ marginTop: 4 }}>
        {all.length} video reali per {Object.keys(REAL_VIDEOS).length}/{EXERCISES.length} esercizi · {similar} varianti simili · {approved} approvati da te · {rejected} non adatti
      </p>
      <div className="mt12">
        <Notice icon={<AlertTriangle size={17} color="var(--warn)" />}>
          Video di terzi su YouTube, riprodotti con il player ufficiale senza audio all’avvio. Sono stati verificati esistenza, incorporabilità, autore e tre fotogrammi di anteprima; non è stato possibile
          controllare ogni secondo né l’audio. Guardali e segnali come “approvato” o “non adatto” nella pagina dell’esercizio.
        </Notice>
      </div>
      <div className="list mt16">
        {EXERCISES.map((e) => {
          const vids = REAL_VIDEOS[e.id] ?? [];
          const rev = vids.map((v) => settings.videoReviews[v.youtubeId]?.status);
          return (
            <button key={e.id} className="ex-row" onClick={() => navigate(`/esercizio/${e.id}`)}>
              <ExerciseThumb exerciseId={e.id} />
              <span style={{ minWidth: 0 }}>
                <span className="ex-group" style={{ display: 'block' }}>
                  {EXERCISE_MUSCLES[e.id]?.group}
                </span>
                <span className="ex-name" style={{ display: 'block' }}>
                  {e.name}
                </span>
                <span className="ex-sub row" style={{ gap: 6 }}>
                  {vids.length ? `${vids.length} video` : 'nessun video'}
                  {vids.some((v) => v.match === 'variante simile') && <span className="c-accent">· variante simile</span>}
                  {rev.includes('approvato') && <CheckCircle2 size={13} color="var(--ok)" />}
                  {rev.includes('non adatto') && <XCircle size={13} color="var(--bad)" />}
                </span>
              </span>
              <ChevronRight size={18} className="c3" />
            </button>
          );
        })}
      </div>
    </main>
  );
}
