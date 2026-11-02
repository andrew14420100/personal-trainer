import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Trash2, Shield, Smartphone, HardDrive, LogOut, Info, Lock } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { DAYS, SLOTS, SLOT_VARIANTS } from '../data/program';
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import { PHOTOS } from '../data/media';
import { restore, snapshot, wipeAll } from '../lib/db';
import { backupFileName, decryptBackup, deliverFile, encryptBackup, isEncrypted, makeBackup, validateBackup, type EncryptedBackup } from '../lib/backup';
import { CALIBRATION_SESSIONS } from '../lib/plan';
import { wakeLockSupported } from '../lib/wakelock';
import { timer } from '../lib/timer';
import { ConfirmSheet, Notice, Section, Segmented, Sheet, Switch, toast } from '../components/ui';
import type { Settings as S } from '../lib/settings';

const isStandalone = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function Settings() {
  const { settings, sessions, measurements } = useData();
  const update = useSettingsUpdater();
  const [name, setName] = useState(settings.name);
  useEffect(() => setName(settings.name), [settings.name]);
  const set = <K extends keyof S>(k: K, v: S[K]) => update((s) => ({ ...s, [k]: v }));

  return (
    <main className="screen">
      <div className="brandbar">
        <div className="brand">
          FORMA<b>·</b>LAB
        </div>
      </div>
      <h1 className="display h1" style={{ marginTop: 12 }}>
        Profilo
      </h1>

      <Section title="Personale">
        <div className="field">
          <label htmlFor="name">Nome per il saluto</label>
          <input id="name" className="input" value={name} autoComplete="given-name" onChange={(e) => setName(e.target.value)} onBlur={() => set('name', name.trim())} placeholder="Il tuo nome" />
        </div>
      </Section>

      <Section title="Allenamento">
        <div className="card tight flat">
          <div className="label">Settimana di calibrazione (volume ridotto)</div>
          <div style={{ marginTop: 8 }}>
            <Segmented
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
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Automatica: attiva per le prime {CALIBRATION_SESSIONS} sedute completate. Gli esercizi da 3 serie si eseguono con 2.
          </p>
          <div className="setting-row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Timer di recupero automatico</div>
              <div className="small muted">Parte quando segni una serie come completata</div>
            </div>
            <Switch checked={settings.autoRest} onChange={(v) => set('autoRest', v)} label="Timer automatico" />
          </div>
          <div className="setting-row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Segnale acustico</div>
              <div className="small muted">Solo con l’app aperta: iOS non permette suoni o notifiche locali in background</div>
            </div>
            <Switch checked={settings.sound} onChange={(v) => set('sound', v)} label="Segnale acustico" />
          </div>
          <div className="setting-row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Schermo sempre acceso</div>
              <div className="small muted">{wakeLockSupported() ? 'Durante l’allenamento (Screen Wake Lock)' : 'Non supportato da questo browser'}</div>
            </div>
            <Switch checked={settings.keepAwake && wakeLockSupported()} onChange={(v) => set('keepAwake', v)} label="Schermo sempre acceso" />
          </div>
          <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => timer.start(5, 'Prova timer')}>
            Prova il timer (5 s)
          </button>
        </div>
      </Section>

      <Section title="Video e animazioni">
        <div className="card tight flat">
          <div className="setting-row" style={{ paddingTop: 0 }}>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Avvio automatico</div>
              <div className="small muted">Le dimostrazioni partono da sole, senza audio, e si ripetono in loop</div>
            </div>
            <Switch checked={settings.video.autoplay} onChange={(v) => set('video', { ...settings.video, autoplay: v })} label="Avvio automatico video" />
          </div>
          <div className="setting-row">
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Didascalie ✕ / ✓</div>
              <div className="small muted">Etichette di fase e descrizione dell’errore sul video</div>
            </div>
            <Switch checked={settings.video.labels} onChange={(v) => set('video', { ...settings.video, labels: v })} label="Didascalie sul video" />
          </div>
          <div className="label" style={{ marginTop: 12 }}>
            Modalità iniziale nella pagina esercizio
          </div>
          <div style={{ marginTop: 6 }}>
            <Segmented
              label="Modalità iniziale"
              value={settings.video.defaultMode}
              onChange={(v) => set('video', { ...settings.video, defaultMode: v })}
              options={[
                { value: 'quick', label: 'Dimostrazione' },
                { value: 'errors', label: 'Errori e correzioni' },
              ]}
            />
          </div>
          <div className="label" style={{ marginTop: 12 }}>
            Velocità predefinita
          </div>
          <div style={{ marginTop: 6 }}>
            <Segmented
              label="Velocità"
              value={String(settings.video.speed) as '1' | '0.5'}
              onChange={(v) => set('video', { ...settings.video, speed: Number(v) })}
              options={[
                { value: '1', label: 'Normale' },
                { value: '0.5', label: 'Rallentata ½×' },
              ]}
            />
          </div>
          <p className="tiny muted" style={{ marginTop: 10 }}>
            I video non hanno audio. Notifiche: iOS non consente a un’app web di inviare notifiche locali a fine recupero; il segnale suona solo con l’app aperta.
          </p>
        </div>
      </Section>

      <PlanEditor />

      <Section title="I tuoi dati">
        <StorageInfo sessions={sessions.length} measurements={measurements.length} />
        <BackupTools />
      </Section>

      <Section title="Privacy e accesso">
        <div className="card tight flat stack small text-2" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, color: 'var(--text)', fontWeight: 700 }}>
            <Shield size={18} color="var(--right)" /> Dove sono salvati i dati
          </div>
          <p>
            Allenamenti, misure, note e impostazioni sono salvati <b>solo su questo dispositivo</b>, nel database del browser (IndexedDB) dell’indirizzo in cui hai installato l’app. Nessun server li riceve:
            non c’è sincronizzazione automatica tra iPhone e PC. Usa il backup qui sopra per spostarli o conservarli.
          </p>
          <p>
            Su iPhone l’app installata nella schermata Home ha un archivio <b>separato</b> da Safari: registra sempre dall’icona dell’app. iOS protegge i dati con la crittografia del dispositivo quando
            l’iPhone è bloccato.
          </p>
          <p>Nessuna pubblicità, nessun sistema di analisi o tracciamento. I video vengono caricati da YouTube (modalità privacy avanzata, youtube-nocookie.com) solo quando premi play.</p>
          {!__PREVIEW__ && (
            <a className="btn sm" href="/__auth/logout" style={{ alignSelf: 'flex-start' }}>
              <LogOut size={16} /> Esci (termina la sessione di accesso)
            </a>
          )}
        </div>
      </Section>

      <Section title="Installazione su iPhone">
        <div className="card tight flat stack small text-2" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 8, color: 'var(--text)', fontWeight: 700 }}>
            <Smartphone size={18} /> {isStandalone() ? 'App installata: stai usando la versione Home' : 'Non ancora installata'}
          </div>
          {!isStandalone() && (
            <ol className="steps">
              <li>Apri l’indirizzo privato di FORMA LAB in Safari ed effettua l’accesso.</li>
              <li>Tocca il pulsante Condividi (quadrato con la freccia).</li>
              <li>Scegli “Aggiungi alla schermata Home”, poi “Aggiungi”.</li>
              <li>Apri FORMA LAB dall’icona: funzionerà a schermo intero e offline.</li>
            </ol>
          )}
        </div>
      </Section>

      <Section title="Crediti e licenze">
        <div className="card tight flat small text-2 stack" style={{ gap: 8 }}>
          <p>Fotografie da Wikimedia Commons, ridimensionate e compresse per l’app:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
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
          <p>Video: proprietà dei rispettivi autori su YouTube, incorporati con il player ufficiale. Caratteri: Inter e Archivio (SIL Open Font License). Icone: Lucide (ISC).</p>
          <p className="tiny muted">
            <Info size={12} style={{ verticalAlign: '-2px' }} /> Le indicazioni tecniche hanno scopo informativo e non sostituiscono il parere di un medico o di un professionista dell’esercizio. Versione 2.0 ·
            build {__BUILD_DATE__}
            {__PREVIEW__ ? ' · ANTEPRIMA' : ''}
          </p>
        </div>
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
  return (
    <Section title="Scheda e recuperi" action={<button className="link" onClick={() => setOpen(true)}>Modifica</button>}>
      <p className="small text-2">
        Serie, ripetizioni e recuperi sono modificabili. {count ? `${count} personalizzazioni attive.` : 'Nessuna personalizzazione: stai usando la scheda originale.'}
      </p>
      <Sheet open={open} onClose={() => setOpen(false)} label="Modifica scheda">
        <h3 className="display h3">Modifica scheda</h3>
        <p className="small text-2" style={{ margin: '6px 0 12px' }}>
          I valori originali sono indicati tra parentesi. Lascia vuoto per usare l’originale.
        </p>
        {DAYS.map((d) => (
          <div key={d.id} style={{ marginBottom: 16 }}>
            <div className="eyebrow" style={{ color: d.accent, marginBottom: 8 }}>
              {d.weekdayLabel} · {d.name}
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {SLOTS.filter((s) => s.dayId === d.id).map((s) => {
                const o = settings.slotOverrides[s.id] ?? {};
                const exId = o.exerciseId ?? s.exerciseId;
                const num = (v: string) => (v.trim() === '' ? undefined : Math.max(1, Math.min(10, Math.round(Number(v)))) || undefined);
                return (
                  <div key={s.id} className="card tight flat">
                    <div style={{ fontWeight: 650 }}>
                      {s.order}. {EXERCISE_BY_ID[exId].name}
                    </div>
                    {SLOT_VARIANTS[s.id] && (
                      <select className="input" style={{ marginTop: 8 }} value={exId} onChange={(e) => setOverride(s.id, { exerciseId: e.target.value === s.exerciseId ? undefined : e.target.value })} aria-label="Variante">
                        {SLOT_VARIANTS[s.id].map((v) => (
                          <option key={v} value={v}>
                            {EXERCISE_BY_ID[v].name}
                            {v === s.exerciseId ? ' (predefinita)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                      <div className="field">
                        <label>Serie ({s.sets})</label>
                        <input className="input" inputMode="numeric" defaultValue={o.sets ?? ''} placeholder={String(s.sets)} onBlur={(e) => setOverride(s.id, { sets: num(e.target.value) })} />
                      </div>
                      <div className="field">
                        <label>Min ({s.repsMin})</label>
                        <input className="input" inputMode="numeric" defaultValue={o.repsMin ?? ''} placeholder={String(s.repsMin)} onBlur={(e) => setOverride(s.id, { repsMin: e.target.value.trim() ? Math.max(1, Number(e.target.value) || s.repsMin) : undefined })} />
                      </div>
                      <div className="field">
                        <label>Max ({s.repsMax})</label>
                        <input className="input" inputMode="numeric" defaultValue={o.repsMax ?? ''} placeholder={String(s.repsMax)} onBlur={(e) => setOverride(s.id, { repsMax: e.target.value.trim() ? Math.max(1, Number(e.target.value) || s.repsMax) : undefined })} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Recuperi (secondi)
        </div>
        <div className="stack" style={{ gap: 6 }}>
          {EXERCISES.map((e) => (
            <div key={e.id} className="row between">
              <span className="small grow">{e.name}</span>
              <input
                className="input"
                style={{ width: 90, minHeight: 40 }}
                inputMode="numeric"
                aria-label={`Recupero ${e.name}`}
                defaultValue={settings.restOverrides[e.id] ?? ''}
                placeholder={String(e.restSec)}
                onBlur={(ev) =>
                  update((s) => {
                    const r = { ...s.restOverrides };
                    const v = Math.round(Number(ev.target.value));
                    if (ev.target.value.trim() && v >= 10 && v <= 600) r[e.id] = v;
                    else delete r[e.id];
                    return { ...s, restOverrides: r };
                  })
                }
              />
            </div>
          ))}
        </div>
        <button
          className="btn block ghost"
          style={{ marginTop: 16 }}
          onClick={() => update((s) => ({ ...s, slotOverrides: {}, restOverrides: {} })).then(() => { setOpen(false); toast('Scheda originale ripristinata'); })}
        >
          Ripristina scheda originale
        </button>
        <button className="btn block primary" style={{ marginTop: 8 }} onClick={() => setOpen(false)}>
          Fatto
        </button>
      </Sheet>
    </Section>
  );
}

function StorageInfo({ sessions, measurements }: { sessions: number; measurements: number }) {
  const [est, setEst] = useState<{ usage?: number; quota?: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.estimate?.().then(setEst).catch(() => {});
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
  }, []);
  return (
    <div className="card tight flat" style={{ marginBottom: 10 }}>
      <div className="row" style={{ gap: 8, fontWeight: 700 }}>
        <HardDrive size={18} /> Archivio locale
      </div>
      <div className="small text-2" style={{ marginTop: 6 }}>
        {sessions} sessioni · {measurements} misurazioni
        {est?.usage != null && ` · ${(est.usage / 1024).toFixed(0)} KB usati`}
      </div>
      <div className="small text-2" style={{ marginTop: 4 }}>
        Archiviazione persistente: {persisted == null ? 'non verificabile' : persisted ? 'concessa' : 'non concessa'}
        {persisted === false && (
          <button
            className="link"
            style={{ marginLeft: 6 }}
            onClick={() => navigator.storage?.persist?.().then((p) => {
              setPersisted(p);
              toast(p ? 'Archiviazione persistente concessa' : 'Il browser non l’ha concessa: fai backup regolari');
            })}
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
      const raw = JSON.parse(await f.text());
      setPending({ raw });
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
    <div className="card tight flat stack" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 8, fontWeight: 700 }}>
        <Download size={18} /> Esporta backup
      </div>
      <div className="setting-row" style={{ paddingTop: 0 }}>
        <div className="grow">
          <div style={{ fontWeight: 600 }}>
            <Lock size={14} style={{ verticalAlign: '-2px' }} /> Cifra con passphrase
          </div>
          <div className="small muted">AES-256-GCM. Senza passphrase il file non è leggibile da nessuno, nemmeno da te.</div>
        </div>
        <Switch checked={encrypt} onChange={setEncrypt} label="Cifra il backup" />
      </div>
      {encrypt && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input className="input" type="password" autoComplete="new-password" placeholder="Passphrase" value={pass} onChange={(e) => setPass(e.target.value)} aria-label="Passphrase" />
          <input className="input" type="password" autoComplete="new-password" placeholder="Ripeti" value={pass2} onChange={(e) => setPass2(e.target.value)} aria-label="Ripeti passphrase" />
        </div>
      )}
      {__PREVIEW__ ? (
        <Notice kind="info">Nell’anteprima dentro Claude il download dei file è bloccato: l’esportazione funziona nell’app pubblicata.</Notice>
      ) : (
        <button className="btn primary block" disabled={busy} onClick={doExport}>
          <Download size={18} /> Esporta tutti i dati
        </button>
      )}
      <p className="tiny muted">Consiglio: salva il file in iCloud Drive o su un altro dispositivo una volta a settimana. Il backup cifrato è adatto anche a cloud di terze parti.</p>

      <div className="divider" />
      <div className="row" style={{ gap: 8, fontWeight: 700 }}>
        <Upload size={18} /> Importa backup
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" id="import-file" onChange={(e) => onFile(e.target.files?.[0])} />
      <label htmlFor="import-file" className="btn block">
        <Upload size={18} /> Scegli file…
      </label>

      <div className="divider" />
      <button className="btn danger block" onClick={() => setWipe(true)}>
        <Trash2 size={18} /> Cancella tutti i dati personali
      </button>

      <Sheet open={!!pending} onClose={() => setPending(null)} label="Importa backup">
        <div className="stack">
          <h3 className="display h3">Importa backup</h3>
          {pending && isEncrypted(pending.raw) && (
            <input className="input" type="password" placeholder="Passphrase del backup" value={importPass} onChange={(e) => setImportPass(e.target.value)} aria-label="Passphrase del backup" autoFocus />
          )}
          <Segmented
            label="Modalità di importazione"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'merge', label: 'Unisci' },
              { value: 'replace', label: 'Sostituisci tutto' },
            ]}
          />
          <p className="small text-2">{mode === 'merge' ? 'Aggiunge i dati del file a quelli presenti (gli elementi con lo stesso identificativo vengono aggiornati).' : 'Cancella i dati attuali e li sostituisce con quelli del file.'}</p>
          {mode === 'replace' && <Notice>I dati attuali su questo dispositivo andranno persi.</Notice>}
          <button className="btn primary block" disabled={busy} onClick={doImport}>
            Importa
          </button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={wipe}
        onClose={() => setWipe(false)}
        title="Cancellare tutti i dati?"
        body="Allenamenti, misure, note, preferiti e impostazioni verranno eliminati da questo dispositivo. Esporta prima un backup se vuoi conservarli."
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
