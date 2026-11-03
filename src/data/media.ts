// Photographs bundled with the app (stored locally, available offline).
// All from Wikimedia Commons under free licenses; resized and compressed for the app (modification
// noted as required by CC BY). Attribution is shown in Impostazioni → Crediti e licenze.
import rackMan from '../assets/photos/rack-man.jpg';
import cableRope from '../assets/photos/cable-rope.jpg';
import legPress from '../assets/photos/leg-press.jpg';
import legMachine from '../assets/photos/leg-machine.jpg';
import dumbbellHand from '../assets/photos/dumbbell-hand.jpg';

export interface Photo {
  src: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
}

export const PHOTOS: Photo[] = [
  {
    src: rackMan,
    title: 'Attractive man lifting dumbbell weight for exercise in fitness gym',
    author: 'Nenad Stojkovic',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Attractive_man_lifting_dumbbell_weight_for_exercise_in_fitness_gym.jpg',
  },
  {
    src: cableRope,
    title: 'Strong woman using cable machine for upper body workout in gym',
    author: 'Shixart1985',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Strong_woman_using_cable_machine_for_upper_body_workout_in_gym.jpg',
  },
  {
    src: legPress,
    title: 'Young man using a leg press machine at the gym',
    author: 'Nenad Stojkovic',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Young_man_using_a_leg_press_machine_at_the_gym.jpg',
  },
  {
    src: legMachine,
    title: 'Girl playing weights with legs on the exercise machine',
    author: 'Nenad Stojkovic',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Girl_playing_weights_with_legs_on_the_exercise_machine.jpg',
  },
  {
    src: dumbbellHand,
    title: 'Close-up Hand holding dumbbell in gym',
    author: 'Nenad Stojkovic',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Close-up_Hand_holding_dumbbell_in_gym.jpg',
  },
];

export const restDayPhoto = dumbbellHand;
export const photoCredit = (src: string) => {
  const p = PHOTOS.find((x) => x.src === src);
  return p ? `Foto: ${p.author} · ${p.license}` : '';
};
