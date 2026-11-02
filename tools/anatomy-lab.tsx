import { createRoot } from 'react-dom/client';
import '../src/styles/app.css';
import { Anatomy } from '../src/components/Anatomy';
import { EXERCISE_MUSCLES } from '../src/data/muscles';
const ids = ['lat-pulldown-wide', 'chest-press', 'lateral-raise', 'db-rdl', 'leg-press', 'plank'];
createRoot(document.getElementById('r')!).render(
  <>
    {ids.map((id) => (
      <div key={id} style={{ width: 300 }}>
        <div>{id}</div>
        <Anatomy primary={EXERCISE_MUSCLES[id].primary} secondary={EXERCISE_MUSCLES[id].secondary} />
      </div>
    ))}
  </>,
);
document.title = 'ready';
