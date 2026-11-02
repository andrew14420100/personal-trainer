import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Star, Timer, Wind, TrendingUp, CheckCircle2, XCircle, Repeat2 } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { EXERCISE_BY_ID } from '../data/exercises';
import { DAY_BY_ID, SLOTS } from '../data/program';
import { VIDEOS_BY_EXERCISE, youtubeWatchUrl, type VideoSource } from '../data/videos';
import { effectiveSlot, formatPrescription } from '../lib/plan';
import { doneSets, exerciseHistory, lastLog } from '../lib/stats';
import { progressionHint } from '../lib/progression';
import { timer } from '../lib/timer';
import { kg, shortDate, num } from '../lib/format';
import { navigate } from '../lib/router';
import { Notice, Section, Segmented, TopBar, toast } from '../components/ui';
import { VideoPlayer } from '../components/VideoPlayer';
import { Cues, FixCard, TutorialPhases } from '../components/Technique';
import { ChartCard } from '../components/Charts';
import { NotFound } from './Program';

export function ExerciseDetail({ id, slotId }: { id: string; slotId?: string }) {
  const ex = EXERCISE_BY_ID[id];
  const data = useData();
  const update = useSettingsUpdater();
  const [mode, setMode] = useState<'demo' | 'tutorial'>('demo');
  const [corrected, setCorrected] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  useEffect(() => setNote(data.settings.notes[id] ?? ''), [id, data.settings.notes]);
  useEffect(() => {
    setMode('demo');
    setCorrected({});
  }, [id]);

  const history = useMemo(() => (ex ? exerciseHistory(data.sessions, id) : []), [data.sessions, id, ex]);
  if (!ex) return <NotFound />;

  const vids = VIDEOS_BY_EXERCISE[id];
  const video = mode === 'demo' ? vids?.demo : vids?.tutorial;
  const slots = SLOTS.map((s) => effectiveSlot(s, data.settings, data.calibration)).filter((s) => s.exerciseId === id);
  const primarySlot = slots.find((s) => s.id === slotId) ?? slots[0];
  const last = lastLog(data.sessions, id);
  const hint = primarySlot ? progressionHint(ex, { repsMin: primarySlot.repsMin, repsMax: primarySlot.repsMax, sets: primarySlot.plannedSets }, last?.log ?? null) : null;
  const fav = data.settings.favorites.includes(id);
  const rest = data.settings.restOverrides[id] ?? ex.restSec;
  const allCorrected = ex.errors.every((e) => corrected[e.id]);

  const toggleFav = () =>
    update((s) => ({ ...s, favorites: fav ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] })).then(() => toast(fav ? 'Rimosso dai preferiti' : 'Aggiunto ai preferiti'));

  return (
    <main className="screen" style={{ ['--accent' as string]: primarySlot ? DAY_BY_ID[primarySlot.dayId].accent : undefined }}>
      <TopBar
        fallback="/scheda"
        title={ex.name}
        right={
          <button className={`icon-btn${fav ? ' on' : ''}`} aria-pressed={fav} aria-label={fav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'} onClick={toggleFav}>
            <Star size={20} fill={fav ? 'currentColor' : 'none'} />
          </button>
        }
      />

      {/* 1–2 Name and muscles */}
      <div className="eyebrow" style={{ color: 'var(--accent)' }}>
        {ex.category} · {ex.equipment}
      </div>
      <h1 className="display h2" style={{ marginTop: 6 }}>
        {ex.name}
      </h1>
      <div className="chips" style={{ marginTop: 10 }}>
        {ex.primary.map((m) => (
          <span key={m} className="chip accent">
            {m}
          </span>
        ))}
        {ex.secondary.map((m) => (
          <span key={m} className="chip">
            {m}
          </span>
        ))}
      </div>

      {/* 3–6 Video */}
      <div style={{ marginTop: 16 }}>
        <VideoPlayer video={video} label={`${ex.name} — ${mode === 'demo' ? 'dimostrazione' : 'tutorial'}`} />
      </div>
      <div style={{ marginTop: 10 }}>
        <Segmented
          label="Tipo di video"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'demo', label: 'Dimostrazione' },
            { value: 'tutorial', label: 'Tutorial completo' },
          ]}
        />
      </div>
      {video && <VideoMeta video={video} />}
      {video && <VideoReview youtubeId={video.youtubeId} />}
      {vids?.missing.map((m) => (
        <div key={m} style={{ marginTop: 10 }}>
          <Notice>{m}</Notice>
        </div>
      ))}
      {ex.variantNote && (
        <div style={{ marginTop: 10 }}>
          <Notice>
            <b>Variante da confermare.</b> {ex.variantNote}
          </Notice>
        </div>
      )}

      {mode === 'tutorial' && (
        <Section title="Tutorial guidato">
          <p className="small text-2" style={{ marginBottom: 10 }}>
            Il video è incorporato senza modifiche (licenza YouTube). Errori e correzioni sono illustrati qui, in rosso e in verde, specifici per questo esercizio.
          </p>
          <TutorialPhases ex={ex} />
        </Section>
      )}

      {/* 7–9 Prescription, last load, rest timer */}
      <Section title="Prescrizione">
        <div className="stack" style={{ gap: 8 }}>
          {slots.map((s) => (
            <div key={s.id} className="card tight flat row between">
              <div>
                <div style={{ fontWeight: 700 }}>{formatPrescription(s, s.todaySets)}</div>
                <div className="small muted">
                  {DAY_BY_ID[s.dayId].weekdayLabel} · {DAY_BY_ID[s.dayId].name} · posizione {s.order}
                  {s.todaySets !== s.plannedSets && ` · calibrazione (poi ${s.plannedSets} serie)`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="stat-grid" style={{ marginTop: 10 }}>
          <div className="stat">
            <div className="stat-label">Ultima sessione</div>
            {last ? (
              <>
                <div className="stat-value" style={{ fontSize: 22 }}>
                  {ex.tracking === 'time'
                    ? `${Math.max(...doneSets(last.log).map((x) => x.reps ?? 0))} s`
                    : kg(Math.max(...doneSets(last.log).map((x) => x.weight ?? 0)))}
                </div>
                <div className="stat-sub">
                  {shortDate(last.date)} ·{' '}
                  {doneSets(last.log)
                    .map((x) => x.reps)
                    .join(' / ')}{' '}
                  {ex.tracking === 'time' ? 's' : 'rip.'}
                </div>
              </>
            ) : (
              <>
                <div className="stat-value muted" style={{ fontSize: 22 }}>
                  —
                </div>
                <div className="stat-sub">ancora nessun dato</div>
              </>
            )}
          </div>
          <div className="stat">
            <div className="stat-label">Recupero</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {rest} s
            </div>
            <button className="btn sm primary" style={{ marginTop: 8, width: '100%' }} onClick={() => timer.start(rest, ex.name)}>
              <Timer size={16} /> Avvia timer
            </button>
          </div>
        </div>
        {hint && (
          <div className="card tight flat" style={{ marginTop: 10 }}>
            <div className="row" style={{ gap: 8, fontWeight: 700 }}>
              <TrendingUp size={18} color="var(--progress)" /> {hint.title}
            </div>
            <p className="small text-2" style={{ marginTop: 6 }}>
              {hint.detail}
            </p>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              Suggerimento indicativo basato su serie, ripetizioni, margine e tecnica che hai dichiarato. Non è una valutazione medica né posturale.
            </p>
          </div>
        )}
      </Section>

      {/* 10 Technique */}
      <Section title="Tecnica">
        <div className="card tight flat">
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Preparazione
          </div>
          <ol className="steps">
            {ex.setup.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="divider" style={{ margin: '16px 0' }} />
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Esecuzione
          </div>
          <ol className="steps">
            {ex.execution.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="row small text-2" style={{ marginTop: 14, gap: 8 }}>
            <Wind size={16} /> {ex.breathing}
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Cues cues={ex.cues} />
        </div>
      </Section>

      {/* 11–12 Errors and corrections */}
      <Section
        title="Errori e correzioni"
        action={
          <button className="link" onClick={() => setCorrected(Object.fromEntries(ex.errors.map((e) => [e.id, !allCorrected])))}>
            <Repeat2 size={14} style={{ verticalAlign: '-2px' }} /> {allCorrected ? 'Mostra errori' : 'Correggi tutti'}
          </button>
        }
      >
        <div className="stack" style={{ gap: 10 }}>
          {ex.errors.map((e) => (
            <FixCard key={e.id} err={e} corrected={!!corrected[e.id]} onToggle={() => setCorrected((c) => ({ ...c, [e.id]: !c[e.id] }))} />
          ))}
        </div>
      </Section>

      {/* 13 Alternatives */}
      <Section title="Alternative">
        <div className="stack" style={{ gap: 8 }}>
          {ex.alternatives.map((a) => (
            <div key={a.name} className="card tight flat">
              <div style={{ fontWeight: 650 }}>{a.name}</div>
              <div className="small text-2">{a.note}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 14 Notes */}
      <Section title="Note personali">
        <textarea
          className="input"
          value={note}
          placeholder="Regolazioni della macchina, sensazioni, attrezzo usato…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => update((s) => ({ ...s, notes: { ...s.notes, [id]: note } }))}
          aria-label="Note personali"
        />
        <p className="tiny muted" style={{ marginTop: 6 }}>
          Salvate automaticamente su questo dispositivo.
        </p>
      </Section>

      {/* 15 History */}
      <Section title="Storico prestazioni">
        {history.length ? (
          <div className="stack" style={{ gap: 10 }}>
            {history.length >= 2 && ex.tracking === 'reps' && history.some((h) => h.topWeight > 0) && (
              <ChartCard
                title="Carico massimo per sessione"
                kind="line"
                unit="kg"
                data={history.map((h) => ({ key: h.sessionId, label: shortDate(h.date), value: h.topWeight, detail: `${shortDate(h.date)} · ${h.topReps} rip.` }))}
              />
            )}
            {history.length >= 2 && ex.tracking === 'time' && (
              <ChartCard title="Durata massima per sessione" kind="line" unit="s" data={history.map((h) => ({ key: h.sessionId, label: shortDate(h.date), value: h.topReps }))} />
            )}
            <table className="data">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Serie</th>
                  <th>{ex.tracking === 'time' ? 'Secondi' : 'Kg × rip.'}</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h) => (
                  <tr key={h.sessionId} onClick={() => navigate(`/sessione/${h.sessionId}`)} style={{ cursor: 'pointer' }}>
                    <td>{shortDate(h.date)}</td>
                    <td>{h.sets}</td>
                    <td>
                      {doneSets(h.log)
                        .map((s) => (ex.tracking === 'time' ? `${s.reps}` : `${num(s.weight ?? 0, 2)}×${s.reps}`))
                        .join('  ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="small text-2">Nessuna serie registrata per questo esercizio. Lo storico si compila automaticamente durante gli allenamenti.</p>
        )}
      </Section>
    </main>
  );
}

function VideoMeta({ video }: { video: VideoSource }) {
  return (
    <div className="card tight flat" style={{ marginTop: 10 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="small" style={{ fontWeight: 650 }}>
            {video.title}
          </div>
          <div className="tiny muted" style={{ marginTop: 2 }}>
            {video.author} · {video.duration} · {video.kind === 'demo' ? 'Dimostrazione rapida' : 'Tutorial'}
          </div>
        </div>
        <a className="icon-btn plain" href={youtubeWatchUrl(video.youtubeId)} target="_blank" rel="noopener noreferrer" aria-label="Apri la fonte originale">
          <ExternalLink size={18} />
        </a>
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        <span className={`chip ${video.match === 'esatto' ? 'ok' : 'warn'}`}>Corrispondenza: {video.match}</span>
        <span className="chip">Errori: {video.errorsShown}</span>
        <span className="chip">Link verificato</span>
      </div>
      {video.matchNote && (
        <p className="tiny text-2" style={{ marginTop: 8 }}>
          {video.matchNote}
        </p>
      )}
    </div>
  );
}

function VideoReview({ youtubeId }: { youtubeId: string }) {
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
    <div className="row wrap small" style={{ marginTop: 8, gap: 8 }}>
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
          <span className="muted">
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
