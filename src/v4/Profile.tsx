import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Download, HardDrive, Info, Lock, LogOut, ShieldCheck, Smartphone, Trash2, Upload, Video } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { DAYS, SLOTS, SLOT_VARIANTS } from '../data/program';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { PHOTOS } from '../data/media';
import { kvGet, restore, snapshot, wipeAll, type Snapshot } from '../lib/db';
import { backupFileName, decryptBackup, deliverFile, encryptBackup, isEncrypted, makeBackup, validateBackup, type EncryptedBackup } from '../lib/backup';
import { CALIBRATION_SESSIONS } from '../lib/plan';
import { wakeLockSupported } from '../lib/wakelock';
import { timer } from '../lib/timer';
import { navigate } from '../lib/router';
import type { MigrationReport } from '../lib/migration';
import type { Settings as S } from '../lib/settings';
import { Acc, AppBar, Confirm, Notice, Section, Seg, Sheet, Switch, toast } from './kit';

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function Row({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="list-row" style={{ cursor: 'default' }}>
      <span className="grow">
        <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
          {title}
        </span>
        {sub && <span className="t-xs c3">{sub}</span>}
      </span>
      {children}
    </div>
  );
}

export function Profile() {
  const { settings, sessions, measurements } = useData();
  const update = useSettingsUpdater();
  const [name, setName] = useState(settings.name);
  useEffect(() => setName(settings.name), [settings.name]);
  const set = <K extends keyof S>(k: K, v: S[K]) => update((s) => ({ ...s, [k]: v }));
  return (
    <main className="page">
      <AppBar title="Profilo" />

      <Section title="Preferenze">
        <div className="card col">
          <div>
            <label className="t-label" htmlFor="name">
              Nome per il saluto
            </label>
            <input id="name" className="input mt8" value={name} autoComplete="given-name" onChange={(e) => setName(e.target.value)} onBlur={() => set('name', name.trim())} placeholder="Il tuo nome" />
          </div>
          <div>
            <div className="t-label">Settimana di calibrazione</div>
            <div className="mt8">
              <Seg
                label="Calibrazione"
                value={settings.calibration}
                onChange={(v) => set('calibration', v)}
                options={[
                  { value: 'auto', label: 'Automatica' },
                  { value: 'on', label: 'Attiva' },
                  { value: 'off', label: 'Disattiva' },
                ]}
              />
            </div>
            <p className="t-xs c3 mt8">Automatica: per le prime {CALIBRATION_SESSIONS} sedute gli esercizi da 3 serie si fanno con 2.</p>
          </div>
        </div>
        <div className="list mt8">
          <Row title="Recupero automatico" sub="Parte quando segni una serie">
            <Switch checked={settings.autoRest} onChange={(v) => set('autoRest', v)} label="Recupero automatico" />
          </Row>
          <Row title="Segnale acustico" sub="Solo con l’app aperta (limite di iOS)">
            <Switch checked={settings.sound} onChange={(v) => set('sound', v)} label="Segnale acustico" />
          </Row>
          <Row title="Schermo sempre acceso" sub={wakeLockSupported() ? 'Durante l’allenamento' : 'Non supportato da questo browser'}>
            <Switch checked={settings.keepAwake && wakeLockSupported()} onChange={(v) => set('keepAwake', v)} label="Schermo sempre acceso" />
          </Row>
          <Row title="Video in automatico" sub="Partono senza audio e in loop">
            <Switch checked={settings.video.autoplay} onChange={(v) => set('video', { ...settings.video, autoplay: v })} label="Avvio automatico video" />
          </Row>
          <button className="list-row" onClick={() => timer.start(5, 'Prova timer')}>
            <span className="grow t-sm" style={{ fontWeight: 650 }}>
              Prova il timer (5 s)
            </span>
          </button>
        </div>
      </Section>

      <PlanEditor />

      <Section title="Video">
        <button className="list-row" style={{ borderRadius: 'var(--r-lg)', background: 'var(--s1)', width: '100%' }} onClick={() => navigate('/videoteca')}>
          <Video size={20} className="c2" />
          <span className="grow">
            <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
              Videoteca e stato dei video
            </span>
            <span className="t-xs c3">Fonte, corrispondenza e tua revisione per ogni esercizio</span>
          </span>
          <ChevronRight size={18} className="c3" />
        </button>
      </Section>

      <Section title="I tuoi dati">
        <StorageInfo sessions={sessions.length} measurements={measurements.length} />
        <BackupTools />
        <PreviousVersion />
      </Section>

      <Section title="Privacy e accesso">
        <div className="card col t-sm c2">
          <div className="row t-h3" style={{ color: 'var(--t1)' }}>
            <ShieldCheck size={18} color="var(--ok)" /> Dati solo su questo dispositivo
          </div>
          <p style={{ margin: 0 }}>
            Allenamenti, misure, note e impostazioni sono salvati nel database del browser (IndexedDB) di questo indirizzo. Nessun server li riceve e non c’è sincronizzazione tra dispositivi: usa il backup per
            spostarli.
          </p>
          <p style={{ margin: 0 }}>Su iPhone l’app nella schermata Home ha un archivio separato da Safari: registra sempre dall’icona dell’app.</p>
          <p style={{ margin: 0 }}>Nessuna pubblicità né tracciamento. I video sono caricati dal player ufficiale YouTube (youtube-nocookie.com) solo quando li apri.</p>
          {!__PREVIEW__ && (
            <a className="btn sm" href="/__auth/logout" style={{ alignSelf: 'flex-start' }}>
              <LogOut size={15} /> Esci
            </a>
          )}
        </div>
      </Section>

      <Section title="Installazione">
        <div className="card col t-sm c2">
          <div className="row t-h3" style={{ color: 'var(--t1)' }}>
            <Smartphone size={18} /> {isStandalone() ? 'App installata' : 'Non ancora installata'}
          </div>
          {!isStandalone() && (
            <ol className="steps">
              <li>iPhone: apri l’indirizzo in Safari ed effettua l’accesso.</li>
              <li>Tocca Condividi, poi “Aggiungi alla schermata Home”.</li>
              <li>PC (Chrome/Edge): icona “Installa” nella barra degli indirizzi.</li>
              <li>Apri FORMA LAB dall’icona: schermo intero e funzioni locali anche offline.</li>
            </ol>
          )}
        </div>
      </Section>

      <Section title="Crediti">
        <Acc title="Foto, video, caratteri" icon={<Info size={18} className="c3" />}>
          <ul className="t-xs c2" style={{ margin: 0, paddingLeft: 18 }}>
            {PHOTOS.map((p) => (
              <li key={p.source}>
                <a href={p.source} target="_blank" rel="noopener noreferrer">
                  {p.title}
                </a>{' '}
                — {p.author},{' '}
                <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">
                  {p.license}
                </a>
              </li>
            ))}
          </ul>
          <p className="t-xs c2">Video: proprietà dei rispettivi autori, incorporati con il player ufficiale YouTube senza modifiche. Caratteri: Manrope e Inter (SIL OFL). Icone: Lucide (ISC).</p>
          <p className="t-xs c3">
            Le indicazioni tecniche sono informative e non sostituiscono un medico o un professionista. FORMA LAB 4.0 · build {__BUILD_DATE__}
            {__PREVIEW__ ? ' · ANTEPRIMA' : ''}
          </p>
        </Acc>
      </Section>
    </main>
  );
}

