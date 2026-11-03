// Shows a readable message instead of a black screen if a screen crashes while rendering.
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="page bare">
        <div className="brand" style={{ marginBottom: 20 }}>
          FORMA<b>·</b>LAB
        </div>
        <h1 className="t-h1">Qualcosa non ha funzionato</h1>
        <p className="c2" style={{ marginTop: 10 }}>
          I tuoi dati sono salvati sul dispositivo e non sono stati toccati. Prova a ricaricare; se l’errore resta, inviami il testo qui sotto.
        </p>
        <pre className="card tight flat small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 14 }}>
          {String(this.state.error?.stack || this.state.error)}
        </pre>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={() => location.reload()}>
            Ricarica
          </button>
          <button className="btn" onClick={() => ((location.hash = '#/'), this.setState({ error: null }))}>
            Torna a Oggi
          </button>
        </div>
      </main>
    );
  }
}
