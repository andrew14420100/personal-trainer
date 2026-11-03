// 4.1: exercise picker, routine editor (custom routines and edited plan days), library, routine view.
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, Download, ChevronRight, Dumbbell, Link2, Play, PlayCircle, Plus, Search, Trash2, Unlink, Zap } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { EXERCISE_BY_ID } from '../data/exercises';
import { EXERCISE_MUSCLES, MUSCLE_LABEL, MUSCLE_REGION, aggregate, type MuscleId } from '../data/muscles';
import { allExercises, isPerSideDefault, sourceOf } from '../data/catalog';
import { DAY_BY_ID } from '../data/program';
import { uid } from '../lib/db';
import { itemsToSlots, estimateMinutes, formatPrescription, dayAsItems } from '../lib/plan';
import { ROUTINE_ACCENTS } from '../lib/meta';
import { startCustom } from '../lib/workout';
import { navigate } from '../lib/router';
import type { CustomExercise, Routine, RoutineItem } from '../lib/settings';
import type { DayId } from '../data/types';
import { Anatomy } from '../components/Anatomy';
import { Confirm, Empty, NavBar, Section, Sheet, toast } from './kit';
import { ExerciseThumb } from './Plan';
import { downloadExchange } from './Programs';
import { exportRoutine } from '../lib/exchange';

const GROUPS = ['Tutti', 'Cardio', 'Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti', 'Gambe', 'Glutei', 'Femorali', 'Polpacci', 'Addome'];
const matchGroup = (id: string, g: string) => {
  if (g === 'Tutti') return true;
  const m = EXERCISE_MUSCLES[id];
  if (!m) return false;
  const regions = [m.group, ...m.primary.map((x) => MUSCLE_REGION[x])].join(' ');
  if (g === 'Gambe') return /Gambe|Quadricipiti|Adduttori/.test(regions);
  if (g === 'Spalle') return /Spalle|Trapezio/.test(regions);
  if (g === 'Addome') return /Addome|Lombari/.test(regions);
  return regions.includes(g);
};

export interface LibFilter {
  q: string;
  g: string;
  eq: string;
  lv: string;
  only: '' | 'preferiti' | 'recenti' | 'archiviati';
}
export const EMPTY_FILTER: LibFilter = { q: '', g: 'Tutti', eq: '', lv: '', only: '' };
const EQUIPMENTS = ['Bilanciere', 'Manubri', 'Macchina', 'Cavi', 'Corpo libero', 'Kettlebell', 'Elastici', 'Bilanciere EZ', 'Palla medica', 'Fitball', 'Foam roller', 'Altro'];
export const eqOf = (equipment: string) => {
  const e = equipment.toLowerCase();
  if (/bilanciere ez/.test(e)) return 'Bilanciere EZ';
  if (/multipower|smith|macchin|leg press|hack|pec|chest press|leg curl|leg extension|abductor|adductor|calf|t-bar|pressa/.test(e)) return 'Macchina';
  if (/cav|pulley|lat machine|corda/.test(e)) return 'Cavi';
  if (/manubri/.test(e)) return 'Manubri';
  if (/bilanciere/.test(e)) return 'Bilanciere';
  if (/corpo libero|sbarra|parallele|nessuno|tapis|cyclette|ellittica|vogatore|stepper/.test(e)) return 'Corpo libero';
  return EQUIPMENTS.find((x) => e.includes(x.toLowerCase())) ?? 'Altro';
};
export const levelOf = (id: string) => EXERCISE_BY_ID[id]?.level ?? (sourceOf(id) === 'scheda' ? 'principiante' : 'intermedio');

