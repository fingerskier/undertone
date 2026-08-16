import { createFileRoute } from "@tanstack/react-router";
import { StudioApp } from "@/components/studio/studio-app";
import type { SearchParams } from "@/lib/store";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    seed: typeof search.seed === "string" ? search.seed : undefined,
    style: typeof search.style === "string" ? search.style : undefined,
    key: typeof search.key === "string" ? search.key : undefined,
    mode: typeof search.mode === "string" ? search.mode : undefined,
    bpm: typeof search.bpm === "string" ? search.bpm : undefined,
    bars: typeof search.bars === "string" ? search.bars : undefined,
    swing: typeof search.swing === "string" ? search.swing : undefined,
    density: typeof search.density === "string" ? search.density : undefined,
  }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  return <StudioApp search={search} />;
}
