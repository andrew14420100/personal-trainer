// Writes public/formats/esempio-scheda-4-giorni.json: the original FORMA LAB plan in Exchange v1.
import { writeFileSync } from 'node:fs';
import '../src/data/catalog';
import { exportOriginalPlan } from '../src/lib/exchange';
import { DEFAULT_SETTINGS } from '../src/lib/settings';
const f = exportOriginalPlan(DEFAULT_SETTINGS);
delete f.exportedAt;
f.generator = 'FORMA LAB 5.0 (esempio)';
writeFileSync('public/formats/esempio-scheda-4-giorni.json', JSON.stringify(f, null, 2) + '\n');
console.log('ok', f.program.days.reduce((a, d) => a + d.exercises.length, 0), 'posizioni');
