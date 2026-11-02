import type { Pose, PoseDelta, Vec } from './rig';

/** Body / equipment anchor names usable by equipment and overlays. */
export type Anchor =
  | 'hip' | 'shoulder' | 'neck' | 'headC' | 'midback' | 'elbow' | 'hand' | 'knee' | 'ankle' | 'toe' | 'heel'
  | 'farHand' | 'farElbow' | 'farKnee' | 'farAnkle' | 'farToe' | 'farShoulder' | 'farHip';

export type Pt = Anchor | Vec | { a: Anchor; d: Vec };

export type Equip =
  /** Static machine part (rounded rect), optional rotation around its center. */
  | { t: 'rect'; x: number; y: number; w: number; h: number; r?: number; rot?: number; tone?: 'frame' | 'pad' | 'dark' }
  /** Pad/roller attached to a body point or fixed. */
  | { t: 'pad'; at: Pt; r: number }
  /** Cable from a fixed pulley to a point (usually the hand). */
  | { t: 'cable'; from: Vec; to: Pt }
  /** Pulley wheel. */
  | { t: 'pulley'; at: Vec; r?: number }
  /** Handle in the hand. */
  | { t: 'handle'; at: Pt; kind: 'bar' | 'v' | 'rope' | 'grip' }
  /** Dumbbell seen from the side (plate). */
  | { t: 'dumbbell'; at: Pt; far?: boolean }
  /** Barbell / smith bar seen from the side. */
  | { t: 'barbell'; at: Pt; r?: number }
  /** A plate or sled rigidly linked to a body point, rotated by rot degrees. */
  | { t: 'plate'; at: Pt; w: number; h: number; rot: number; d?: Vec }
  /** Lever arm from a pivot to a point (machine arms that follow the hand / leg). */
  | { t: 'lever'; pivot: Vec; to: Pt; width?: number }
  /** Straight rail (e.g. smith machine guide) */
  | { t: 'rail'; x: number; y1: number; y2: number }
  /** Floor mat */
  | { t: 'mat'; x: number; w: number };

export type Overlay =
  | { t: 'line'; a: Pt; b: Pt; ext?: number }
  | { t: 'spine' }
  | { t: 'plumb'; a: Pt; up?: number; down?: number }
  | { t: 'ring'; a: Pt; r?: number }
  | { t: 'trail'; a: Pt }
  | { t: 'arrow'; a: Pt; dir: number; len?: number }
  | { t: 'level'; a: Pt; b: Pt };

export interface AnimError {
  /** id of the error in exercises.ts (title / fix texts are taken from there). */
  id: string;
  /** Short captions shown on screen (max ~28 chars). */
  bad: string;
  good: string;
  start?: PoseDelta;
  end?: PoseDelta;
  /** Range of motion used while showing the fault (1 = full). */
  rom?: number;
  /** Speed multiplier while showing the fault (e.g. 1.8 = fast/uncontrolled). */
  speed?: number;
  overlays: Overlay[];
}

export interface AnimSpec {
  exerciseId: string;
  /** Camera framing in logical units (zoom on the relevant area): [x, y, scale]. */
  camera?: [number, number, number];
  start: Pose;
  end: Pose;
  /** Seconds per repetition at normal speed. */
  rep?: number;
  /** For isometrics (plank): hold instead of reps. */
  hold?: boolean;
  equipment: Equip[];
  /** Overlays shown in the "Posizione iniziale" phase. */
  setup: { caption: string; overlays: Overlay[] };
  /** Overlays shown during the clean demo (subtle, green). */
  demo?: Overlay[];
  errors: AnimError[];
  /** Plane of the camera, shown to the user. */
  view: string;
  /** Frontal view (athlete facing the camera). */
  front?: boolean;
}
