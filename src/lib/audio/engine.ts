import { degreeToMidi } from "@/lib/music/theory";
import type { GeneratedSet, StemId } from "@/lib/music/types";
import { STEPS_PER_BAR } from "@/lib/music/types";
import {
  makeImpulse,
  makeSaturation,
  playBassNote,
  playHat,
  playKick,
  playPerc,
  playSnare,
  startPadVoices,
  type PadVoice,
} from "./synths";

export interface MixerState {
  mute: Record<StemId, boolean>;
  solo: Record<StemId, boolean>;
  gain: Record<StemId, number>;
  master: number;
}

const LOOKAHEAD = 0.025;
const SCHEDULE_AHEAD = 0.14;

function audible(stem: StemId, mix: MixerState): boolean {
  const anySolo = mix.solo.drums || mix.solo.pad || mix.solo.bass;
  if (anySolo) return mix.solo[stem] && !mix.mute[stem];
  return !mix.mute[stem];
}

export class StudioEngine {
  private ctx: AudioContext | null = null;
  private set: GeneratedSet | null = null;
  private mix: MixerState = {
    mute: { drums: false, pad: false, bass: false },
    solo: { drums: false, pad: false, bass: false },
    gain: { drums: 0.85, pad: 0.72, bass: 0.8 },
    master: 0.85,
  };

  private drumsGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private padDuck: GainNode | null = null;
  private bassGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private delay: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private analyser: AnalyserNode | null = null;

  private timer: number | null = null;
  private reverbDecay = -1;
  private nextNoteTime = 0;
  private currentStep = 0;
  private playing = false;
  private padVoice: PadVoice | null = null;
  private lastPadBar = -1;
  private lastBassMidi: number | null = null;
  private onStep: ((step: number) => void) | null = null;

