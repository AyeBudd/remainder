import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useHideAmounts } from "@/hooks/use-hide-amounts";
import type { AppView } from "@/lib/view";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <rect x="2" y="10" width="20" height="4" rx="2" className="fill-muted-foreground/40" />
      <rect x="2" y="10" width="13" height="4" rx="2" className="fill-foreground" />
    </svg>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-secondary" />;
  }
  if (!user) {
    return (
      <Button asChild variant="outline">
        <Link to="/login">Sign in</Link>
      </Button>
    );
  }
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-11 items-center gap-2 rounded-full px-1.5 pr-3 text-sm transition-colors hover:bg-secondary"
        >
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="size-8 rounded-full object-cover outline outline-1 -outline-offset-1 outline-foreground/10"
            />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-medium">
              {label.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="hidden max-w-36 truncate sm:inline">{label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-3 py-2 text-xs text-muted-foreground">Signed in</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">Account settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut("/")}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type Props = {
  view?: AppView;
  onViewChange?: (view: AppView) => void;
};

export function SiteHeader({ view = "ledger", onViewChange }: Props) {
  return (
    <header className="flex h-16 items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-1">
        {onViewChange && <AppNav view={view} onChange={onViewChange} />}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-foreground"
          onClick={() => onViewChange?.("ledger")}
        >
          <Mark />
          <span className="font-serif text-xl tracking-tight">Remaindr</span>
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <HideAmountsButton />
        <AuthSlot />
      </div>
    </header>
  );
}

function HideAmountsButton() {
  const { hidden, toggle } = useHideAmounts();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      title={hidden ? "Show amounts" : "Hide amounts"}
    >
      {hidden ? <EyeOff /> : <Eye />}
    </Button>
  );
}
