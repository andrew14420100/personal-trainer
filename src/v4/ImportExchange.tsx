import { useMemo, useState } from 'react';
import { Download, FileJson, Upload } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { allExercises } from '../data/catalog';
import { exchangeToRoutines, matchExchangeExercise, parseExchange, routinesToExchange, type WorkoutExchange } from '../lib/workoutExchange';
import { Sheet, toast } from './kit';

/** Local-only import: the JSON never leaves this device. */
export function ImportExchangeButton() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [program, setProgram] = useState<WorkoutExchange | null>(null);
  const [error, setError] = useState('');
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { settings } = useData();
  const update = useSettingsUpdater();

  const catalog = useMemo(() => allExercises().map(x => ({ id: x.id, name: x.name })), []);
  const matches = useMemo(() => program?.days.flatMap((day, di) =>
    day.exercises.map((exercise, ei) => ({
      key: di + ':' + ei, exercise,
      match: matchExchangeExercise(exercise, selections[di + ':' + ei]),
    }))) ?? [], [program, selections]);
  const unresolved = matches.filter(x => !x.match.id);

  const inspect = (value: string) => {
    try {
      setProgram(parseExchange(value));
      setSelections({});
      setError('');
    } catch (err) {
      setProgram(null);
      setError(err instanceof Error ? err.message : 'Non riesco a leggere il file.');
    }
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 262144) { setError('File troppo grande (massimo 256 KB).'); return; }
    try {
      const value = await file.text();
      setRaw(value);
      inspect(value);
    } catch {
      setError('Lettura del file non riuscita.');
    }
  };
  const save = async () => {
    if (!program || unresolved.length || saving) return;
    try {
      setSaving(true);
      const routines = exchangeToRoutines(program, selections);
      // A single settings write: never modify the four built-in days or completed sessions.
      await update(s => ({ ...s, routines: [...s.routines, ...routines] }));
      toast('Importate ' + routines.length + ' giornate: le schede precedenti sono intatte.');
      setOpen(false);
      setRaw('');
      setProgram(null);
      setSelections({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Importazione non riuscita.');
    } finally {
      setSaving(false);
    }
  };
  const folder = program?.program.folder?.trim() || ('ChatGPT · ' + (program?.program.title || ''));
  const duplicateFolder = !!program && settings.routines.some(x => x.folder === folder);
  return (
    <>
      <button className="btn sm" onClick={() => setOpen(true)} aria-label="Importa scheda da ChatGPT">
        <Upload size={16} /> Importa scheda
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Importa scheda da ChatGPT">
        <div className="col" style={{ gap: 12 }}>
          <h2 className="t-h2">Importa scheda da ChatGPT</h2>
          <p className="t-sm c2">Selezioni un file JSON FORMA LAB oppure incolli il testo. Nessun file viene caricato online.</p>
          <input type="file" className="input" accept=".json,application/json"
            aria-label="Seleziona il file JSON" onChange={e => void readFile(e.target.files?.[0])} />
          <textarea className="input" aria-label="Incolla JSON" rows={4}
            placeholder="Oppure incolli qui il contenuto JSON..."
            value={raw} onChange={e => { setRaw(e.target.value); setProgram(null); setError(''); }} />
          <button className="btn block" onClick={() => inspect(raw)} disabled={!raw.trim()}>
            <FileJson size={16} /> Controlla e mostra anteprima
          </button>
          {error && <div className="notice" role="alert">{error}</div>}
          {program && (
            <>
              <div className="card col" style={{ gap: 8 }}>
                <h3 className="t-h3">{program.program.title}</h3>
                <div className="t-xs c2">
                  {program.days.length} giornate · {program.days.reduce((sum, day) => sum + day.exercises.length, 0)} esercizi · autore: {program.program.author}
                </div>
                {program.program.durationWeeks != null && <p className="t-xs c2">
                  Programma di {program.program.durationWeeks} settimane: questa prima versione importa le giornate come routine.
                  La periodizzazione sul calendario non è ancora automatica.
                </p>}
                {program.days.map((day, di) => (
                  <div className="card col" key={day.id} style={{ padding: 10, gap: 6 }}>
                    <strong>{day.weekdayLabel || 'Giorno ' + (di + 1)} · {day.name}</strong>
                    {day.exercises.map((exercise, ei) => {
                      const key = di + ':' + ei;
                      const match = matches.find(m => m.key === key)?.match;
                      return <div key={key} className="t-sm">
                        {exercise.exerciseName} · {exercise.sets} × {exercise.repetitions.min}–{exercise.repetitions.max}
                        {exercise.repetitions.unit === 'seconds' ? ' s' : exercise.repetitions.unit === 'minutes' ? ' min' : ' rip'}
                        {match?.id
                          ? <div className="t-xs c2">✓ {match.candidates[0]?.name || 'Esercizio associato'}</div>
                          : <label className="t-xs c2" style={{ display: 'block' }}>
                              Associa l’esercizio corretto:
                              <select className="input" value={selections[key] || ''}
                                aria-label={'Associa ' + exercise.exerciseName}
                                onChange={e => setSelections(prev => ({ ...prev, [key]: e.target.value }))}>
                                <option value="">Selezioni un esercizio...</option>
                                {catalog.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                              </select>
                            </label>}
                      </div>;
                    })}
                  </div>
                ))}
              </div>
              {duplicateFolder && <div className="notice">
                Esiste già una cartella con questo nome. Importando, verranno create copie aggiuntive, senza cancellare le precedenti.
              </div>}
              {unresolved.length > 0 && <div className="notice">
                Associa ancora {unresolved.length} esercizi sconosciuti o ambigui prima di continuare.
              </div>}
              <button className="btn primary lg block" disabled={saving || unresolved.length > 0}
                onClick={() => void save()}>
                {saving ? 'Importazione in corso...' : 'Conferma e importa ' + program.days.length + ' giornate'}
              </button>
            </>
          )}
          <button className="btn block ghost" onClick={() => setOpen(false)}>Chiudi</button>
        </div>
      </Sheet>
    </>
  );
}

export function ExportExchangeButton() {
  const { settings } = useData();
  const exportFile = () => {
    if (!settings.routines.length) { toast('Non ci sono schede personali da esportare.'); return; }
    const data = JSON.stringify(routinesToExchange(settings.routines), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'FORMA_LAB_schede_per_ChatGPT.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  };
  return <button className="btn sm" onClick={exportFile}><Download size={16} /> Esporta schede</button>;
}
