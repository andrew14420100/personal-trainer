// 5.0 first-run tour: one step per area, with a button that opens it. Skippable, reopenable from "Altro".
import { useState } from 'react';
import { CalendarDays, Dumbbell, Home, LayoutGrid, LineChart, Sparkles } from 'lucide-react';
import { useSettingsUpdater } from '../app/store';
import { navigate } from '../lib/router';
import { Sheet } from './kit';

const STEPS: [typeof Home, string, string, string][] = [
  [Sparkles, 'Benvenuto in FORMA LAB 5.0', 'La tua app di allenamento, privata e in italiano. Tutti i dati restano sul tuo dispositivo; ecco dove trovi ogni cosa.', '/'],
  [Home, 'Oggi', 'L’allenamento del giorno con “Inizia oggi” e una dashboard di widget che puoi riordinare o nascondere (tocca “Personalizza”).', '/'],
  [CalendarDays, 'Agenda', 'Il tuo giorno con la settimana sempre visibile. Se salti un allenamento viene spostato al primo giorno libero, e puoi annullare. Puoi aggiungere impegni personali.', '/agenda'],
  [Dumbbell, 'Allenati', 'La scheda dei 4 giorni (modificabile), le tue schede in cartelle, l’allenamento libero e la libreria. In seduta: serie, recupero automatico, superserie, record.', '/allenamenti'],
  [LineChart, 'Progressi', 'Grafici, record, mappa muscolare, report mensili e annuali, corpo e misure: tutto calcolato solo dai tuoi dati.', '/progressi'],
  [LayoutGrid, 'Altro', 'Aspetto (tema chiaro/scuro, testo, modalità Palestra, barra inferiore), strumenti, videoteca, backup e privacy.', '/altro'],
];

export function Tour() {
  const update = useSettingsUpdater();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
    void update((s) => ({ ...s, tourDone: true }));
  };
  const [Icon, title, body, to] = STEPS[i];
  return (
    <Sheet open={open} onClose={close} label="Tour iniziale">
      <div className="col" style={{ alignItems: 'stretch' }}>
        <div className="row spread">
          <span className="t-label">
            {i + 1} di {STEPS.length}
          </span>
          <button className="link" onClick={close}>
            Salta
          </button>
        </div>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--grad-ink)', display: 'grid', placeItems: 'center', color: '#fff' }}>
          <Icon size={28} />
        </div>
        <h3 className="t-h1">{title}</h3>
        <p className="t-sm c2" style={{ margin: 0 }}>
          {body}
        </p>
        <div className="row" aria-hidden style={{ gap: 6, justifyContent: 'center' }}>
          {STEPS.map((_, k) => (
            <span key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 3, background: k === i ? 'var(--accent)' : 'var(--s3)', transition: 'width .3s' }} />
          ))}
        </div>
        <div className="row">
          {i > 0 && (
            <button className="btn grow" onClick={() => setI(i - 1)}>
              Indietro
            </button>
          )}
          {i < STEPS.length - 1 ? (
            <button
              className="btn primary grow"
              onClick={() => {
                setI(i + 1);
                navigate(STEPS[i + 1][3]);
              }}
            >
              Avanti
            </button>
          ) : (
            <button
              className="btn primary grow"
              onClick={() => {
                close();
                navigate(to === '/altro' ? '/' : to);
              }}
            >
              Inizia
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
