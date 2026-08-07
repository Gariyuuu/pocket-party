"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AVAILABLE_GAMES } from "@/games/core/registry";
import { GameCard } from "@/components/ui/game-card";
import type { GameId } from "@/games/core/registry";
import { cn } from "@/lib/utils";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function PlaySoloButton() {
  const [open, setOpen] = useState(false);
  const [gameId, setGameId] = useState<GameId | null>(null);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("medium");
  const router = useRouter();

  function handleStart() {
    if (!gameId) return;
    router.push(`/game/${gameId}?mode=solo&difficulty=${difficulty}`);
  }

  return (
    <>
      <Button size="lg" variant="outline" onClick={() => setOpen(true)}>
        Play Solo
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Play solo vs a bot</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {AVAILABLE_GAMES.map((game) => (
              <GameCard key={game.id} game={game} selected={gameId === game.id} onSelect={setGameId} />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Difficulty</Label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors",
                    difficulty === d ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleStart} disabled={!gameId} className="w-full">
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
