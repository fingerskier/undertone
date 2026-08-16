import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StudioApp } from "@/components/studio/studio-app";
import { AppErrorBoundary } from "@/lib/error-component";
import type { SearchParams } from "@/lib/store";
import "./styles.css";

function readSearch(): SearchParams {
  const q = new URLSearchParams(window.location.search);
  const get = (key: string) => q.get(key) ?? undefined;
  return {
    seed: get("seed"),
    style: get("style"),
    key: get("key"),
    mode: get("mode"),
    bpm: get("bpm"),
    bars: get("bars"),
    swing: get("swing"),
    density: get("density"),
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <StudioApp search={readSearch()} />
    </AppErrorBoundary>
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
