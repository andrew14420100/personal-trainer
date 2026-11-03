// 5.0 "Altro": every secondary area in one clear list, plus appearance settings.
import { Calculator, ChevronRight, Database, Dumbbell, HelpCircle, Library, Ruler, Settings2, Video } from 'lucide-react';
import { useData, useSettingsUpdater } from '../app/store';
import { navigate } from '../lib/router';
import { AppBar, Section, Seg, Switch } from './kit';
import { TAB_PRESETS } from './Shell';

const LINKS: [typeof Library, string, string, string][] = [
  [Library, 'Libreria esercizi', 'Ricerca, filtri, preferiti, esercizi tuoi', '/libreria'],
  [Dumbbell, 'Schede e allenamento libero', 'Le tue schede, cartelle, modelli', '/allenamenti'],
  [Ruler, 'Corpo e misure', 'Peso, circonferenze, foto, obiettivi', '/progressi?tab=corpo'],
  [Calculator, 'Strumenti', 'Dischi, massimale, percentuali', '/strumenti'],
  [Video, 'Videoteca', 'Stato dei video per ogni esercizio', '/videoteca'],
  [Database, 'Dati, backup e privacy', 'Esporta, importa, CSV, promemoria', '/profilo'],
  [Settings2, 'Impostazioni allenamento', 'Unità, RPE, recuperi, riscaldamento', '/profilo'],
];

export function More() {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const preset = TAB_PRESETS.find((p) => p.tabs.join() === settings.tabs.join())?.id ?? 'standard';
  return (
    <main className="page">
      <AppBar title="Altro" />
      <div className="list">
        {LINKS.map(([Icon, title, sub, to]) => (
          <button key={title} className="list-row" onClick={() => navigate(to)}>
            <Icon size={20} color="var(--accent)" />
            <span className="grow">
              <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                {title}
              </span>
              <span className="t-xs c3">{sub}</span>
            </span>
            <ChevronRight size={18} className="c3" />
          </button>
        ))}
        <button className="list-row" onClick={() => update((s) => ({ ...s, tourDone: false })).then(() => navigate('/'))}>
          <HelpCircle size={20} color="var(--accent)" />
          <span className="grow">
            <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
              Rivedi il tour iniziale
            </span>
            <span className="t-xs c3">Una panoramica di tutte le sezioni</span>
          </span>
          <ChevronRight size={18} className="c3" />
        </button>
      </div>

      <Section title="Aspetto">
        <div className="card col">
          <div>
            <div className="t-label">Tema</div>
            <div className="mt8">
              <Seg
                label="Tema"
                value={settings.theme}
                onChange={(v) => update((s) => ({ ...s, theme: v }))}
                options={[
                  { value: 'auto', label: 'Automatico' },
                  { value: 'light', label: 'Chiaro' },
                  { value: 'dark', label: 'Scuro' },
                ]}
              />
            </div>
          </div>
          <div>
            <div className="t-label">Dimensione del testo</div>
            <div className="mt8">
              <Seg
                label="Dimensione del testo"
                value={settings.textSize}
                onChange={(v) => update((s) => ({ ...s, textSize: v }))}
                options={[
                  { value: 's', label: 'Piccolo' },
                  { value: 'm', label: 'Normale' },
                  { value: 'l', label: 'Grande' },
                ]}
              />
            </div>
          </div>
          <div className="row">
            <span className="grow">
              <span className="t-sm" style={{ display: 'block', fontWeight: 650 }}>
                Modalità Palestra
              </span>
              <span className="t-xs c3">Contrasto più alto e controlli più grandi</span>
            </span>
            <Switch checked={settings.gymMode} onChange={(v) => update((s) => ({ ...s, gymMode: v }))} label="Modalità Palestra" />
          </div>
          <div>
            <div className="t-label">Barra inferiore</div>
            <select className="input mt8" aria-label="Configurazione della barra inferiore" value={preset} onChange={(e) => update((s) => ({ ...s, tabs: TAB_PRESETS.find((p) => p.id === e.target.value)!.tabs }))}>
              {TAB_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>
    </main>
  );
}
