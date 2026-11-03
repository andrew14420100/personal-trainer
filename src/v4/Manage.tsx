// "Gestisci schede": every program, the original plan and personal routines in one place.
// Multi-select, archive/restore, duplicate, make default, delete (with double confirmation for
// bulk deletions, a safety copy and undo). Deleting schede never deletes history, loads,
// measurements or photos.
import { useMemo, useState } from 'react';
import { Archive, ArchiveRestore, CheckSquare, Copy, Download, FileUp, Pencil, RotateCcw, Search, Square, Star, Trash2 } from 'lucide-react';
import { useData } from '../app/store';
import { kvSet } from '../lib/db';
import { loadSettings, saveSettings, updateSettings } from '../lib/settings';
import { allSchede, blockingSession, defaultName, deleteSchede, duplicateProgram, duplicateRoutine, ORIGINAL, programRoutineIds, restoreOriginal, setArchived } from '../lib/library';
import { buildDraft, commitDraft, exportOriginalPlan, exportProgram, exportRoutine, IMPORT_FOLDER } from '../lib/exchange';
import { navigate } from '../lib/router';
import { Empty, NavBar, Notice, Seg, Sheet, toast } from './kit';
import { ActivateSheet, downloadExchange } from './Programs';

type Kind = 'original' | 'program' | 'routine';
interface Row {
  key: string;
  kind: Kind;
  id: string;
  name: string;
  sub: string;
  archived: boolean;
}
type Filter = 'tutte' | 'programmi' | 'routine' | 'archiviate';

/** Applies a change with a safety copy of the previous library and an "Annulla" action. */
async function applyWithUndo(fn: (s: Awaited<ReturnType<typeof loadSettings>>) => Awaited<ReturnType<typeof loadSettings>>, msg: string) {
  const before = await loadSettings();
  await kvSet('backup:pre-delete', { at: new Date().toISOString(), settings: before });
  await saveSettings(fn(before)); // single write
  toast(msg, { label: 'Annulla', run: () => void updateSettings(() => before).then(() => toast('Operazione annullata')) });
}

