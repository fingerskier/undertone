import { Library, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
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
        <AuthSlot />
      </div>
    </header>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-9 animate-pulse rounded-full bg-surface" />;
  }
  return (
    <>
      <SignedOut>
        <Button asChild variant="outline" size="sm">
          <Link to="/login">
            <UserRound />
            Sign in
          </Link>
        </Button>
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-2">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="size-8 rounded-full object-cover outline outline-1 -outline-offset-1 outline-fg/10"
            />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-surface text-xs text-muted">
              {(user?.displayName ?? "U").charAt(0).toUpperCase()}
            </span>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="hidden text-xs text-muted hover:text-fg sm:inline"
          >
            Sign out
          </button>
        </div>
      </SignedIn>
    </>
  );
}
