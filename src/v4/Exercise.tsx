import { useEffect, useState } from 'react';
import { AlertTriangle, Check, ExternalLink, History, Info, ListChecks, NotebookPen, Repeat, Settings2, TrendingUp, Wind, X } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { EXERCISE_BY_ID } from '../data/exercises';
import { EXERCISE_MUSCLES, MUSCLE_LABEL } from '../data/muscles';
import { REAL_VIDEOS } from '../data/realVideos';
import { VIDEOS_BY_EXERCISE, youtubeWatchUrl } from '../data/videos';
import { SLOTS, SLOT_VARIANTS } from '../data/program';
import { effectiveSlot, formatPrescription } from '../lib/plan';
import { doneSets, exerciseHistory } from '../lib/stats';
import { kg, num, volume } from '../lib/format';
import { progressionHint } from '../lib/progression';
import { navigate } from '../lib/router';
import { Anatomy } from '../components/Anatomy';
import { ChartCard } from '../components/Charts';
import { UserVideo, useMedia } from '../components/UserVideo';
import { allExercises, sourceOf } from '../data/catalog';
import { Archive, ArchiveRestore, Star } from 'lucide-react';
import { Acc, Empty, NavBar, Notice, Seg } from './kit';
import { Player } from './Player';

type Src = 'v0' | 'v1' | 'own';

