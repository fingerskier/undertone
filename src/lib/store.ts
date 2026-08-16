import { create } from "zustand";
import { getEngine, type MixerState } from "@/lib/audio/engine";
import { DEFAULT_PARAMS, generateSet, generateStem } from "@/lib/music/generate";
import { randomSeed, seedFromHex, seedToHex } from "@/lib/music/rng";
import { getStyle } from "@/lib/music/styles";
import type {
  Density,
  GeneratedSet,
  GenParams,
  KeyName,
  ModeName,
  SavedSet,
  StemId,
  StyleId,
} from "@/lib/music/types";

export interface StudioStore {
  current: GeneratedSet;
  playing: boolean;
  currentStep: number;
  exporting: boolean;
  mix: MixerState;
  lock: Record<StemId, boolean>;
  library: SavedSet[];
  libraryOpen: boolean;
  applyParams: (partial: Partial<GenParams>, regenerate?: boolean) => void;
  generate: () => void;
  regenerateStem: (stem: StemId) => void;
  toggleHit: (lane: keyof GeneratedSet["drums"], step: number) => void;
  setMix: (patch: Partial<MixerState> | ((m: MixerState) => MixerState)) => void;
  toggleMute: (stem: StemId) => void;
  toggleSolo: (stem: StemId) => void;
  toggleLock: (stem: StemId) => void;
  setGain: (stem: StemId, value: number) => void;
  play: () => Promise<void>;
  stop: () => void;
  togglePlay: () => Promise<void>;
  exportWav: () => Promise<void>;
  saveLocal: (name?: string) => void;
  loadSaved: (saved: SavedSet) => void;
  removeSaved: (id: string) => void;
  setLibrary: (items: SavedSet[]) => void;
  setLibraryOpen: (open: boolean) => void;
  loadFromSearch: (search: SearchParams) => void;
}

export interface SearchParams {
  seed?: string;
  style?: string;
  key?: string;
  mode?: string;
  bpm?: string;
  bars?: string;
  swing?: string;
  density?: string;
}

const LOCAL_KEY = "undertone.library";

function readLocalLibrary(): SavedSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalLibrary(items: SavedSet[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(items.slice(0, 40)));
}

function pushUrl(params: GenParams): void {
  if (typeof window === "undefined") return;
  const q = new URLSearchParams({
    seed: seedToHex(params.seed),
    style: params.styleId,
    key: params.key,
    mode: params.mode,
    bpm: String(params.bpm),
    bars: String(params.bars),
    swing: String(params.swing),
    density: params.density,
  });
  const next = `${window.location.pathname}?${q.toString()}`;
  window.history.replaceState(null, "", next);
}

function syncEngine(set: GeneratedSet, mix: MixerState): void {
  if (typeof window === "undefined") return;
  const engine = getEngine();
  engine.load(set);
  engine.setMixer(mix);
}

export function paramsFromSearch(search: SearchParams): GenParams {
  const styleId = (["night-drive", "warehouse", "dusk", "pulse", "fog", "ritual"] as StyleId[]).includes(
    search.style as StyleId,
  )
    ? (search.style as StyleId)
    : DEFAULT_PARAMS.styleId;
  const style = getStyle(styleId);
  const bpm = Number(search.bpm);
  const swing = Number(search.swing);
  const bars = Number(search.bars);
  return {
    seed: search.seed ? seedFromHex(search.seed) : DEFAULT_PARAMS.seed,
    styleId,
    key: (search.key as KeyName) || style.key,
    mode: (search.mode as ModeName) || style.mode,
    bpm: Number.isFinite(bpm) && bpm >= 50 && bpm <= 180 ? bpm : style.bpm,
    bars: bars === 2 ? 2 : 4,
    swing: Number.isFinite(swing) && swing >= 0 && swing <= 0.7 ? swing : style.swing,
    density: (["sparse", "balanced", "dense"] as Density[]).includes(search.density as Density)
      ? (search.density as Density)
      : "balanced",
  };
}

