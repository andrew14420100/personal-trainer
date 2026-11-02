import { useEffect, useState } from 'react';
import { Film, Play } from 'lucide-react';
import { ANIMATIONS, ANIMATION_BY_EXERCISE } from '../anim/library';
import { REAL_VIDEOS } from '../data/realVideos';
import { listMediaIds } from '../lib/db';
import { useData } from '../app/store';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { SLOTS } from '../data/program';
import { VIDEO_CHECK, VIDEO_LIBRARY, allVideoIds, youtubeWatchUrl, type VideoSource } from '../data/videos';
import { navigate } from '../lib/router';
import { Notice, Section, TopBar } from '../components/ui';

export function Videos() {
  const { settings } = useData();
  const ids = allVideoIds();
  const approved = ids.filter((id) => settings.videoReviews[id]?.status === 'approvato').length;
  const [own, setOwn] = useState<string[]>([]);
  useEffect(() => {
    listMediaIds()
      .then(setOwn)
      .catch(() => setOwn([]));
  }, []);
  const ownQuick = EXERCISES.filter((e) => own.includes(`${e.id}:quick`)).length;
  const ownErr = EXERCISES.filter((e) => own.includes(`${e.id}:errors`)).length;
  const animErrors = ANIMATIONS.reduce((a, x) => a + x.errors.length, 0);

  return (
    <main className="screen">
      <TopBar title="Videoteca" fallback="/scheda" />
      <h1 className="display h1">Videoteca</h1>
      <p className="text-2" style={{ marginTop: 8 }}>
        Stato reale dei contenuti per i {EXERCISES.length} esercizi ({SLOTS.length} posizioni della scheda).
      </p>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="stat">
          <div className="stat-label">Video reali (atleti)</div>
          <div className="stat-value" style={{ color: 'var(--right)' }}>
            {EXERCISES.filter((e) => REAL_VIDEOS[e.id]?.length).length}/{EXERCISES.length}
          </div>
          <div className="stat-sub">
            {EXERCISES.filter((e) => REAL_VIDEOS[e.id]?.[0]?.overlays).length} con ❌/✅ sul video · avvio muto
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Schemi tecnici animati</div>
          <div className="stat-value">{ANIMATIONS.length}</div>
          <div className="stat-sub">{animErrors} errori ✕ → ✓ · non sono video</div>
        </div>
        <div className="stat">
          <div className="stat-label">Tuoi video annotati</div>
          <div className="stat-value" style={{ color: ownQuick + ownErr ? 'var(--data)' : 'var(--progress)' }}>
            {ownQuick + ownErr}/{EXERCISES.length * 2}
          </div>
          <div className="stat-sub">registrati da te · {ownQuick} demo, {ownErr} errori</div>
        </div>
        <div className="stat">
          <div className="stat-label">Tutorial esterni</div>
          <div className="stat-value">{ids.length}</div>
          <div className="stat-sub">parlati, secondari · {approved} approvati</div>
        </div>

      </div>

      <div style={{ marginTop: 14 }}>
        <Notice kind="info">
          <b>Da dove vengono i video.</b> Per ogni esercizio è stato scelto un video breve di un atleta reale (YouTube Shorts) che mostra l’esercizio, quasi sempre con ❌ rossi e ✅ verdi. I video
          sono di terzi: vengono incorporati con il player ufficiale, senza modifiche, e partono senza audio (puoi attivarlo). Richiedono la connessione. La corrispondenza è stata verificata su
          titolo, autore e fotogrammi pubblici di anteprima; guardali e segnala con Approva/Non adatto quelli da sostituire.
        </Notice>
      </div>

      <Section title="Stato per esercizio">
        <div className="stack" style={{ gap: 8 }}>
          {EXERCISES.map((ex) => {
            const a = ANIMATION_BY_EXERCISE[ex.id];
            const q = own.includes(`${ex.id}:quick`);
            const e = own.includes(`${ex.id}:errors`);
            return (
              <details key={ex.id} className="card tight flat disclosure">
                <summary>
                  <div className="row between">
                    <b>{ex.name}</b>
                    <span className="row" style={{ gap: 4 }}>
                      <span className={`chip ${REAL_VIDEOS[ex.id]?.length ? 'ok' : 'warn'}`}>{REAL_VIDEOS[ex.id]?.length ? `Video ${REAL_VIDEOS[ex.id].length}` : 'Manca video'}</span>
                      <span className={`chip ${q || e ? 'ok' : ''}`}>Reale {q || e ? `${(q ? 1 : 0) + (e ? 1 : 0)}/2` : '—'}</span>
                    </span>
                  </div>
                </summary>
                <div className="stack small" style={{ gap: 10, marginTop: 12 }}>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <button className="btn sm primary" onClick={() => navigate(`/esercizio/${ex.id}`)}>
                      <Play size={14} /> Apri l’esercizio
                    </button>
                  </div>
                  {(REAL_VIDEOS[ex.id] ?? []).map((v) => (
                    <div key={v.youtubeId} className="text-2">
                      <b style={{ color: 'var(--text)' }}>{v.author}</b> — {v.title}{' '}
                      <span className={`chip ${v.match === 'esatto' ? 'ok' : 'warn'}`}>{v.match}</span> {v.overlays ? <span className="chip ok">❌/✅</span> : null}{' '}
                      <a href={youtubeWatchUrl(v.youtubeId)} target="_blank" rel="noopener noreferrer">
                        originale
                      </a>
                    </div>
                  ))}
                  <div className="text-2">
                    <b style={{ color: 'var(--text)' }}>Schema animato:</b> vista {a.view.toLowerCase()} · errori animati: {a.errors.map((x) => x.bad.toLowerCase()).join(' · ')}.
                  </div>
                  <Storyboard exerciseId={ex.id} />
                </div>
              </details>
            );
          })}
        </div>
      </Section>

      <Section title="Riferimenti esterni (YouTube) · schede di verifica">
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

    </main>
  );
}

