import { CheckCircle2, ExternalLink, AlertTriangle, Film, XCircle } from 'lucide-react';
import { useData } from '../app/store';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { SLOTS } from '../data/program';
import { VIDEO_CHECK, VIDEO_LIBRARY, allVideoIds, youtubeThumb, youtubeWatchUrl, type VideoSource } from '../data/videos';
import { navigate } from '../lib/router';
import { Notice, Section } from '../components/ui';

export function Videos() {
  const { settings } = useData();
  const ids = allVideoIds();
  const approved = ids.filter((id) => settings.videoReviews[id]?.status === 'approvato').length;
  const rejected = ids.filter((id) => settings.videoReviews[id]?.status === 'non adatto').length;
  const withBoth = VIDEO_LIBRARY.filter((v) => v.demo && v.tutorial).length;
  const missingItems = VIDEO_LIBRARY.flatMap((v) => v.missing.map((m) => ({ id: v.exerciseId, m })));
  const partial = VIDEO_LIBRARY.flatMap((v) => [v.demo, v.tutorial].filter((x): x is VideoSource => !!x && x.match !== 'esatto').map((x) => ({ id: v.exerciseId, x })));

  return (
    <main className="screen">
      <div className="brandbar">
        <div className="brand">
          FORMA<b>·</b>LAB
        </div>
      </div>
      <h1 className="display h1" style={{ marginTop: 12 }}>
        Videoteca
      </h1>
      <p className="text-2" style={{ marginTop: 8 }}>
        Due modalità per ognuno dei {EXERCISES.length} esercizi ({SLOTS.length} posizioni): dimostrazione rapida e tutorial completo.
      </p>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="stat">
          <div className="stat-label">Video collegati</div>
          <div className="stat-value">{ids.length}</div>
          <div className="stat-sub">link verificati il {VIDEO_CHECK.date}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Esercizi con demo + tutorial</div>
          <div className="stat-value">
            {withBoth}/{EXERCISES.length}
          </div>
          <div className="stat-sub">{missingItems.length} lacune segnalate</div>
        </div>
        <div className="stat">
          <div className="stat-label">Approvati da te</div>
          <div className="stat-value" style={{ color: 'var(--right)' }}>
            {approved}
          </div>
          <div className="stat-sub">{rejected} segnati non adatti</div>
        </div>
        <div className="stat">
          <div className="stat-label">Varianti non identiche</div>
          <div className="stat-value" style={{ color: 'var(--progress)' }}>
            {partial.length}
          </div>
          <div className="stat-sub">segnalate nella scheda</div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Notice kind="info">
          <b>Cosa significa “link verificato”.</b> Ogni video esiste ed è incorporabile (controllo tramite oEmbed di YouTube). Titolo, canale e durata confermano l’esercizio, ma nessun professionista ha
          revisionato ogni secondo dei filmati: guardali e segna <i>Approva</i> o <i>Non adatto</i> nella pagina dell’esercizio. Licenza: {VIDEO_CHECK.license}
        </Notice>
      </div>

      <Section title="Libreria per esercizio">
        <div className="stack" style={{ gap: 10 }}>
          {VIDEO_LIBRARY.map((v) => {
            const ex = EXERCISE_BY_ID[v.exerciseId];
            return (
              <div key={v.exerciseId} className="card tight flat">
                <button className="row between tap-row" onClick={() => navigate(`/esercizio/${ex.id}`)}>
                  <span className="ex-name">{ex.name}</span>
                  <span className="small muted">apri</span>
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8, marginTop: 10 }}>
                  {[v.demo, v.tutorial].map((x, i) => (
                    <VideoTile key={i} v={x} label={i === 0 ? 'Dimostrazione' : 'Tutorial'} review={x ? settings.videoReviews[x.youtubeId]?.status : undefined} />
                  ))}
                </div>
                {v.extra.length > 0 && (
                  <div className="small text-2" style={{ marginTop: 8 }}>
                    Approfondimenti:{' '}
                    {v.extra.map((e) => (
                      <a key={e.youtubeId} href={youtubeWatchUrl(e.youtubeId)} target="_blank" rel="noopener noreferrer" style={{ marginRight: 8 }}>
                        {e.author} ({e.duration}) <ExternalLink size={11} />
                      </a>
                    ))}
                  </div>
                )}
                {v.missing.map((m) => (
                  <div key={m} className="small" style={{ marginTop: 8, color: 'var(--progress)' }}>
                    <AlertTriangle size={13} style={{ verticalAlign: '-2px' }} /> {m}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Schede di verifica">
        <p className="small text-2" style={{ marginBottom: 10 }}>
          Fonte, autore, URL, tipo, licenza, corrispondenza, errori/correzioni, compatibilità iPhone e stato per ogni video.
        </p>
        <div className="stack" style={{ gap: 8 }}>
          {VIDEO_LIBRARY.map((v) => (
            <details key={v.exerciseId} className="card tight flat disclosure">
              <summary className="row between">
                <b>{EXERCISE_BY_ID[v.exerciseId].name}</b>
                <span className="small muted">{[v.demo, v.tutorial, ...v.extra].filter(Boolean).length} video</span>
              </summary>
              {[v.demo, v.tutorial, ...v.extra].filter((x): x is VideoSource => !!x).map((x) => (
                <dl key={x.youtubeId} className="small" style={{ margin: '12px 0 0', display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px 10px' }}>
                  <dt className="muted">Tipo</dt>
                  <dd style={{ margin: 0 }}>{x.kind === 'demo' ? 'Dimostrazione rapida' : x.kind === 'tutorial' ? 'Tutorial completo' : 'Approfondimento errori'}</dd>
                  <dt className="muted">Fonte</dt>
                  <dd style={{ margin: 0 }}>YouTube</dd>
                  <dt className="muted">Autore</dt>
                  <dd style={{ margin: 0 }}>{x.author}</dd>
                  <dt className="muted">Titolo</dt>
                  <dd style={{ margin: 0 }}>{x.title}</dd>
                  <dt className="muted">URL</dt>
                  <dd style={{ margin: 0, wordBreak: 'break-all' }}>
                    <a href={youtubeWatchUrl(x.youtubeId)} target="_blank" rel="noopener noreferrer">
                      {youtubeWatchUrl(x.youtubeId)}
                    </a>
                  </dd>
                  <dt className="muted">Licenza</dt>
                  <dd style={{ margin: 0 }}>Standard YouTube · solo incorporamento</dd>
                  <dt className="muted">Corrispondenza</dt>
                  <dd style={{ margin: 0 }}>
                    {x.match}
                    {x.matchNote ? ` — ${x.matchNote}` : ''}
                  </dd>
                  <dt className="muted">Errori/correzioni</dt>
                  <dd style={{ margin: 0 }}>{x.errorsShown}; rosso/verde nel pannello didattico dell’app</dd>
                  <dt className="muted">iPhone</dt>
                  <dd style={{ margin: 0 }}>Player ufficiale incorporabile, playsinline · test sul dispositivo da eseguire</dd>
                  <dt className="muted">Stato</dt>
                  <dd style={{ margin: 0 }}>
                    Link verificato {VIDEO_CHECK.date}
                    {settings.videoReviews[x.youtubeId] ? ` · ${settings.videoReviews[x.youtubeId].status} da te` : ' · contenuto da visionare'}
                  </dd>
                </dl>
              ))}
            </details>
          ))}
        </div>
      </Section>

      <Section title="Contenuti da produrre">
        <div className="card tight flat stack" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, fontWeight: 700 }}>
            <Film size={18} color="var(--progress)" /> Guida alle riprese originali
          </div>
          <p className="small text-2">
            Per gli esercizi segnalati sopra (tutorial non specifico per la variante, macchina diversa da quella della tua palestra) la soluzione migliore è registrare un video tuo, di cui possiedi i
            diritti: potrà essere annotato in rosso/verde e reso disponibile offline in una versione futura.
          </p>
          <ol className="steps small">
            <li>iPhone in orizzontale su treppiede, a 2–3 m, all’altezza dell’anca; luce frontale, 1080p a 60 fps (o 240 fps per il rallentatore).</li>
            <li>Angolazione: laterale per spinte, trazioni e cerniere d’anca; a 45° per split squat e alzate laterali; frontale per controllare le ginocchia.</li>
            <li>Ripresa A (30–60 s): regolazione della macchina, posizione iniziale, 3–5 ripetizioni continue.</li>
            <li>Ripresa B (2–4 min): regolazioni in primo piano, 2–3 errori comuni eseguiti a carico leggero, poi la correzione e una serie pulita senza interruzioni.</li>
            <li>Esegui gli errori solo a carico minimo e senza dolore: servono a mostrarli, non ad allenarsi.</li>
            <li>Verifica il regolamento della palestra e non riprendere altre persone senza il loro consenso.</li>
          </ol>
        </div>
      </Section>
    </main>
  );
}

function VideoTile({ v, label, review }: { v?: VideoSource; label: string; review?: 'approvato' | 'non adatto' }) {
  if (!v)
    return (
      <div className="ex-thumb" style={{ width: '100%', height: 'auto', aspectRatio: '16/9', display: 'grid', placeItems: 'center', padding: 8, textAlign: 'center' }}>
        <span className="tiny" style={{ color: 'var(--progress)' }}>
          {label}: mancante
        </span>
      </div>
    );
  return (
    <a href={youtubeWatchUrl(v.youtubeId)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} aria-label={`${label}: ${v.title} (apre YouTube)`}>
      <div className="ex-thumb" style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}>
        <img src={youtubeThumb(v.youtubeId)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        <span className="n" style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span className="tiny" style={{ position: 'absolute', right: 6, bottom: 4, color: '#fff', textShadow: '0 1px 4px #000' }}>
          {v.duration}
        </span>
        {review && (
          <span style={{ position: 'absolute', right: 5, top: 4 }}>
            {review === 'approvato' ? <CheckCircle2 size={16} color="var(--right)" /> : <XCircle size={16} color="var(--wrong)" />}
          </span>
        )}
      </div>
      <div className="tiny text-2" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {v.author}
      </div>
      {v.match !== 'esatto' && (
        <div className="tiny" style={{ color: 'var(--progress)' }}>
          {v.match}
        </div>
      )}
    </a>
  );
}
