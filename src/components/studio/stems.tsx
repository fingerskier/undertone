import type { ReactNode } from "react";
import { Lock, LockOpen, RefreshCw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { DrumPattern, StemId } from "@/lib/music/types";
import { STEPS_PER_BAR } from "@/lib/music/types";
import { useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

const LANES: { key: keyof DrumPattern; label: string }[] = [
  { key: "kick", label: "Kick" },
  { key: "snare", label: "Snare" },
  { key: "hat", label: "Hat" },
  { key: "openHat", label: "Open" },
  { key: "perc", label: "Perc" },
];

export function StemDeck() {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      <DrumGrid />
      <PadPanel />
      <BassRoll />
    </div>
  );
}

function ChannelChrome({
  stem,
  title,
  children,
}: {
  stem: StemId;
  title: string;
  children: ReactNode;
}) {
  const mix = useStudio((s) => s.mix);
  const lock = useStudio((s) => s.lock[stem]);
  const toggleMute = useStudio((s) => s.toggleMute);
  const toggleSolo = useStudio((s) => s.toggleSolo);
  const toggleLock = useStudio((s) => s.toggleLock);
  const setGain = useStudio((s) => s.setGain);
  const regenerateStem = useStudio((s) => s.regenerateStem);

  return (
    <section className="flex min-w-0 flex-col rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
        <div className="flex items-center gap-1">
          <IconToggle pressed={mix.mute[stem]} onClick={() => toggleMute(stem)} label="Mute">
            M
          </IconToggle>
          <IconToggle pressed={mix.solo[stem]} onClick={() => toggleSolo(stem)} label="Solo">
            S
          </IconToggle>
          <button
            type="button"
            onClick={() => toggleLock(stem)}
            className="grid size-9 place-items-center rounded-sm text-muted hover:text-fg"
            aria-pressed={lock}
            aria-label={lock ? "Unlock stem" : "Lock stem"}
          >
            {lock ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => regenerateStem(stem)}
            className="grid size-9 place-items-center rounded-sm text-muted hover:text-fg"
            aria-label={`Regenerate ${title}`}
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
      <div className="mt-4 flex items-center gap-3">
        <Volume2 className="size-4 text-subtle" />
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[mix.gain[stem]]}
          onValueChange={([v]) => setGain(stem, v ?? 0)}
        />
      </div>
    </section>
  );
}

function IconToggle({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      className={cn(
        "grid size-9 place-items-center rounded-sm font-mono text-xs",
        pressed ? "bg-fg text-bg" : "text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function DrumGrid() {
  const drums = useStudio((s) => s.current.drums);
  const bars = useStudio((s) => s.current.params.bars);
  const step = useStudio((s) => s.currentStep);
  const toggleHit = useStudio((s) => s.toggleHit);
  const cols = bars * STEPS_PER_BAR;

  return (
    <ChannelChrome stem="drums" title="Drums">
      <div className="-mx-1 overflow-x-auto">
        <div className="min-w-deck space-y-1.5 px-1">
          {LANES.map((lane) => (
            <div key={lane.key} className="grid grid-cols-[auto_1fr] items-center gap-2">
              <span className="w-12 font-mono text-xs tracking-wide text-subtle uppercase">
                {lane.label}
              </span>
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: cols }, (_, i) => {
                  const hit = drums[lane.key].find((h) => h.step === i);
                  const beat = i % 4 === 0;
                  const active = step === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleHit(lane.key, i)}
                      aria-label={`${lane.label} step ${i + 1}`}
                      className={cn(
                        "h-7 rounded-xs transition-colors duration-150",
                        hit ? "bg-fg" : beat ? "bg-surface-2" : "bg-surface",
                        active && "ring-1 ring-accent",
                      )}
                      style={hit ? { opacity: 0.45 + hit.vel * 0.55 } : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChannelChrome>
  );
}

function PadPanel() {
  const pad = useStudio((s) => s.current.pad);
  const bars = useStudio((s) => s.current.params.bars);
  const step = useStudio((s) => s.currentStep);
  const currentBar = Math.floor(step / STEPS_PER_BAR) % bars;

  return (
    <ChannelChrome stem="pad" title="Pad">
      <div className="grid grid-cols-2 gap-2">
        {pad.map((chord) => (
          <div
            key={chord.bar}
            className={cn(
              "flex min-h-24 flex-col justify-between rounded-md bg-surface p-3 transition-colors duration-150",
              currentBar === chord.bar && "bg-surface-2 shadow-[var(--shadow-border-hover)]",
            )}
          >
            <span className="font-mono text-xs text-subtle">Bar {chord.bar + 1}</span>
            <div>
              <p className="font-display text-3xl leading-none tracking-tight">{chord.name}</p>
              <p className="mt-1 text-sm text-muted">{chord.numeral}</p>
            </div>
          </div>
        ))}
      </div>
    </ChannelChrome>
  );
}

function BassRoll() {
  const bass = useStudio((s) => s.current.bass);
  const bars = useStudio((s) => s.current.params.bars);
  const step = useStudio((s) => s.currentStep);
  const cols = bars * STEPS_PER_BAR;
  const degrees = [8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <ChannelChrome stem="bass" title="Bass">
      <div className="-mx-1 overflow-x-auto">
        <div className="min-w-deck space-y-1 px-1">
          {degrees.map((deg) => (
            <div key={deg} className="grid grid-cols-[auto_1fr] items-center gap-2">
              <span className="w-12 font-mono text-xs text-subtle">{deg === 8 ? "8" : deg}</span>
              <div className="relative h-5">
                <div
                  className="absolute inset-0 grid gap-0.5"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: cols }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xs",
                        step === i ? "bg-surface-2" : i % 4 === 0 ? "bg-surface" : "bg-bg",
                      )}
                    />
                  ))}
                </div>
                {bass
                  .filter((n) => n.degree === deg || (deg === 8 && n.degree === 1 && n.octave >= 3))
                  .map((n) => (
                    <div
                      key={`${n.step}-${n.degree}-${n.octave}`}
                      className="absolute top-0 h-5 rounded-xs bg-fg"
                      style={{
                        left: `${(n.step / cols) * 100}%`,
                        width: `${(n.length / cols) * 100}%`,
                        opacity: 0.5 + n.vel * 0.45,
                      }}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChannelChrome>
  );
}

export function LibraryPanel() {
  const open = useStudio((s) => s.libraryOpen);
  const library = useStudio((s) => s.library);
  const loadSaved = useStudio((s) => s.loadSaved);
  const removeSaved = useStudio((s) => s.removeSaved);
  const setLibraryOpen = useStudio((s) => s.setLibraryOpen);
  if (!open) return null;

  return (
    <aside className="rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-tight">Library</h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => setLibraryOpen(false)}>
          Close
        </Button>
      </div>
      {library.length === 0 ? (
        <p className="text-sm text-muted">
          Saved sets stay on this device. Sign in to keep a cloud copy as well.
        </p>
      ) : (
        <ul className="space-y-2">
          {library.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => loadSaved(item)}
              >
                <p className="truncate text-sm text-fg">{item.name}</p>
                <p className="font-mono text-xs text-subtle">
                  {item.set.params.bpm} bpm · {item.set.params.key} {item.set.params.mode}
                </p>
              </button>
              <button
                type="button"
                className="text-xs text-muted hover:text-fg"
                onClick={() => removeSaved(item.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
