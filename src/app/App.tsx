import { useEffect } from 'react';
import { useRoute } from '../lib/router';
import { ensureMigration } from '../lib/migration';
import { useData } from './store';
import { Home } from '../v4/Home';
import { Plan, DayView } from '../v4/Plan';
import { Exercise } from '../v4/Exercise';
import { Workout } from '../v4/Workout';
import { SessionView } from '../v4/SessionView';
import { Calendar } from '../v4/Calendar';
import { Progress } from '../v4/Progress';
import { Profile } from '../v4/Profile';
import { Videos } from '../v4/Videos';
import { DayEditor, Library, RoutineEditor, RoutineView } from '../v4/Routines';
import { Tools } from '../v4/Tools';
import { RestBar, TabBar } from '../v4/Shell';
import { Empty, Notice, ToastHost } from '../v4/kit';
import { UpdatePrompt } from '../components/UpdatePrompt';
import { PreviewBar } from '../preview/PreviewBar';
import { navigate } from '../lib/router';
import type { DayId } from '../data/types';
import { Compass } from 'lucide-react';

// Old 2.0/3.0 paths kept working (bookmarks, installed app history).
const ALIASES: Record<string, string> = { scheda: 'allenamenti', impostazioni: 'profilo', riepilogo: 'sessione', video: 'videoteca' };

export function App() {
  const { path, query } = useRoute();
  const data = useData();
  const root = ALIASES[path[0] ?? ''] ?? path[0] ?? '';
  const inWorkout = root === 'allenamento';

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
    // Verified safety copy of the previous version's data before the first 4.0 use (never deletes anything).
    ensureMigration().catch(() => {});
  }, []);

  let screen: JSX.Element;
  switch (root) {
    case '':
      screen = <Home />;
      break;
    case 'allenamenti':
      screen = <Plan />;
      break;
    case 'giorno':
      screen = path[2] === 'modifica' ? <DayEditor dayId={path[1] as DayId} /> : <DayView dayId={path[1] as DayId} />;
      break;
    case 'routine':
      screen = path[1] === 'nuova' ? <RoutineEditor /> : path[2] === 'modifica' ? <RoutineEditor id={path[1]} /> : <RoutineView id={path[1]} />;
      break;
    case 'libreria':
      screen = <Library />;
      break;
    case 'strumenti':
      screen = <Tools />;
      break;
    case 'esercizio':
      screen = <Exercise id={path[1]} slotId={query.get('slot') ?? undefined} />;
      break;
    case 'allenamento':
      screen = <Workout />;
      break;
    case 'sessione':
      screen = <SessionView id={path[1]} justFinished={query.get('fine') === '1'} />;
      break;
    case 'calendario':
      screen = <Calendar />;
      break;
    case 'progressi':
      screen = <Progress />;
      break;
    case 'profilo':
      screen = <Profile />;
      break;
    case 'videoteca':
      screen = <Videos />;
      break;
    default:
      screen = (
        <main className="page">
          <Empty
            icon={<Compass size={22} />}
            title="Pagina non trovata"
            action={
              <button className="btn primary" onClick={() => navigate('/', { replace: true })}>
                Vai a Oggi
              </button>
            }
          />
        </main>
      );
  }

  return (
    <div className="app">
      {__PREVIEW__ && !inWorkout && <PreviewBar />}
      {data.error && (
        <div style={{ padding: 'calc(var(--safe-t) + 12px) 16px 0', maxWidth: 560, margin: '0 auto' }}>
          <Notice>Archivio locale non disponibile: {data.error}. In navigazione privata o con i dati dei siti bloccati i dati non possono essere salvati.</Notice>
        </div>
      )}
      <div key={root + (path[1] ?? '') + (path[2] ?? '')}>{screen}</div>
      {!inWorkout && <TabBar />}
      <RestBar inWorkout={inWorkout} />
      <ToastHost />
      <UpdatePrompt />
    </div>
  );
}
