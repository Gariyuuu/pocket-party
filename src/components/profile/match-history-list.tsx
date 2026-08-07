import { EmptyState } from "@/components/ui/state-panel";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { getGameMeta, type GameId } from "@/games/core/registry";

export interface MatchHistoryEntry {
  matchId: string;
  gameId: string;
  result: "win" | "loss" | "draw" | "abandoned" | null;
  score: number;
  endedAt: string | null;
  opponents: { displayName: string }[];
}

export function MatchHistoryList({ entries }: { entries: MatchHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No matches yet"
        description="Finish a game and it'll show up here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const meta = getGameMeta(entry.gameId as GameId);
        return (
          <li key={entry.matchId} className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="font-medium">{meta?.name ?? entry.gameId}</p>
              <p className="text-xs text-muted-foreground">
                vs {entry.opponents.map((o) => o.displayName).join(", ") || "—"}
              </p>
            </div>
            <Badge
              variant={
                entry.result === "win" ? "default" : entry.result === "draw" ? "outline" : "secondary"
              }
            >
              {entry.result === "win" ? "Won" : entry.result === "draw" ? "Draw" : "Lost"}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
