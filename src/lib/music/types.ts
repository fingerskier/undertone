export const KEYS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export type KeyName = (typeof KEYS)[number];
export type ModeName = "minor" | "dorian" | "major";
export type StemId = "drums" | "pad" | "bass";
export type Density = "sparse" | "balanced" | "dense";
export type Bars = 2 | 4;

export type StyleId =
  | "night-drive"
  | "warehouse"
  | "dusk"
  | "pulse"
  | "fog"
  | "ritual";

export interface DrumHit {
  step: number;
  vel: number;
}

export interface DrumPattern {
  kick: DrumHit[];
  snare: DrumHit[];
  hat: DrumHit[];
  openHat: DrumHit[];
  perc: DrumHit[];
}

export interface BassNote {
  step: number;
  length: number;
  degree: number;
  octave: number;
  vel: number;
}

export interface PadChord {
  bar: number;
  numeral: string;
  name: string;
  degrees: number[];
}

export interface KitCharacter {
  kickStart: number;
  kickEnd: number;
  kickDecay: number;
  snareTone: number;
  snareNoise: number;
  snareDecay: number;
  hatDecay: number;
  hatColor: number;
  percPitch: number;
  clap: boolean;
}

export interface MixCharacter {
  reverbDecay: number;
  delayBeats: number;
  delayFeedback: number;
  delayMix: number;
  padFilter: number;
  padMovement: number;
  bassCutoff: number;
  bassSub: number;
  sidechain: number;
  swing: number;
  bpm: number;
}

export interface StylePreset {
  id: StyleId;
  name: string;
  blurb: string;
  bpm: number;
  key: KeyName;
  mode: ModeName;
  swing: number;
  kit: KitCharacter;
  mix: MixCharacter;
}

export interface GenParams {
  seed: number;
  styleId: StyleId;
  key: KeyName;
  mode: ModeName;
  bpm: number;
  bars: Bars;
  swing: number;
  density: Density;
}

export interface GeneratedSet {
  id: string;
  name: string;
  params: GenParams;
  drums: DrumPattern;
  bass: BassNote[];
  pad: PadChord[];
  kit: KitCharacter;
  mix: MixCharacter;
}

export interface SavedSet {
  id: string;
  name: string;
  createdAt: string;
  set: GeneratedSet;
}

export const STEPS_PER_BAR = 16;

export function totalSteps(bars: number): number {
  return bars * STEPS_PER_BAR;
}
