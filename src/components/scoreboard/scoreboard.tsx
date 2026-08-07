import { cn } from "@/lib/utils";
import { PlayerBadge, type PlayerBadgeShape } from "@/components/ui/player-badge";

export interface ScoreboardEntry {
  playerId: string;
  name: string;
  color: string;
  shape: PlayerBadgeShape;
  wins: number;
  isYou?: boolean;
}

interface ScoreboardProps {
  entries: ScoreboardEntry[];
  className?: string;
}

/** Session scoreboard — tracks wins across rematches within one room, not persisted account history. */
export function Scoreboard({ entries, className }: ScoreboardProps) {
  const sorted = [...entries].sort((a, b) => b.wins - a.wins);

  return (
    <div className={cn("rounded-2xl border p-4", className)}>
      <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Session scoreboard
      </h3>
      <ul className="flex flex-col gap-2">
        {sorted.map((entry) => (
          <li key={entry.playerId} className="flex items-center justify-between gap-3">
            <PlayerBadge
              name={entry.name}
              color={entry.color}
              shape={entry.shape}
              isYou={entry.isYou}
              size="sm"
            />
            <span className="font-display text-lg font-bold tabular-nums">{entry.wins}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
