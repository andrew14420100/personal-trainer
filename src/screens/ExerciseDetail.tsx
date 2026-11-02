import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Star, Timer, Wind, TrendingUp, Repeat2 } from 'lucide-react';
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
import { MediaHero } from '../components/MediaHero';
import { VideoReview } from '../components/VideoReview';
import { Anatomy } from '../components/Anatomy';
import { EXERCISE_MUSCLES, MUSCLE_LABEL } from '../data/muscles';
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
  const mus = EXERCISE_MUSCLES[id];
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

      {/* 1–2 Name, muscle group and key facts at a glance */}
      <div className="eyebrow" style={{ color: 'var(--accent)' }}>
        {mus.group} · {ex.category}
      </div>
      <h1 className="display h2" style={{ marginTop: 6, textWrap: 'balance' }}>
        {ex.name} <span style={{ color: 'var(--accent)' }}>— {mus.group}</span>
      </h1>

      {/* 3–6 Video: real demonstration first */}
      <div style={{ marginTop: 16 }}>
        <MediaHero exerciseId={id} />
      </div>
      <section className="card tight ex-facts" style={{ marginTop: 14 }} aria-label="Scheda rapida">
        <div className="ex-facts-grid">
          <div>
            <div className="label">Muscolo principale</div>
            <div className="ex-fact-v">{mus.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}</div>
          </div>
          <div>
            <div className="label">Muscoli secondari</div>
            <div className="ex-fact-v small">{mus.secondary.map((m) => MUSCLE_LABEL[m]).join(', ') || '—'}</div>
          </div>
          <div>
            <div className="label">Attrezzatura</div>
            <div className="ex-fact-v small">{ex.equipment}</div>
          </div>
          <div className="ex-facts-nums">
            <div>
              <div className="label">Serie</div>
              <div className="ex-fact-n">{primarySlot?.todaySets ?? '—'}</div>
            </div>
            <div>
              <div className="label">{ex.tracking === 'time' ? 'Secondi' : 'Ripetizioni'}</div>
              <div className="ex-fact-n">{primarySlot ? `${primarySlot.repsMin}–${primarySlot.repsMax}` : '—'}</div>
            </div>
            <div>
              <div className="label">Recupero</div>
              <div className="ex-fact-n">{rest}s</div>
            </div>
          </div>
        </div>
        <div className="ex-facts-anat">
          <Anatomy primary={mus.primary} secondary={mus.secondary} size="sm" legend={false} />
          <div className="tiny muted" style={{ textAlign: 'center', marginTop: 4 }}>
            <span style={{ color: 'var(--muscle-p)' }}>■</span> principali <span style={{ color: 'var(--muscle-s)' }}>■</span> secondari
          </div>
        </div>
      </section>
      {primarySlot?.sideLabel && <p className="tiny muted" style={{ marginTop: 6 }}>Ripetizioni {primarySlot.sideLabel}.</p>}

      {ex.variantNote && (
        <div style={{ marginTop: 10 }}>
          <Notice>
            <b>Variante da confermare.</b> {ex.variantNote}
          </Notice>
        </div>
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

      <Section title="Guida passo per passo">
        <TutorialPhases ex={ex} />
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

      {/* External references (embed only, not editable) */}
      <Section title="Fonti esterne">
        <details className="card tight flat disclosure">
          <summary className="row between">
            <span className="small" style={{ fontWeight: 650 }}>
              Video YouTube di riferimento ({[vids?.demo, vids?.tutorial].filter(Boolean).length})
            </span>
            <span className="small muted">apri</span>
          </summary>
          <p className="tiny muted" style={{ margin: '8px 0' }}>
            Contenuti di terzi, solo incorporabili e spesso parlati: restano come riferimento secondario. Richiedono la connessione.
          </p>
          <Segmented
            label="Video esterno"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'demo', label: 'Breve' },
              { value: 'tutorial', label: 'Tutorial' },
            ]}
          />
          <div style={{ marginTop: 10 }}>
            <VideoPlayer video={video} label={`${ex.name} — fonte esterna`} />
          </div>
          {video && <VideoMeta video={video} />}
          {video && <VideoReview youtubeId={video.youtubeId} />}
          {vids?.missing.map((m) => (
            <div key={m} style={{ marginTop: 10 }}>
              <Notice>{m}</Notice>
            </div>
          ))}
        </details>
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
