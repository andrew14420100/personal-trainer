import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/v4.css';
import { App } from './app/App';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