/** Shot list to record an original real-athlete video in the reference style (no voice, ✕/✓). */
function Storyboard({ exerciseId }: { exerciseId: string }) {
  const ex = EXERCISE_BY_ID[exerciseId];
  const a = ANIMATION_BY_EXERCISE[exerciseId];
  const angle = a.front ? 'frontale, a 2–3 m, all’altezza del petto' : 'laterale (profilo), a 2–3 m, all’altezza dell’anca';
  return (
    <div className="card tight" style={{ background: 'var(--bg-2)' }}>
      <div className="row" style={{ gap: 6, fontWeight: 700 }}>
        <Film size={15} color="var(--progress)" /> Storyboard per il video reale
      </div>
      <ol className="steps small" style={{ marginTop: 8 }}>
        <li>
          <b>A · Posizione iniziale (3–4 s).</b> Inquadratura {angle}, verticale 9:16. Regolazione: {ex.setup[0].toLowerCase()}
        </li>
        {a.errors.map((e, i) => (
          <li key={e.id}>
            <b>
              B{i + 1} · ✕ {e.bad} (2 ripetizioni, carico leggero).
            </b>{' '}
            Poi C{i + 1} · ✓ {e.good}: {ex.errors.find((x) => x.id === e.id)?.fix ?? ''}
          </li>
        ))}
        <li>
          <b>D · Esecuzione completa (3–4 ripetizioni).</b> Inquadratura intera, ritmo controllato, nessuna voce.
        </li>
      </ol>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        Registra senza audio parlato, a carico ridotto per gli errori. Poi apri l’esercizio → “Aggiungi il tuo video” → Annota: ✕ e ✓ nei momenti indicati, linee sulle zone ({a.errors.length} errori).
      </p>
    </div>
  );
}
