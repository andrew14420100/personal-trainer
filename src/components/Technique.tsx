// Didactic panels shown NEXT TO the (unmodified) video: preparation, errors in RED,
// corrections RED→GREEN, execution and summary. Content is exercise-specific.
import { useEffect, useState } from 'react';
import { Check, X, ArrowRight, Wind } from 'lucide-react';
import type { Exercise, ExerciseError } from '../data/types';
import { BodyMap, areaLabel } from './BodyMap';

export function FixCard({ err, corrected, onToggle }: { err: ExerciseError; corrected: boolean; onToggle?: () => void }) {
  return (
    <div className={`fix-card${corrected ? ' corrected' : ''}`}>
      <div className="fix-head">
        <BodyMap area={err.area} state={corrected ? 'right' : 'wrong'} size={36} />
        <div className="grow">
          <div style={{ fontWeight: 700 }}>{err.title}</div>
          <div className="small muted">Zona: {areaLabel(err.area)}</div>
        </div>
        {onToggle && (
          <button className={`btn sm ${corrected ? '' : 'primary'}`} onClick={onToggle} aria-pressed={corrected}>
            {corrected ? 'Mostra errore' : 'Correggi'}
          </button>
        )}
      </div>
      <div className="fix-body">
        <div className="fix-side wrong">
          <X size={18} aria-hidden />
          <span className="lbl">Errore</span>
          {err.wrong}
        </div>
        {corrected && (
          <div className="fix-side right" style={{ animation: 'screen-in .45s var(--ease) both' }}>
            <Check size={18} aria-hidden />
            <span className="lbl">Correzione</span>
            {err.fix}
          </div>
        )}
      </div>
      <div className="fix-why">
        <b style={{ color: 'var(--text)' }}>Perché conta: </b>
        {err.why}
      </div>
    </div>
  );
}

export function Cues({ cues }: { cues: string[] }) {
  return (
    <div className="cues">
      {cues.map((c) => (
        <div key={c} className="cue">
          <Check size={16} aria-hidden /> {c}
        </div>
      ))}
    </div>
  );
}

const PHASES = [
  { id: 1, label: 'Preparazione', cls: '' },
  { id: 2, label: 'Errori', cls: 'err' },
  { id: 3, label: 'Correzione', cls: 'ok' },
  { id: 4, label: 'Esecuzione', cls: '' },
  { id: 5, label: 'Riepilogo', cls: '' },
] as const;

/** Five-phase guided tutorial panel (used with the full tutorial video). */
export function TutorialPhases({ ex }: { ex: Exercise }) {
  const [phase, setPhase] = useState<number>(1);
  const [fixStep, setFixStep] = useState(0);
  useEffect(() => {
    setPhase(1);
    setFixStep(0);
  }, [ex.id]);

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="phases" role="tablist" aria-label="Fasi del tutorial">
        {PHASES.map((p) => (
          <button key={p.id} role="tab" aria-selected={phase === p.id} className={`phase-btn ${p.cls}`} onClick={() => setPhase(p.id)}>
            <span className="k">{p.id}</span>
            {p.label}
          </button>
        ))}
      </div>

      <div className="card tight flat" role="tabpanel" style={{ animation: 'screen-in .35s var(--ease) both' }} key={phase}>
        {phase === 1 && (
          <>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Fase 1 · Posizione e regolazioni
            </div>
            <ol className="steps">
              {ex.setup.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </>
        )}
        {phase === 2 && (
          <>
            <div className="eyebrow" style={{ marginBottom: 10, color: 'var(--wrong)' }}>
              Fase 2 · Errori più comuni
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {ex.errors.map((e) => (
                <FixCard key={e.id} err={e} corrected={false} />
              ))}
            </div>
          </>
        )}
        {phase === 3 && (
          <>
            <div className="eyebrow" style={{ marginBottom: 10, color: 'var(--right)' }}>
              Fase 3 · Correzione {Math.min(fixStep + 1, ex.errors.length)}/{ex.errors.length}
            </div>
            <FixCard err={ex.errors[fixStep]} corrected />
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn sm" disabled={fixStep === 0} onClick={() => setFixStep((i) => i - 1)}>
                Precedente
              </button>
              <div className="grow" />
              {fixStep < ex.errors.length - 1 ? (
                <button className="btn sm primary" onClick={() => setFixStep((i) => i + 1)}>
                  Successiva <ArrowRight size={16} />
                </button>
              ) : (
                <button className="btn sm primary" onClick={() => setPhase(4)}>
                  Esecuzione <ArrowRight size={16} />
                </button>
              )}
            </div>
          </>
        )}
        {phase === 4 && (
          <>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Fase 4 · Esecuzione controllata
            </div>
            <ol className="steps">
              {ex.execution.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <div className="row small text-2" style={{ marginTop: 12, gap: 8 }}>
              <Wind size={16} /> {ex.breathing}
            </div>
          </>
        )}
        {phase === 5 && (
          <>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Fase 5 · Da ricordare
            </div>
            <Cues cues={ex.cues} />
            <div className="small text-2" style={{ marginTop: 12 }}>
              <b style={{ color: 'var(--wrong)' }}>Errori da evitare: </b>
              {ex.errors
                .slice(0, 3)
                .map((e) => e.title.toLowerCase())
                .join(' · ')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