export function ManageSchede() {
  const { settings, active } = useData();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('tutte');
  const [sel, setSel] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<null | { rows: Row[]; all: boolean }>(null);
  const [step2, setStep2] = useState(false);
  const [typed, setTyped] = useState('');
  const [activate, setActivate] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const inProg = programRoutineIds(settings);
    const out: Row[] = [];
    if (!settings.originalHidden) out.push({ key: 'o', kind: 'original', id: ORIGINAL, name: 'Scheda FORMA LAB (4 giorni)', sub: 'Scheda originale · 4 giornate · 26 posizioni', archived: false });
    for (const p of settings.programs) out.push({ key: `p-${p.id}`, kind: 'program', id: p.id, name: p.name, sub: `Programma · ${p.days.length} giornate · ${p.durationWeeks} settimane${p.folder ? ` · ${p.folder}` : ''}`, archived: p.archived });
    for (const r of settings.routines) if (!inProg.has(r.id)) out.push({ key: `r-${r.id}`, kind: 'routine', id: r.id, name: r.name, sub: `Scheda personale · ${r.items.length} esercizi${r.folder ? ` · ${r.folder}` : ''}`, archived: !!r.archived });
    return out;
  }, [settings]);

  const t = q.trim().toLowerCase();
  const shown = rows.filter((r) => (filter === 'archiviate' ? r.archived : !r.archived) && (filter !== 'programmi' || r.kind !== 'routine') && (filter !== 'routine' || r.kind === 'routine') && (!t || r.name.toLowerCase().includes(t)));
  const selected = rows.filter((r) => sel.includes(r.key));
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const selOf = (rs: Row[]) => ({ original: rs.some((r) => r.kind === 'original'), programs: rs.filter((r) => r.kind === 'program').map((r) => r.id), routines: rs.filter((r) => r.kind === 'routine').map((r) => r.id) });
  const isDefault = (r: Row) => (r.kind === 'original' && settings.activeProgramId === ORIGINAL) || (r.kind === 'program' && settings.activeProgramId === r.id);

  const askDelete = (rs: Row[], all = false) => {
    if (!rs.length) return;
    if (blockingSession(active, settings, selOf(rs))) {
      toast('C’è un allenamento in corso su una di queste schede: concludilo o salvalo prima di eliminarla.', { label: 'Vai', run: () => navigate('/allenamento') });
      return;
    }
    setConfirm({ rows: rs, all });
    setStep2(false);
    setTyped('');
  };
  const doDelete = async () => {
    if (!confirm) return;
    const rs = confirm.rows;
    const defaultGone = rs.some(isDefault);
    await applyWithUndo((s) => deleteSchede(s, selOf(rs)), `${rs.length === 1 ? 'Scheda eliminata' : `${rs.length} schede eliminate`}${defaultGone ? ': nessun programma predefinito attivo' : ''}`);
    setConfirm(null);
    setSel([]);
  };
  const bulk = confirm && confirm.rows.length > 1;
  const sessionsKept = useData().sessions.filter((x) => x.status === 'completed').length;

  return (
    <main className="page">
      <NavBar title="Gestisci schede" fallback="/allenamenti" />
      <h1 className="t-h1">Gestisci schede</h1>
      <p className="t-sm c2" style={{ marginTop: 4 }}>
        Predefinito: <b>{defaultName(settings)}</b>. Eliminare una scheda non cancella mai lo storico, i carichi registrati, le misure o le foto.
      </p>

      <div className="search mt12">
        <Search size={17} className="c3" />
        <input className="input" type="search" placeholder="Cerca scheda" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca scheda" />
      </div>
      <div className="mt8">
        <Seg<Filter>
          label="Filtro schede"
          value={filter}
          onChange={(f) => (setFilter(f), setSel([]))}
          options={[
            { value: 'tutte', label: 'Tutte' },
            { value: 'programmi', label: 'Programmi' },
            { value: 'routine', label: 'Personali' },
            { value: 'archiviate', label: 'Archiviate' },
          ]}
        />
      </div>

      <div className="row wrap mt12" style={{ gap: 6 }}>
        <button className="btn sm ghost" onClick={() => setSel(sel.length === shown.length ? [] : shown.map((r) => r.key))} disabled={!shown.length}>
          {sel.length && sel.length === shown.length ? <CheckSquare size={14} /> : <Square size={14} />} {sel.length && sel.length === shown.length ? 'Deseleziona' : 'Seleziona tutte'}
        </button>
        <button className="btn sm danger" disabled={!selected.length} onClick={() => askDelete(selected)}>
          <Trash2 size={14} /> Elimina selezionate{selected.length ? ` (${selected.length})` : ''}
        </button>
        {filter !== 'archiviate' ? (
          <button className="btn sm" disabled={!selected.some((r) => r.kind !== 'original')} onClick={() => applyWithUndo((s) => setArchived(s, selOf(selected), true), 'Schede archiviate').then(() => setSel([]))}>
            <Archive size={14} /> Archivia
          </button>
        ) : (
          <button className="btn sm" disabled={!selected.length} onClick={() => applyWithUndo((s) => setArchived(s, selOf(selected), false), 'Schede ripristinate').then(() => setSel([]))}>
            <ArchiveRestore size={14} /> Ripristina
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt16">
          <Empty
            icon={<FileUp size={22} />}
            title="Nessuna scheda"
            action={
              <button className="btn primary" onClick={() => navigate('/importa')}>
                <FileUp size={16} /> Importa scheda
              </button>
            }
          >
            Importa una scheda o creane una nuova. Lo storico degli allenamenti è conservato.
          </Empty>
        </div>
      ) : (
        <div className="list mt12">
          {shown.map((r) => (
            <div key={r.key} className="list-row" style={{ alignItems: 'flex-start' }}>
              <button className="icon-btn clear" style={{ width: 34, height: 34 }} role="checkbox" aria-checked={sel.includes(r.key)} aria-label={`Seleziona ${r.name}`} onClick={() => toggle(r.key)}>
                {sel.includes(r.key) ? <CheckSquare size={20} color="var(--accent)" /> : <Square size={20} />}
              </button>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                  {isDefault(r) && <Star size={13} color="var(--accent)" fill="var(--accent)" style={{ verticalAlign: '-2px', marginRight: 4 }} />}
                  {r.name}
                </span>
                <span className="t-xs c3">
                  {r.sub}
                  {isDefault(r) ? ' · predefinita' : ''}
                  {r.archived ? ' · archiviata' : ''}
                </span>
                <span className="row wrap mt8" style={{ gap: 4 }}>
                  {r.kind !== 'routine' && !isDefault(r) && !r.archived && (
                    <button className="btn sm" onClick={() => setActivate(r.id)}>
                      <Star size={13} /> Rendi predefinita
                    </button>
                  )}
                  <button className="btn sm ghost" aria-label={`Modifica ${r.name}`} onClick={() => navigate(r.kind === 'original' ? '/allenamenti' : r.kind === 'program' ? `/programma/${r.id}` : `/routine/${r.id}/modifica`)}>
                    <Pencil size={13} /> Modifica
                  </button>
                  <button
                    className="btn sm ghost"
                    aria-label={`Duplica ${r.name}`}
                    onClick={() =>
                      r.kind === 'program'
                        ? applyWithUndo((s) => duplicateProgram(s, r.id), 'Programma duplicato')
                        : r.kind === 'routine'
                          ? applyWithUndo((s) => duplicateRoutine(s, r.id), 'Scheda duplicata')
                          : applyWithUndo((s) => {
                              const d = buildDraft(exportOriginalPlan(s));
                              d.name = 'Scheda FORMA LAB (copia modificabile)';
                              return commitDraft(d, s, 'new');
                            }, 'Copia della scheda originale creata come programma')
                    }
                  >
                    <Copy size={13} /> Duplica
                  </button>
                  <button
                    className="btn sm ghost"
                    aria-label={`Esporta ${r.name}`}
                    onClick={() => downloadExchange(r.kind === 'original' ? exportOriginalPlan(settings) : r.kind === 'program' ? exportProgram(settings.programs.find((p) => p.id === r.id)!, settings) : exportRoutine(settings.routines.find((x) => x.id === r.id)!))}
                  >
                    <Download size={13} />
                  </button>
                  <button className="btn sm ghost" style={{ color: 'var(--bad)' }} aria-label={`Elimina ${r.name}`} onClick={() => askDelete([r])}>
                    <Trash2 size={13} />
                  </button>
                </span>
              </span>
            </div>
          ))}
          {!shown.length && <div className="list-row t-sm c3">Nessuna scheda con questi filtri.</div>}
        </div>
      )}

      {settings.originalHidden && (
        <button className="btn ghost block mt12" onClick={() => applyWithUndo(restoreOriginal, 'Scheda originale ripristinata nell’elenco (non è predefinita)')}>
          <RotateCcw size={15} /> Ripristina modello originale
        </button>
      )}
      {rows.length > 0 && (
        <button className="btn danger block mt16" onClick={() => askDelete(rows, true)}>
          <Trash2 size={16} /> Elimina tutte le schede
        </button>
      )}
      <p className="t-xs c3 mt8">
        “Elimina tutte le schede” è diverso da “Cancella tutti i dati” (Profilo): qui restano storico, carichi, misure, foto e impostazioni. Le schede importate stanno nella cartella “{IMPORT_FOLDER}”.
      </p>

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} label="Conferma eliminazione">
        {confirm && (
          <div className="col">
            <h3 className="t-h2">{confirm.all ? 'Eliminare tutte le schede?' : bulk ? `Eliminare ${confirm.rows.length} schede?` : `Eliminare “${confirm.rows[0].name}”?`}</h3>
            <ul className="t-sm c2" style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                {selOf(confirm.rows).programs.length} programmi, {selOf(confirm.rows).routines.length} schede personali{selOf(confirm.rows).original ? ', la scheda originale' : ''}
              </li>
              {confirm.rows.some(isDefault) && <li>Comprende il programma predefinito: resterai senza programma attivo finché non ne scegli uno.</li>}
              <li>Restano: {sessionsKept} sedute nello storico, carichi, misure, foto, esercizi creati da te.</li>
            </ul>
            {!step2 ? (
              <>
                {(bulk || confirm.all) && (
                  <button
                    className="btn block"
                    onClick={() => {
                      const a = allSchede(settings);
                      void downloadExchange(exportOriginalPlan(settings));
                      for (const id of a.programs) void downloadExchange(exportProgram(settings.programs.find((p) => p.id === id)!, settings));
                    }}
                  >
                    <Download size={15} /> Prima esporta un backup delle schede
                  </button>
                )}
                <button className="btn danger lg block" onClick={() => (bulk || confirm.all ? setStep2(true) : void doDelete())}>
                  {bulk || confirm.all ? 'Continua' : 'Elimina'}
                </button>
              </>
            ) : (
              <>
                <Notice>
                  Seconda conferma: scrivi <b>ELIMINA</b> per procedere. Subito dopo potrai ancora annullare.
                </Notice>
                <input className="input" aria-label="Scrivi ELIMINA per confermare" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />
                <button className="btn danger lg block" disabled={typed.trim() !== 'ELIMINA'} onClick={doDelete}>
                  Elimina definitivamente
                </button>
              </>
            )}
            <button className="btn ghost block" onClick={() => setConfirm(null)}>
              Annulla
            </button>
          </div>
        )}
      </Sheet>
      {activate && <ActivateSheet open onClose={() => setActivate(null)} id={activate} />}
    </main>
  );
}


