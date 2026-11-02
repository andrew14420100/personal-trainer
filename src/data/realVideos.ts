// Real-athlete short videos (YouTube Shorts) chosen for each exercise — see docs/VIDEO_REALI.md.
// Verified 2026-11-02: oEmbed (exists, embeddable), title/author from oEmbed, and the three public
// preview frames (25/50/75%) inspected to confirm: real person, correct exercise, ❌/✅ overlays.
// Played embedded and MUTED by default (official player, content unaltered). Audio not verified.

export interface RealVideo {
  youtubeId: string;
  author: string;
  title: string;
  match: 'esatto' | 'variante simile';
  /** Red ❌ / green ✅ indicators visible in the preview frames. */
  overlays: boolean;
  note?: string;
}

export const REAL_VIDEOS: Record<string, RealVideo[]> = {
  'chest-press': [
    { youtubeId: '2awX3rTGa1k', author: 'Andrew Kwong (DeltaBolic)', title: 'Machine Chest Press MISTAKE!', match: 'esatto', overlays: true },
    { youtubeId: 'jsZQJwf4OpA', author: 'unorthadoxOPS', title: 'Machine Chest Press — Form Check ✅ | Unorthodox Ops', match: 'esatto', overlays: false },
  ],
  'lat-pulldown-wide': [
    { youtubeId: '6zw-Tfh6_8E', author: 'The John Fitness', title: '❌ Stop doing this mistake on lat pull down exercise', match: 'esatto', overlays: true, note: 'Confronto affiancato ❌/✅' },
    { youtubeId: 'obIz4ir4-LQ', author: 'FitPulse Gym', title: 'Lat Pulldown Mistake ❌ Do This Instead ✅ #shorts', match: 'esatto', overlays: true, note: 'Errore: barra dietro la nuca' },
  ],
  'incline-db-press': [
    { youtubeId: 'YT5g9jakCGc', author: 'LiftsbyNik', title: 'Incline Dumbbell Press: WRONG vs RIGHT Form! 🔥', match: 'esatto', overlays: true, note: 'Confronto ✅/❌' },
    { youtubeId: 'Gruq177Psnk', author: 'Andrew Kwong (DeltaBolic)', title: 'Incline Chest Press Mistake (STOP DOING THIS!)', match: 'esatto', overlays: true },
  ],
  'cable-row-v': [
    { youtubeId: 'I3Ia2y_Bh90', author: 'DilekFit', title: '✅ Fix your form: Cable Seated row 🤌🏻  #fitnesstips #fitnesshacks #gymhacks #gymtips #fitnessdilek', match: 'esatto', overlays: true, note: 'Confronto ❌ sopra / ✅ sotto' },
    { youtubeId: 'WJiseDekRPE', author: 'KC FITNESS', title: 'Seated Cable Row Mistakes You MUST Avoid (Fix Your Posture)', match: 'esatto', overlays: true },
  ],
  'lateral-raise': [
    { youtubeId: 'e271x1QfKRQ', author: 'KC FITNESS', title: '👉 Dumbbell Lateral Raise WRONG vs RIGHT (Stop This Mistake!) Build Wider Shoulders FAST 💪🔥#shorts', match: 'esatto', overlays: true, note: 'Traiettorie rosse e verdi sul movimento' },
    { youtubeId: '8sy02A9F6fw', author: 'Nikhil Dagar', title: 'Lateral Raises Mistake‼️Wrong vs Right way of lateral raise #shorts #shoulder #shoulderworkout #gym', match: 'esatto', overlays: true },
  ],
  'triceps-pushdown': [
    { youtubeId: 'HjrzCvIkvnI', author: 'akki fitness ', title: 'TRICEP ROPE PUSHDOWN: WRONG FORM ❌ VS RIGHT FORM ✅', match: 'esatto', overlays: true, note: 'Corda, confronto ❌/✅' },
    { youtubeId: 'xgINIAI3S58', author: 'Andrew Kwong (DeltaBolic)', title: '❌ Tricep Pushdown Mistake (Leaning to One Side) #shorts', match: 'esatto', overlays: true },
  ],
  'db-curl': [
    { youtubeId: 'oLyP6sORFOc', author: 'Andrew Kwong (DeltaBolic)', title: '❌ Don’t Make THIS Bicep Curl Mistake!', match: 'esatto', overlays: true, note: 'Linee rosse/verdi sul braccio' },
    { youtubeId: 'h40JGg137LI', author: 'Itsyourtrainer', title: 'Stop making this Bicep Curl mistake! 🛑💪 #shorts #gymhacks #bicepsworkout', match: 'variante simile', overlays: false, note: 'Curl al cavo' },
  ],
  'leg-press': [
    { youtubeId: 'a1F-BkdS2SU', author: 'Abhinav Raut', title: 'Leg Press Mistakes!! ❌ #shorts #fitness #gym', match: 'esatto', overlays: true, note: 'Ginocchia bloccate, ripetizioni parziali' },
    { youtubeId: 'QHnr8Rm53p0', author: 'Andrew Kwong (DeltaBolic)', title: '❌ Stop Making These Leg Press Mistakes!', match: 'esatto', overlays: true },
  ],
  'db-rdl': [
    { youtubeId: 'oZUw4p14MUc', author: 'FitPulse Gym', title: 'Romanian Deadlift Mistake ❌ Do This Instead ✅ #shorts', match: 'esatto', overlays: true, note: 'Sbagliato: squat e schiena tonda / Giusto: cerniera d’anca' },
    { youtubeId: '-nGKawZj9hs', author: 'Fit In A Minute', title: 'Dumbbell Romanian Deadlift Mistakes ❌ Fix Your Form! ✅ #DumbbellRomanianDeadlift #Shorts', match: 'esatto', overlays: true },
  ],
  'leg-extension': [
    { youtubeId: 'b9i5mXA_qsk', author: 'Andrew Kwong (DeltaBolic)', title: 'Leg Extension Mistakes (FIX THESE!)', match: 'esatto', overlays: true },
    { youtubeId: 'kC_QhgtW6cs', author: 'Stan Bakh', title: 'Leg Extension Mistakes! Here is a video showing the wrong way vs the right way of .', match: 'esatto', overlays: true },
  ],
  'seated-leg-curl': [
    { youtubeId: 'xdbEG3xGLI8', author: 'Andrew Kwong (DeltaBolic)', title: '✅ The PERFECT Seated Leg Curl Tips', match: 'esatto', overlays: true },
    { youtubeId: '6TqHQ-eVySI', author: 'stefy Perez', title: 'Seated Leg Curl: Keep your spine aligned and lower the weights slowly ✅ #CoachTefit', match: 'esatto', overlays: true, note: 'Indicazioni ✓ scritte' },
  ],
  'calf-raise': [
    { youtubeId: 'CKZ-wtx3h4Y', author: 'lift and fit with OMM', title: 'standing calf raise #wrong #right #exercise #shorts #youtubeshort #gymmotivation #gym', match: 'esatto', overlays: true, note: 'Macchina in piedi, sbagliato/giusto' },
    { youtubeId: 'sNqa1ad2qIQ', author: 'Fitonomy - Get Fit at Home ', title: 'CALF RAISE MISTAKES', match: 'variante simile', overlays: true, note: 'Su gradino con manubri' },
  ],
  'plank': [
    { youtubeId: 'Pkp3SOvipZ0', author: 'MarieKme', title: 'Plank Form Correction ✅ vs. ❌', match: 'esatto', overlays: true },
    { youtubeId: 'xe2MXatLTUw', author: 'Andrew Kwong (DeltaBolic)', title: '✅ The PERFECT Plank', match: 'esatto', overlays: false },
  ],
  'smith-incline-press': [
    { youtubeId: 'g20vGp_P8HQ', author: 'Alex Lueth', title: 'Smith machine incline bench press tips. Target: upper chest', match: 'esatto', overlays: true, note: 'Confronto ❌/✅ al Multipower' },
    { youtubeId: '7woIoJjBM4I', author: 'KC FITNESS', title: '"Top 5 Mistakes in Smith Machine Incline Bench Press 🚫💪"#shorts #fitness #gym', match: 'esatto', overlays: true },
  ],
  'low-row-machine': [
    { youtubeId: 'xrTK-lYeTUY', author: 'KC FITNESS', title: '👉 Machine Low Row WRONG vs RIGHT (Stop This Mistake!) Build a Thicker Back FAST 💪🔥#shorts #gym', match: 'esatto', overlays: true, note: 'Confronto ❌/✅ alla low row' },
  ],
  'pec-fly': [
    { youtubeId: 'tNxJ9oMvAAI', author: 'Andrew Kwong (DeltaBolic)', title: '❌ Machine Chest Fly Mistakes', match: 'esatto', overlays: true },
    { youtubeId: 'kmeDMlVsr_o', author: 'KC FITNESS', title: '“PEC-DECK FLY Mistakes You’re Making! (Fix Your Chest Activation)”#shorts #fitneess #motivation', match: 'esatto', overlays: true },
  ],
  'lat-pulldown-neutral': [
    { youtubeId: 'QuSqYj7tFbI', author: 'Optimal Hypertrophy', title: 'Neutral Pulldowns vs. Wide Grip | Jeff Nippard', match: 'esatto', overlays: false, note: 'Presa neutra vs larga, senza ❌/✅' },
    { youtubeId: 'hnSqbBk15tw', author: 'Jeff Nippard', title: 'Stop Messing Up Your Lat Pulldowns', match: 'variante simile', overlays: false, note: 'Presa larga' },
  ],
  'shoulder-press-machine': [
    { youtubeId: '_kFTngr9Agw', author: 'KC FITNESS', title: '"Ultimate Guide to Machine Shoulder Press Corrections!"#shorts #fitneess #motivation', match: 'esatto', overlays: true, note: 'Confronto ❌/✅ alla macchina' },
    { youtubeId: '6v4nrRVySj0', author: 'Andrew Kwong (DeltaBolic)', title: '✅ The PERFECT Machine Shoulder Press!', match: 'esatto', overlays: false },
  ],
  'incline-db-curl': [
    { youtubeId: 'fXFN8_1Bh6k', author: 'Andrew Kwong (DeltaBolic)', title: '❌ Incline Bicep Curl Mistake (DON’T DO THIS!)', match: 'esatto', overlays: true, note: 'Confronto ❌ sopra / ✅ sotto' },
    { youtubeId: 'OvROaeWt6Ns', author: 'LiftsbyNik', title: 'Stop Doing Incline Dumbbell Curls Wrong! 💪 #shorts', match: 'esatto', overlays: false },
  ],
  'overhead-cable-triceps': [
    { youtubeId: 'uGiJ5wKJElc', author: 'QIM FITNESS', title: 'Avoid Mistake Cable Rope Overhead Triceps Extension#shorts#xoteam#tiktok', match: 'esatto', overlays: true, note: 'Corda sopra la testa, ❌/✅' },
    { youtubeId: '9Ark9S11uXw', author: 'Andrew Kwong (DeltaBolic)', title: 'The PERFECT Low Pulley Overhead Extensions', match: 'esatto', overlays: false },
  ],
  'hack-squat': [
    { youtubeId: 'vaU2FSmUhNc', author: 'GAZI FITNESS', title: 'Hack squat mistakes! Right✅ vs Wrong❌ | GAZI FITNESS #gym #shorts', match: 'esatto', overlays: true, note: 'Confronto affiancato ❌/✅' },
    { youtubeId: 'Vb-Pt8ToMpY', author: 'KC FITNESS', title: '"Common Hack Squat Mistakes and How to Avoid Them | Quick Guide"', match: 'esatto', overlays: true, note: 'Linee rosse/verdi' },
  ],
  'hip-thrust-machine': [
    { youtubeId: 'w6cx9Jw_IkQ', author: 'GAZI FITNESS', title: 'Hip thrust mistakes! Right✅ vs Wrong❌ | GAZI FITNESS #gym #shorts', match: 'esatto', overlays: true, note: 'Confronto ❌/✅' },
    { youtubeId: 'sxOrVuCvWq4', author: 'Andrew Kwong (DeltaBolic)', title: 'The PERFECT Machine Hip Thrust', match: 'esatto', overlays: false },
  ],
  'assisted-split-squat': [
    { youtubeId: 'SqGJp7l6MBs', author: 'DreTrains', title: 'Split squat mistakes', match: 'variante simile', overlays: true, note: 'Split squat senza appoggio' },
    { youtubeId: 'sw4MzpC8l58', author: 'Alex Lueth', title: 'Dumbbell split squat technique! 🦿 Follow for more fitness tips ✅', match: 'variante simile', overlays: true, note: 'Con manubri, senza appoggio' },
  ],
  'lying-leg-curl': [
    { youtubeId: 'FgPfFX2-XLc', author: 'FITWITHBINESH', title: 'Lying Legs Curl mistakes❌ || correction✅ #shorts #bineshmfitness', match: 'esatto', overlays: true },
    { youtubeId: '27BG8RM_kzM', author: 'KC FITNESS', title: '"Common Leg Curl Mistakes & How to Fix Them! Perfect Your Form 🚫 #Shorts”', match: 'esatto', overlays: false },
  ],
  'dead-bug': [
    { youtubeId: '5qah1cTaJCk', author: 'Colossus Fitness', title: 'STOP MAKING THESE DEADBUG MISTAKES! ❌', match: 'esatto', overlays: true },
    { youtubeId: '-8xqJ2xXs2A', author: 'Claire DeFitt', title: 'Common Deadbug Mistake! #coreworkout #absexercise', match: 'esatto', overlays: false },
  ],
};