function PlanEditor() {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const [open, setOpen] = useState(false);
  const setOverride = (slotId: string, patch: Record<string, number | string | undefined>) =>
    update((s) => {
      const cur = { ...(s.slotOverrides[slotId] ?? {}), ...patch };
      Object.keys(cur).forEach((k) => (cur as Record<string, unknown>)[k] === undefined && delete (cur as Record<string, unknown>)[k]);
      const all = { ...s.slotOverrides };
      if (Object.keys(cur).length) all[slotId] = cur;
      else delete all[slotId];
      return { ...s, slotOverrides: all };
    });
  const count = Object.keys(settings.slotOverrides).length + Object.keys(settings.restOverrides).length;
  const n = (v: string, lo: number, hi: number) => (v.trim() === '' ? undefined : Math.max(lo, Math.min(hi, Math.round(Number(v)))) || undefined);
  return (
    <Section title="Scheda" action={<button className="link" onClick={() => setOpen(true)}>Modifica</button>}>
      <p className="t-sm c2" style={{ margin: 0 }}>
        {count ? `${count} personalizzazioni attive (serie, ripetizioni, recuperi o varianti).` : 'Stai usando la scheda originale: 4 giorni, 26 posizioni.'}
      </p>
      <Sheet open={open} onClose={() => setOpen(false)} label="Modifica scheda">
        <h3 className="t-h2">Modifica scheda</h3>
        <p className="t-sm c2" style={{ margin: '6px 0 12px' }}>
          Tra parentesi i valori originali. Lascia vuoto per usare l’originale.
        </p>
        {DAYS.map((d) => (
          <div key={d.id} style={{ marginBottom: 16 }}>
            <div className="t-label" style={{ color: d.accent, marginBottom: 8 }}>
              {d.weekdayLabel} · {d.name}
            </div>
            <div className="col" style={{ gap: 8 }}>
              {SLOTS.filter((s) => s.dayId === d.id).map((s) => {
                const o = settings.slotOverrides[s.id] ?? {};
                const exId = o.exerciseId ?? s.exerciseId;
                const ex = EXERCISE_BY_ID[exId];
                return (
                  <div key={s.id} className="card inset" style={{ padding: 12 }}>
                    <div className="t-sm" style={{ fontWeight: 650 }}>
                      {s.order}. {ex.name}
                    </div>
                    {SLOT_VARIANTS[s.id] && (
                      <select className="input mt8" value={exId} onChange={(e) => setOverride(s.id, { exerciseId: e.target.value === s.exerciseId ? undefined : e.target.value })} aria-label="Variante">
                        {SLOT_VARIANTS[s.id].map((v) => (
                          <option key={v} value={v}>
                            {EXERCISE_BY_ID[v].name}
                            {v === s.exerciseId ? ' (predefinita)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                      {(
                        [
                          ['Serie', 'sets', s.sets, 1, 10],
                          ['Min', 'repsMin', s.repsMin, 1, 300],
                          ['Max', 'repsMax', s.repsMax, 1, 300],
                        ] as const
                      ).map(([lab, key, def, lo, hi]) => (
                        <label key={key} className="t-xs c3">
                          {lab} ({def})
                          <input className="input" style={{ minHeight: 40, marginTop: 4 }} inputMode="numeric" defaultValue={o[key] ?? ''} placeholder={String(def)} onBlur={(e) => setOverride(s.id, { [key]: n(e.target.value, lo, hi) })} />
                        </label>
                      ))}
                      <label className="t-xs c3">
                        Rec. ({ex.restSec})
                        <input
                          className="input"
                          style={{ minHeight: 40, marginTop: 4 }}
                          inputMode="numeric"
                          defaultValue={settings.restOverrides[exId] ?? ''}
                          placeholder={String(ex.restSec)}
                          onBlur={(ev) =>
                            update((st) => {
                              const r = { ...st.restOverrides };
                              const v = Math.round(Number(ev.target.value));
                              if (ev.target.value.trim() && v >= 10 && v <= 600) r[exId] = v;
                              else delete r[exId];
                              return { ...st, restOverrides: r };
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button
          className="btn block ghost"
          onClick={() =>
            update((s) => ({ ...s, slotOverrides: {}, restOverrides: {} })).then(() => {
              setOpen(false);
              toast('Scheda originale ripristinata');
            })
          }
        >
          Ripristina scheda originale
        </button>
        <button className="btn block primary mt8" onClick={() => setOpen(false)}>
          Fatto
        </button>
        <p className="t-xs c3 mt8">{EXERCISES.length} esercizi in archivio.</p>
      </Sheet>
    </Section>
  );
}

function StorageInfo({ sessions, measurements }: { sessions: number; measurements: number }) {
  const [est, setEst] = useState<{ usage?: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.estimate?.().then(setEst).catch(() => {});
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
  }, []);
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div className="row t-h3">
        <HardDrive size={18} /> Archivio locale
      </div>
      <div className="t-sm c2 mt8">
        {sessions} sessioni · {measurements} misurazioni
        {est?.usage != null && ` · ${(est.usage / 1024).toFixed(0)} KB`}
      </div>
      <div className="t-xs c3" style={{ marginTop: 4 }}>
        Archiviazione persistente: {persisted == null ? 'non verificabile' : persisted ? 'concessa' : 'non concessa'}
        {persisted === false && (
          <button
            className="link"
            style={{ marginLeft: 6, fontSize: 12 }}
            onClick={() =>
              navigator.storage?.persist?.().then((p) => {
                setPersisted(p);
                toast(p ? 'Archiviazione persistente concessa' : 'Non concessa: fai backup regolari');
              })
            }
          >
            Richiedi
          </button>
        )}
      </div>
    </div>
  );
}

function BackupTools() {
  const [encrypt, setEncrypt] = useState(true);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ raw: unknown } | null>(null);
  const [importPass, setImportPass] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [wipe, setWipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const doExport = async () => {
    if (encrypt && (pass.length < 8 || pass !== pass2)) return toast(pass.length < 8 ? 'Passphrase di almeno 8 caratteri' : 'Le passphrase non coincidono');
    setBusy(true);
    try {
      const b = makeBackup(await snapshot());
      const content = encrypt ? JSON.stringify(await encryptBackup(b, pass)) : JSON.stringify(b, null, 1);
      const how = await deliverFile(backupFileName(encrypt), content);
      toast(how === 'shared' ? 'Backup pronto: salvalo in File o iCloud Drive' : 'Backup scaricato');
      setPass('');
      setPass2('');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending({ raw: JSON.parse(await f.text()) });
    } catch {
      toast('File non leggibile');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const doImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const b = isEncrypted(pending.raw) ? await decryptBackup(pending.raw as EncryptedBackup, importPass) : validateBackup(pending.raw);
      await restore(b, mode);
      toast(`Importati ${b.sessions.length} allenamenti`);
      setPending(null);
      setImportPass('');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card col">
      <div className="row t-h3">
        <Download size={18} /> Backup
      </div>
      <div className="row">
        <span className="grow t-sm">
          <Lock size={13} /> Cifra con passphrase (AES-256-GCM)
        </span>
        <Switch checked={encrypt} onChange={setEncrypt} label="Cifra il backup" />
      </div>
      {encrypt && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input className="input" type="password" autoComplete="new-password" placeholder="Passphrase" value={pass} onChange={(e) => setPass(e.target.value)} aria-label="Passphrase" />
          <input className="input" type="password" autoComplete="new-password" placeholder="Ripeti" value={pass2} onChange={(e) => setPass2(e.target.value)} aria-label="Ripeti passphrase" />
        </div>
      )}
      {__PREVIEW__ ? (
        <Notice>Nell’anteprima dentro Claude il download dei file è bloccato: l’esportazione funziona nell’app pubblicata.</Notice>
      ) : (
        <button className="btn primary block" disabled={busy} onClick={doExport}>
          <Download size={17} /> Esporta tutti i dati
        </button>
      )}
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" id="import-file" onChange={(e) => onFile(e.target.files?.[0])} />
      <label htmlFor="import-file" className="btn block">
        <Upload size={17} /> Importa / ripristina da file…
      </label>
      <button className="btn danger block ghost" onClick={() => setWipe(true)}>
        <Trash2 size={17} /> Cancella tutti i dati
      </button>
      <Sheet open={!!pending} onClose={() => setPending(null)} label="Importa backup">
        <div className="col">
          <h3 className="t-h2">Importa backup</h3>
          {pending && isEncrypted(pending.raw) && <input className="input" type="password" placeholder="Passphrase del backup" value={importPass} onChange={(e) => setImportPass(e.target.value)} aria-label="Passphrase del backup" autoFocus />}
          <Seg
            label="Modalità di importazione"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'merge', label: 'Unisci' },
              { value: 'replace', label: 'Sostituisci tutto' },
            ]}
          />
          <p className="t-sm c2" style={{ margin: 0 }}>
            {mode === 'merge' ? 'Aggiunge i dati del file a quelli presenti (stesso identificativo = aggiornato).' : 'Cancella i dati attuali e li sostituisce con quelli del file.'}
          </p>
          {mode === 'replace' && <Notice>I dati attuali su questo dispositivo andranno persi.</Notice>}
          <button className="btn primary block" disabled={busy} onClick={doImport}>
            Importa
          </button>
        </div>
      </Sheet>
      <Confirm
        open={wipe}
        onClose={() => setWipe(false)}
        title="Cancellare tutti i dati?"
        body="Allenamenti, misure, note, impostazioni, video caricati e la copia di sicurezza della versione precedente verranno eliminati da questo dispositivo. Esporta prima un backup."
        confirmLabel="Cancella tutto"
        danger
        onConfirm={async () => {
          timer.stop();
          await wipeAll();
          toast('Dati cancellati');
        }}
      />
    </div>
  );
}

/** Safety copy taken automatically before the first 4.0 start (see lib/migration.ts). */
function PreviousVersion() {
  const [rep, setRep] = useState<MigrationReport | null | undefined>(undefined);
  const [copy, setCopy] = useState<{ at: string; data: Snapshot } | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    void kvGet<MigrationReport>('migration:4.0').then((r) => setRep(r ?? null));
    void kvGet<{ at: string; data: Snapshot }>('backup:pre-4.0').then((c) => setCopy(c ?? null));
  }, []);
  if (rep === undefined) return null;
  return (
    <div className="card mt8 col">
      <div className="row t-h3">
        <ShieldCheck size={18} color="var(--ok)" /> Dati della versione precedente
      </div>
      {copy ? (
        <>
          <p className="t-sm c2" style={{ margin: 0 }}>
            Al primo avvio della 4.0 è stata salvata una copia verificata dei dati precedenti ({copy.data.sessions.length} sessioni, {copy.data.measurements.length} misurazioni) il{' '}
            {new Date(copy.at).toLocaleString('it-IT')}. Nessun dato è stato convertito o cancellato: il formato non è cambiato.
          </p>
          {!__PREVIEW__ && (
            <button
              className="btn block"
              onClick={async () => {
                const how = await deliverFile(`forma-lab-copia-pre-4.0.json`, JSON.stringify(makeBackup(copy.data), null, 1));
                toast(how === 'shared' ? 'Copia pronta' : 'Copia scaricata');
              }}
            >
              <Download size={17} /> Esporta la copia pre-4.0
            </button>
          )}
          <button className="btn block ghost" onClick={() => setConfirm(true)}>
            Ripristina elementi mancanti dalla copia
          </button>
          <Confirm
            open={confirm}
            onClose={() => setConfirm(false)}
            title="Ripristinare dalla copia pre-4.0?"
            body="Unisce la copia ai dati attuali: gli elementi mancanti vengono ripristinati, quelli con lo stesso identificativo tornano alla versione della copia."
            confirmLabel="Ripristina"
            onConfirm={async () => {
              await restore(copy.data, 'merge');
              toast('Copia ripristinata');
            }}
          />
        </>
      ) : (
        <p className="t-sm c2" style={{ margin: 0 }}>
          {rep ? 'Al primo avvio della 4.0 non c’erano dati precedenti su questo dispositivo: nessuna copia necessaria.' : 'Verifica non ancora eseguita.'}
        </p>
      )}
    </div>
  );
}
