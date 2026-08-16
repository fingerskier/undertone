import { chance, jitter, mulberry32, pick, type Rng } from "./rng";
import { getStyle } from "./styles";
import { chordName, PROGRESSIONS, romanNumeral } from "./theory";
import type {
  BassNote,
  Density,
  DrumHit,
  DrumPattern,
  GeneratedSet,
  GenParams,
  PadChord,
  StyleId,
} from "./types";
import { STEPS_PER_BAR, totalSteps } from "./types";

type ProbMap = number[];

const KICK: Record<StyleId, ProbMap> = {
  "night-drive": [1, 0, 0, 0.08, 1, 0, 0, 0.05, 1, 0, 0.12, 0, 1, 0, 0.22, 0],
  warehouse: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0.1, 1, 0, 0, 0],
  dusk: [1, 0, 0, 0, 0, 0, 0.35, 0, 0, 0, 0.15, 0, 0.55, 0, 0, 0],
  pulse: [1, 0, 0, 0.28, 0, 0, 0.85, 0, 0, 0.32, 0, 0, 0.78, 0, 0.18, 0],
  fog: [1, 0, 0, 0, 0, 0, 0, 0.12, 0, 0, 0.9, 0, 0, 0, 0.2, 0],
  ritual: [1, 0, 0, 0.15, 0, 0, 0.85, 0, 0, 0, 0.9, 0, 0, 0.45, 0, 0],
};

const SNARE: Record<StyleId, ProbMap> = {
  "night-drive": [0, 0, 0, 0, 1, 0, 0, 0.1, 0, 0, 0, 0, 1, 0, 0.12, 0],
  warehouse: [0, 0, 0, 0, 0.15, 0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0],
  dusk: [0, 0, 0, 0, 0.45, 0, 0, 0, 0, 0, 0, 0, 0.35, 0, 0, 0],
  pulse: [0, 0, 0.18, 0, 1, 0, 0, 0.28, 0, 0.12, 0, 0, 1, 0, 0.22, 0.1],
  fog: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0.15],
  ritual: [0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0, 0, 0, 0.25, 0, 0, 0],
};

const HAT: Record<StyleId, ProbMap> = {
  "night-drive": [0.9, 0.2, 0.85, 0.15, 0.9, 0.2, 0.85, 0.35, 0.9, 0.2, 0.85, 0.15, 0.9, 0.25, 0.8, 0.4],
  warehouse: [0.2, 0, 1, 0, 0.2, 0, 1, 0.15, 0.2, 0, 1, 0, 0.2, 0.1, 1, 0.25],
  dusk: [0.4, 0, 0.15, 0, 0.35, 0, 0.1, 0, 0.3, 0, 0.15, 0, 0.25, 0, 0.2, 0],
  pulse: [0.75, 0.45, 0.7, 0.5, 0.55, 0.35, 0.8, 0.55, 0.7, 0.4, 0.65, 0.5, 0.5, 0.35, 0.75, 0.6],
  fog: [0.55, 0, 0.25, 0, 0.4, 0, 0.2, 0.15, 0.5, 0, 0.2, 0, 0.35, 0, 0.25, 0.2],
  ritual: [0.15, 0, 0.1, 0, 0.2, 0, 0.1, 0, 0.15, 0, 0.1, 0, 0.2, 0, 0.15, 0],
};

const OPEN: Record<StyleId, ProbMap> = {
  "night-drive": [0, 0, 0, 0, 0, 0, 0, 0.35, 0, 0, 0, 0, 0, 0, 0, 0.45],
  warehouse: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.55],
  dusk: [0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0, 0, 0, 0.25],
  pulse: [0, 0, 0, 0, 0, 0, 0, 0.4, 0, 0, 0, 0, 0, 0, 0, 0.3],
  fog: [0, 0, 0, 0, 0, 0, 0, 0.15, 0, 0, 0, 0, 0, 0, 0, 0.35],
  ritual: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2],
};

