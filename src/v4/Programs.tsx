// Multi-week programs (imported or exported with Workout Exchange v1): view, manage, compare, export.
import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, ArrowLeftRight, ChevronRight, Copy, Download, FileUp, Pencil, Play, Star, Trash2, Undo2 } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { EXERCISE_BY_ID } from '../data/exercises';
import { uid } from '../lib/db';
import { deliverFile } from '../lib/backup';
import { currentWeek, diffPrograms, exportOriginalPlan, exportProgram, phaseOf, setsForWeek, type ExFile } from '../lib/exchange';
import { itemsToSlots, formatPrescription } from '../lib/plan';
import { startCustom } from '../lib/workout';
import { navigate } from '../lib/router';
import type { Program, Settings } from '../lib/settings';
import { Confirm, Empty, NavBar, Notice, Section, Sheet, toast } from './kit';

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'scheda';

export async function downloadExchange(f: ExFile) {
  if (__PREVIEW__) return toast('Nell’anteprima dentro Claude il download è bloccato');
  const how = await deliverFile(`${slug(f.program.name)}.forma-lab.json`, JSON.stringify(f, null, 2), 'application/json');
  toast(how === 'shared' ? 'File pronto: puoi caricarlo in ChatGPT' : 'File scaricato: caricalo in ChatGPT');
}

