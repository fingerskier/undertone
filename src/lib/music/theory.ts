import type { KeyName, ModeName } from "./types";

export const NOTE_INDEX: Record<KeyName, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

const NOTE_NAMES: KeyName[] = [
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
];

const SCALES: Record<ModeName, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function degreeToMidi(
  key: KeyName,
  mode: ModeName,
  degree: number,
  octave: number,
): number {
  const scale = SCALES[mode];
  const idx = ((degree - 1) % 7 + 7) % 7;
  const octShift = Math.floor((degree - 1) / 7);
  return 12 * (octave + octShift) + NOTE_INDEX[key] + scale[idx]!;
}

export function pitchClassName(pc: number): KeyName {
  return NOTE_NAMES[((pc % 12) + 12) % 12]!;
}

export function chordName(
  key: KeyName,
  mode: ModeName,
  degrees: number[],
): string {
  const rootMidi = degreeToMidi(key, mode, degrees[0] ?? 1, 4);
  return pitchClassName(rootMidi);
}

export function romanNumeral(degree: number, mode: ModeName): string {
  const names = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const idx = ((degree - 1) % 7 + 7) % 7;
  const raw = names[idx]!;
  const minorish =
    mode === "major"
      ? idx === 1 || idx === 2 || idx === 5
      : idx === 0 || idx === 1 || idx === 3 || idx === 4;
  return minorish ? raw.toLowerCase() : raw;
}

export type Progression = { numeral: string; degrees: number[] }[];

export const PROGRESSIONS: Record<string, Progression> = {
  dusk: [
    { numeral: "i", degrees: [1, 3, 5, 7] },
    { numeral: "III", degrees: [3, 5, 7, 2] },
    { numeral: "VII", degrees: [7, 2, 4, 6] },
    { numeral: "iv", degrees: [4, 6, 1, 3] },
  ],
  night: [
    { numeral: "i", degrees: [1, 3, 5, 7] },
    { numeral: "VI", degrees: [6, 1, 3, 5] },
    { numeral: "III", degrees: [3, 5, 7, 2] },
    { numeral: "VII", degrees: [7, 2, 4, 6] },
  ],
  warehouse: [
    { numeral: "i", degrees: [1, 5, 7] },
    { numeral: "i", degrees: [1, 5, 7] },
    { numeral: "i", degrees: [1, 5, 8] },
    { numeral: "VII", degrees: [7, 2, 4] },
  ],
  pulse: [
    { numeral: "i", degrees: [1, 3, 5, 7] },
    { numeral: "iv", degrees: [4, 6, 1, 3] },
    { numeral: "i", degrees: [1, 3, 5, 7] },
    { numeral: "VI", degrees: [6, 1, 3, 5] },
  ],
  fog: [
    { numeral: "i", degrees: [1, 5, 7] },
    { numeral: "VII", degrees: [7, 2, 5] },
    { numeral: "i", degrees: [1, 5, 7] },
    { numeral: "VI", degrees: [6, 1, 3] },
  ],
  ritual: [
    { numeral: "i", degrees: [1, 5] },
    { numeral: "i", degrees: [1, 5] },
    { numeral: "iv", degrees: [4, 1, 5] },
    { numeral: "i", degrees: [1, 5] },
  ],
};