export const useStudio = create<StudioStore>((set, get) => ({
  current: generateSet(DEFAULT_PARAMS),
  playing: false,
  currentStep: 0,
  exporting: false,
  mix: {
    mute: { drums: false, pad: false, bass: false },
    solo: { drums: false, pad: false, bass: false },
    gain: { drums: 0.85, pad: 0.72, bass: 0.8 },
    master: 0.85,
  },
  lock: { drums: false, pad: false, bass: false },
  library: [],
  libraryOpen: false,

  applyParams: (partial, regenerate = true) => {
    const params = { ...get().current.params, ...partial };
    if (partial.styleId && !partial.bpm && !partial.key) {
      const style = getStyle(partial.styleId);
      params.bpm = style.bpm;
      params.key = style.key;
      params.mode = style.mode;
      params.swing = style.swing;
    }
    if (!regenerate) {
      const current = { ...get().current, params, mix: { ...get().current.mix, bpm: params.bpm, swing: params.swing } };
      set({ current });
      syncEngine(current, get().mix);
      pushUrl(params);
      return;
    }
    const next = generateSet(params);
    const { lock, current } = get();
    if (lock.drums) next.drums = current.drums;
    if (lock.pad) next.pad = current.pad;
    if (lock.bass) next.bass = current.bass;
    set({ current: next, currentStep: 0 });
    syncEngine(next, get().mix);
    pushUrl(next.params);
  },

  generate: () => {
    const params = { ...get().current.params, seed: randomSeed() };
    const next = generateSet(params);
    const { lock, current } = get();
    if (lock.drums) next.drums = current.drums;
    if (lock.pad) next.pad = current.pad;
    if (lock.bass) next.bass = current.bass;
    set({ current: next, currentStep: 0 });
    syncEngine(next, get().mix);
    pushUrl(next.params);
  },

  regenerateStem: (stem) => {
    const next = generateStem(get().current, stem, Date.now() % 997);
    set({ current: next, currentStep: 0 });
    syncEngine(next, get().mix);
    pushUrl(next.params);
  },

  toggleHit: (lane, step) => {
    const current = get().current;
    const hits = current.drums[lane];
    const exists = hits.find((h) => h.step === step);
    const nextHits = exists ? hits.filter((h) => h.step !== step) : [...hits, { step, vel: 0.8 }];
    const next = { ...current, drums: { ...current.drums, [lane]: nextHits } };
    set({ current: next });
    syncEngine(next, get().mix);
  },

  setMix: (patch) => {
    const mix = typeof patch === "function" ? patch(get().mix) : { ...get().mix, ...patch };
    set({ mix });
    if (typeof window !== "undefined") getEngine().setMixer(mix);
  },

  toggleMute: (stem) => {
    const mix = {
      ...get().mix,
      mute: { ...get().mix.mute, [stem]: !get().mix.mute[stem] },
    };
    set({ mix });
    if (typeof window !== "undefined") getEngine().setMixer(mix);
  },

  toggleSolo: (stem) => {
    const mix = {
      ...get().mix,
      solo: { ...get().mix.solo, [stem]: !get().mix.solo[stem] },
    };
    set({ mix });
    if (typeof window !== "undefined") getEngine().setMixer(mix);
  },

  toggleLock: (stem) => {
    set({ lock: { ...get().lock, [stem]: !get().lock[stem] } });
  },

  setGain: (stem, value) => {
    const mix = { ...get().mix, gain: { ...get().mix.gain, [stem]: value } };
    set({ mix });
    if (typeof window !== "undefined") getEngine().setMixer(mix);
  },

  play: async () => {
    const engine = getEngine();
    engine.setOnStep((step) => set({ currentStep: step }));
    engine.load(get().current);
    engine.setMixer(get().mix);
    await engine.play();
    set({ playing: true });
  },

  stop: () => {
    getEngine().stop();
    set({ playing: false, currentStep: 0 });
  },

  togglePlay: async () => {
    if (get().playing) get().stop();
    else await get().play();
  },

  exportWav: async () => {
    set({ exporting: true });
    try {
      const engine = getEngine();
      engine.load(get().current);
      engine.setMixer(get().mix);
      const blob = await engine.renderWav();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${get().current.id}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      set({ exporting: false });
    }
  },

  saveLocal: (name) => {
    const item: SavedSet = {
      id: `${get().current.id}-${Date.now()}`,
      name: name?.trim() || get().current.name,
      createdAt: new Date().toISOString(),
      set: get().current,
    };
    const library = [item, ...get().library].slice(0, 40);
    set({ library });
    writeLocalLibrary(library);
  },

  loadSaved: (saved) => {
    set({ current: saved.set, currentStep: 0 });
    syncEngine(saved.set, get().mix);
    pushUrl(saved.set.params);
  },

  removeSaved: (id) => {
    const library = get().library.filter((s) => s.id !== id);
    set({ library });
    writeLocalLibrary(library);
  },

  setLibrary: (items) => set({ library: items }),
  setLibraryOpen: (open) => set({ libraryOpen: open }),

  loadFromSearch: (search) => {
    const params = paramsFromSearch(search);
    const next = generateSet(params);
    set({ current: next, currentStep: 0, library: readLocalLibrary() });
    syncEngine(next, get().mix);
  },
}));
