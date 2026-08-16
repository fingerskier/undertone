import { midiToFreq } from "@/lib/music/theory";
import type { KitCharacter } from "@/lib/music/types";

function envGain(
  ctx: BaseAudioContext,
  start: number,
  attack: number,
  decay: number,
  peak: number,
  end = 0.0001,
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + Math.max(0.004, attack));
  g.gain.exponentialRampToValueAtTime(end, start + Math.max(0.02, decay));
  return g;
}

function noiseBuffer(ctx: BaseAudioContext, seconds = 1): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return data && buffer;
}

let sharedNoise: WeakMap<BaseAudioContext, AudioBuffer> | null = null;

function getNoise(ctx: BaseAudioContext): AudioBuffer {
  sharedNoise ??= new WeakMap();
  let buf = sharedNoise.get(ctx);
  if (!buf) {
    buf = noiseBuffer(ctx, 1.5);
    sharedNoise.set(ctx, buf);
  }
  return buf;
}

function playNoise(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  filterType: BiquadFilterType,
  freq: number,
  q: number,
  attack: number,
  decay: number,
  gain: number,
): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, time);
  filter.Q.setValueAtTime(q, time);
  const g = envGain(ctx, time, attack, decay, gain);
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start(time);
  src.stop(time + decay + 0.02);
}

export function playKick(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  vel: number,
  kit: KitCharacter,
): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(kit.kickStart, time);
  osc.frequency.exponentialRampToValueAtTime(kit.kickEnd, time + 0.07);
  const g = envGain(ctx, time, 0.004, kit.kickDecay, 0.95 * vel);
  osc.connect(g);
  g.connect(dest);
  osc.start(time);
  osc.stop(time + kit.kickDecay + 0.04);

  const click = ctx.createOscillator();
  click.type = "square";
  click.frequency.setValueAtTime(kit.kickStart * 8, time);
  const cg = envGain(ctx, time, 0.001, 0.018, 0.12 * vel);
  click.connect(cg);
  cg.connect(dest);
  click.start(time);
  click.stop(time + 0.03);
}

export function playSnare(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  vel: number,
  kit: KitCharacter,
): void {
  playNoise(ctx, dest, time, "bandpass", 1800, 0.85, 0.002, kit.snareDecay, kit.snareNoise * vel);

  const tone = ctx.createOscillator();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(kit.snareTone, time);
  tone.frequency.exponentialRampToValueAtTime(kit.snareTone * 0.7, time + 0.08);
  const tg = envGain(ctx, time, 0.002, kit.snareDecay * 0.85, 0.28 * vel);
  tone.connect(tg);
  tg.connect(dest);
  tone.start(time);
  tone.stop(time + kit.snareDecay + 0.03);

  if (kit.clap) {
    playNoise(ctx, dest, time + 0.012, "highpass", 1200, 0.7, 0.001, 0.06, 0.22 * vel);
    playNoise(ctx, dest, time + 0.024, "highpass", 1400, 0.7, 0.001, 0.05, 0.16 * vel);
  }
}

export function playHat(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  vel: number,
  kit: KitCharacter,
  open: boolean,
): void {
  const decay = open ? kit.hatDecay * 6.5 : kit.hatDecay;
  const ratios = [2, 3.14, 4.16, 5.43, 6.79];
  const mix = ctx.createGain();
  mix.gain.value = 1;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(kit.hatColor * 0.7, time);
  const g = envGain(ctx, time, 0.001, decay, (open ? 0.18 : 0.14) * vel);
  mix.connect(hp);
  hp.connect(g);
  g.connect(dest);

  for (const r of ratios) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(kit.hatColor * 0.22 * r, time);
    const og = ctx.createGain();
    og.gain.value = 0.22;
    osc.connect(og);
    og.connect(mix);
    osc.start(time);
    osc.stop(time + decay + 0.02);
  }

  playNoise(ctx, dest, time, "highpass", kit.hatColor, 0.6, 0.001, decay, (open ? 0.16 : 0.1) * vel);
}