function useFiltered(f: LibFilter) {
  const { settings } = useData();
  return useMemo(() => {
    const t = f.q.trim().toLowerCase();
    const fav = new Set(settings.favorites);
    const arch = new Set(settings.archivedExercises);
    let list = allExercises();
    if (f.only === 'recenti') list = settings.recentExercises.map((id) => EXERCISE_BY_ID[id]).filter(Boolean);
    return list.filter(
      (e) =>
        (f.only === 'archiviati' ? arch.has(e.id) : !arch.has(e.id)) &&
        (f.only !== 'preferiti' || fav.has(e.id)) &&
        matchGroup(e.id, f.g) &&
        (!f.eq || eqOf(e.equipment) === f.eq) &&
        (!f.lv || levelOf(e.id) === f.lv) &&
        (!t || `${e.name} ${e.nameEn} ${EXERCISE_MUSCLES[e.id]?.group ?? ''} ${e.equipment}`.toLowerCase().includes(t)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, settings.customExercises, settings.favorites, settings.archivedExercises, settings.recentExercises]);
}

function Filters({ f, set }: { f: LibFilter; set: (f: LibFilter) => void }) {
  return (
    <>
      <div className="search">
        <Search size={17} className="c3" />
        <input className="input" type="search" placeholder="Cerca esercizio" value={f.q} onChange={(e) => set({ ...f, q: e.target.value })} aria-label="Cerca esercizio" />
      </div>
      <div className="hscroll mt8" role="tablist" aria-label="Gruppo muscolare">
        {GROUPS.map((x) => (
          <button key={x} role="tab" aria-selected={f.g === x} className={`chip${f.g === x ? ' accent' : ''}`} onClick={() => set({ ...f, g: x })}>
            {x}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
        <select className="input" aria-label="Attrezzatura" value={f.eq} onChange={(e) => set({ ...f, eq: e.target.value })}>
          <option value="">Attrezzatura</option>
          {EQUIPMENTS.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select className="input" aria-label="Difficoltà" value={f.lv} onChange={(e) => set({ ...f, lv: e.target.value })}>
          <option value="">Difficoltà</option>
          <option value="principiante">Principiante</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzato">Avanzato</option>
        </select>
        <select className="input" aria-label="Mostra" value={f.only} onChange={(e) => set({ ...f, only: e.target.value as LibFilter['only'] })}>
          <option value="">Tutti</option>
          <option value="preferiti">Preferiti</option>
          <option value="recenti">Recenti</option>
          <option value="archiviati">Archiviati</option>
        </select>
      </div>
    </>
  );
}

/** Long lists render 60 rows at a time (fast on iPhone). */
function useWindow(n: number, deps: unknown) {
  const [count, setCount] = useState(60);
  const key = JSON.stringify(deps);
  const [prev, setPrev] = useState(key);
  if (prev !== key) {
    setPrev(key);
    setCount(60);
  }
  return [Math.min(n, count), () => setCount((c) => c + 60)] as const;
}

const SRC_LABEL = { scheda: 'Scheda · video', libreria: 'Libreria', catalogo: 'Catalogo', tuo: 'Tuo' } as const;

/** Bottom sheet to pick one or more exercises. */
export function ExercisePicker({ open, onClose, onPick, multi = true, title = 'Aggiungi esercizi' }: { open: boolean; onClose: () => void; onPick: (ids: string[]) => void; multi?: boolean; title?: string }) {
  const [f, setF] = useState<LibFilter>(EMPTY_FILTER);
  const [sel, setSel] = useState<string[]>([]);
  const [create, setCreate] = useState(false);
  const list = useFiltered(f);
  const [shown, more] = useWindow(list.length, f);
  const q = f.q;
  const done = (ids: string[]) => {
    onPick(ids);
    setSel([]);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <div className="row spread" style={{ marginBottom: 10 }}>
        <h3 className="t-h2">{title}</h3>
        {multi && (
          <button className="btn sm primary" disabled={!sel.length} onClick={() => done(sel)}>
            Aggiungi{sel.length ? ` (${sel.length})` : ''}
          </button>
        )}
      </div>
      <Filters f={f} set={setF} />
      <div className="t-xs c3 mt8">{list.length} esercizi</div>
      <div className="list mt8">
        {list.slice(0, shown).map((e) => {
          const on = sel.includes(e.id);
          return (
            <button key={e.id} className="ex-row" aria-pressed={multi ? on : undefined} onClick={() => (multi ? setSel((s) => (on ? s.filter((x) => x !== e.id) : [...s, e.id])) : done([e.id]))}>
              <ExerciseThumb exerciseId={e.id} />
              <span style={{ minWidth: 0 }}>
                <span className="ex-group" style={{ display: 'block' }}>
                  {EXERCISE_MUSCLES[e.id]?.group} · {SRC_LABEL[sourceOf(e.id)]}
                </span>
                <span className="ex-name" style={{ display: 'block' }}>
                  {e.name}
                </span>
                <span className="ex-sub">{e.equipment}</span>
              </span>
              {multi ? <span className={`check${on ? ' on' : ''}`} style={{ width: 32, height: 32 }} aria-hidden>{on && <Check size={16} strokeWidth={3} />}</span> : <ChevronRight size={18} className="c3" />}
            </button>
          );
        })}
        {!list.length && <div className="list-row t-sm c3">Nessun esercizio trovato.</div>}
      </div>
      {shown < list.length && (
        <button className="btn block mt8" onClick={more}>
          Mostra altri ({list.length - shown})
        </button>
      )}
      <button className="btn block ghost mt12" onClick={() => setCreate(true)}>
        <Plus size={16} /> Crea un esercizio tuo
      </button>
      <CustomExerciseSheet open={create} onClose={() => setCreate(false)} onCreated={(id) => (multi ? setSel((s) => [...s, id]) : done([id]))} initialName={q} />
    </Sheet>
  );
}

const ALL_MUSCLES = Object.keys(MUSCLE_LABEL) as MuscleId[];

export function CustomExerciseSheet({ open, onClose, onCreated, initialName = '' }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void; initialName?: string }) {
  const update = useSettingsUpdater();
  const [name, setName] = useState(initialName);
  const [primary, setPrimary] = useState<MuscleId[]>([]);
  const [equipment, setEquipment] = useState('');
  const [tracking, setTracking] = useState<'reps' | 'time'>('reps');
  const [bw, setBw] = useState(false);
  const [rest, setRest] = useState('90');
  const save = async () => {
    if (!name.trim()) return toast('Scrivi il nome');
    if (!primary.length) return toast('Scegli almeno un muscolo');
    const c: CustomExercise = {
      id: `u-${uid()}`,
      name: name.trim(),
      group: MUSCLE_REGION[primary[0]],
      primary,
      secondary: [],
      equipment: equipment.trim(),
      tracking,
      load: bw ? 'bodyweight' : 'external',
      restSec: Math.max(10, Math.min(600, Math.round(Number(rest)) || 90)),
    };
    await update((s) => ({ ...s, customExercises: [...s.customExercises, c] }));
    toast('Esercizio creato');
    setName('');
    setPrimary([]);
    onClose();
    onCreated?.(c.id);
  };
  return (
    <Sheet open={open} onClose={onClose} label="Nuovo esercizio">
      <div className="col">
        <h3 className="t-h2">Nuovo esercizio</h3>
        <input className="input" placeholder="Nome (es. Rematore alla macchina Hammer)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome esercizio" />
        <div>
          <div className="t-label">Muscoli principali</div>
          <div className="chips mt8">
            {ALL_MUSCLES.map((m) => (
              <button key={m} className={`chip${primary.includes(m) ? ' accent' : ''}`} aria-pressed={primary.includes(m)} onClick={() => setPrimary((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]))}>
                {MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
        <input className="input" placeholder="Attrezzo (facoltativo)" value={equipment} onChange={(e) => setEquipment(e.target.value)} aria-label="Attrezzo" />
        <div className="row wrap">
          <button className={`chip${tracking === 'reps' ? ' accent' : ''}`} aria-pressed={tracking === 'reps'} onClick={() => setTracking('reps')}>
            Ripetizioni
          </button>
          <button className={`chip${tracking === 'time' ? ' accent' : ''}`} aria-pressed={tracking === 'time'} onClick={() => setTracking('time')}>
            A tempo
          </button>
          <button className={`chip${bw ? ' accent' : ''}`} aria-pressed={bw} onClick={() => setBw(!bw)}>
            Corpo libero
          </button>
        </div>
        <label className="t-xs c3">
          Recupero (s)
          <input className="input" inputMode="numeric" aria-label="Recupero in secondi" value={rest} onChange={(e) => setRest(e.target.value)} style={{ marginTop: 4 }} />
        </label>
        <button className="btn primary block" onClick={save}>
          Crea esercizio
        </button>
      </div>
    </Sheet>
  );
}

export function newItem(exerciseId: string): RoutineItem {
  const ex = EXERCISE_BY_ID[exerciseId];
  const time = ex.tracking === 'time';
  if (ex.tracking === 'cardio') return { id: uid(), exerciseId, sets: 1, repsMin: 10, repsMax: 30, unit: 'min', perSide: false, restSec: 0 };
  return { id: uid(), exerciseId, sets: 3, repsMin: time ? 30 : 8, repsMax: time ? 45 : 12, unit: time ? 'sec' : 'reps', perSide: isPerSideDefault(exerciseId), sideLabel: isPerSideDefault(exerciseId) ? 'per lato' : undefined };
}

const nextLetter = (items: RoutineItem[]) => String.fromCharCode(65 + new Set(items.map((i) => i.group).filter(Boolean)).size);

/** Editable list of routine items (sets, reps, rest, order, supersets). */
export function ItemsEditor({ items, onChange }: { items: RoutineItem[]; onChange: (items: RoutineItem[]) => void }) {
  const [pick, setPick] = useState(false);
  const [replace, setReplace] = useState<number | null>(null);
  const set = (i: number, patch: Partial<RoutineItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => {
    const n = [...items];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    onChange(n);
  };
  const num = (v: string, lo: number, hi: number, def: number) => Math.max(lo, Math.min(hi, Math.round(Number(v.replace(',', '.'))) || def));
  return (
    <div className="col" style={{ gap: 8 }}>
      {items.map((it, i) => {
        const ex = EXERCISE_BY_ID[it.exerciseId];
        if (!ex) return null;
        const linked = !!it.group && items[i + 1]?.group === it.group;
        return (
          <div key={it.id} className="card" style={{ padding: 12 }}>
            <div className="row">
              <ExerciseThumb exerciseId={it.exerciseId} n={i + 1} />
              <span className="grow">
                {it.group && <span className="chip sm warn" style={{ marginBottom: 4 }}>Superserie {it.group}</span>}
                <span className="ex-name" style={{ display: 'block' }}>
                  {ex.name}
                </span>
                <button className="link t-xs" onClick={() => setReplace(i)}>
                  Sostituisci
                </button>
              </span>
              <span className="col" style={{ gap: 4 }}>
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Sposta su ${ex.name}`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={16} />
                </button>
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Sposta giù ${ex.name}`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={16} />
                </button>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 10 }}>
              {(
                [
                  ['Serie', 'sets', it.sets, 1, 10],
                  [it.unit === 'sec' ? 'Min s' : 'Min rip', 'repsMin', it.repsMin, 1, 600],
                  [it.unit === 'sec' ? 'Max s' : 'Max rip', 'repsMax', it.repsMax, 1, 600],
                  ['Rec. s', 'restSec', it.restSec ?? ex.restSec, 0, 600],
                ] as const
              ).map(([lab, key, val, lo, hi]) => (
                <label key={key} className="t-xs c3">
                  {lab}
                  <input
                    className="input"
                    style={{ minHeight: 40, marginTop: 4, textAlign: 'center' }}
                    inputMode="numeric"
                    defaultValue={val}
                    aria-label={`${lab} ${ex.name}`}
                    onBlur={(e) => {
                      const v = num(e.target.value, lo, hi, val);
                      e.target.value = String(v);
                      const patch: Partial<RoutineItem> = { [key]: v };
                      if (key === 'repsMin' && v > it.repsMax) patch.repsMax = v;
                      if (key === 'repsMax' && v < it.repsMin) patch.repsMin = v;
                      set(i, patch);
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="row mt8" style={{ gap: 6 }}>
              {i < items.length - 1 && (
                <button
                  className="btn sm ghost"
                  onClick={() => {
                    if (linked) {
                      const g = it.group;
                      const sameCount = items.filter((x) => x.group === g).length;
                      onChange(items.map((x, j) => (j === i + 1 || (sameCount <= 2 && x.group === g) ? { ...x, group: undefined } : x)));
                    } else {
                      const g = it.group ?? nextLetter(items);
                      onChange(items.map((x, j) => (j === i || j === i + 1 ? { ...x, group: g } : x)));
                    }
                  }}
                >
                  {linked ? <Unlink size={14} /> : <Link2 size={14} />} {linked ? 'Separa dal successivo' : 'Superserie col successivo'}
                </button>
              )}
              <div className="grow" />
              <button className="icon-btn clear" aria-label={`Rimuovi ${ex.name}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        );
      })}
      <button className="btn block" onClick={() => setPick(true)}>
        <Plus size={17} /> Aggiungi esercizi
      </button>
      <ExercisePicker open={pick} onClose={() => setPick(false)} onPick={(ids) => onChange([...items, ...ids.map(newItem)])} />
      <ExercisePicker
        open={replace != null}
        multi={false}
        title="Sostituisci con…"
        onClose={() => setReplace(null)}
        onPick={([id]) => replace != null && set(replace, { ...newItem(id), id: items[replace].id, sets: items[replace].sets, group: items[replace].group })}
      />
    </div>
  );
}

/** Edit one of the 4 plan days (stored in settings.dayEdits; original program kept for reset). */
export function DayEditor({ dayId }: { dayId: DayId }) {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const day = DAY_BY_ID[dayId];
  const [items, setItems] = useState<RoutineItem[]>(() => dayAsItems(dayId, settings));
  const [reset, setReset] = useState(false);
  if (!day) return null;
  const save = async () => {
    if (!items.length) return toast('Serve almeno un esercizio');
    await update((s) => ({ ...s, dayEdits: { ...s.dayEdits, [dayId]: items } }));
    toast('Giorno aggiornato');
    navigate(`/giorno/${dayId}`, { replace: true });
  };
  return (
    <main className="page">
      <NavBar title={`Modifica ${day.code}`} fallback={`/giorno/${dayId}`} right={<button className="link" onClick={save}>Salva</button>} />
      <h1 className="t-h1">{day.name}</h1>
      <p className="t-sm c2" style={{ marginTop: 4 }}>
        Aggiungi, togli, sostituisci o riordina gli esercizi, crea superserie e cambia serie, ripetizioni e recupero. Lo storico resta collegato a ogni esercizio.
      </p>
      <div className="mt16">
        <ItemsEditor items={items} onChange={setItems} />
      </div>
      <button className="btn primary lg block mt16" onClick={save}>
        <Check size={18} /> Salva il giorno
      </button>
      {settings.dayEdits[dayId] && (
        <button className="btn ghost block mt8" onClick={() => setReset(true)}>
          Ripristina la scheda originale di questo giorno
        </button>
      )}
      <Confirm
        open={reset}
        onClose={() => setReset(false)}
        title="Ripristinare il giorno originale?"
        body="Torna agli esercizi della scheda iniziale. Lo storico delle sedute non cambia."
        confirmLabel="Ripristina"
        onConfirm={async () => {
          await update((s) => {
            const d = { ...s.dayEdits };
            delete d[dayId];
            return { ...s, dayEdits: d };
          });
          navigate(`/giorno/${dayId}`, { replace: true });
        }}
      />
    </main>
  );
}

/** Create or edit a custom routine. */
export function RoutineEditor({ id }: { id?: string }) {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const existing = settings.routines.find((r) => r.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [accent, setAccent] = useState(existing?.accent ?? ROUTINE_ACCENTS[settings.routines.length % ROUTINE_ACCENTS.length]);
  const [items, setItems] = useState<RoutineItem[]>(existing?.items ?? []);
  const [folder, setFolder] = useState(existing?.folder ?? '');
  const [del, setDel] = useState(false);
  const folders = [...new Set(settings.routines.map((r) => r.folder).filter(Boolean))] as string[];
  const save = async () => {
    if (!name.trim()) return toast('Dai un nome alla scheda');
    if (!items.length) return toast('Aggiungi almeno un esercizio');
    const r: Routine = { id: existing?.id ?? uid(), name: name.trim(), folder: folder.trim(), accent, items, createdAt: existing?.createdAt ?? Date.now() };
    await update((s) => ({ ...s, routines: existing ? s.routines.map((x) => (x.id === r.id ? r : x)) : [...s.routines, r] }));
    toast('Scheda salvata');
    navigate(`/routine/${r.id}`, { replace: true });
  };
  return (
    <main className="page">
      <NavBar title={existing ? 'Modifica scheda' : 'Nuova scheda'} fallback="/allenamenti" right={<button className="link" onClick={save}>Salva</button>} />
      <input className="input" style={{ fontSize: 20, fontWeight: 700 }} placeholder="Nome (es. Full body, Braccia, Hotel)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome della scheda" />
      <input className="input mt8" list="folders" placeholder="Cartella (facoltativa, es. Vacanza, Casa)" value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Cartella" />
      <datalist id="folders">
        {folders.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <div className="row mt12" role="radiogroup" aria-label="Colore">
        {ROUTINE_ACCENTS.map((c) => (
          <button key={c} role="radio" aria-checked={accent === c} aria-label={`Colore ${c}`} onClick={() => setAccent(c)} style={{ width: 34, height: 34, borderRadius: 17, border: accent === c ? '3px solid var(--t1)' : '0', background: c }} />
        ))}
      </div>
      <div className="mt16">
        <ItemsEditor items={items} onChange={setItems} />
      </div>
      <button className="btn primary lg block mt16" onClick={save}>
        <Check size={18} /> Salva scheda
      </button>
      {existing && (
        <button className="btn danger ghost block mt8" onClick={() => setDel(true)}>
          <Trash2 size={16} /> Elimina scheda
        </button>
      )}
      <Confirm
        open={del}
        onClose={() => setDel(false)}
        title="Eliminare la scheda?"
        body="Le sedute già registrate restano nello storico."
        confirmLabel="Elimina"
        danger
        onConfirm={async () => {
          await update((s) => ({ ...s, routines: s.routines.filter((x) => x.id !== existing!.id) }));
          navigate('/allenamenti', { replace: true });
        }}
      />
    </main>
  );
}

/** View of a custom routine. */
export function RoutineView({ id }: { id: string }) {
  const { settings, sessions, active } = useData();
  const update = useSettingsUpdater();
  const r = settings.routines.find((x) => x.id === id);
  if (!r)
    return (
      <main className="page">
        <NavBar fallback="/allenamenti" />
        <Empty icon={<Dumbbell size={22} />} title="Scheda non trovata" />
      </main>
    );
  const slots = itemsToSlots(r.items, 'upper-a', settings, false);
  const m = aggregate(slots.map((s) => s.exerciseId));
  const begin = async () => {
    if (!active) await startCustom(`r:${r.id}`, r.name, slots, sessions);
    navigate('/allenamento');
  };
  return (
    <main className="page" style={{ ['--day' as string]: r.accent }}>
      <NavBar title="Scheda personale" fallback="/allenamenti" right={<button className="link" onClick={() => navigate(`/routine/${r.id}/modifica`)}>Modifica</button>} />
      <div className="t-label" style={{ color: 'var(--day)' }}>
        Scheda personale
      </div>
      <h1 className="t-h1" style={{ marginTop: 4 }}>
        {r.name}
      </h1>
      <p className="t-sm c2" style={{ marginTop: 4 }}>
        {slots.length} esercizi · {slots.reduce((a, s) => a + s.todaySets, 0)} serie · ~{estimateMinutes(slots)} min
      </p>
      <button className="btn primary lg block mt12" onClick={begin}>
        {active ? <PlayCircle size={20} /> : <Play size={18} fill="currentColor" />} {active ? 'Riprendi l’allenamento in corso' : 'Inizia allenamento'}
      </button>
      <button
        className="btn block mt8"
        onClick={async () => {
          const copy: Routine = { ...structuredClone(r), id: uid(), name: `${r.name} (copia)`, createdAt: Date.now() };
          await update((s) => ({ ...s, routines: [...s.routines, copy] }));
          toast('Scheda duplicata');
          navigate(`/routine/${copy.id}/modifica`);
        }}
      >
        <Copy size={16} /> Duplica
      </button>
      <button className="btn block mt8" onClick={() => downloadExchange(exportRoutine(r))}>
        <Download size={16} /> Esporta scheda per ChatGPT
      </button>
      <Section title="Muscoli">
        <div className="card">
          <Anatomy primary={m.primary} secondary={m.secondary} />
        </div>
      </Section>
      <Section title="Esercizi">
        <div className="list">
          {slots.map((s, i) => (
            <button key={s.id} className="ex-row" onClick={() => navigate(`/esercizio/${s.exerciseId}`)}>
              <ExerciseThumb exerciseId={s.exerciseId} n={i + 1} />
              <span style={{ minWidth: 0 }}>
                <span className="ex-group" style={{ display: 'block' }}>
                  {EXERCISE_MUSCLES[s.exerciseId]?.group}
                  {s.group ? ` · superserie ${s.group}` : ''}
                </span>
                <span className="ex-name" style={{ display: 'block' }}>
                  {EXERCISE_BY_ID[s.exerciseId].name}
                </span>
                <span className="ex-sub">
                  {formatPrescription(s, s.todaySets)} · rec. {s.restSec}s
                </span>
              </span>
              <ChevronRight size={18} className="c3" />
            </button>
          ))}
        </div>
      </Section>
    </main>
  );
}

/** Library of every exercise. */
export function Library() {
  const [f, setF] = useState<LibFilter>(EMPTY_FILTER);
  const [create, setCreate] = useState(false);
  const list = useFiltered(f);
  const [shown, more] = useWindow(list.length, f);
  return (
    <main className="page">
      <NavBar title="Libreria esercizi" fallback="/allenamenti" right={<button className="icon-btn clear" aria-label="Crea esercizio" onClick={() => setCreate(true)}><Plus size={20} /></button>} />
      <h1 className="t-h1">Libreria</h1>
      <p className="t-sm c2" style={{ marginTop: 4, marginBottom: 12 }}>
        {allExercises().length} esercizi: quelli della tua scheda (con video reali), quelli della libreria (pagina tecnica, senza video: puoi aggiungere il tuo) e quelli creati da te.
      </p>
      <Filters f={f} set={setF} />
      <div className="t-xs c3 mt8" aria-live="polite">
        {list.length} esercizi trovati
      </div>
      <div className="list mt8">
        {list.slice(0, shown).map((e) => (
          <button key={e.id} className="ex-row" onClick={() => navigate(`/esercizio/${e.id}`)}>
            <ExerciseThumb exerciseId={e.id} />
            <span style={{ minWidth: 0 }}>
              <span className="ex-group" style={{ display: 'block' }}>
                {EXERCISE_MUSCLES[e.id]?.group} · {SRC_LABEL[sourceOf(e.id)]}
              </span>
              <span className="ex-name" style={{ display: 'block' }}>
                {e.name}
              </span>
              <span className="ex-sub">{e.equipment}</span>
            </span>
            <ChevronRight size={18} className="c3" />
          </button>
        ))}
      </div>
      {shown < list.length && (
        <button className="btn block mt8" onClick={more}>
          Mostra altri ({list.length - shown})
        </button>
      )}
      <CustomExerciseSheet open={create} onClose={() => setCreate(false)} onCreated={(id) => navigate(`/esercizio/${id}`)} />
    </main>
  );
}

export function FreeStartButton() {
  const { sessions, active } = useData();
  return (
    <button
      className="list-row"
      onClick={async () => {
        if (!active) await startCustom('free', 'Allenamento libero', [], sessions);
        navigate('/allenamento');
      }}
    >
      <Zap size={20} color="var(--warn)" />
      <span className="grow">
        <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
          Allenamento libero
        </span>
        <span className="t-xs c3">Parti vuoto e aggiungi gli esercizi mentre ti alleni</span>
      </span>
      <ChevronRight size={18} className="c3" />
    </button>
  );
}