const PERC: Record<StyleId, ProbMap> = {
  "night-drive": [0, 0, 0.25, 0, 0, 0, 0, 0.15, 0, 0.2, 0, 0, 0, 0, 0.3, 0],
  warehouse: [0, 0, 0, 0.2, 0, 0, 0, 0, 0, 0, 0, 0.25, 0, 0, 0, 0.15],
  dusk: [0, 0, 0.15, 0, 0, 0, 0, 0, 0, 0.12, 0, 0, 0, 0, 0.18, 0],
  pulse: [0, 0.2, 0, 0, 0, 0.15, 0, 0.22, 0, 0.18, 0, 0, 0, 0.12, 0, 0.2],
  fog: [0, 0, 0, 0.18, 0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0, 0.12],
  ritual: [0, 0, 0.55, 0, 0, 0.25, 0, 0.4, 0, 0.3, 0, 0.55, 0, 0.2, 0.65, 0],
};

const DENSITY_SCALE: Record<Density, number> = {
  sparse: 0.55,
  balanced: 1,
  dense: 1.35,
};

const STYLE_PROGRESSION: Record<StyleId, keyof typeof PROGRESSIONS> = {
  "night-drive": "night",
  warehouse: "warehouse",
  dusk: "dusk",
  pulse: "pulse",
  fog: "fog",
  ritual: "ritual",
};

function hitsFromMap(
  rng: Rng,
  map: ProbMap,
  bars: number,
  density: Density,
  opts?: { fillBoost?: boolean },
): DrumHit[] {
  const scale = DENSITY_SCALE[density];
  const hits: DrumHit[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const last = opts?.fillBoost && bar === bars - 1;
    for (let i = 0; i < STEPS_PER_BAR; i++) {
      let p = (map[i] ?? 0) * scale;
      if (last && i >= 12) p = Math.min(1, p + 0.22);
      if (bar > 0) p *= 0.92 + rng() * 0.16;
      if (chance(rng, p)) {
        const accent = i % 4 === 0;
        const vel = Math.min(1, Math.max(0.28, (accent ? 0.86 : 0.62) + jitter(rng, 0.14)));
        hits.push({ step: bar * STEPS_PER_BAR + i, vel });
      }
    }
  }
  return hits;
}

function generateDrums(rng: Rng, params: GenParams): DrumPattern {
  const { styleId, bars, density } = params;
  return {
    kick: hitsFromMap(rng, KICK[styleId], bars, density),
    snare: hitsFromMap(rng, SNARE[styleId], bars, density, { fillBoost: true }),
    hat: hitsFromMap(rng, HAT[styleId], bars, density),
    openHat: hitsFromMap(rng, OPEN[styleId], bars, density),
    perc: hitsFromMap(rng, PERC[styleId], bars, density, { fillBoost: styleId === "ritual" }),
  };
}

function generatePad(rng: Rng, params: GenParams): PadChord[] {
  const prog = PROGRESSIONS[STYLE_PROGRESSION[params.styleId]]!;
  const bars = params.bars;
  const chords: PadChord[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const slot = prog[bar % prog.length]!;
    const degrees = slot.degrees.slice();
    if (params.density === "dense" && !degrees.includes(7) && chance(rng, 0.5)) {
      degrees.push(7);
    }
    if (params.density === "sparse" && degrees.length > 3 && chance(rng, 0.4)) {
      degrees.pop();
    }
    chords.push({
      bar,
      numeral: slot.numeral || romanNumeral(degrees[0] ?? 1, params.mode),
      name: chordName(params.key, params.mode, degrees),
      degrees,
    });
  }
  return chords;
}

function occupied(notes: BassNote[], step: number): boolean {
  return notes.some((n) => step >= n.step && step < n.step + n.length);
}

