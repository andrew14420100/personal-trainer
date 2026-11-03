// Prints the official exerciseId table (program + curated library) used in docs/FORMATO_SCHEDE_v1.md.
import { EXERCISES } from '../src/data/exercises';
import { LIBRARY } from '../src/data/library';
const row = (e: { id: string; name: string; nameEn: string }) => `| \`${e.id}\` | ${e.name} | ${e.nameEn} |`;
console.log(['### Esercizi della scheda (con video)', '', '| exerciseId | Nome italiano | Nome inglese |', '|---|---|---|', ...EXERCISES.map(row), '', '### Libreria interna (con pagina tecnica)', '', '| exerciseId | Nome italiano | Nome inglese |', '|---|---|---|', ...LIBRARY.map(row)].join('\n'));
