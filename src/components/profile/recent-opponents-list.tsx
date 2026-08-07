import { EmptyState } from "@/components/ui/state-panel";
import { PlayerBadge } from "@/components/ui/player-badge";
import { AVATAR_COLOR_OPTIONS } from "@/lib/design/tokens";
import { Users } from "lucide-react";

export interface RecentOpponent {
  displayName: string;
  avatarColor: string;
  timesPlayed: number;
}

export function RecentOpponentsList({ opponents }: { opponents: RecentOpponent[] }) {
  if (opponents.length === 0) {
    return (
      <EmptyState icon={Users} title="No recent opponents" description="Play a match to start building this list." />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {opponents.map((opponent, i) => (
        <li key={`${opponent.displayName}-${i}`} className="flex items-center justify-between rounded-xl border p-3">
          <PlayerBadge
            name={opponent.displayName}
            color={AVATAR_COLOR_OPTIONS.find((c) => c.id === opponent.avatarColor)?.value ?? "var(--color-party-violet)"}
            size="sm"
          />
          <span className="text-xs text-muted-foreground">
            {opponent.timesPlayed} {opponent.timesPlayed === 1 ? "match" : "matches"}
          </span>
        </li>
      ))}
    </ul>
  );
}
