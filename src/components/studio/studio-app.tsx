import { useEffect } from "react";
import { Toaster } from "sonner";
import { listCloudSets } from "@/lib/library";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { type SearchParams, useStudio } from "@/lib/store";
import { StudioHeader } from "./header";
import { LibraryPanel, StemDeck } from "./stems";
import { Transport } from "./transport";

export function StudioApp({ search }: { search: SearchParams }) {
  const loadFromSearch = useStudio((s) => s.loadFromSearch);
  const togglePlay = useStudio((s) => s.togglePlay);
  const generate = useStudio((s) => s.generate);
  const stop = useStudio((s) => s.stop);
  const setLibrary = useStudio((s) => s.setLibrary);
  const { user } = useCurrentUserState();

  useEffect(() => {
    loadFromSearch(search);
  }, [
    loadFromSearch,
    search.seed,
    search.style,
    search.key,
    search.mode,
    search.bpm,
    search.bars,
    search.swing,
    search.density,
  ]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) {
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

  useEffect(() => {
    if (!user) return;
    void listCloudSets()
      .then((cloud) => {
        const local = useStudio.getState().library;
        const seen = new Set(cloud.map((s) => s.id));
        setLibrary([...cloud, ...local.filter((s) => !seen.has(s.id))]);
      })
      .catch(() => {
        /* guest or network */
      });
  }, [user, setLibrary]);

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