/** Section for the Allenamenti page: import/export buttons and the list of programs. */
export function ProgramsSection() {
  const { settings } = useData();
  const [showArchived, setShowArchived] = useState(false);
  const list = settings.programs.filter((p) => showArchived || !p.archived);
  const active = settings.programs.find((p) => p.id === settings.activeProgramId);
  return (
    <Section title="Programmi" action={settings.programs.some((p) => p.archived) ? <button className="link" onClick={() => setShowArchived(!showArchived)}>{showArchived ? 'Nascondi archiviati' : 'Archiviati'}</button> : undefined}>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary lg grow" onClick={() => navigate('/importa')}>
          <FileUp size={18} /> Importa scheda
        </button>
        <button className="btn lg" aria-label="Esporta la scheda originale per ChatGPT" onClick={() => downloadExchange(exportOriginalPlan(settings))}>
          <Download size={18} />
        </button>
      </div>
      <p className="t-xs c3 mt8" style={{ marginBottom: 0 }}>
        Programma corrente: <b>{active ? active.name : 'Scheda FORMA LAB (4 giorni)'}</b>. Il pulsante ↓ esporta la scheda originale per ChatGPT.
      </p>
      {list.length > 0 && (
        <div className="list mt8">
          {list.map((p) => (
            <button key={p.id} className="list-row" onClick={() => navigate(`/programma/${p.id}`)}>
              {p.id === settings.activeProgramId ? <Star size={18} color="var(--accent)" fill="var(--accent)" /> : <span style={{ width: 18 }} />}
              <span className="grow">
                <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                  {p.name}
                  {p.archived ? ' · archiviato' : ''}
                </span>
                <span className="t-xs c3">
                  {p.days.length} giornate · {p.durationWeeks} settimane · {p.goal}
                  {p.author ? ` · ${p.author}` : ''}
                </span>
              </span>
              <ChevronRight size={18} className="c3" />
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

function removeProgram(s: Settings, id: string): Settings {
  const p = s.programs.find((x) => x.id === id);
  if (!p) return s;
  const rids = new Set(p.days.map((d) => d.routineId));
  return {
    ...s,
    programs: s.programs.filter((x) => x.id !== id),
    routines: s.routines.filter((r) => !rids.has(r.id)),
    activeProgramId: s.activeProgramId === id ? '' : s.activeProgramId,
    previousProgramIds: s.previousProgramIds.filter((x) => x !== id),
  };
}

function duplicateProgram(s: Settings, id: string): Settings {
  const p = s.programs.find((x) => x.id === id)!;
  const now = Date.now();
  const days = p.days.map((d) => {
    const r = s.routines.find((x) => x.id === d.routineId)!;
    return { day: { ...d, routineId: uid() }, routine: r };
  });
  const routines = days.map(({ day, routine }) => ({ ...structuredClone(routine), id: day.routineId, items: routine.items.map((i) => ({ ...i, id: uid() })), createdAt: now }));
  const copy: Program = { ...structuredClone(p), id: uid(), name: `${p.name} (copia)`.slice(0, 80), days: days.map((x) => x.day), createdAt: now, updatedAt: now, activatedAt: undefined, archived: false, sourceKey: `${p.sourceKey}-copia-${now}` };
  return { ...s, programs: [...s.programs, copy], routines: [...s.routines, ...routines] };
}

export function ProgramView({ id }: { id: string }) {
  const { settings, sessions, active } = useData();
  const update = useSettingsUpdater();
  const p = settings.programs.find((x) => x.id === id);
  const [rename, setRename] = useState(false);
  const [name, setName] = useState(p?.name ?? '');
  const [del, setDel] = useState(false);
  const [cmp, setCmp] = useState(false);
  if (!p)
    return (
      <main className="page">
        <NavBar fallback="/allenamenti" />
        <Empty icon={<FileUp size={22} />} title="Programma non trovato" />
      </main>
    );
  const isActive = settings.activeProgramId === p.id;
  const week = isActive ? currentWeek(p) : 1;
  const phase = phaseOf(p, week);
  const start = async (routineId: string, dayName: string) => {
    const r = settings.routines.find((x) => x.id === routineId);
    if (!r) return;
    if (!active) {
      const slots = itemsToSlots(r.items, 'upper-a', settings, false).map((sl) => ({ ...sl, todaySets: setsForWeek(sl.todaySets, phase), plannedSets: setsForWeek(sl.plannedSets, phase) }));
      await startCustom(`r:${r.id}`, `${p.name} · ${dayName}${isActive ? ` · sett. ${week}` : ''}`, slots, sessions);
    }
    navigate('/allenamento');
  };
  return (
    <main className="page">
      <NavBar title="Programma" fallback="/allenamenti" right={<button className="icon-btn clear" aria-label="Rinomina programma" onClick={() => (setName(p.name), setRename(true))}><Pencil size={18} /></button>} />
      <div className="t-label" style={{ color: 'var(--accent)' }}>
        {p.folder}
        {isActive ? ' · programma corrente' : ''}
        {p.archived ? ' · archiviato' : ''}
      </div>
      <h1 className="t-h1" style={{ marginTop: 4 }}>
        {p.name}
      </h1>
      <p className="t-sm c2" style={{ marginTop: 4 }}>
        {p.goal} · {p.level} · {p.durationWeeks} settimane · {p.days.length} giornate{p.author ? ` · ${p.author}` : ''}
      </p>
      {p.description && <p className="t-sm c2 mt8">{p.description}</p>}
      {isActive && (
        <div className="card mt12 change-banner">
          <div className="t-h3">
            Settimana {week} di {p.durationWeeks}
            {phase ? ` · ${phase.name}` : ''}
          </div>
          <div className="t-sm c2" style={{ marginTop: 4 }}>
            {phase?.deload ? 'Settimana di scarico: serie ridotte al 60%. ' : ''}
            {phase?.setsDelta ? `Serie ${phase.setsDelta > 0 ? '+' : ''}${phase.setsDelta} per esercizio. ` : ''}
            {phase?.rpe ? `RPE obiettivo ${phase.rpe}. ` : ''}
            {phase?.rir != null ? `RIR obiettivo ${phase.rir}. ` : ''}
            {phase?.notes ?? ''}
          </div>
        </div>
      )}

      <div className="row wrap mt12" style={{ gap: 6 }}>
        {isActive ? (
          <button className="btn sm" onClick={() => update((s) => ({ ...s, activeProgramId: s.previousProgramIds[0] && s.programs.some((x) => x.id === s.previousProgramIds[0]) ? s.previousProgramIds[0] : '', previousProgramIds: s.previousProgramIds.slice(1) })).then(() => toast('Tornato al programma precedente'))}>
            <Undo2 size={14} /> Torna al precedente
          </button>
        ) : (
          <button className="btn sm primary" onClick={() => update((s) => ({ ...s, activeProgramId: p.id, previousProgramIds: [s.activeProgramId, ...s.previousProgramIds.filter((x) => x !== s.activeProgramId)].filter((x) => x !== p.id).slice(0, 10), programs: s.programs.map((x) => (x.id === p.id ? { ...x, activatedAt: Date.now() } : x)) })).then(() => toast('Programma corrente attivato'))}>
            <Star size={14} /> Attiva come programma corrente
          </button>
        )}
        <button className="btn sm" onClick={() => downloadExchange(exportProgram(p, settings))}>
          <Download size={14} /> Esporta scheda per ChatGPT
        </button>
        <button className="btn sm ghost" onClick={() => setCmp(true)}>
          <ArrowLeftRight size={14} /> Confronta
        </button>
        <button className="btn sm ghost" onClick={() => update((s) => duplicateProgram(s, p.id)).then(() => toast('Programma duplicato'))}>
          <Copy size={14} /> Duplica
        </button>
        <button className="btn sm ghost" onClick={() => update((s) => ({ ...s, programs: s.programs.map((x) => (x.id === p.id ? { ...x, archived: !x.archived } : x)) }))}>
          {p.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />} {p.archived ? 'Ripristina' : 'Archivia'}
        </button>
        <button className="btn sm ghost" style={{ color: 'var(--bad)' }} onClick={() => setDel(true)}>
          <Trash2 size={14} /> Elimina
        </button>
      </div>

      {p.phases.length > 0 && (
        <Section title="Fasi">
          <div className="list">
            {p.phases.map((ph) => (
              <div key={ph.name + ph.fromWeek} className="list-row" style={isActive && phase === ph ? { background: 'var(--accent-soft)' } : undefined}>
                <span className="grow">
                  <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                    {ph.name}
                    {ph.deload ? ' · scarico' : ''}
                  </span>
                  <span className="t-xs c3">
                    Settimane {ph.fromWeek}–{ph.toWeek}
                    {ph.setsDelta ? ` · serie ${ph.setsDelta > 0 ? '+' : ''}${ph.setsDelta}` : ''}
                    {ph.rpe ? ` · RPE ${ph.rpe}` : ''}
                    {ph.rir != null ? ` · RIR ${ph.rir}` : ''}
                  </span>
                </span>
              </div>
            ))}
          </div>
          {p.progression && <p className="t-xs c3 mt8">Progressione: {p.progression}</p>}
        </Section>
      )}

      {p.days.map((d) => {
        const r = settings.routines.find((x) => x.id === d.routineId);
        return (
          <Section
            key={d.id}
            title={d.name}
            action={
              <button className="btn sm primary" onClick={() => start(d.routineId, d.name)} aria-label={`Inizia ${d.name}`}>
                <Play size={14} fill="currentColor" /> Inizia
              </button>
            }
          >
            {d.muscleGroups.length > 0 && <div className="t-xs c3" style={{ marginTop: -4, marginBottom: 6 }}>{d.muscleGroups.join(' · ')}{d.weekday ? ` · ${d.weekday}` : ''}</div>}
            {r ? (
              <div className="list">
                {r.items.map((it) => (
                  <button key={it.id} className="list-row" onClick={() => navigate(`/esercizio/${it.exerciseId}`)}>
                    {it.group ? <span className="chip sm warn">{it.group}</span> : null}
                    <span className="grow">
                      <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                        {EXERCISE_BY_ID[it.exerciseId]?.name ?? 'Esercizio eliminato'}
                      </span>
                      <span className="t-xs c3">
                        {formatPrescription(it, setsForWeek(it.sets, isActive ? phase : undefined))} · rec. {it.restSec ?? 90}s
                        {it.rpe != null ? ` · RPE ${it.rpe}` : ''}
                        {it.rir != null ? ` · RIR ${it.rir}` : ''}
                        {it.load ? ` · ${it.load.value} ${it.load.unit}` : ''}
                        {it.warmupSets ? ` · ${it.warmupSets} risc.` : ''}
                      </span>
                      {it.notes && <span className="t-xs c3" style={{ display: 'block' }}>{it.notes}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <Notice>Giornata non trovata.</Notice>
            )}
            <button className="link t-xs mt8" onClick={() => navigate(`/routine/${d.routineId}/modifica`)}>
              <Pencil size={12} /> Modifica esercizi di questa giornata
            </button>
          </Section>
        );
      })}

      <Sheet open={rename} onClose={() => setRename(false)} label="Rinomina programma">
        <div className="col">
          <h3 className="t-h2">Rinomina</h3>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nuovo nome del programma" />
          <button
            className="btn primary block"
            disabled={!name.trim()}
            onClick={() => update((s) => ({ ...s, programs: s.programs.map((x) => (x.id === p.id ? { ...x, name: name.trim().slice(0, 80), updatedAt: Date.now() } : x)) })).then(() => setRename(false))}
          >
            Salva
          </button>
        </div>
      </Sheet>
      <Confirm
        open={del}
        onClose={() => setDel(false)}
        title="Eliminare il programma?"
        body="Vengono eliminate le sue giornate. Le sedute già registrate restano nello storico."
        confirmLabel="Elimina programma"
        danger
        onConfirm={() => update((s) => removeProgram(s, p.id)).then(() => navigate('/allenamenti', { replace: true }))}
      />
      <CompareSheet open={cmp} onClose={() => setCmp(false)} program={p} />
    </main>
  );
}

function CompareSheet({ open, onClose, program }: { open: boolean; onClose: () => void; program: Program }) {
  const { settings } = useData();
  const others = settings.programs.filter((x) => x.id !== program.id);
  const [other, setOther] = useState<string>('originale');
  const a = useMemo(() => exportProgram(program, settings).program, [program, settings]);
  const b = useMemo(() => (other === 'originale' ? exportOriginalPlan(settings).program : exportProgram(settings.programs.find((x) => x.id === other) ?? program, settings).program), [other, settings, program]);
  const diff = useMemo(() => diffPrograms(b, a), [a, b]);
  const sets = (pp: typeof a) => pp.days.reduce((t, d) => t + d.exercises.reduce((x, e) => x + e.sets, 0), 0);
  return (
    <Sheet open={open} onClose={onClose} label="Confronta schede">
      <div className="col">
        <h3 className="t-h2">Confronta</h3>
        <select className="input" aria-label="Scheda da confrontare" value={other} onChange={(e) => setOther(e.target.value)}>
          <option value="originale">Scheda FORMA LAB originale</option>
          {others.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <table className="data">
          <thead>
            <tr>
              <th></th>
              <th>{b.name.slice(0, 22)}</th>
              <th>{a.name.slice(0, 22)}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Giornate</td>
              <td>{b.days.length}</td>
              <td>{a.days.length}</td>
            </tr>
            <tr>
              <td>Esercizi</td>
              <td>{b.days.reduce((t, d) => t + d.exercises.length, 0)}</td>
              <td>{a.days.reduce((t, d) => t + d.exercises.length, 0)}</td>
            </tr>
            <tr>
              <td>Serie a settimana</td>
              <td>{sets(b)}</td>
              <td>{sets(a)}</td>
            </tr>
            <tr>
              <td>Settimane</td>
              <td>{b.durationWeeks}</td>
              <td>{a.durationWeeks}</td>
            </tr>
          </tbody>
        </table>
        <div className="t-label">Differenze</div>
        <ul className="t-sm c2" style={{ margin: 0, paddingLeft: 18 }}>
          {diff.length ? diff.slice(0, 40).map((x) => <li key={x}>{x}</li>) : <li>Nessuna differenza negli esercizi.</li>}
        </ul>
      </div>
    </Sheet>
  );
}
