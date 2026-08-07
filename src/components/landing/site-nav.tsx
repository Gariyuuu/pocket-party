import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsMenu } from "@/components/settings-menu";

export function SiteNav() {
  return (
    <header className="safe-top sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-party text-white">
            <PartyPopper className="size-4" />
          </span>
          <span className="text-gradient-party">Pocket Party</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link href="/lobby" className="text-muted-foreground transition-colors hover:text-foreground">
            Public rooms
          </Link>
          <Link href="/leaderboard" className="text-muted-foreground transition-colors hover:text-foreground">
            Leaderboard
          </Link>
          <Link href="/profile" className="text-muted-foreground transition-colors hover:text-foreground">
            Profile
          </Link>
          <Link href="/patch-notes" className="text-muted-foreground transition-colors hover:text-foreground">
            Patch notes
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <SettingsMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