export function Exercise({ id, slotId }: { id: string; slotId?: string }) {
  const { settings, calibration, sessions } = useData();
  const update = useSettingsUpdater();
  const ex = EXERCISE_BY_ID[id];
  const vids = REAL_VIDEOS[id] ?? [];
  const [own] = useMedia(`${id}:quick`);
  const [src, setSrc] = useState<Src>('v0');
  const [note, setNote] = useState('');
  const [metric, setMetric] = useState<'carico' | 'rip' | 'volume'>('carico');
  useEffect(() => setNote(settings.notes[id] ?? ''), [id, settings.notes]);
  // remember as recently viewed (most recent first, max 30)
  useEffect(() => {
    if (!EXERCISE_BY_ID[id] || settings.recentExercises[0] === id) return;
    void update((s) => ({ ...s, recentExercises: [id, ...s.recentExercises.filter((x) => x !== id)].slice(0, 30) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!ex)
    return (
      <main className="page">
        <NavBar fallback="/allenamenti" />
        <Empty icon={<Info size={22} />} title="Esercizio non trovato" />
      </main>
    );
  const mus = EXERCISE_MUSCLES[id];
  const slot0 = SLOTS.find((s) => s.id === slotId) ?? SLOTS.find((s) => s.exerciseId === id) ?? SLOTS.find((s) => SLOT_VARIANTS[s.id]?.includes(id));
  const slot = slot0 ? effectiveSlot(slot0, settings, calibration) : null;
  const hist = exerciseHistory(sessions, id);
  const last = hist[hist.length - 1];
  const hint = slot ? progressionHint(ex, { repsMin: slot.repsMin, repsMax: slot.repsMax, sets: slot.todaySets }, last?.log ?? null) : null;
  const video = src === 'v1' ? vids[1] : vids[0];
  const tut = VIDEOS_BY_EXERCISE[id];
  const links = [tut?.demo, tut?.tutorial, ...(tut?.extra ?? [])].filter(Boolean) as NonNullable<typeof tut>['extra'];
  const isTime = ex.tracking === 'time';
  const chart = hist.map((p) => ({
    key: p.sessionId,
    label: new Date(p.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' }),
    value: metric === 'carico' ? p.topWeight : metric === 'rip' ? p.totalReps : p.volume,
    detail: new Date(p.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }),
  }));

  return (
    <main className="page">
      <NavBar title={ex.name} fallback="/allenamenti" />
      <div className="ex-group" style={{ marginTop: 4 }}>
        {mus?.group}
      </div>
      <h1 className="t-h1" style={{ marginTop: 2 }}>
        {ex.name}
      </h1>
      <div className="row wrap mt8" style={{ gap: 6 }}>
        <button
          className={`btn sm${settings.favorites.includes(id) ? ' primary' : ''}`}
          aria-pressed={settings.favorites.includes(id)}
          onClick={() => update((st) => ({ ...st, favorites: st.favorites.includes(id) ? st.favorites.filter((x) => x !== id) : [...st.favorites, id] }))}
        >
          <Star size={14} /> {settings.favorites.includes(id) ? 'Preferito' : 'Aggiungi ai preferiti'}
        </button>
        {sourceOf(id) !== 'scheda' && (
          <button
            className="btn sm ghost"
            onClick={() => update((st) => ({ ...st, archivedExercises: st.archivedExercises.includes(id) ? st.archivedExercises.filter((x) => x !== id) : [...st.archivedExercises, id] }))}
          >
            {settings.archivedExercises.includes(id) ? <ArchiveRestore size={14} /> : <Archive size={14} />} {settings.archivedExercises.includes(id) ? 'Ripristina dall’archivio' : 'Archivia'}
          </button>
        )}
      </div>
      {ex.source && (
        <p className="t-xs c3 mt8" style={{ marginBottom: 0 }}>
          Dati di catalogo da {ex.source.name} ({ex.source.license}){ex.source.autoName ? `; nome italiano tradotto automaticamente dall’originale “${ex.nameEn}”` : ''}. Istruzioni tecniche e video non ancora disponibili né verificati per questo esercizio.
        </p>
      )}
      <p className="t-sm c3" style={{ marginTop: 2 }}>
        {ex.nameEn} · {ex.equipment}
        {ex.level ? ` · ${ex.level}` : ''}
        {ex.movement ? ` · ${ex.movement}` : ''}
      </p>

      {/* ── Video ─────────────────────────────── */}
      <div className="mt12">
        {(vids.length > 1 || own) && (
          <div style={{ marginBottom: 8 }}>
            <Seg<Src>
              label="Fonte video"
              value={src}
              onChange={setSrc}
              options={[
                { value: 'v0', label: 'Video 1' },
                ...(vids[1] ? [{ value: 'v1' as Src, label: 'Video 2' }] : []),
                ...(own ? [{ value: 'own' as Src, label: 'Il tuo' }] : []),
              ]}
            />
          </div>
        )}
        {src === 'own' ? (
          <UserVideo exerciseId={id} kind="quick" />
        ) : video ? (
          <>
            <Player key={video.youtubeId} youtubeId={video.youtubeId} title={video.title} autoPlay={settings.video.autoplay} />
            <div className="t-xs c3 mt8">
              Video reale di <b className="c2">{video.author}</b> su YouTube, senza audio all’avvio.
              {video.match === 'variante simile' && <span className="c-accent"> Variante simile: {video.note ?? 'attrezzo o impugnatura diversi da quelli della scheda.'}</span>}
              {video.match === 'esatto' && video.note ? ` ${video.note}.` : ''}
            </div>
            <div className="chips mt8">
              <span className={`chip sm ${video.match === 'esatto' ? 'ok' : 'warn'}`}>{video.match === 'esatto' ? 'Video reale · incorporabile, da provare su iPhone' : 'Variante simile'}</span>
            </div>
          </>
        ) : (
          <Notice icon={<AlertTriangle size={17} color="var(--warn)" />}>
            Nessun video idoneo trovato per questo esercizio. Non mostriamo filmati non pertinenti: puoi aggiungere un tuo video qui sotto.
          </Notice>
        )}
      </div>

      {/* ── Facts ─────────────────────────────── */}
      {slot && (
        <div className="stats mt16">
          <div className="stat">
            <div className="t-label">Serie × {isTime ? 'secondi' : 'ripetizioni'}</div>
            <div className="v" style={{ fontSize: 20 }}>
              {formatPrescription(slot, slot.todaySets)}
            </div>
          </div>
          <div className="stat">
            <div className="t-label">Recupero</div>
            <div className="v" style={{ fontSize: 20 }}>
              {slot.restSec} s
            </div>
          </div>
          <div className="stat">
            <div className="t-label">{isTime ? 'Ultima durata' : 'Ultimo carico'}</div>
            <div className="v c-data" style={{ fontSize: 20 }}>
              {last ? (isTime ? `${last.topReps} s` : last.topWeight ? kg(last.topWeight) : 'corpo libero') : '—'}
            </div>
            <div className="s">{last ? new Date(last.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : 'nessun dato'}</div>
          </div>
          <div className="stat">
            <div className="t-label">Prossima volta</div>
            <div className="t-sm mt8" style={{ fontWeight: 650 }}>
              {hint?.suggestedWeight ? kg(hint.suggestedWeight) : hint?.title}
            </div>
          </div>
        </div>
      )}
      {hint && <p className="t-xs c3 mt8">{hint.detail} Indicazione orientativa, non un parere medico.</p>}

      <div className="card mt12">
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="t-label" style={{ marginRight: 4 }}>
            Principali
          </span>
          {mus?.primary.map((m) => (
            <span key={m} className="chip accent">
              {MUSCLE_LABEL[m]}
            </span>
          ))}
        </div>
        {!!mus?.secondary.length && (
          <div className="row wrap mt8" style={{ gap: 6 }}>
            <span className="t-label" style={{ marginRight: 4 }}>
              Secondari
            </span>
            {mus.secondary.map((m) => (
              <span key={m} className="chip">
                {MUSCLE_LABEL[m]}
              </span>
            ))}
          </div>
        )}
        <div className="mt12">
          <Anatomy primary={mus?.primary ?? []} secondary={mus?.secondary ?? []} />
        </div>
      </div>

      {ex.variantNote && (
        <div className="mt12">
          <Notice icon={<AlertTriangle size={17} color="var(--warn)" />}>{ex.variantNote}</Notice>
        </div>
      )}

      {/* ── Technique ─────────────────────────── */}
      <h2 className="t-h2 mt24" style={{ marginBottom: 10 }}>
        Tecnica
      </h2>
      {!ex.setup.length && !ex.errors.length && <p className="t-sm c3">Esercizio creato da te: nessuna guida tecnica. Puoi aggiungere un tuo video e le note qui sotto.</p>}
      {ex.setup.length > 0 && (
      <Acc title="Regolazione della macchina" icon={<Settings2 size={18} className="c3" />}>
        <ol className="steps">
          {ex.setup.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Acc>
      )}
      {ex.execution.length > 0 && (
      <Acc title="Esecuzione" icon={<ListChecks size={18} className="c3" />}>
        <ol className="steps">
          {ex.execution.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="t-sm c2 mt12 row" style={{ alignItems: 'flex-start' }}>
          <Wind size={16} style={{ flex: 'none', marginTop: 2 }} /> {ex.breathing}
        </p>
        <div className="chips mt12">
          {ex.cues.map((c) => (
            <span key={c} className="chip ok">
              {c}
            </span>
          ))}
        </div>
      </Acc>
      )}
      {ex.errors.length > 0 && (
      <Acc title="Errori e correzioni" icon={<AlertTriangle size={18} color="var(--bad)" />} badge={<span className="chip bad sm">{ex.errors.length}</span>}>
        {ex.errors.map((e) => (
          <div key={e.id} className="fault">
            <div className="f-bad">
              <span className="ico">
                <X size={14} strokeWidth={3} />
              </span>
              <div>
                <b>{e.title}</b>
                <div className="c2">{e.wrong}</div>
                <div className="t-xs c3" style={{ marginTop: 4 }}>
                  {e.why}
                </div>
              </div>
            </div>
            <div className="f-good">
              <span className="ico">
                <Check size={14} strokeWidth={3} />
              </span>
              <div>{e.fix}</div>
            </div>
          </div>
        ))}
      </Acc>
      )}
      {ex.alternatives.length > 0 && (
      <Acc title="Alternative" icon={<Repeat size={18} className="c3" />}>
        <div className="col" style={{ gap: 10 }}>
          {ex.alternatives.map((a) => (
            <div key={a.name}>
              <b className="t-sm">{a.name}</b>
              <div className="t-sm c2">{a.note}</div>
            </div>
          ))}
        </div>
      </Acc>
      )}
      <Acc title="Altri video (con voce)" icon={<ExternalLink size={18} className="c3" />}>
        <p className="t-xs c3" style={{ marginTop: 0 }}>
          Tutorial più lunghi e parlati: si aprono su YouTube, non vengono riprodotti nell’app.
        </p>
        <div className="col" style={{ gap: 8 }}>
          {[...vids.slice(2), ...links].map((v) => (
            <a key={v.youtubeId} className="list-row" style={{ borderRadius: 12, background: 'var(--s2)' }} href={youtubeWatchUrl(v.youtubeId)} target="_blank" rel="noopener noreferrer">
              <span className="grow">
                <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                  {v.title}
                </span>
                <span className="t-xs c3">
                  {v.author}
                  {'duration' in v ? ` · ${(v as { duration: string }).duration}` : ''}
                </span>
              </span>
              <ExternalLink size={16} className="c3" />
            </a>
          ))}
          {!links.length && vids.length <= 2 && <span className="t-sm c3">Nessun altro video.</span>}
        </div>
      </Acc>
      <Acc title="Il tuo video" icon={<NotebookPen size={18} className="c3" />}>
        <p className="t-xs c3" style={{ marginTop: 0 }}>
          Puoi caricare un video registrato da te: resta solo su questo dispositivo e si riproduce con il player dell’app (senza YouTube).
        </p>
        {src !== 'own' && <UserVideo exerciseId={id} kind="quick" />}
        {src === 'own' && <p className="t-sm c2">È mostrato sopra.</p>}
      </Acc>

      {/* ── Personal ──────────────────────────── */}
      <AltList id={id} />
      <h2 className="t-h2 mt24" style={{ marginBottom: 10 }}>
        I tuoi dati
      </h2>
      {hist.length ? (
        <>
          <Seg
            label="Grafico"
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'carico', label: isTime ? 'Durata' : 'Carico' },
              { value: 'rip', label: isTime ? 'Secondi tot.' : 'Ripetizioni' },
              { value: 'volume', label: 'Volume' },
            ]}
          />
          <div className="mt8">
            <ChartCard
              title={metric === 'carico' ? (isTime ? 'Durata migliore' : 'Carico massimo') : metric === 'rip' ? (isTime ? 'Secondi totali' : 'Ripetizioni totali') : 'Volume (kg × rip.)'}
              subtitle={`${hist.length} sedute registrate`}
              data={chart.map((c) => (metric === 'carico' && isTime ? { ...c, value: hist.find((h) => h.sessionId === c.key)!.topReps } : c))}
              unit={metric === 'carico' ? (isTime ? 's' : 'kg') : metric === 'rip' ? (isTime ? 's' : 'rip') : 'kg'}
              kind={metric === 'volume' ? 'bar' : 'line'}
            />
          </div>
          <Acc title="Storico serie" icon={<History size={18} className="c3" />} badge={<span className="chip sm">{hist.length}</span>}>
            <div className="col" style={{ gap: 10 }}>
              {[...hist].reverse().map((p) => (
                <button key={p.sessionId} className="list-row" style={{ borderRadius: 12, background: 'var(--s2)' }} onClick={() => navigate(`/sessione/${p.sessionId}`)}>
                  <span className="grow">
                    <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                      {new Date(p.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="t-xs c2">{doneSets(p.log).map((x) => (isTime ? `${x.reps}s` : `${num(x.weight ?? 0, 2)}×${x.reps}`)).join(' · ')}</span>
                  </span>
                  {!isTime && <span className="t-xs c3">{volume(p.volume)}</span>}
                </button>
              ))}
            </div>
          </Acc>
          {!isTime && last && (
            <p className="t-xs c3 mt8">
              <TrendingUp size={12} /> Migliore stima 1RM (Epley, ≤12 rip.): {kg(Math.round(Math.max(...hist.map((h) => h.bestE1rm)) * 10) / 10)}
            </p>
          )}
        </>
      ) : (
        <div className="card">
          <p className="t-sm c2" style={{ margin: 0 }}>
            Nessuna serie registrata. Lo storico e il grafico compaiono dopo il primo allenamento con questo esercizio.
          </p>
        </div>
      )}
      <div className="card mt12">
        <label className="t-label" htmlFor="ex-note">
          Note personali
        </label>
        <textarea
          id="ex-note"
          className="input mt8"
          style={{ minHeight: 72 }}
          value={note}
          placeholder="Sedile 4, schienale 2, presa media…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (settings.notes[id] ?? '') && update((s) => ({ ...s, notes: { ...s.notes, [id]: note } }))}
        />
      </div>
    </main>
  );
}

/** Equivalent alternatives: same main muscle, different equipment first (useful when a machine is busy). */
function AltList({ id }: { id: string }) {
  const m = EXERCISE_MUSCLES[id];
  if (!m?.primary.length) return null;
  const me = EXERCISE_BY_ID[id];
  const alts = allExercises()
    .filter((e) => e.id !== id && e.tracking === me?.tracking && EXERCISE_MUSCLES[e.id]?.primary[0] === m.primary[0])
    .sort((a, b) => Number(b.equipment !== me?.equipment) - Number(a.equipment !== me?.equipment) || Number(sourceOf(a.id) !== 'scheda') - Number(sourceOf(b.id) !== 'scheda'))
    .slice(0, 6);
  if (!alts.length) return null;
  return (
    <Acc title="Alternative equivalenti (stessi muscoli)" icon={<Repeat size={18} className="c3" />}>
      <div className="list">
        {alts.map((e) => (
          <button key={e.id} className="list-row" onClick={() => navigate(`/esercizio/${e.id}`)}>
            <span className="grow">
              <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                {e.name}
              </span>
              <span className="t-xs c3">{e.equipment}</span>
            </span>
          </button>
        ))}
      </div>
    </Acc>
  );
}
