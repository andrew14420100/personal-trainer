// "Importa scheda": FORMA LAB Workout Exchange v1 (JSON, pasted ChatGPT answer, CSV).
// Local and offline: parse → validate → match → editable preview → one atomic settings write.
import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardPaste, Copy, FileJson, FileUp, HelpCircle, Repeat, Sparkles, Upload, XCircle } from 'lucide-react';
import { useData } from '../app/store';
import { EXERCISE_BY_ID } from '../data/exercises';
import { EXERCISE_MUSCLES, MUSCLE_LABEL, MUSCLE_REGION, type MuscleId } from '../data/muscles';
import { kvSet } from '../lib/db';
import { loadSettings, saveSettings, updateSettings, type Settings } from '../lib/settings';
import { buildDraft, diffPrograms, draftProblems, exportProgram, findDuplicate, GOALS, IMPORT_FOLDER, MAX_BYTES, parseText, validateExchange, type Draft, type DraftItem, type Issue } from '../lib/exchange';
import { navigate } from '../lib/router';
import { NavBar, Notice, Section, Seg, toast } from './kit';
import { ExercisePicker } from './Routines';
import { allSchede, applyImport, defaultName, NONE, type ImportAction } from '../lib/library';

export const CHATGPT_PROMPT = `Crea il programma di allenamento nel formato "FORMA LAB Workout Exchange — versione 1".
Rispondi SOLO con un blocco JSON valido, senza testo prima o dopo, rispettando queste regole:
- "format": "forma-lab-workout-exchange", "version": 1, e un oggetto "program".
- program: name, goal (massa|forza|ricomposizione|dimagrimento|resistenza|salute|altro), level (principiante|intermedio|avanzato), durationWeeks (1–52), daysPerWeek (1–7), days (almeno 1). Facoltativi: description, author ("ChatGPT"), recommendedWeekdays (lunedi…domenica, senza accenti), progression, phases.
- phases: { name, fromWeek, toWeek, deload (true per lo scarico), setsDelta (serie in più/meno), rpe, rir, notes }, in ordine e senza sovrapporsi.
- days: { id (minuscole e trattini, es. "giorno-1"), name, weekday, muscleGroups, notes, exercises }.
- exercises: { name (in italiano), exerciseId (solo se conosci l'identificatore FORMA LAB), nameEn, equipment, sets (1–10), reps {min,max} OPPURE durationSec {min,max}, perSide, restSec (0–600), load {value, unit: kg|lb|%1RM} solo se lo specifichi davvero, rpe (5–10), rir (0–6), group (lettera maiuscola uguale su esercizi consecutivi = superserie o giant set), warmupSets (0–5), notes, alternatives [nomi] }.
- Nessun altro campo, nessun HTML o codice nei testi.`;

type Mode = 'new' | 'update' | 'copy';

