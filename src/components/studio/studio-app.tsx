import { useEffect } from "react";
import { Toaster } from "sonner";
import { type SearchParams, useStudio } from "@/lib/store";
import { StudioHeader } from "./header";
import { LibraryPanel, StemDeck } from "./stems";
import { Transport } from "./transport";

export function StudioApp({ search }: { search: SearchParams }) {
  const loadFromSearch = useStudio((s) => s.loadFromSearch);
  const togglePlay = useStudio((s) => s.togglePlay);
  const generate = useStudio((s) => s.generate);
  const stop = useStudio((s) => s.stop);

  useEffect(() => {
    loadFromSearch(search);
  }, [loadFromSearch, search]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        void togglePlay();
      }
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        generate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [generate, togglePlay]);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5 px-4 py-6 pb-24 sm:px-6 sm:py-8">
        <StudioHeader />
        <p className="max-w-xl text-sm text-muted">
          A drum machine, an ambient pad, and a bass line — generated as one locked set. Change
          the room, then listen.
        </p>
        <Transport />
        <LibraryPanel />
        <StemDeck />
      </div>
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          className: "bg-surface text-fg border-border",
        }}
      />
    </div>
  );
}
