import { Library } from "lucide-react";
import { useStudio } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function StudioHeader() {
  const libraryOpen = useStudio((s) => s.libraryOpen);
  const setLibraryOpen = useStudio((s) => s.setLibraryOpen);

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">Set generator</p>
        <h1 className="font-display text-3xl leading-tight tracking-tight text-fg md:text-4xl">
          Undertone
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={libraryOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setLibraryOpen(!libraryOpen)}
        >
          <Library />
          Library
        </Button>
      </div>
    </header>
  );
}