function generateBass(rng: Rng, params: GenParams, drums: DrumPattern, pad: PadChord[]): BassNote[] {
  const steps = totalSteps(params.bars);
  const notes: BassNote[] = [];
  const style = params.styleId;

  const lengths =
    style === "dusk" || style === "fog" || style === "ritual"
      ? [4, 6, 8]
      : style === "warehouse"
        ? [2, 2, 4]
        : [2, 3, 4];

  const walk =
    style === "pulse" || style === "fog" || style === "night-drive"
      ? 0.55
      : style === "warehouse"
        ? 0.25
        : 0.35;

  const densityBoost = params.density === "dense" ? 0.2 : params.density === "sparse" ? -0.18 : 0;

  for (let step = 0; step < steps; ) {
    if (occupied(notes, step)) {
      step++;
      continue;
    }

    const bar = Math.floor(step / STEPS_PER_BAR);
    const chord = pad[bar] ?? pad[0]!;
    const inBar = step % STEPS_PER_BAR;
    const onKick = drums.kick.some((h) => h.step === step);
    const onSnare = drums.snare.some((h) => h.step === step);
    const downbeat = inBar === 0;

    const place =
      downbeat ||
      onKick ||
      (onSnare && chance(rng, 0.45 + densityBoost)) ||
      chance(rng, walk + densityBoost);

    if (!place) {
      step++;
      continue;
    }

    let degree: number;
    if (downbeat || onKick) {
      degree = chance(rng, 0.78) ? 1 : pick(rng, chord.degrees);
    } else if (onSnare) {
      degree = pick(rng, [5, 7, chord.degrees[0] ?? 1]);
    } else {
      degree = pick(rng, [1, 3, 5, 7, 4, 6]);
    }

    let octave = 2;
    if (style === "warehouse" && chance(rng, 0.25)) octave = 3;
    if (style === "pulse" && chance(rng, 0.2)) octave = 1;

    let length = pick(rng, lengths);
    if (downbeat && (style === "dusk" || style === "ritual")) length = Math.max(length, 6);
    if (step + length > steps) length = steps - step;
    while (length > 1 && occupied(notes, step + length - 1)) length--;

    notes.push({
      step,
      length: Math.max(1, length),
      degree,
      octave,
      vel: downbeat ? 0.9 : 0.68 + jitter(rng, 0.1),
    });
    step += Math.max(1, length);
  }

  return notes;
}

function setName(params: GenParams): string {
  return `${getStyle(params.styleId).name} in ${params.key} ${params.mode}`;
}

export function generateSet(params: GenParams): GeneratedSet {
  const style = getStyle(params.styleId);
  const rng = mulberry32(params.seed);
  const drums = generateDrums(rng, params);
  const pad = generatePad(rng, params);
  const bass = generateBass(rng, params, drums, pad);
  const hex = (params.seed >>> 0).toString(16).padStart(8, "0");
  return {
    id: `${params.styleId}-${params.key.toLowerCase()}-${hex}`,
    name: setName(params),
    params,
    drums,
    bass,
    pad,
    kit: { ...style.kit },
    mix: {
      ...style.mix,
      bpm: params.bpm,
      swing: params.swing,
    },
  };
}

export function generateStem(
  current: GeneratedSet,
  stem: "drums" | "pad" | "bass",
  seedOffset = 1,
): GeneratedSet {
  const params: GenParams = {
    ...current.params,
    seed: (current.params.seed + seedOffset * 7919) >>> 0,
  };
  const next = generateSet(params);
  if (stem === "drums") return { ...current, drums: next.drums, kit: next.kit };
  if (stem === "pad") {
    const bass = generateBass(mulberry32(params.seed + 3), current.params, current.drums, next.pad);
    return { ...current, pad: next.pad, bass };
  }
  return { ...current, bass: next.bass };
}

export const DEFAULT_PARAMS: GenParams = {
  seed: 0x5e7a001,
  styleId: "night-drive",
  key: "F#",
  mode: "minor",
  bpm: 94,
  bars: 4,
  swing: 0.08,
  density: "balanced",
};