  isPlaying(): boolean {
    return this.playing;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  setOnStep(cb: ((step: number) => void) | null): void {
    this.onStep = cb;
  }

  async ensure(): Promise<AudioContext> {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.buildGraph(ctx);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  private buildGraph(ctx: AudioContext): void {
    const drums = ctx.createGain();
    const pad = ctx.createGain();
    const duck = ctx.createGain();
    const bass = ctx.createGain();
    const master = ctx.createGain();
    const sat = makeSaturation(ctx);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.008;
    comp.release.value = 0.18;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.05;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;

    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 1.8);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.28;

    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.4;
    const fb = ctx.createGain();
    fb.gain.value = 0.25;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.12;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(delayGain);

    drums.connect(master);
    pad.connect(duck);
    duck.connect(master);
    bass.connect(master);
    drums.connect(reverb);
    pad.connect(reverb);
    drums.connect(delay);
    reverb.connect(reverbGain);
    reverbGain.connect(master);
    delayGain.connect(master);

    master.connect(sat);
    sat.connect(comp);
    comp.connect(limiter);
    limiter.connect(analyser);
    analyser.connect(ctx.destination);

    this.drumsGain = drums;
    this.padGain = pad;
    this.padDuck = duck;
    this.bassGain = bass;
    this.masterGain = master;
    this.delay = delay;
    this.delayGain = delayGain;
    this.reverb = reverb;
    this.analyser = analyser;
    this.applyMixer();
  }

  load(set: GeneratedSet): void {
    this.set = set;
    this.applyMixCharacter();
    if (this.playing) {
      this.lastPadBar = -1;
    }
  }

  setMixer(mix: MixerState): void {
    this.mix = mix;
    this.applyMixer();
  }

  private applyMixer(): void {
    const ctx = this.ctx;
    if (!ctx || !this.drumsGain || !this.padGain || !this.bassGain || !this.masterGain) return;
    const now = ctx.currentTime;
    this.drumsGain.gain.setTargetAtTime(audible("drums", this.mix) ? this.mix.gain.drums : 0, now, 0.03);
    this.padGain.gain.setTargetAtTime(audible("pad", this.mix) ? this.mix.gain.pad : 0, now, 0.03);
    this.bassGain.gain.setTargetAtTime(audible("bass", this.mix) ? this.mix.gain.bass : 0, now, 0.03);
    this.masterGain.gain.setTargetAtTime(this.mix.master, now, 0.03);
  }

  private applyMixCharacter(): void {
    const ctx = this.ctx;
    const set = this.set;
    if (!ctx || !set || !this.delay || !this.delayGain || !this.reverb) return;
    const spb = 60 / set.params.bpm;
    this.delay.delayTime.setTargetAtTime(Math.min(1.8, set.mix.delayBeats * spb), ctx.currentTime, 0.05);
    this.delayGain.gain.setTargetAtTime(set.mix.delayMix, ctx.currentTime, 0.05);
    // Impulse synthesis fills sampleRate*decay*2 samples — only rebuild when the
    // decay actually changes, not on every load/slider tick.
    if (set.mix.reverbDecay !== this.reverbDecay) {
      this.reverbDecay = set.mix.reverbDecay;
      this.reverb.buffer = makeImpulse(ctx, set.mix.reverbDecay);
    }
  }

  async play(): Promise<void> {
    const ctx = await this.ensure();
    if (this.playing) return;
    this.applyMixCharacter();
    this.applyMixer();
    this.playing = true;
    this.currentStep = 0;
    this.lastPadBar = -1;
    this.lastBassMidi = null;
    this.nextNoteTime = ctx.currentTime + 0.06;
    this.scheduler();
    this.timer = window.setInterval(() => this.scheduler(), LOOKAHEAD * 1000);
  }

  stop(): void {
    this.playing = false;
    if (this.timer != null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    const now = this.ctx?.currentTime ?? 0;
    this.padVoice?.stop(now);
    this.padVoice = null;
    this.lastPadBar = -1;
    this.currentStep = 0;
    this.onStep?.(0);
  }

  private secondsPerStep(): number {
    const bpm = this.set?.params.bpm ?? 94;
    return 60 / bpm / 4;
  }

  private swingOffset(step: number): number {
    if (step % 2 === 0) return 0;
    const swing = this.set?.params.swing ?? 0;
    return swing * this.secondsPerStep() * 0.66;
  }

  private scheduler(): void {
    const ctx = this.ctx;
    const set = this.set;
    if (!ctx || !set || !this.playing) return;
    const steps = set.params.bars * STEPS_PER_BAR;
    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const step = this.currentStep;
      const time = this.nextNoteTime + this.swingOffset(step);
      this.scheduleStep(set, step, time);
      const captured = step;
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (this.playing) this.onStep?.(captured);
      }, delayMs);
      this.nextNoteTime += this.secondsPerStep();
      this.currentStep = (step + 1) % steps;
    }
  }

  private scheduleStep(set: GeneratedSet, step: number, time: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.drumsGain || !this.bassGain || !this.padGain || !this.padDuck) return;
    const bar = Math.floor(step / STEPS_PER_BAR) % set.params.bars;

    if (bar !== this.lastPadBar) {
      this.lastPadBar = bar;
      const chord = set.pad[bar] ?? set.pad[0];
      if (chord) {
        this.padVoice?.stop(time);
        const midis = chord.degrees.map((d, i) =>
          degreeToMidi(set.params.key, set.params.mode, d, i === 0 ? 3 : 4),
        );
        this.padVoice = startPadVoices(
          ctx,
          this.padGain,
          time,
          midis,
          set.mix.padFilter,
          set.mix.padMovement,
        );
      }
    }

    const kick = set.drums.kick.find((h) => h.step === step);
    if (kick) {
      playKick(ctx, this.drumsGain, time, kick.vel, set.kit);
      if (set.mix.sidechain > 0) {
        const duck = this.padDuck.gain;
        const depth = 1 - set.mix.sidechain * 0.7;
        duck.cancelScheduledValues(time);
        duck.setValueAtTime(1, time);
        duck.linearRampToValueAtTime(depth, time + 0.035);
        duck.exponentialRampToValueAtTime(1, time + 0.26);
      }
    }
    const snare = set.drums.snare.find((h) => h.step === step);
    if (snare) playSnare(ctx, this.drumsGain, time, snare.vel, set.kit);
    const hat = set.drums.hat.find((h) => h.step === step);
    if (hat) playHat(ctx, this.drumsGain, time, hat.vel, set.kit, false);
    const open = set.drums.openHat.find((h) => h.step === step);
    if (open) playHat(ctx, this.drumsGain, time, open.vel, set.kit, true);
    const perc = set.drums.perc.find((h) => h.step === step);
    if (perc) playPerc(ctx, this.drumsGain, time, perc.vel, set.kit);

    const note = set.bass.find((n) => n.step === step);
    if (note) {
      const midi = degreeToMidi(set.params.key, set.params.mode, note.degree, note.octave);
      const dur = note.length * this.secondsPerStep() * 0.94;
      playBassNote(
        ctx,
        this.bassGain,
        time,
        dur,
        midi,
        note.vel,
        set.mix.bassCutoff,
        set.mix.bassSub,
        this.lastBassMidi,
      );
      this.lastBassMidi = midi;
    }
  }

  async renderWav(): Promise<Blob> {
    const set = this.set;
    if (!set) throw new Error("Nothing to export");
    const sr = 44100;
    const steps = set.params.bars * STEPS_PER_BAR;
    const stepDur = 60 / set.params.bpm / 4;
    const duration = steps * stepDur + 1.4;
    const ctx = new OfflineAudioContext(2, Math.ceil(duration * sr), sr);

    const drums = ctx.createGain();
    const pad = ctx.createGain();
    const duck = ctx.createGain();
    const bass = ctx.createGain();
    const master = ctx.createGain();
    drums.gain.value = audible("drums", this.mix) ? this.mix.gain.drums : 0;
    pad.gain.value = audible("pad", this.mix) ? this.mix.gain.pad : 0;
    bass.gain.value = audible("bass", this.mix) ? this.mix.gain.bass : 0;
    master.gain.value = this.mix.master;
    const sat = makeSaturation(ctx);
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, set.mix.reverbDecay);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.28;
    const delay = ctx.createDelay(2);
    delay.delayTime.value = Math.min(1.8, set.mix.delayBeats * (60 / set.params.bpm));
    const fb = ctx.createGain();
    fb.gain.value = set.mix.delayFeedback;
    const delayGain = ctx.createGain();
    delayGain.gain.value = set.mix.delayMix;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(delayGain);

    drums.connect(master);
    pad.connect(duck);
    duck.connect(master);
    bass.connect(master);
    drums.connect(reverb);
    pad.connect(reverb);
    drums.connect(delay);
    reverb.connect(reverbGain);
    reverbGain.connect(master);
    delayGain.connect(master);
    master.connect(sat);
    sat.connect(ctx.destination);

    let lastPad = -1;
    let padVoice: PadVoice | null = null;
    let lastBass: number | null = null;
    for (let step = 0; step < steps; step++) {
      const swing = step % 2 === 1 ? set.params.swing * stepDur * 0.66 : 0;
      const time = 0.05 + step * stepDur + swing;
      const bar = Math.floor(step / STEPS_PER_BAR);
      if (bar !== lastPad) {
        lastPad = bar;
        const chord = set.pad[bar] ?? set.pad[0];
        if (chord) {
          padVoice?.stop(time);
          const midis = chord.degrees.map((d, i) =>
            degreeToMidi(set.params.key, set.params.mode, d, i === 0 ? 3 : 4),
          );
          padVoice = startPadVoices(ctx, pad, time, midis, set.mix.padFilter, set.mix.padMovement);
        }
      }
      const kick = set.drums.kick.find((h) => h.step === step);
      if (kick) {
        playKick(ctx, drums, time, kick.vel, set.kit);
        if (set.mix.sidechain > 0) {
          const depth = 1 - set.mix.sidechain * 0.7;
          duck.gain.setValueAtTime(1, time);
          duck.gain.linearRampToValueAtTime(depth, time + 0.035);
          duck.gain.exponentialRampToValueAtTime(1, time + 0.26);
        }
      }
      const snare = set.drums.snare.find((h) => h.step === step);
      if (snare) playSnare(ctx, drums, time, snare.vel, set.kit);
      const hat = set.drums.hat.find((h) => h.step === step);
      if (hat) playHat(ctx, drums, time, hat.vel, set.kit, false);
      const open = set.drums.openHat.find((h) => h.step === step);
      if (open) playHat(ctx, drums, time, open.vel, set.kit, true);
      const perc = set.drums.perc.find((h) => h.step === step);
      if (perc) playPerc(ctx, drums, time, perc.vel, set.kit);
      const note = set.bass.find((n) => n.step === step);
      if (note) {
        const midi = degreeToMidi(set.params.key, set.params.mode, note.degree, note.octave);
        playBassNote(
          ctx,
          bass,
          time,
          note.length * stepDur * 0.94,
          midi,
          note.vel,
          set.mix.bassCutoff,
          set.mix.bassSub,
          lastBass,
        );
        lastBass = midi;
      }
    }
    padVoice?.stop(0.05 + steps * stepDur);

    const rendered = await ctx.startRendering();
    return encodeWav(rendered);
  }
}

function encodeWav(buffer: AudioBuffer): Blob {
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  const sr = buffer.sampleRate;
  const bytes = len * ch * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * ch * 2, true);
  view.setUint16(32, ch * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, bytes, true);
  const channels: Float32Array[] = [];
  for (let c = 0; c < ch; c++) channels.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c]![i]!));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

let singleton: StudioEngine | null = null;

export function getEngine(): StudioEngine {
  singleton ??= new StudioEngine();
  return singleton;
}
