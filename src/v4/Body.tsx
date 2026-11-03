// 4.1 body tracking: measurements (incl. body fat) with charts, progress photos with before/after
// comparison (stored only on this device), goals.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Columns2, Ruler, Target, Trash2 } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { deleteMeasurement, deleteMedia, getMedia, listMediaIds, saveMeasurement, saveMedia, uid, type MediaItem, type Measurement } from '../lib/db';
import { completed, exerciseHistory, isoDate, weekStart } from '../lib/stats';
import { fromUnit, kg, num, parseDecimal, shortDate, toUnit, unitLabel } from '../lib/format';
import { allExercises } from '../data/catalog';
import { EXERCISE_BY_ID } from '../data/exercises';
import { ChartCard } from '../components/Charts';
import { Confirm, Empty, Section, Sheet, toast } from './kit';

const FIELDS: { key: keyof Measurement; label: string; unit: string }[] = [
  { key: 'bodyWeight', label: 'Peso corporeo', unit: 'kg' },
  { key: 'bodyFat', label: 'Massa grassa', unit: '%' },
  { key: 'waist', label: 'Vita', unit: 'cm' },
  { key: 'chest', label: 'Torace', unit: 'cm' },
  { key: 'hips', label: 'Fianchi', unit: 'cm' },
  { key: 'arm', label: 'Braccio', unit: 'cm' },
  { key: 'thigh', label: 'Coscia', unit: 'cm' },
];

export function BodyTab() {
  return (
    <>
      <Goals />
      <Measurements />
      <Photos />
    </>
  );
}

function Bar({ v, max, label, right }: { v: number; max: number; label: string; right: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
  return (
    <div className="mt12">
      <div className="row spread t-sm">
        <span style={{ fontWeight: 650 }}>{label}</span>
        <span className="c2">{right}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--s3)', marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: pct >= 1 ? 'var(--ok)' : 'var(--accent)' }} />
      </div>
    </div>
  );
}

