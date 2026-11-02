// FORMA LAB video library.
//
// Every entry below is a REAL YouTube video found by searching YouTube and then checked through
// YouTube's public oEmbed endpoint (HTTP 200 = the video exists and its owner allows embedding).
// Title and channel are copied from the oEmbed response. See docs/VERIFICA_VIDEO.md and
// `npm run verify:videos` to re-run the check.
//
// What has NOT been done (and is therefore never claimed in the UI):
//  - No person qualified in exercise science has watched every second of each video. The
//    technical match is based on title, channel, duration and the exercise/equipment named in the
//    title. In the app you can mark each video as "Approvato dopo visione" once you have watched it.
//  - YouTube videos are under the YouTube Standard License: they can only be embedded unmodified.
//    For this reason the RED/GREEN error→correction annotations are shown in a separate didactic
//    panel, never drawn on top of the footage.
//  - No video is available offline (FORMA LAB does not own the files).

export type VideoKind = 'demo' | 'tutorial' | 'extra';
export type Match = 'esatto' | 'variante simile' | 'variante diversa';

export interface VideoSource {
  youtubeId: string;
  kind: VideoKind;
  title: string;
  author: string;
  /** Duration as shown by YouTube search results at verification time. */
  duration: string;
  match: Match;
  matchNote?: string;
  /** Whether the title/description explicitly promises common mistakes and corrections. */
  errorsShown: 'sì (dichiarato nel titolo)' | 'non dichiarato';
  language: 'EN' | 'IT';
}

export interface ExerciseVideos {
  exerciseId: string;
  demo?: VideoSource;
  tutorial?: VideoSource;
  extra: VideoSource[];
  /** Explicit statement of what is missing for this exercise. */
  missing: string[];
}

export const VIDEO_CHECK = {
  date: '2026-11-02',
  method:
    'Ricerca su YouTube + verifica tramite endpoint pubblico oEmbed (https://www.youtube.com/oembed). HTTP 200 = video esistente e incorporabile.',
  license: 'Licenza standard di YouTube: solo incorporamento tramite il player ufficiale, nessuna modifica del filmato.',
  iphone:
    'Player YouTube ufficiale (iframe, playsinline) compatibile con Safari iOS. Riproduzione da confermare sul tuo iPhone: vedi la checklist nel rapporto di test.',
} as const;

const v = (
  youtubeId: string,
  kind: VideoKind,
  author: string,
  title: string,
  duration: string,
  match: Match,
  opts: Partial<Pick<VideoSource, 'matchNote' | 'errorsShown' | 'language'>> = {},
): VideoSource => ({
  youtubeId,
  kind,
  author,
  title,
  duration,
  match,
  errorsShown: opts.errorsShown ?? 'non dichiarato',
  language: opts.language ?? 'EN',
  matchNote: opts.matchNote,
});

const ERR = { errorsShown: 'sì (dichiarato nel titolo)' } as const;

const LONG = 'Più lungo dei 2–4 minuti indicativi: contiene più errori e correzioni.';
const NO_ERRORS_DEMO: string[] = [];

