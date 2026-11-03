import { useEffect, useRef, useState } from 'react';
import { BellRing, ChevronRight, Dumbbell, FileSpreadsheet, Flame, Download, HardDrive, Info, Lock, LogOut, ShieldCheck, Smartphone, Trash2, Upload, Video } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { DAYS } from '../data/program';
import { PHOTOS } from '../data/media';
import { kvGet, restore, snapshot, wipeAll, type Snapshot } from '../lib/db';
import { backupFileName, decryptBackup, deliverFile, encryptBackup, isEncrypted, makeBackup, validateBackup, type EncryptedBackup } from '../lib/backup';
import { CALIBRATION_SESSIONS } from '../lib/plan';
import { wakeLockSupported } from '../lib/wakelock';
import { timer } from '../lib/timer';
import { navigate } from '../lib/router';
import type { MigrationReport } from '../lib/migration';
import type { Settings as S } from '../lib/settings';
import { updateSettings } from '../lib/settings';
import { remindersIcs, setsCsv } from '../lib/exports';
import { MUSCLE_LABEL } from '../data/muscles';
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

      <Section title="Scheda">
        <div className="list">
          {DAYS.map((d) => (
            <button key={d.id} className="list-row" style={{ ['--day' as string]: d.accent }} onClick={() => navigate(`/giorno/${d.id}/modifica`)}>
              <span className="dot" />
              <span className="grow">
                <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                  {d.weekdayLabel} · {d.name}
                </span>
                <span className="t-xs c3">{settings.dayEdits[d.id] ? 'Personalizzato' : 'Originale'} · modifica esercizi, serie, recuperi, superserie</span>
              </span>
              <ChevronRight size={18} className="c3" />
            </button>
          ))}
        </div>
        <p className="t-xs c3 mt8">Le schede personali si creano da Allenamenti → Le mie schede.</p>
      </Section>

      <TrainingPrefs />
      <CustomExercises />
      <Reminders />

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
        <CsvExport />
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
            Le indicazioni tecniche sono informative e non sostituiscono un medico o un professionista. FORMA LAB 5.0 · build {__BUILD_DATE__}
            {__PREVIEW__ ? ' · ANTEPRIMA' : ''}
          </p>
        </Acc>
      </Section>
    </main>
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
  const [wipe2, setWipe2] = useState(false);
  const [typed, setTyped] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const doExport = async () => {
    if (encrypt && (pass.length < 8 || pass !== pass2)) return toast(pass.length < 8 ? 'Passphrase di almeno 8 caratteri' : 'Le passphrase non coincidono');
    setBusy(true);
    try {
      const b = makeBackup(await snapshot());
      const content = encrypt ? JSON.stringify(await encryptBackup(b, pass)) : JSON.stringify(b, null, 1);
      const how = await deliverFile(backupFileName(encrypt), content);
      await updateSettings((st) => ({ ...st, lastBackupAt: Date.now() }));
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
        confirmLabel="Continua"
        danger
        onConfirm={() => setWipe2(true)}
      />
      <Sheet open={wipe2} onClose={() => (setWipe2(false), setTyped(''))} label="Conferma definitiva">
        <div className="col">
          <h3 className="t-h2">Conferma definitiva</h3>
          <p className="t-sm c2" style={{ margin: 0 }}>
            Seconda conferma: scrivi <b>CANCELLA</b> per eliminare tutti i dati da questo dispositivo. L’operazione non si può annullare.
          </p>
          <input className="input" aria-label="Scrivi CANCELLA per confermare" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />
          <button
            className="btn danger lg block"
            disabled={typed.trim() !== 'CANCELLA'}
            onClick={async () => {
              timer.stop();
              await wipeAll();
              setWipe2(false);
              setTyped('');
              toast('Dati cancellati');
            }}
          >
            Cancella tutti i dati
          </button>
        </div>
      </Sheet>
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

function TrainingPrefs() {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const set = <K extends keyof S>(k: K, v: S[K]) => update((s) => ({ ...s, [k]: v }));
  return (
    <Section title="Allenamento">
      <div className="card col">
        <div>
          <div className="t-label">Unità di peso</div>
          <div className="mt8">
            <Seg
              label="Unità di peso"
              value={settings.unit}
              onChange={(v) => set('unit', v)}
              options={[
                { value: 'kg', label: 'Chilogrammi (kg)' },
                { value: 'lb', label: 'Libbre (lb)' },
              ]}
            />
          </div>
          <p className="t-xs c3 mt8" style={{ marginBottom: 0 }}>I dati restano salvati in kg: cambia solo come li vedi e li inserisci.</p>
        </div>
      </div>
      <div className="list mt8">
        <Row title="RPE per ogni serie" sub="Tocca il numero della serie per indicarlo">
          <Switch checked={settings.rpePerSet} onChange={(v) => set('rpePerSet', v)} label="RPE per serie" />
        </Row>
        <Row title="Superserie intelligenti" sub="Dopo una serie passa al prossimo esercizio del gruppo; recupero a fine giro">
          <Switch checked={settings.smartSuperset} onChange={(v) => set('smartSuperset', v)} label="Superserie intelligenti" />
        </Row>
      </div>
      <div className="card mt8">
        <div className="row t-h3">
          <Flame size={18} /> Serie di riscaldamento
        </div>
        <p className="t-xs c3" style={{ margin: '6px 0 10px' }}>
          Generate con il pulsante “Riscaldamento” in seduta, in percentuale del carico della prima serie di lavoro.
        </p>
        {settings.warmup.map((w, i) => (
          <div key={i} className="row" style={{ marginBottom: 6 }}>
            <span className="t-sm c3" style={{ width: 22 }}>
              {i + 1}
            </span>
            <input
              className="input"
              inputMode="numeric"
              defaultValue={w.pct}
              aria-label={`Percentuale serie di riscaldamento ${i + 1}`}
              onBlur={(e) => update((s) => ({ ...s, warmup: s.warmup.map((x, j) => (j === i ? { ...x, pct: Math.max(10, Math.min(95, Math.round(Number(e.target.value)) || x.pct)) } : x)) }))}
            />
            <span className="t-sm c3">% ×</span>
            <input
              className="input"
              inputMode="numeric"
              defaultValue={w.reps}
              aria-label={`Ripetizioni serie di riscaldamento ${i + 1}`}
              onBlur={(e) => update((s) => ({ ...s, warmup: s.warmup.map((x, j) => (j === i ? { ...x, reps: Math.max(1, Math.min(20, Math.round(Number(e.target.value)) || x.reps)) } : x)) }))}
            />
            <button className="icon-btn clear" aria-label={`Rimuovi serie di riscaldamento ${i + 1}`} disabled={settings.warmup.length <= 1} onClick={() => update((s) => ({ ...s, warmup: s.warmup.filter((_, j) => j !== i) }))}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {settings.warmup.length < 5 && (
          <button className="btn sm ghost" onClick={() => update((s) => ({ ...s, warmup: [...s.warmup, { pct: 90, reps: 1 }] }))}>
            + Aggiungi
          </button>
        )}
      </div>
    </Section>
  );
}

function CustomExercises() {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const [del, setDel] = useState<string | null>(null);
  if (!settings.customExercises.length) return null;
  return (
    <Section title="Esercizi creati da te">
      <div className="list">
        {settings.customExercises.map((c) => (
          <div key={c.id} className="list-row">
            <Dumbbell size={18} className="c3" />
            <button className="grow" style={{ border: 0, background: 'none', color: 'inherit', textAlign: 'left', padding: 0 }} onClick={() => navigate(`/esercizio/${c.id}`)}>
              <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                {c.name}
              </span>
              <span className="t-xs c3">{c.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}</span>
            </button>
            <button className="icon-btn clear" aria-label={`Elimina ${c.name}`} onClick={() => setDel(c.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <Confirm
        open={!!del}
        onClose={() => setDel(null)}
        title="Eliminare l’esercizio?"
        body="Le sedute già registrate restano nello storico (con il nome “Esercizio eliminato”). Va tolto anche dalle schede che lo usano."
        confirmLabel="Elimina"
        danger
        onConfirm={() => update((s) => ({ ...s, customExercises: s.customExercises.filter((x) => x.id !== del) }))}
      />
    </Section>
  );
}

function Reminders() {
  const { settings } = useData();
  const update = useSettingsUpdater();
  return (
    <Section title="Promemoria">
      <div className="card col">
        <p className="t-sm c2" style={{ margin: 0 }}>
          Un’app web su iPhone non può inviare notifiche senza un server. In alternativa aggiungi i 4 allenamenti settimanali al <b>Calendario</b> del telefono, con un avviso prima dell’orario.
        </p>
        <div className="row">
          <label className="t-xs c3 grow">
            Orario
            <input type="time" className="input" aria-label="Orario del promemoria" value={settings.reminders.time} onChange={(e) => update((s) => ({ ...s, reminders: { ...s.reminders, time: e.target.value || '18:30' } }))} style={{ marginTop: 4 }} />
          </label>
          <label className="t-xs c3 grow">
            Avviso (minuti prima)
            <input
              className="input"
              inputMode="numeric"
              aria-label="Minuti di anticipo dell’avviso"
              defaultValue={settings.reminders.minutesBefore}
              style={{ marginTop: 4 }}
              onBlur={(e) => update((s) => ({ ...s, reminders: { ...s.reminders, minutesBefore: Math.max(0, Math.min(240, Math.round(Number(e.target.value)) || 0)) } }))}
            />
          </label>
        </div>
        {__PREVIEW__ ? (
          <Notice>Nell’anteprima dentro Claude il download è bloccato.</Notice>
        ) : (
          <button
            className="btn primary block"
            onClick={async () => {
              const how = await deliverFile('forma-lab-allenamenti.ics', remindersIcs(settings), 'text/calendar');
              toast(how === 'shared' ? 'Scegli Calendario per aggiungerli' : 'File scaricato: aprilo per aggiungerli al calendario');
            }}
          >
            <BellRing size={17} /> Aggiungi al calendario
          </button>
        )}
        <p className="t-xs c3" style={{ margin: 0 }}>
          Eventi ricorrenti ogni settimana (Lun, Mar, Gio, Ven). Se sposti un allenamento in FORMA LAB, il calendario del telefono non si aggiorna da solo.
        </p>
      </div>
    </Section>
  );
}

function CsvExport() {
  const { sessions, settings } = useData();
  if (__PREVIEW__) return null;
  return (
    <button
      className="btn block mt8"
      onClick={async () => {
        const how = await deliverFile(`forma-lab-serie-${new Date().toISOString().slice(0, 10)}.csv`, setsCsv(sessions, settings), 'text/csv');
        toast(how === 'shared' ? 'File CSV pronto' : 'File CSV scaricato');
      }}
    >
      <FileSpreadsheet size={17} /> Esporta tutte le serie (CSV per Excel/Numbers)
    </button>
  );
}