export function Goals() {
  const { settings, sessions, measurements } = useData();
  const update = useSettingsUpdater();
  const [edit, setEdit] = useState(false);
  const [lift, setLift] = useState('');
  const [liftW, setLiftW] = useState('');
  const wk = weekStart(Date.now());
  const thisWeek = completed(sessions).filter((s) => weekStart(s.startedAt) === wk).length;
  const lastW = [...measurements].sort((a, b) => a.date.localeCompare(b.date)).filter((m) => m.bodyWeight != null);
  const curW = lastW[lastW.length - 1]?.bodyWeight ?? null;
  const firstW = lastW[0]?.bodyWeight ?? null;
  const g = settings.goals;
  return (
    <Section title="Obiettivi" action={<button className="link" onClick={() => setEdit(true)}>Modifica</button>}>
      <div className="card">
        <Bar v={thisWeek} max={g.weeklySessions} label="Allenamenti questa settimana" right={`${thisWeek}/${g.weeklySessions}`} />
        {g.targetWeight != null && (
          <Bar
            v={curW != null && firstW != null && firstW !== g.targetWeight ? (firstW - curW) / (firstW - g.targetWeight) : 0}
            max={1}
            label="Peso corporeo"
            right={curW != null ? `${kg(curW)} → ${kg(g.targetWeight)}` : `obiettivo ${kg(g.targetWeight)} · registra il peso`}
          />
        )}
        {g.lifts.map((l) => {
          const h = exerciseHistory(sessions, l.exerciseId);
          const best = Math.max(0, ...h.map((p) => p.topWeight));
          return <Bar key={l.exerciseId} v={best} max={l.weight} label={EXERCISE_BY_ID[l.exerciseId]?.name ?? 'Esercizio'} right={`${kg(best)} / ${kg(l.weight)}`} />;
        })}
      </div>
      <Sheet open={edit} onClose={() => setEdit(false)} label="Obiettivi">
        <div className="col">
          <h3 className="t-h2">Obiettivi</h3>
          <label className="t-xs c3">
            Allenamenti a settimana
            <input
              className="input"
              inputMode="numeric"
              aria-label="Allenamenti a settimana"
              defaultValue={g.weeklySessions}
              style={{ marginTop: 4 }}
              onBlur={(e) => update((s) => ({ ...s, goals: { ...s.goals, weeklySessions: Math.max(1, Math.min(14, Math.round(Number(e.target.value)) || 4)) } }))}
            />
          </label>
          <label className="t-xs c3">
            Peso corporeo obiettivo ({unitLabel()}, vuoto = nessuno)
            <input
              className="input"
              inputMode="decimal"
              aria-label="Peso corporeo obiettivo"
              defaultValue={g.targetWeight != null ? String(toUnit(g.targetWeight)).replace('.', ',') : ''}
              style={{ marginTop: 4 }}
              onBlur={(e) => {
                const v = parseDecimal(e.target.value);
                void update((s) => ({ ...s, goals: { ...s.goals, targetWeight: v == null ? null : fromUnit(v) } }));
              }}
            />
          </label>
          <div className="t-label">Carico obiettivo su un esercizio</div>
          {g.lifts.map((l) => (
            <div key={l.exerciseId} className="row">
              <span className="grow t-sm">
                {EXERCISE_BY_ID[l.exerciseId]?.name}: {kg(l.weight)}
              </span>
              <button className="icon-btn clear" aria-label="Rimuovi obiettivo" onClick={() => update((s) => ({ ...s, goals: { ...s.goals, lifts: s.goals.lifts.filter((x) => x.exerciseId !== l.exerciseId) } }))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <select className="input" value={lift} onChange={(e) => setLift(e.target.value)} aria-label="Esercizio obiettivo">
            <option value="">Scegli esercizio…</option>
            {allExercises()
              .filter((e) => e.tracking === 'reps' && e.load === 'external')
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
          <div className="row">
            <input className="input grow" inputMode="decimal" placeholder={`Carico (${unitLabel()})`} value={liftW} onChange={(e) => setLiftW(e.target.value)} aria-label="Carico obiettivo" />
            <button
              className="btn"
              onClick={() => {
                const v = parseDecimal(liftW);
                if (!lift || v == null) return toast('Scegli esercizio e carico');
                void update((s) => ({ ...s, goals: { ...s.goals, lifts: [...s.goals.lifts.filter((x) => x.exerciseId !== lift), { exerciseId: lift, weight: fromUnit(v) }] } }));
                setLift('');
                setLiftW('');
              }}
            >
              <Target size={16} /> Aggiungi
            </button>
          </div>
          <button className="btn primary block" onClick={() => setEdit(false)}>
            Fatto
          </button>
        </div>
      </Sheet>
    </Section>
  );
}

function Measurements() {
  const { measurements } = useData();
  const [form, setForm] = useState<Record<string, string>>({ date: isoDate(new Date()) });
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const [field, setField] = useState<keyof Measurement>('bodyWeight');
  const save = async () => {
    const m: Measurement = { id: uid(), date: form.date || isoDate(new Date()), note: form.note?.trim() || undefined };
    let any = false;
    for (const f of FIELDS) {
      let v = parseDecimal(form[f.key as string] ?? '');
      if (v != null) {
        if (f.key === 'bodyWeight') v = fromUnit(v);
        (m as unknown as Record<string, number>)[f.key as string] = v;
        any = true;
      }
    }
    if (!any) return toast('Inserisci almeno una misura');
    await saveMeasurement(m);
    setForm({ date: isoDate(new Date()) });
    setOpen(false);
    toast('Misurazione salvata');
  };
  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
  const series = sorted.filter((m) => m[field] != null);
  const fdef = FIELDS.find((f) => f.key === field)!;
  const show = (k: keyof Measurement, v: number) => (k === 'bodyWeight' ? kg(v) : `${num(v, 1)} ${FIELDS.find((f) => f.key === k)!.unit}`);
  return (
    <Section title="Peso e misure" action={<button className="link" onClick={() => setOpen((o) => !o)} aria-expanded={open}>+ Nuova</button>}>
      <div className="col">
        {open && (
          <div className="card col">
            <label className="t-xs c3">
              Data
              <input type="date" className="input" aria-label="Data della misurazione" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ marginTop: 4 }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {FIELDS.map((f) => (
                <label key={f.key} className="t-xs c3">
                  {f.label} ({f.key === 'bodyWeight' ? unitLabel() : f.unit})
                  <input id={`m-${f.key}`} aria-label={f.label} className="input" inputMode="decimal" value={form[f.key as string] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} style={{ marginTop: 4 }} />
                </label>
              ))}
            </div>
            <input className="input" placeholder="Nota (facoltativa)" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} aria-label="Nota" />
            <button className="btn primary block" onClick={save}>
              Salva
            </button>
          </div>
        )}
        {measurements.length === 0 ? (
          <Empty icon={<Ruler size={22} />} title="Nessuna misurazione">
            Registra peso, massa grassa e circonferenze sempre nelle stesse condizioni (es. al mattino, a digiuno).
          </Empty>
        ) : (
          <>
            <div className="hscroll" role="tablist" aria-label="Misura">
              {FIELDS.map((f) => (
                <button key={f.key} role="tab" aria-selected={field === f.key} className={`chip${field === f.key ? ' accent' : ''}`} onClick={() => setField(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
            {series.length >= 2 ? (
              <ChartCard
                title={fdef.label}
                kind="line"
                unit={field === 'bodyWeight' ? unitLabel() : fdef.unit}
                color="var(--warn)"
                data={series.map((m) => ({ key: m.id, label: shortDate(new Date(m.date + 'T12:00:00')), value: field === 'bodyWeight' ? toUnit(m[field] as number) : (m[field] as number) }))}
              />
            ) : (
              <p className="t-sm c2" style={{ margin: 0 }}>
                Servono almeno due misurazioni di “{fdef.label.toLowerCase()}” per il grafico.
              </p>
            )}
            <div className="list">
              {[...sorted].reverse().map((m) => (
                <div key={m.id} className="list-row">
                  <span className="grow">
                    <b className="t-sm">{new Date(m.date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                    <span className="t-xs c2" style={{ display: 'block' }}>
                      {FIELDS.filter((f) => m[f.key] != null)
                        .map((f) => `${f.label} ${show(f.key, m[f.key] as number)}`)
                        .join(' · ')}
                    </span>
                    {m.note && <span className="t-xs c3">{m.note}</span>}
                  </span>
                  <button className="icon-btn clear" aria-label="Elimina misurazione" onClick={() => setDel(m.id)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Confirm open={!!del} onClose={() => setDel(null)} title="Eliminare la misurazione?" confirmLabel="Elimina" danger onConfirm={() => del && deleteMeasurement(del)} />
    </Section>
  );
}

function usePhotos() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [v, setV] = useState(0);
  useEffect(() => {
    let dead = false;
    void (async () => {
      const ids = (await listMediaIds()).filter((id) => id.startsWith('photo:'));
      const list = (await Promise.all(ids.map((id) => getMedia(id)))).filter(Boolean) as MediaItem[];
      if (!dead) setItems(list.sort((a, b) => b.createdAt - a.createdAt));
    })();
    return () => {
      dead = true;
    };
  }, [v]);
  return [items, () => setV((x) => x + 1)] as const;
}

function useUrl(blob?: Blob) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : ''), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}

function Thumb({ item, onClick, selected }: { item: MediaItem; onClick: () => void; selected?: boolean }) {
  const url = useUrl(item.blob);
  return (
    <button onClick={onClick} aria-pressed={selected} aria-label={`Foto del ${new Date(item.createdAt).toLocaleDateString('it-IT')}`} style={selected ? { outline: '3px solid var(--accent)' } : undefined}>
      <img src={url} alt="" />
      <span>{new Date(item.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
    </button>
  );
}

function Photos() {
  const [items, reload] = usePhotos();
  const file = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<MediaItem | null>(null);
  const [compare, setCompare] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [del, setDel] = useState<string | null>(null);
  const [date, setDate] = useState(isoDate(new Date()));
  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const blob = await downscale(f);
      await saveMedia({ id: `photo:${uid()}`, exerciseId: 'body', kind: 'photo', blob, type: blob.type, createdAt: new Date(date + 'T12:00:00').getTime(), markers: [] });
      toast('Foto salvata sul dispositivo');
      reload();
    } catch {
      toast('Impossibile salvare la foto');
    } finally {
      if (file.current) file.current.value = '';
    }
  };
  const pair = sel.map((id) => items.find((i) => i.id === id)).filter(Boolean) as MediaItem[];
  return (
    <Section title="Foto dei progressi" action={items.length >= 2 ? <button className="link" onClick={() => (setCompare(true), setSel(items.length >= 2 ? [items[items.length - 1].id, items[0].id] : []))}>Confronta</button> : undefined}>
      <p className="t-xs c3" style={{ marginTop: 0 }}>
        Restano solo su questo dispositivo: non sono incluse nel backup e non vengono mai inviate.
      </p>
      <div className="row">
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data della foto" style={{ maxWidth: 170 }} />
        <input ref={file} type="file" accept="image/*" capture="user" className="sr-only" id="photo-file" onChange={(e) => onFile(e.target.files?.[0])} />
        <label htmlFor="photo-file" className="btn primary grow">
          <Camera size={17} /> Aggiungi foto
        </label>
      </div>
      {items.length ? (
        <div className="photo-grid mt12">
          {items.map((it) => (
            <Thumb key={it.id} item={it} onClick={() => setView(it)} />
          ))}
        </div>
      ) : (
        <p className="t-sm c3">Nessuna foto. Scattale con la stessa luce e posa per confrontarle.</p>
      )}
      <Sheet open={!!view} onClose={() => setView(null)} label="Foto">
        {view && <Full item={view} />}
        {view && (
          <button className="btn danger ghost block mt12" onClick={() => (setDel(view.id), setView(null))}>
            <Trash2 size={16} /> Elimina foto
          </button>
        )}
      </Sheet>
      <Sheet open={compare} onClose={() => setCompare(false)} label="Confronto foto">
        <h3 className="t-h2" style={{ marginBottom: 10 }}>
          <Columns2 size={18} /> Prima e dopo
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {pair.map((p) => (
            <Full key={p.id} item={p} />
          ))}
        </div>
        <p className="t-xs c3">Scegli due foto:</p>
        <div className="photo-grid">
          {items.map((it) => (
            <Thumb key={it.id} item={it} selected={sel.includes(it.id)} onClick={() => setSel((s) => (s.includes(it.id) ? s.filter((x) => x !== it.id) : [...s.slice(-1), it.id]))} />
          ))}
        </div>
      </Sheet>
      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        title="Eliminare la foto?"
        confirmLabel="Elimina"
        danger
        onConfirm={async () => {
          if (del) await deleteMedia(del);
          reload();
        }}
      />
    </Section>
  );
}

function Full({ item }: { item: MediaItem }) {
  const url = useUrl(item.blob);
  return (
    <figure style={{ margin: 0 }}>
      <img src={url} alt={`Foto del ${new Date(item.createdAt).toLocaleDateString('it-IT')}`} style={{ width: '100%', borderRadius: 14, display: 'block' }} />
      <figcaption className="t-xs c3" style={{ marginTop: 4 }}>
        {new Date(item.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
      </figcaption>
    </figure>
  );
}

/** Resize to max 1600 px (JPEG) so photos stay small in the browser storage. */
async function downscale(f: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? f), 'image/jpeg', 0.85));
  } catch {
    return f;
  }
}

