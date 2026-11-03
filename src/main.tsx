import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/v4.css';
import { App } from './app/App';
import { ErrorBoundary } from './components/ErrorBoundary';

import { loadExtendedCatalog } from './data/ext';

// The extended exercise catalog is registered before the first render so that history referring
// to those exercises always resolves (it is a local chunk, precached for offline use).
void loadExtendedCatalog().catch(() => {}).finally(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
));
