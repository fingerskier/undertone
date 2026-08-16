import type { ReactNode } from "react";
import { Download, Pause, Play, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { saveCloudSet } from "@/lib/library";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { KEYS, type Bars, type Density, type ModeName } from "@/lib/music/types";
import { STYLES } from "@/lib/music/styles";
import { seedToHex } from "@/lib/music/rng";
import { useStudio } from "@/lib/store";
import { MasterMeter } from "./meter";

const selectClass =
  "h-11 rounded-sm bg-bg px-3 text-sm text-fg shadow-[var(--shadow-border)] focus-visible:outline-none";

export function Transport() {
  const current = useStudio((s) => s.current);
  const playing = useStudio((s) => s.playing);
  const exporting = useStudio((s) => s.exporting);
  const togglePlay = useStudio((s) => s.togglePlay);
  const generate = useStudio((s) => s.generate);
  const applyParams = useStudio((s) => s.applyParams);
  const exportWav = useStudio((s) => s.exportWav);
  const saveLocal = useStudio((s) => s.saveLocal);
  const user = useCurrentUser();
  const params = current.params;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied");
    } catch {
      toast("Could not copy link");
    }
  };

  const persist = () => {
    saveLocal();
    const latest = useStudio.getState().library[0];
    if (user && latest) {
      void saveCloudSet({ data: latest }).catch(() => {
        /* duplicate or unsigned */
      });
    }
    toast("Set saved");
  };

  return (
    <section className="min-w-0 rounded-xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="solid"
            size="lg"
            className="min-w-28"
            onClick={() => void togglePlay()}
            aria-pressed={playing}
          >
            {playing ? <Pause /> : <Play className="ml-0.5" />}
            {playing ? "Stop" : "Play"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={generate}>
            <RefreshCw />
            Generate
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={exporting}
            onClick={() => void exportWav()}
          >
            <Download />
            {exporting ? "Rendering" : "WAV"}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={copyLink}>
            <Share2 />
            Share
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={persist}>
            Save
          </Button>
          <div className="ml-auto hidden min-w-48 flex-1 md:block">
            <MasterMeter />
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          {STYLES.map((style) => {
            const active = params.styleId === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => applyParams({ styleId: style.id })}
                className={`h-11 shrink-0 rounded-full px-4 text-sm transition-[background-color,color] duration-150 ${
                  active ? "bg-fg text-bg" : "bg-surface text-muted hover:text-fg"
                }`}
              >
                {style.name}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted">{current.name}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Key">
            <select
              className={selectClass}
              value={params.key}
              onChange={(e) => applyParams({ key: e.target.value as (typeof KEYS)[number] })}
            >
              {KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mode">
            <select
              className={selectClass}
              value={params.mode}
              onChange={(e) => applyParams({ mode: e.target.value as ModeName })}
            >
              <option value="minor">Minor</option>
              <option value="dorian">Dorian</option>
              <option value="major">Major</option>
            </select>
          </Field>
          <Field label="Bars">
            <select
              className={selectClass}
              value={params.bars}
              onChange={(e) => applyParams({ bars: Number(e.target.value) as Bars })}
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
            </select>
          </Field>
          <Field label="Density">
            <select
              className={selectClass}
              value={params.density}
              onChange={(e) => applyParams({ density: e.target.value as Density })}
            >
              <option value="sparse">Sparse</option>
              <option value="balanced">Balanced</option>
              <option value="dense">Dense</option>
            </select>
          </Field>
          <Field label={`Tempo  ${params.bpm}`}>
            <Slider
              min={60}
              max={140}
              step={1}
              value={[params.bpm]}
              onValueChange={([v]) => applyParams({ bpm: v ?? params.bpm }, false)}
            />
          </Field>
          <Field label={`Swing  ${Math.round(params.swing * 100)}`}>
            <Slider
              min={0}
              max={0.55}
              step={0.01}
              value={[params.swing]}
              onValueChange={([v]) => applyParams({ swing: v ?? params.swing }, false)}
            />
          </Field>
        </div>

        <p className="font-mono text-xs text-subtle">
          seed {seedToHex(params.seed)} · space plays · g generates
        </p>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-xs tracking-wide text-subtle uppercase">{label}</span>
      {children}
    </label>
  );
}