export function ImportPage() {
  const { settings } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<Issue[]>([]);
  const [warnings, setWarnings] = useState<Issue[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<Mode>('new');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');

  const load = (t: string, name = 'Scheda importata') => {
    setDraft(null);
    const p = parseText(t, name);
    if (p.errors.length) {
      setErrors(p.errors);
      setWarnings([]);
      return;
    }
    const v = validateExchange(p.raw);
    setErrors(v.errors);
    setWarnings(v.warnings);
    if (v.data) {
      const d = buildDraft(v.data);
      setDraft(d);
      setMode(findDuplicate(d, settings) ? 'update' : 'new');
      setTimeout(() => document.getElementById('anteprima')?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    if (f.size > MAX_BYTES) return setErrors([{ path: f.name, message: `File troppo grande (massimo ${MAX_BYTES / 1024} KB)` }]);
    setFileName(f.name);
    load(await f.text(), f.name.replace(/\.(json|csv|txt)$/i, ''));
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <main className="page">
      <NavBar title="Importa scheda" fallback="/allenamenti" />
      <h1 className="t-h1">Importa scheda</h1>
      <p className="t-sm c2" style={{ marginTop: 4 }}>
        Formato ufficiale: <b>FORMA LAB Workout Exchange v1</b>. Tutto avviene sul tuo dispositivo, senza server né account ChatGPT.
      </p>

      <div className="col mt16" style={{ gap: 8 }}>
        <input ref={fileRef} id="import-program-file" type="file" className="sr-only" accept="application/json,.json,text/csv,.csv,text/plain,.txt" onChange={(e) => onFile(e.target.files?.[0])} />
        <label htmlFor="import-program-file" className="card tap row" style={{ display: 'flex', gap: 14 }}>
          <FileJson size={26} color="var(--accent)" />
          <span className="grow">
            <span className="t-h3" style={{ display: 'block' }}>
              Importa un file JSON o CSV
            </span>
            <span className="t-xs c3">Dal telefono (app File, iCloud Drive, download) o dal PC{fileName ? ` · ultimo: ${fileName}` : ''}</span>
          </span>
          <Upload size={18} className="c3" />
        </label>
        <div className="card col" style={{ gap: 8 }}>
          <div className="row">
            <ClipboardPaste size={22} color="var(--accent)" />
            <span className="t-h3 grow">Incolla la risposta di ChatGPT</span>
          </div>
          <textarea className="input" style={{ minHeight: 120, fontFamily: 'ui-monospace, monospace', fontSize: 13 }} placeholder='{"format": "forma-lab-workout-exchange", "version": 1, "program": { … } }' value={text} onChange={(e) => setText(e.target.value)} aria-label="Testo della scheda da importare" />
          <div className="row">
            <button
              className="btn sm ghost"
              onClick={async () => {
                try {
                  setText(await navigator.clipboard.readText());
                } catch {
                  toast('Incolla con un tocco prolungato nel riquadro');
                }
              }}
            >
              Incolla dagli appunti
            </button>
            <div className="grow" />
            <button className="btn primary" disabled={!text.trim()} onClick={() => load(text)}>
              Analizza
            </button>
          </div>
        </div>
        <details className="acc">
          <summary>
            <Sparkles size={18} color="var(--accent)" /> Come farlo creare a ChatGPT
          </summary>
          <div className="body col">
            <p className="t-sm c2" style={{ margin: 0 }}>
              Copia queste istruzioni nella conversazione con ChatGPT, poi chiedi la scheda che desideri. Salva la risposta come file .json oppure incollala qui sopra.
            </p>
            <pre className="t-xs" style={{ whiteSpace: 'pre-wrap', background: 'var(--s2)', padding: 12, borderRadius: 12, margin: 0 }}>{CHATGPT_PROMPT}</pre>
            <button
              className="btn sm"
              onClick={() =>
                navigator.clipboard?.writeText(CHATGPT_PROMPT).then(
                  () => toast('Istruzioni copiate'),
                  () => toast('Copia non consentita: seleziona il testo'),
                )
              }
            >
              <Copy size={14} /> Copia istruzioni per ChatGPT
            </button>
            <p className="t-xs c3" style={{ margin: 0 }}>
              Specifica completa e JSON Schema: documento “FORMATO_SCHEDE_v1” del progetto. CSV accettato con colonne: giorno; esercizio; serie; ripetizioni (8-12 o 30s); recupero; superserie; note.
            </p>
          </div>
        </details>
        <p className="t-xs c3" style={{ margin: 0 }}>
          <HelpCircle size={12} /> Excel e PDF: non ancora supportati (in programma, con anteprima e correzione, senza servizi a pagamento).
        </p>
      </div>

      {(errors.length > 0 || warnings.length > 0) && (
        <Section title={errors.length ? 'Il file non è valido' : 'Avvisi'}>
          <div className="card col" role={errors.length ? 'alert' : 'status'} style={{ gap: 6 }}>
            {errors.slice(0, 15).map((e, i) => (
              <div key={i} className="row t-sm" style={{ alignItems: 'flex-start' }}>
                <XCircle size={16} color="var(--bad)" style={{ flex: 'none', marginTop: 2 }} />
                <span>
                  <code className="t-xs c3">{e.path}</code> — {e.message}
                </span>
              </div>
            ))}
            {errors.length > 15 && <div className="t-xs c3">…e altri {errors.length - 15} errori</div>}
            {warnings.map((e, i) => (
              <div key={`w${i}`} className="row t-sm" style={{ alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="var(--warn)" style={{ flex: 'none', marginTop: 2 }} />
                <span>{e.message}</span>
              </div>
            ))}
            {errors.length > 0 && <p className="t-xs c3" style={{ margin: 0 }}>Nessuna modifica è stata fatta. Correggi il file (o chiedi a ChatGPT di correggerlo indicando questi errori) e riprova.</p>}
          </div>
        </Section>
      )}

      {draft && <Preview draft={draft} setDraft={setDraft} mode={mode} setMode={setMode} busy={busy} setBusy={setBusy} settings={settings} />}
    </main>
  );
}

const MUSCLES = Object.keys(MUSCLE_LABEL) as MuscleId[];

function Preview({ draft, setDraft, mode, setMode, busy, setBusy, settings }: { draft: Draft; setDraft: (d: Draft | null) => void; mode: Mode; setMode: (m: Mode) => void; busy: boolean; setBusy: (b: boolean) => void; settings: Settings }) {
  const [pick, setPick] = useState<string | null>(null);
  const [action, setAction] = useState<ImportAction>('add');
  const [sure, setSure] = useState(false);
  const dup = findDuplicate(draft, settings);
  const all = allSchede(settings);
  const destructive = action === 'replace-default' || action === 'replace-all';
  const problems = draftProblems(draft);
  const p = draft.file.program;
  const set = (key: string, patch: Partial<DraftItem>) => setDraft({ ...draft, days: draft.days.map((d) => ({ ...d, items: d.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) })) });
  const muscles = useMemo(() => {
    const m = new Set<string>();
    draft.days.forEach((d) => {
      d.muscleGroups.forEach((g) => m.add(g));
      d.items.forEach((it) => it.chosenId && EXERCISE_MUSCLES[it.chosenId]?.primary.forEach((x) => m.add(MUSCLE_REGION[x])));
    });
    return [...m];
  }, [draft]);
  const diff = useMemo(() => (dup ? diffPrograms(exportProgram(dup, settings).program, p) : []), [dup, settings, p]);
  const total = draft.days.reduce((a, d) => a + d.items.length, 0);
  const recognized = draft.days.reduce((a, d) => a + d.items.filter((i) => i.match.status === 'ok').length, 0);

  const confirm = async () => {
    setBusy(true);
    try {
      const current = await loadSettings();
      // safety copy of the plan before an important change (restorable from the toast)
      await kvSet('backup:pre-import', { at: new Date().toISOString(), settings: current });
      const { settings: next, programId } = applyImport(draft, current, action, mode === 'update' && dup ? { replace: dup.id } : 'new');
      await saveSettings(next); // single write: the import (and any replacement) is applied entirely or not at all
      navigate(`/programma/${programId}`, { replace: true });
      toast(`${mode === 'update' ? 'Programma aggiornato' : 'Programma importato'}${action === 'add' ? '' : ' e reso predefinito'}`, {
        label: 'Annulla',
        run: () => void updateSettings(() => current).then(() => (navigate('/allenamenti', { replace: true }), toast('Importazione annullata'))),
      });
    } catch (e) {
      toast(`Importazione non riuscita: ${(e as Error).message}. Nessuna modifica salvata.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section" id="anteprima" aria-label="Anteprima del programma">
      <div className="section-head">
        <h2 className="t-h2">Anteprima</h2>
        <span className="t-xs c3">
          {recognized}/{total} esercizi riconosciuti
        </span>
      </div>
      <div className="card col">
        <label className="t-xs c3">
          Nome del programma
          <input className="input" style={{ marginTop: 4, fontWeight: 700 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Nome del programma" />
        </label>
        <div className="row">
          <label className="t-xs c3 grow">
            Obiettivo
            <select className="input" style={{ marginTop: 4 }} value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} aria-label="Obiettivo">
              {GOALS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="t-xs c3" style={{ width: 120 }}>
            Settimane
            <input className="input" style={{ marginTop: 4 }} inputMode="numeric" value={draft.durationWeeks} onChange={(e) => setDraft({ ...draft, durationWeeks: Math.max(1, Math.min(52, Number(e.target.value) || 1)) })} aria-label="Durata in settimane" />
          </label>
        </div>
        <div className="t-sm c2">
          {p.author ? `Autore: ${p.author} · ` : ''}Livello {p.level} · {draft.days.length} giornate · {p.daysPerWeek} a settimana
          {p.recommendedWeekdays?.length ? ` · ${p.recommendedWeekdays.join(', ')}` : ''}
        </div>
        {p.description && <p className="t-sm c2" style={{ margin: 0 }}>{p.description}</p>}
        <div className="chips">
          {muscles.map((m) => (
            <span key={m} className="chip sm">
              {m}
            </span>
          ))}
        </div>
        {p.phases?.length ? (
          <div>
            <div className="t-label">Fasi</div>
            {p.phases.map((ph) => (
              <div key={ph.name + ph.fromWeek} className="t-sm" style={{ marginTop: 4 }}>
                Settimane {ph.fromWeek}–{ph.toWeek}: <b>{ph.name}</b>
                {ph.deload ? ' · scarico' : ''}
                {ph.setsDelta ? ` · serie ${ph.setsDelta > 0 ? '+' : ''}${ph.setsDelta}` : ''}
                {ph.rpe ? ` · RPE ${ph.rpe}` : ''}
                {ph.rir != null ? ` · RIR ${ph.rir}` : ''}
              </div>
            ))}
          </div>
        ) : null}
        {p.progression && <p className="t-xs c3" style={{ margin: 0 }}>Progressione: {p.progression}</p>}
      </div>

      {draft.days.map((day) => (
        <div key={day.id} className="card mt12" style={{ padding: 12 }}>
          <div className="row spread">
            <span className="t-h3">{day.name}</span>
            <span className="t-xs c3">{day.weekday ?? ''}</span>
          </div>
          {day.notes && <p className="t-xs c3" style={{ margin: '4px 0 0' }}>{day.notes}</p>}
          <div className="col mt8" style={{ gap: 10 }}>
            {day.items.map((it) => (
              <ItemRow key={it.key} it={it} set={(patch) => set(it.key, patch)} onPick={() => setPick(it.key)} />
            ))}
          </div>
        </div>
      ))}

      {dup && (
        <div className="card mt12 col change-banner">
          <div className="t-h3">Programma già presente: “{dup.name}”</div>
          <Seg<Mode>
            label="Cosa fare con il programma già presente"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'update', label: 'Aggiorna' },
              { value: 'copy', label: 'Duplica' },
            ]}
          />
          {mode === 'update' && (
            <div className="t-sm c2">
              {diff.length ? (
                <>
                  <div className="t-label">Differenze ({diff.length})</div>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {diff.slice(0, 30).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </>
              ) : (
                'Nessuna differenza negli esercizi: verranno aggiornati solo nome e dati del programma.'
              )}
              <p className="t-xs c3" style={{ margin: '6px 0 0' }}>Lo storico delle sedute già fatte non cambia.</p>
            </div>
          )}
          {mode === 'copy' && <p className="t-sm c2" style={{ margin: 0 }}>Verrà creato un nuovo programma, il precedente resta invariato.</p>}
        </div>
      )}

      {problems.length > 0 && (
        <div className="mt12">
          <Notice icon={<AlertTriangle size={17} color="var(--warn)" />}>
            <b>Da completare prima di importare:</b>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {problems.slice(0, 8).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}
      <div className="card mt12 col" role="radiogroup" aria-label="Come importare">
        <div className="t-h3">Come importarlo?</div>
        <div className="t-xs c3">Predefinito attuale: {defaultName(settings)}</div>
        {(
          [
            ['add', 'Aggiungi', 'Lo aggiunge alle tue schede. Il programma predefinito non cambia.'],
            ['add-default', 'Aggiungi e rendi predefinita', 'Home, Agenda, Calendario e “Inizia oggi” useranno solo questo programma. Le altre schede restano.'],
            ['replace-default', 'Sostituisci predefinita', settings.activeProgramId === NONE ? 'Non c’è un predefinito da sostituire: diventa semplicemente predefinito.' : `Elimina “${defaultName(settings)}” e mette questo al suo posto.`],
            ['replace-all', 'Sostituisci tutte le schede', `Elimina ${all.programs.length} programmi, ${all.routines.length} schede personali${all.original ? ' e la scheda originale' : ''}; resta solo questo.`],
          ] as [ImportAction, string, string][]
        ).map(([v, l, d]) => (
          <button key={v} type="button" role="radio" aria-checked={action === v} className={`list-row${action === v ? ' on' : ''}`} style={{ alignItems: 'flex-start', borderRadius: 12, outline: action === v ? '2px solid var(--accent)' : undefined }} onClick={() => (setAction(v), setSure(false))}>
            <span className="grow">
              <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                {l}
              </span>
              <span className="t-xs c3">{d}</span>
            </span>
          </button>
        ))}
        {destructive && (
          <label className="row t-sm" style={{ gap: 8, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} aria-label="Confermo la sostituzione" style={{ marginTop: 3 }} />
            <span>Confermo: le schede indicate verranno eliminate. Storico, carichi, misure e foto restano; subito dopo potrò annullare.</span>
          </label>
        )}
      </div>
      <button className="btn primary lg block mt16" disabled={busy || problems.length > 0 || (destructive && !sure)} onClick={confirm}>
        <CheckCircle2 size={18} /> {action === 'add' ? 'Conferma e importa programma' : action === 'add-default' ? 'Importa e rendi predefinito' : 'Importa e sostituisci'}
      </button>
      <button className="btn ghost block mt8" onClick={() => setDraft(null)}>
        Annulla
      </button>
      <p className="t-xs c3 mt8">
        Verrà salvato nella cartella “{IMPORT_FOLDER}”. Lo storico non viene mai modificato. Prima di salvare viene fatta una copia di sicurezza; dopo l’importazione puoi annullare.
      </p>
      <ExercisePicker
        open={pick != null}
        multi={false}
        title="Sostituisci con…"
        onClose={() => setPick(null)}
        onPick={([id]) => pick && set(pick, { chosenId: id, createCustom: false })}
      />
    </section>
  );
}

function ItemRow({ it, set, onPick }: { it: DraftItem; set: (p: Partial<DraftItem>) => void; onPick: () => void }) {
  const ex = it.chosenId ? EXERCISE_BY_ID[it.chosenId] : null;
  const status = it.chosenId ? 'ok' : it.createCustom ? 'new' : it.match.status;
  const unitLabel = it.unit === 'sec' ? 's' : 'rip';
  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        {status === 'ok' ? <CheckCircle2 size={18} color="var(--ok)" style={{ flex: 'none', marginTop: 2 }} /> : status === 'new' ? <Sparkles size={18} color="var(--accent)" style={{ flex: 'none', marginTop: 2 }} /> : <AlertTriangle size={18} color="var(--warn)" style={{ flex: 'none', marginTop: 2 }} />}
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
            {it.src.group && <span className="chip sm warn" style={{ marginRight: 6 }}>{it.src.group}</span>}
            {it.src.name}
          </span>
          {ex && (
            <span className="t-xs c3">
              → {ex.name}
              {it.match.status === 'ok' && it.match.how === 'id' ? ' (identificatore)' : ''}
            </span>
          )}
          {status === 'new' && <span className="t-xs c3">→ nuovo esercizio tuo</span>}
          {it.src.notes && <span className="t-xs c3" style={{ display: 'block' }}>Nota: {it.src.notes}</span>}
        </span>
        {ex && (
          <button className="link t-xs" onClick={onPick}>
            <Repeat size={12} /> Cambia
          </button>
        )}
      </div>
      {!it.chosenId && !it.createCustom && it.match.status === 'ambiguous' && (
        <select className="input mt8" aria-label={`Scegli l’esercizio per ${it.src.name}`} value="" onChange={(e) => e.target.value && set({ chosenId: e.target.value })}>
          <option value="">Corrisponde a più esercizi: scegli…</option>
          {it.match.candidates.map((id) => (
            <option key={id} value={id}>
              {EXERCISE_BY_ID[id]?.name} · {EXERCISE_BY_ID[id]?.equipment}
            </option>
          ))}
        </select>
      )}
      {!it.chosenId && !it.createCustom && it.match.status === 'unknown' && (
        <div className="col mt8" style={{ gap: 6 }}>
          <span className="t-xs c2">Non presente nella libreria.{it.match.suggestions.length ? ' Simili (scegli tu, non vengono applicati da soli):' : ''}</span>
          {it.match.suggestions.length > 0 && (
            <select className="input" aria-label={`Esercizi simili a ${it.src.name}`} value="" onChange={(e) => e.target.value && set({ chosenId: e.target.value })}>
              <option value="">Esercizi simili…</option>
              {it.match.suggestions.map((id) => (
                <option key={id} value={id}>
                  {EXERCISE_BY_ID[id]?.name}
                </option>
              ))}
            </select>
          )}
          <div className="row wrap" style={{ gap: 6 }}>
            <button className="btn sm" onClick={() => set({ createCustom: true })}>
              <FileUp size={14} /> Crea come esercizio mio
            </button>
            <button className="btn sm ghost" onClick={onPick}>
              <Repeat size={14} /> Sostituisci…
            </button>
          </div>
        </div>
      )}
      {it.createCustom && (
        <div className="row mt8">
          <label className="t-xs c3 grow">
            Muscolo principale del nuovo esercizio
            <select className="input" style={{ marginTop: 4 }} value={it.customMuscle} onChange={(e) => set({ customMuscle: e.target.value as MuscleId })} aria-label={`Muscolo principale di ${it.src.name}`}>
              {MUSCLES.map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn sm ghost" style={{ alignSelf: 'flex-end' }} onClick={() => set({ createCustom: false })}>
            Annulla
          </button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
        {(
          [
            ['Serie', 'sets', 1, 10],
            [`Min ${unitLabel}`, 'repsMin', 1, 7200],
            [`Max ${unitLabel}`, 'repsMax', 1, 7200],
            ['Rec. s', 'restSec', 0, 600],
          ] as const
        ).map(([lab, k, lo, hi]) => (
          <label key={k} className="t-xs c3">
            {lab}
            <input
              className="input"
              style={{ minHeight: 38, marginTop: 2, textAlign: 'center', padding: 6 }}
              inputMode="numeric"
              value={it[k]}
              aria-label={`${lab} ${it.src.name}`}
              onChange={(e) => set({ [k]: Math.max(lo, Math.min(hi, Math.round(Number(e.target.value)) || lo)) } as Partial<DraftItem>)}
            />
          </label>
        ))}
      </div>
      {(it.src.rpe != null || it.src.rir != null || it.src.load || it.src.warmupSets || it.src.perSide) && (
        <div className="t-xs c3 mt8">
          {[it.src.perSide && 'per lato', it.src.warmupSets && `${it.src.warmupSets} serie di riscaldamento`, it.src.rpe != null && `RPE ${it.src.rpe}`, it.src.rir != null && `RIR ${it.src.rir}`, it.src.load && `carico indicato ${it.src.load.value} ${it.src.load.unit}`].filter(Boolean).join(' · ')}
        </div>
      )}
    </div>
  );
}

