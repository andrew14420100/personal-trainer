import { useEffect } from 'react';
import { useRoute } from '../lib/router';
import { useData } from './store';
import { TabBar, TimerPill } from '../components/Shell';
import { ToastHost, Notice } from '../components/ui';
import { Home } from '../screens/Home';
import { Program, DayScreen, NotFound } from '../screens/Program';
import { ExerciseDetail } from '../screens/ExerciseDetail';
import { Workout } from '../screens/Workout';
import { Summary } from '../screens/Summary';
import { Progress } from '../screens/Progress';
import { Videos } from '../screens/Videos';
import { Settings } from '../screens/Settings';
import { UpdatePrompt } from '../components/UpdatePrompt';
import { PreviewBar } from '../preview/PreviewBar';
import type { DayId } from '../data/types';

export function App() {
  const { path, query } = useRoute();
  const data = useData();
  const root = path[0] ?? '';
  const inWorkout = root === 'allenamento';

  useEffect(() => {
    // Ask the browser to keep local data (best effort; Home Screen apps on iOS are already exempt
    // from Safari's 7-day storage cap).
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  let screen: JSX.Element;
  switch (root) {
    case '':
      screen = <Home />;
      break;
    case 'scheda':
      screen = <Program />;
      break;
    case 'giorno':
      screen = <DayScreen dayId={path[1] as DayId} />;
      break;
    case 'esercizio':
      screen = <ExerciseDetail id={path[1]} slotId={query.get('slot') ?? undefined} />;
      break;
    case 'allenamento':
      screen = <Workout />;
      break;
    case 'riepilogo':
    case 'sessione':
      screen = <Summary id={path[1]} />;
      break;
    case 'progressi':
      screen = <Progress />;
      break;
    case 'video':
      screen = <Videos />;
      break;
    case 'impostazioni':
      screen = <Settings />;
      break;
    default:
      screen = <NotFound />;
  }

  return (
    <div className="app">
      {__PREVIEW__ && !inWorkout && <PreviewBar />}
      {data.error && (
        <div style={{ padding: 'calc(var(--safe-t) + 12px) 16px 0', maxWidth: 560, margin: '0 auto' }}>
          <Notice>
            Archivio locale non disponibile: {data.error}. In navigazione privata o con i dati dei siti bloccati i dati non possono essere salvati.
          </Notice>
        </div>
      )}
      <div key={root + (path[1] ?? '')}>{screen}</div>
      {!inWorkout && <TabBar />}
      <TimerPill inWorkout={inWorkout} />
      <ToastHost />
      <UpdatePrompt />
    </div>
  );
}
