"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSeenTutorials } from "@/lib/identity/use-seen-tutorials";
import type { GameContent } from "@/games/core/game-content";
import type { GameId } from "@/games/core/registry";

export function TutorialOverlay({
  gameId,
  title,
  content,
}: {
  gameId: GameId;
  title: string;
  content: GameContent;
}) {
  const seen = useSeenTutorials((s) => s.seen[gameId]);
  const markSeen = useSeenTutorials((s) => s.markSeen);

  return (
    <Dialog open={!seen} onOpenChange={(open) => !open && markSeen(gameId)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">How to play {title}</DialogTitle>
          <DialogDescription>Quick tips before you jump in.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {content.tutorial.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={() => markSeen(gameId)} className="w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