export function playPerc(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  vel: number,
  kit: KitCharacter,
): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(kit.percPitch, time);
  osc.frequency.exponentialRampToValueAtTime(kit.percPitch * 0.55, time + 0.09);
  const g = envGain(ctx, time, 0.003, 0.18, 0.42 * vel);
  osc.connect(g);
  g.connect(dest);
  osc.start(time);
  osc.stop(time + 0.22);
  playNoise(ctx, dest, time, "bandpass", kit.percPitch * 2.2, 1.4, 0.002, 0.08, 0.12 * vel);
}

export function playBassNote(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  duration: number,
  midi: number,
  vel: number,
  cutoff: number,
  subAmt: number,
  prevMidi: number | null,
): void {
  const freq = midiToFreq(midi);
  const startFreq = prevMidi == null ? freq : midiToFreq(prevMidi);
  const glide = prevMidi == null ? 0.004 : 0.028;

  const saw = ctx.createOscillator();
  saw.type = "sawtooth";
  saw.frequency.setValueAtTime(startFreq, time);
  saw.frequency.exponentialRampToValueAtTime(Math.max(20, freq), time + glide);

  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(startFreq / 2, time);
  sub.frequency.exponentialRampToValueAtTime(Math.max(20, freq / 2), time + glide);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.setValueAtTime(1.1, time);
  filter.frequency.setValueAtTime(cutoff * 2.4, time);
  filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff), time + 0.12);

  const g = ctx.createGain();
  const peak = 0.28 * vel;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.012);
  g.gain.setValueAtTime(peak, time + Math.max(0.04, duration - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  const sg = ctx.createGain();
  sg.gain.value = subAmt * 0.35;

  saw.connect(filter);
  filter.connect(g);
  g.connect(dest);
  sub.connect(sg);
  sg.connect(g);

  saw.start(time);
  sub.start(time);
  saw.stop(time + duration + 0.02);
  sub.stop(time + duration + 0.02);
}

export interface PadVoice {
  stop: (time: number) => void;
}

export function startPadVoices(
  ctx: BaseAudioContext,
  dest: AudioNode,
  time: number,
  midis: number[],
  filterHz: number,
  movement: number,
): PadVoice {
  const voices: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  const filters: BiquadFilterNode[] = [];
  const lfos: OscillatorNode[] = [];

  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, time);
  bus.gain.exponentialRampToValueAtTime(0.22, time + 0.7);
  bus.connect(dest);

  midis.forEach((midi, i) => {
    const freq = midiToFreq(midi);
    const detune = [-7, 6, 0][i % 3]!;
    const osc = ctx.createOscillator();
    osc.type = i % 3 === 2 ? "sine" : "sawtooth";
    osc.frequency.value = i % 3 === 2 ? freq / 2 : freq;
    osc.detune.value = detune;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    filter.frequency.value = filterHz;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.05 + i * 0.017;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = filterHz * movement * 0.55;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const g = ctx.createGain();
    g.gain.value = i % 3 === 2 ? 0.35 : 0.18;

    osc.connect(filter);
    filter.connect(g);
    g.connect(bus);
    osc.start(time);
    lfo.start(time);
    voices.push(osc);
    gains.push(g);
    filters.push(filter);
    lfos.push(lfo);
  });

  return {
    stop(when: number) {
      bus.gain.cancelScheduledValues(when);
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), when);
      bus.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
      const halt = when + 0.6;
      for (const n of voices) {
        try {
          n.stop(halt);
        } catch {
          /* already stopped */
        }
      }
      for (const n of lfos) {
        try {
          n.stop(halt);
        } catch {
          /* already stopped */
        }
      }
    },
  };
}

export function makeImpulse(ctx: BaseAudioContext, decay: number): AudioBuffer {
  const seconds = Math.max(0.4, decay);
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * decay * 0.38));
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return buffer;
}

export function makeSaturation(ctx: BaseAudioContext): WaveShaperNode {
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 128 - 1;
    curve[i] = Math.tanh(x * 1.35);
  }
  const shaper = ctx.createWaveShaper();
  shaper.curve = curve;
  shaper.oversample = "2x";
  return shaper;
}
