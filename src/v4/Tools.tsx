// 4.1 tools: plate calculator, 1RM estimate with percentage table.
import { useState } from 'react';
import { useData, useSettingsUpdater } from '../app/store';
import { e1rm } from '../lib/stats';
import { num } from '../lib/format';
import { NavBar, Section } from './kit';

/** Greedy plate breakdown per side with the available plates. Returns null if not reachable exactly. */
export function plateBreakdown(total: number, bar: number, available: number[]): { plates: number[]; rest: number } {
  let side = (total - bar) / 2;
  const plates: number[] = [];
  if (side <= 0) return { plates, rest: Math.max(0, side) };
  for (const p of [...available].sort((a, b) => b - a)) {
    while (side >= p - 1e-9) {
      plates.push(p);
      side = Math.round((side - p) * 1000) / 1000;
    }
  }
  return { plates, rest: side };
}

export function PlateCalc({ initial }: { initial?: number | null }) {
  const { settings } = useData();
  const update = useSettingsUpdater();
  const [w, setW] = useState(initial ? String(initial).replace('.', ',') : '60');
  const total = Number(w.replace(',', '.')) || 0;
  const { bar, available } = settings.plates;
  const r = plateBreakdown(total, bar, available);
  const ALL = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5];
  return (
    <div className="col">
      <div className="row">
        <label className="t-xs c3 grow">
          Peso totale (kg)
          <input className="input" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} style={{ marginTop: 4, fontSize: 20, fontWeight: 700 }} aria-label="Peso totale" />
        </label>
        <label className="t-xs c3" style={{ width: 110 }}>
          Bilanciere (kg)
          <input
            className="input"
            inputMode="decimal"
            defaultValue={bar}
            style={{ marginTop: 4 }}
            aria-label="Peso del bilanciere"
            onBlur={(e) => update((s) => ({ ...s, plates: { ...s.plates, bar: Math.max(0, Number(e.target.value.replace(',', '.')) || 0) } }))}
          />
        </label>
      </div>
      <div className="card inset">
        <div className="t-label">Per lato</div>
        {total <= bar ? (
          <p className="t-sm c2" style={{ margin: '6px 0 0' }}>Solo bilanciere (o peso inferiore al bilanciere).</p>
        ) : (
          <>
            <div className="chips mt8">
              {r.plates.map((p, i) => (
                <span key={i} className="chip accent" style={{ height: 30, fontSize: 14 }}>
                  {num(p, 2)}
                </span>
              ))}
            </div>
            {r.rest > 0 && <p className="t-xs c-bad mt8">Con i dischi disponibili mancano {num(r.rest, 2)} kg per lato.</p>}
          </>
        )}
      </div>
      <div>
        <div className="t-label">Dischi disponibili in palestra</div>
        <div className="chips mt8">
          {ALL.map((p) => {
            const on = available.includes(p);
            return (
              <button key={p} className={`chip${on ? ' accent' : ''}`} aria-pressed={on} onClick={() => update((s) => ({ ...s, plates: { ...s.plates, available: on ? s.plates.available.filter((x) => x !== p) : [...s.plates.available, p] } }))}>
                {num(p, 2)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function OneRmCalc({ weight, reps }: { weight?: number | null; reps?: number | null }) {
  const [w, setW] = useState(weight ? String(weight).replace('.', ',') : '');
  const [r, setR] = useState(reps ? String(reps) : '');
  const W = Number(w.replace(',', '.')) || 0;
  const R = Math.round(Number(r)) || 0;
  const est = R > 0 && R <= 12 ? e1rm(W, R) : 0;
  return (
    <div className="col">
      <div className="row">
        <label className="t-xs c3 grow">
          Carico (kg)
          <input className="input" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} style={{ marginTop: 4 }} aria-label="Carico sollevato" />
        </label>
        <label className="t-xs c3 grow">
          Ripetizioni
          <input className="input" inputMode="numeric" value={r} onChange={(e) => setR(e.target.value)} style={{ marginTop: 4 }} aria-label="Ripetizioni eseguite" />
        </label>
      </div>
      {est > 0 ? (
        <>
          <div className="stat">
            <div className="t-label">Massimale stimato (Epley)</div>
            <div className="v c-data">{num(est, 1)} kg</div>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>%</th>
                <th>Carico</th>
                <th>Rip. indicative</th>
              </tr>
            </thead>
            <tbody>
              {[95, 90, 85, 80, 75, 70, 65, 60].map((p, i) => (
                <tr key={p}>
                  <td>{p}%</td>
                  <td>{num(Math.round((est * p) / 100 / 1.25) * 1.25, 2)} kg</td>
                  <td>{[2, 4, 6, 8, 10, 12, 15, 20][i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="t-xs c3" style={{ margin: 0 }}>Stima indicativa, valida con 1–12 ripetizioni. Non è un test di massimale.</p>
        </>
      ) : (
        <p className="t-sm c3" style={{ margin: 0 }}>Inserisci carico e ripetizioni (1–12) di una serie impegnativa.</p>
      )}
    </div>
  );
}

export function Tools() {
  return (
    <main className="page">
      <NavBar title="Strumenti" fallback="/allenamenti" />
      <h1 className="t-h1">Strumenti</h1>
      <Section title="Calcolatore dischi">
        <div className="card">
          <PlateCalc />
        </div>
      </Section>
      <Section title="Massimale (1RM) e percentuali">
        <div className="card">
          <OneRmCalc />
        </div>
      </Section>
    </main>
  );
}