export const VIDEO_LIBRARY: ExerciseVideos[] = [
  {
    exerciseId: 'chest-press',
    demo: v('sqNwDkUU_Ps', 'demo', 'PureGym', 'How To Use The Chest Press Machine', '1:01', 'esatto'),
    tutorial: v('4YpxZXFADmc', 'tutorial', 'Fitness 19', 'How to Adjust & Use the Chest Press Machine Correctly', '3:55', 'esatto', {
      matchNote: 'Copre la regolazione della macchina (fase di preparazione).',
    }),
    extra: [v('BfnexMc6jMY', 'extra', 'Katie Orlic', 'Machine Chest Press: Cues and Common Mistakes', '0:56', 'esatto', ERR)],
    missing: NO_ERRORS_DEMO,
  },
  {
    exerciseId: 'lat-pulldown-wide',
    demo: v('lueEJGjTuPQ', 'demo', 'Bodybuilding.com', 'Wide-Grip Lat Pulldown | Back Exercise Guide', '1:05', 'esatto'),
    tutorial: v('SALxEARiMkw', 'tutorial', 'ATHLEAN-X™', 'How to do Lat Pulldowns (AVOID MISTAKES!)', '5:55', 'esatto', { ...ERR, matchNote: LONG }),
    extra: [v('O-_EOo6IY3U', 'extra', 'nutritioneering', 'Wide Grip Lat Pulldown Mistakes & How to Correct Them', '1:00', 'esatto', ERR)],
    missing: [],
  },
  {
    exerciseId: 'incline-db-press',
    demo: v('gl8H4QLXKTo', 'demo', 'Buff Dudes Workouts', 'How to Perform Incline Dumbbell Press | Upper Chest Exercise Tutorial', '0:49', 'esatto'),
    tutorial: v('awEEyL5zGvU', 'tutorial', 'Colossus Fitness', 'How To PROPERLY Dumbbell Incline Press Like A Pro | 3 Common Mistakes', '3:21', 'esatto', ERR),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'cable-row-v',
    demo: v('m-UTSvcTpxM', 'demo', 'KAGED', 'Seated Row with V-Bar Grip | How To Perform It Correctly', '1:41', 'esatto'),
    tutorial: v('7BkgqzC6WsM', 'tutorial', 'Colossus Fitness', 'How to PROPERLY Seated Cable Row (DO THIS NOW)', '5:07', 'variante simile', {
      matchNote: 'Pulley basso: l’impugnatura usata nel video potrebbe non essere il triangolo. ' + LONG,
    }),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'lateral-raise',
    demo: v('XPPfnSEATJA', 'demo', 'National Academy of Sports Medicine (NASM)', 'How to do a Dumbbell Lateral Raise', '0:19', 'esatto', {
      matchNote: 'Organizzazione professionale di certificazione. Clip molto breve: usa il loop.',
    }),
    tutorial: v('K5hFLVJnnsw', 'tutorial', 'Sean Nalewanyj', 'Stop Doing Lateral Raises Like This! (8 MISTAKES)', '5:52', 'esatto', { ...ERR, matchNote: LONG }),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'triceps-pushdown',
    demo: v('-zLyUAo1gMw', 'demo', 'Max Euceda', 'How to do the CABLE TRICEP PUSHDOWN! | 2 Minute Tutorial', '2:00', 'esatto'),
    tutorial: v('Do8_ihxoK00', 'tutorial', 'ScottHermanFitness', '3 Triceps Pushdown Mistakes Everyone Makes | FIX NOW!', '8:22', 'esatto', { ...ERR, matchNote: LONG }),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'db-curl',
    demo: v('cBSD6mQIPQk', 'demo', 'Nuffield Health', 'Dumbbell Bicep Curl | Nuffield Health', '0:36', 'esatto'),
    tutorial: v('XE_pHwbst04', 'tutorial', 'Fit Father Project', 'Bicep Curls — (DUMBBELL FORM & TECHNIQUE)', '2:39', 'esatto'),
    extra: [v('jjnJHhzZUUM', 'extra', 'Jeremy Ethier', 'STOP Doing Bicep Curls Like This (5 Mistakes Slowing Your Gains)', '7:34', 'esatto', ERR)],
    missing: [],
  },
  {
    exerciseId: 'leg-press',
    demo: v('p5dCqF7wWUw', 'demo', 'PureGym', 'How To Use The Leg Press Machine', '1:01', 'esatto', {
      matchNote: 'Il modello di leg press (45°, orizzontale) può differire da quello della tua palestra.',
    }),
    tutorial: v('NgsghfPG8h4', 'tutorial', 'LIVESTRONG', '6 Common Leg Press Mistakes — and How to Fix Them', '3:48', 'esatto', ERR),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'db-rdl',
    demo: v('hQgFixeXdZo', 'demo', 'J2FIT Strength & Conditioning', 'Dumbbell Romanian (RDL) Deadlift | TECHNIQUE for Beginners', '1:19', 'esatto'),
    tutorial: v('68DCrZYEtus', 'tutorial', 'Shelley Darlington', 'Dumbbell Romanian Deadlift: Most People Do This Wrong', '4:07', 'esatto', ERR),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'leg-extension',
    demo: v('YyvSfVjQeL0', 'demo', 'ScottHermanFitness', 'How To: Leg Extension (Cybex)', '2:41', 'esatto'),
    tutorial: v('ljO4jkwv8wQ', 'tutorial', 'Jeff Nippard', 'How To Do Leg Extensions With Perfect Technique (Grow Every Quad Head)', '6:37', 'esatto', { matchNote: LONG }),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'seated-leg-curl',
    demo: v('t9sTSr-JYSs', 'demo', 'SilverSneakers', "Beginner's Guide: Seated Leg Curl", '1:58', 'esatto'),
    tutorial: v('Wy1SwoY2aaQ', 'tutorial', 'Colossus Fitness', 'How to PROPERLY Seated Hamstring Curl (FIX THIS NOW)', '3:31', 'esatto', ERR),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'calf-raise',
    demo: v('30ygzcJw4v4', 'demo', 'Anytime Fitness Ashfield', 'How To Use: Standing Calf Raise Machine', '1:34', 'esatto', {
      matchNote: 'Versione in piedi alla macchina (la scheda non specifica la variante).',
    }),
    tutorial: v('SVtg-1loH4c', 'tutorial', 'Colossus Fitness', 'How to PROPERLY Standing Calf Raise | Tips & Common Mistakes', '2:02', 'esatto', ERR),
    extra: [v('Xa18jxyeSnM', 'extra', 'Renaissance Periodization', '8 Calf Raise Mistakes and How to Fix Them', '9:25', 'esatto', ERR)],
    missing: [],
  },
  {
    exerciseId: 'plank',
    demo: v('pSHjTRCQxIw', 'demo', 'ScottHermanFitness', 'How To: Plank', '1:17', 'esatto'),
    tutorial: v('6LqqeBtFn9M', 'tutorial', 'Get Exercise Confident', 'How to do the perfect PLANK: technique and common mistakes', '2:45', 'esatto', ERR),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'smith-incline-press',
    demo: v('_VmR8nhC9M8', 'demo', 'Energise Coaching', 'Low Incline Chest Press (Smith Machine)', '2:07', 'esatto', {
      matchNote: 'Inclinazione bassa al Multipower, coerente con i 30° della scheda.',
    }),
    tutorial: v('e_PWa7bMnk8', 'tutorial', 'Ferris Fitness', 'Incline Smith Machine Press Tips for Maximum Chest Activation', '6:22', 'variante simile', {
      matchNote: 'L’inclinazione usata nel video potrebbe essere diversa da 30°. ' + LONG,
    }),
    extra: [],
    missing: ['Nessun tutorial trovato che dichiari esplicitamente errori e correzioni per la panca a 30° al Multipower.'],
  },
  {
    exerciseId: 'low-row-machine',
    demo: v('vY1-i6sAOMc', 'demo', 'Club Connect', 'Low Row Technogym PureStrength Series', '2:09', 'variante simile', {
      matchNote: 'Modello Technogym: la macchina della tua palestra può essere diversa.',
    }),
    tutorial: v('LkBuqGTKf-4', 'tutorial', 'Luigi Colbax - FIT OVER50', 'Low Row Machine - Rinforzare schiena e spalle - esecuzione corretta e errori comuni', '1:50', 'esatto', {
      ...ERR,
      language: 'IT',
      matchNote: 'In italiano. Più breve di 2 minuti.',
    }),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'pec-fly',
    demo: v('3jYo5cMU3d4', 'demo', 'Max Euceda', 'The Chest PEC DEC FLY | Exercise Form Guide', '2:48', 'esatto'),
    tutorial: v('H4mVGHaK2f4', 'tutorial', 'Colossus Fitness', 'How to PERFECT The Pec Deck | (CHEST FLY MISTAKES & TIPS)', '3:03', 'esatto', ERR),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'lat-pulldown-neutral',
    demo: v('E1FK9APxk54', 'demo', 'Seriously Strong Training', 'Neutral Grip Pulldowns [Perfect Form in 60 Seconds]', '1:02', 'esatto'),
    tutorial: v('KgZqDuNx7rI', 'tutorial', 'Physique Development', 'The BEST way to Perform the Neutral Grip Lat Pulldown | Form Tutorial', '4:55', 'esatto'),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'shoulder-press-machine',
    demo: v('TnhIyp4kmO8', 'demo', 'PureGym', 'How To Use The Shoulder Press Machine', '0:55', 'esatto'),
    tutorial: v('3R14MnZbcpw', 'tutorial', 'Colossus Fitness', 'How to PROPERLY Shoulder Machine Press (LEARN FAST)', '2:26', 'esatto'),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'incline-db-curl',
    demo: v('soxrZlIl35U', 'demo', 'ScottHermanFitness', 'How To: Seated Incline Dumbbell Bicep Curl', '1:45', 'esatto'),
    tutorial: v('PAnypqTfEuU', 'tutorial', 'Colossus Fitness', 'How To Do The Incline Dumbbell Curl Correctly', '3:07', 'esatto'),
    extra: [v('DCe8f6vMe9A', 'extra', 'ATHLEAN-X™', 'Stop Screwing Up Incline Dumbbell Curls (PROPER FORM!)', '5:05', 'esatto', ERR)],
    missing: [],
  },
  {
    exerciseId: 'overhead-cable-triceps',
    demo: v('ns-RGsbzqok', 'demo', 'ChadMollickDotCom', 'Overhead Cable Tricep Extension', '0:43', 'esatto', {
      matchNote: 'Variante sopra la testa: vedi nota sulla variante nella scheda esercizio.',
    }),
    tutorial: v('GzmlxvSFE7A', 'tutorial', 'Colossus Fitness', 'How to PROPERLY Overhead Cable Tricep Extension | Fix Your Tricep Extension Form NOW!', '3:43', 'esatto'),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'hack-squat',
    demo: v('0tn5K9NlCfo', 'demo', 'Bodybuilding.com', 'Hack Squat | Exercise Guide', '1:23', 'esatto'),
    tutorial: v('fE5BWPy7uRc', 'tutorial', 'Colossus Fitness', 'How To PROPERLY Hack Squat With Proper Form', '2:21', 'esatto'),
    extra: [v('4cxt_Tldugw', 'extra', 'Renaissance Periodization', '9 Hack Squat Mistakes and How to Fix Them', '18:47', 'esatto', ERR)],
    missing: [],
  },
  {
    exerciseId: 'hip-thrust-machine',
    demo: v('8xJ0Vxjv0sw', 'demo', 'One Minute Tutorial', 'Hip Thrust Machine: Quick Tutorial for Maximum Glute Activation', '1:07', 'esatto'),
    tutorial: v('tztHvSLdXLA', 'tutorial', 'Colossus Fitness', 'How to PROPERLY Machine Hip Thrust (FIX YOUR FORM NOW)', '3:12', 'esatto'),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'assisted-split-squat',
    demo: v('vUikQQsXCbg', 'demo', 'Rehab My Patient', 'How to do a Split Squat Supported', '0:45', 'esatto', {
      matchNote: 'Split squat con supporto per le mani.',
    }),
    tutorial: v('la0pLPq-3A8', 'tutorial', 'Get Exercise Confident', 'How to do the perfect SPLIT SQUAT: technique and common mistakes', '3:17', 'variante simile', {
      ...ERR,
      matchNote: 'Split squat senza supporto: la tecnica degli arti inferiori è la stessa, cambia solo l’appoggio delle mani.',
    }),
    extra: [v('GpNxsiouXC4', 'extra', 'Dr. Carl Baird', 'How To Perform The Assisted Split Squat | TRX Split Squat Variation', '0:52', 'variante simile', {
      matchNote: 'Assistenza con TRX invece che con un supporto fisso.',
    })],
    missing: ['Nessun tutorial con errori/correzioni specifico per la versione assistita: il tutorial mostra la versione libera.'],
  },
  {
    exerciseId: 'lying-leg-curl',
    demo: v('QjNFk4F5dAs', 'demo', 'PureGym', 'How To Use The Prone Leg Curl Machine', '1:00', 'esatto'),
    tutorial: v('vl5nUdE9mWM', 'tutorial', 'Physique Development', 'How to Lying Leg Curl | Proper Technique, Set Up, & Mistakes', '2:44', 'esatto', ERR),
    extra: [],
    missing: [],
  },
  {
    exerciseId: 'dead-bug',
    demo: v('GbSC02oU3To', 'demo', 'Hinge Health', 'How to Do a Dead Bug: A Guide from Physical Therapists', '1:13', 'esatto', {
      matchNote: 'Realizzato da fisioterapisti.',
    }),
    tutorial: v('lqnuY3wiBzA', 'tutorial', 'Colossus Fitness', 'How to PROPERLY Do Deadbugs (STOP MAKING THESE MISTAKES!)', '3:11', 'esatto', ERR),
    extra: [],
    missing: [],
  },
];

export const VIDEOS_BY_EXERCISE: Record<string, ExerciseVideos> = Object.fromEntries(
  VIDEO_LIBRARY.map((e) => [e.exerciseId, e]),
);

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Every video id in the library (used by the verification script and tests). */
export function allVideoIds(): string[] {
  return VIDEO_LIBRARY.flatMap((e) => [e.demo, e.tutorial, ...e.extra].filter(Boolean).map((x) => x!.youtubeId));
}
