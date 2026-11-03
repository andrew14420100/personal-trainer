// Imports the STRUCTURED data of free-exercise-db (https://github.com/yuhonas/free-exercise-db,
// declared public domain — Unlicense) into src/data/ext/catalog.json.
// Imported: English name, muscles, equipment, level, mechanic, force, category.
// NOT imported: instruction texts and images (their original provenance cannot be verified).
// Italian names are produced by transparent word rules (marked as automatic in the app).
// Usage: node scripts/import-exercises.mjs <path-to-exercises.json>
import { readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const MUSCLE = { quadriceps: ['quadricipiti'], shoulders: ['deltoide-ant', 'deltoide-lat'], abdominals: ['addominali'], chest: ['pettorali'], hamstrings: ['femorali'], triceps: ['tricipiti'], biceps: ['bicipiti'], lats: ['dorsali'], 'middle back': ['romboidi'], calves: ['polpacci'], 'lower back': ['lombari'], forearms: ['avambracci'], glutes: ['glutei'], traps: ['trapezio'], adductors: ['adduttori'], abductors: ['glutei'], neck: ['trapezio'] };
const GROUP = { quadriceps: 'Gambe', shoulders: 'Spalle', abdominals: 'Addome', chest: 'Petto', hamstrings: 'Femorali', triceps: 'Tricipiti', biceps: 'Bicipiti', lats: 'Schiena', 'middle back': 'Schiena', calves: 'Polpacci', 'lower back': 'Lombari', forearms: 'Avambracci', glutes: 'Glutei', traps: 'Trapezio', adductors: 'Adduttori', abductors: 'Glutei', neck: 'Collo' };
const EQUIP = { barbell: 'Bilanciere', dumbbell: 'Manubri', other: 'Altro', 'body only': 'Corpo libero', cable: 'Cavi', machine: 'Macchina', kettlebells: 'Kettlebell', bands: 'Elastici', 'medicine ball': 'Palla medica', 'exercise ball': 'Fitball', 'foam roll': 'Foam roller', 'e-z curl bar': 'Bilanciere EZ' };
const LEVEL = { beginner: 'principiante', intermediate: 'intermedio', expert: 'avanzato' };
const CAT = { strength: 'Forza', stretching: 'Stretching', plyometrics: 'Pliometria', powerlifting: 'Powerlifting', 'olympic weightlifting': 'Sollevamento olimpico', strongman: 'Strongman', cardio: 'Cardio' };
// word rules (applied in order, case-insensitive, whole words)
const WORDS = [
  ['Bench Press', 'Panca'], ['Shoulder Press', 'Lento'], ['Military Press', 'Lento militare'], ['Leg Press', 'Leg press'], ['Romanian Deadlift', 'Stacco rumeno'], ['Stiff-Legged Deadlift', 'Stacco a gambe tese'], ['Deadlift', 'Stacco'], ['Pulldown', 'Lat machine'], ['Pull-Up', 'Trazioni'], ['Pullups', 'Trazioni'], ['Chin-Up', 'Trazioni supine'], ['Push-Up', 'Piegamenti'], ['Pushups', 'Piegamenti'], ['Lateral Raise', 'Alzate laterali'], ['Front Raise', 'Alzate frontali'], ['Calf Raise', 'Calf raise'], ['Fly', 'Croci'], ['Flyes', 'Croci'], ['Row', 'Rematore'], ['Lunge', 'Affondo'], ['Lunges', 'Affondi'], ['Squat', 'Squat'], ['Crunch', 'Crunch'], ['Crunches', 'Crunch'], ['Extension', 'Estensione'], ['Extensions', 'Estensioni'], ['Curl', 'Curl'], ['Stretch', 'Allungamento'], ['Shrug', 'Scrollate'], ['Dip', 'Dip'], ['Dips', 'Dip'], ['Press', 'Distensione'], ['Raise', 'Sollevamento'], ['Twist', 'Torsione'], ['Bridge', 'Ponte'], ['Plank', 'Plank'], ['Kickback', 'Kickback'], ['Pullover', 'Pullover'], ['Thrust', 'Spinta'], ['Walk', 'Camminata'], ['Jump', 'Salto'], ['Jumps', 'Salti'], ['Throw', 'Lancio'], ['Clean', 'Girata'], ['Snatch', 'Strappo'], ['Jerk', 'Slancio'],
  ['Incline', 'inclinata'], ['Decline', 'declinata'], ['Seated', 'seduto'], ['Standing', 'in piedi'], ['Lying', 'sdraiato'], ['Kneeling', 'in ginocchio'], ['One-Arm', 'a un braccio'], ['One Arm', 'a un braccio'], ['Single-Arm', 'a un braccio'], ['Single-Leg', 'a una gamba'], ['One-Legged', 'a una gamba'], ['Alternating', 'alternato'], ['Alternate', 'alternato'], ['Reverse', 'inverso'], ['Close-Grip', 'presa stretta'], ['Wide-Grip', 'presa larga'], ['Hammer', 'a martello'], ['Overhead', 'sopra la testa'], ['Bent Over', 'busto flesso'], ['Bent-Over', 'busto flesso'], ['Side', 'laterale'], ['Front', 'frontale'], ['Rear', 'posteriore'], ['Upright', 'verticale'], ['Weighted', 'con sovraccarico'], ['Assisted', 'assistito'], ['Smith Machine', 'al multipower'], ['Leg', 'gambe'], ['Legs', 'gambe'], ['Hip', 'anca'], ['Glute', 'glutei'], ['Calf', 'polpacci'], ['Triceps', 'tricipiti'], ['Tricep', 'tricipiti'], ['Biceps', 'bicipiti'], ['Chest', 'petto'], ['Shoulder', 'spalle'], ['Back', 'schiena'], ['Neck', 'collo'], ['Wrist', 'polso'], ['Ab', 'addominali'], ['Abs', 'addominali'], ['Rope', 'corda'], ['Ball', 'palla'], ['Box', 'box'],
  ['EZ Bar', 'con bilanciere EZ'], ['EZ-Bar', 'con bilanciere EZ'], ['Hamstring', 'femorali'], ['Hamstrings', 'femorali'], ['Quad', 'quadricipiti'], ['Quadriceps', 'quadricipiti'], ['Lat', 'dorsali'], ['Lats', 'dorsali'], ['Lateral', 'laterale'], ['Inner', 'interno'], ['Outer', 'esterno'], ['Low', 'basso'], ['High', 'alto'], ['Plate', 'con disco'], ['Face Up', 'supino'], ['Face Down', 'prono'], ['Load', 'carico'], ['Drill', 'esercizio'], ['Resistance', 'resistenza'], ['Dynamic', 'dinamico'], ['Crossover', 'croci'], ['Grip', 'presa'], ['Wide', 'larga'], ['Narrow', 'stretta'], ['Floor', 'a terra'], ['Bodyweight', 'a corpo libero'], ['Body', 'corpo'], ['Arm', 'braccio'], ['Arms', 'braccia'], ['Knee', 'ginocchio'], ['Knees', 'ginocchia'], ['Toe', 'punta'], ['Toes', 'punte'], ['Heel', 'tallone'], ['Ankle', 'caviglia'], ['Lower', 'bassa'], ['Upper', 'alta'], ['Spinal', 'colonna'], ['Rotation', 'rotazione'], ['Circles', 'circonduzioni'], ['Hold', 'tenuta'], ['Pause', 'con pausa'], ['Partial', 'parziale'], ['Tempo', 'a tempo'], ['Sumo', 'sumo'], ['Front Squat', 'Squat frontale'], ['Split Squat', 'Split squat'],
  ['Barbell', 'con bilanciere'], ['Dumbbell', 'con manubri'], ['Dumbbells', 'con manubri'], ['Cable', 'ai cavi'], ['Machine', 'alla macchina'], ['Kettlebell', 'con kettlebell'], ['Band', 'con elastico'], ['EZ-Bar', 'con bilanciere EZ'], ['With', 'con'], ['On', 'su'], ['To', 'a'], ['And', 'e'], ['The', ''], ['A', ''],
];
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MOVES = new Set(WORDS.slice(0, WORDS.findIndex(([en]) => en === 'Incline')).map(([, it]) => it.toLowerCase()));
const MUSCLES = new Set(['gambe', 'anca', 'glutei', 'polpacci', 'tricipiti', 'bicipiti', 'petto', 'spalle', 'schiena', 'collo', 'polso', 'addominali', 'femorali', 'quadricipiti', 'dorsali', 'braccio', 'braccia']);
function italian(name) {
  let t = ` ${name} `;
  // replace longest phrases first, marking them with a separator so they stay one chunk
  const words = [...WORDS].sort((a, b) => b[0].length - a[0].length);
  for (const [en, it] of words) t = t.replace(new RegExp(`(?<=[\\s(/-])${esc(en)}(?=[\\s)/,-])`, 'gi'), it ? `|${it}|` : '');
  const chunks = t.split('|').map((c) => c.trim()).filter(Boolean);
  const mv = chunks.filter((c) => MOVES.has(c.toLowerCase()));
  const mu = chunks.filter((c) => MUSCLES.has(c.toLowerCase()));
  const eq = chunks.filter((c) => /^(con|ai|alla|al) /.test(c));
  const rest = chunks.filter((c) => !mv.includes(c) && !mu.includes(c) && !eq.includes(c));
  const out = [...mv, ...mu, ...rest, ...eq].join(' ').replace(/\s+/g, ' ').trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// names already covered by the app's own 68 exercises (avoid duplicates)
const OWN = new Set(['barbell bench press medium grip', 'dumbbell bench press', 'incline dumbbell press', 'pullups', 'chin up', 'leg press', 'leg extensions', 'seated leg curl', 'lying leg curls', 'plank', 'dead bug', 'hack squat', 'barbell squat', 'goblet squat', 'barbell hip thrust', 'face pull', 'hammer curls', 'barbell curl', 'preacher curl', 'standing calf raises', 'seated calf raise', 'cable crossover', 'pushups', 'dips chest version', 'side lateral raise', 'triceps pushdown', 'seated cable rows', 'wide grip lat pulldown', 'close grip front lat pulldown', 'romanian deadlift', 'stiff legged dumbbell deadlift', 'machine shoulder military press', 'elliptical trainer', 'rowing stationary', 'recumbent bike', 'jogging treadmill', 'step mill', 'pallof press', 'ab roller', 'hanging leg raise', 'cable crunch', 'barbell shrug', 'dumbbell shrug', 'bent over barbell row', 'one arm dumbbell row', 't bar row with handle', 'straight arm pulldown', 'hyperextensions back extensions', 'thigh adductor', 'thigh abductor', 'glute kickback', 'dumbbell step ups', 'bodyweight walking lunge', 'split squat with dumbbells', 'skull crusher', 'lying triceps press']);
const seen = new Set();
const out = [];
for (const e of src) {
  const key = slug(e.name).replace(/-/g, ' ');
  if (OWN.has(key) || seen.has(key)) continue;
  seen.add(key);
  const prim = [...new Set((e.primaryMuscles || []).flatMap((m) => MUSCLE[m] || []))];
  const sec = [...new Set((e.secondaryMuscles || []).flatMap((m) => MUSCLE[m] || []))].filter((m) => !prim.includes(m));
  if (!prim.length) continue;
  out.push({
    id: `x-${slug(e.id || e.name)}`,
    it: italian(e.name),
    en: e.name,
    g: e.category === 'stretching' ? 'Stretching e mobilità' : e.category === 'cardio' ? 'Cardio' : GROUP[e.primaryMuscles[0]] || 'Altro',
    p: prim,
    s: sec,
    eq: EQUIP[e.equipment] || 'Nessuno',
    lv: LEVEL[e.level] || 'intermedio',
    mv: [e.mechanic === 'compound' ? 'multi-articolare' : e.mechanic === 'isolation' ? 'mono-articolare' : null, e.force === 'push' ? 'spinta' : e.force === 'pull' ? 'tirata' : e.force === 'static' ? 'statico' : null].filter(Boolean).join(' · '),
    c: CAT[e.category] || 'Forza',
  });
}
out.sort((a, b) => a.it.localeCompare(b.it, 'it'));
writeFileSync(new URL('../src/data/ext/catalog.json', import.meta.url), JSON.stringify(out));
console.log(`importati ${out.length} esercizi (scartati ${src.length - out.length} doppioni o senza muscoli)`);
