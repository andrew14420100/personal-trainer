// PREVIEW ONLY banner: makes it impossible to confuse the Claude preview with the published app.
import { useState } from 'react';
import { Sheet, toast } from '../components/ui';
import { wipeAll } from '../lib/db';
import { loadSamples } from './samples';

export function PreviewBar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'block',
          width: '100%',
          border: 0,
          padding: 'calc(env(safe-area-inset-top, 0px) + 7px) 16px 7px',
          background: 'var(--progress)',
          color: '#1a1205',
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          minHeight: 34,
        }}
      >
        Anteprima in Claude · non è l’app pubblicata — dettagli
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Informazioni sull’anteprima">
        <div className="stack small text-2">
          <h3 className="display h3" style={{ color: 'var(--text)' }}>
            Anteprima interattiva
          </h3>
          <p>Questa è una copia di prova dell’interfaccia, eseguita dentro Claude. Le interazioni sono reali (registro, timer, grafici, impostazioni) ma con questi limiti:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>i video YouTube non possono essere incorporati qui: il player mostra il collegamento alla fonte originale;</li>
            <li>niente accesso protetto, service worker, modalità offline né installazione nella schermata Home;</li>
            <li>i dati restano solo in questo browser, separati dall’app pubblicata; esportazione e download dei backup sono bloccati;</li>
            <li>niente suoni né schermo sempre acceso garantiti.</li>
          </ul>
          <p>Per esplorare i grafici puoi caricare sedute di esempio: sono marcate “[ESEMPIO]” e non sono risultati reali.</p>
          <button
            className="btn primary block"
            onClick={async () => {
              const n = await loadSamples();
              setOpen(false);
              toast(`${n} sedute di ESEMPIO caricate`);
            }}
          >
            Carica sedute di esempio
          </button>
          <button
            className="btn danger block"
            onClick={async () => {
              await wipeAll();
              setOpen(false);
              toast('Dati dell’anteprima cancellati');
            }}
          >
            Cancella i dati dell’anteprima
          </button>
        </div>
      </Sheet>
    </>
  );
}
