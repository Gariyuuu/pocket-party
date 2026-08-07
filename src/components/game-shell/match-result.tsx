"use client";

import { motion } from "framer-motion";
import { Trophy, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchResultProps {
  outcome: "win" | "draw";
  winnerName?: string;
  isMe: boolean;
  isHost: boolean;
  onRematch?: () => void;
  onBackToLobby?: () => void;
  onLeave: () => void;
  busy?: boolean;
}

export function MatchResult({
  outcome,
  winnerName,
  isMe,
  isHost,
  onRematch,
  onBackToLobby,
  onLeave,
  busy,
}: MatchResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 rounded-2xl border p-8 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-gradient-party text-white">
        {outcome === "win" ? <Trophy className="size-7" /> : <Handshake className="size-7" />}
      </div>
      <h2 className="font-display text-2xl font-bold">
        {outcome === "draw" ? "It's a draw!" : isMe ? "You won!" : `${winnerName ?? "Opponent"} won!`}
      </h2>

      <div className="flex flex-wrap justify-center gap-2">
        {isHost ? (
          <>
            <Button onClick={onRematch} disabled={busy}>
              Rematch
            </Button>
            <Button variant="secondary" onClick={onBackToLobby} disabled={busy}>
              Back to lobby
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Waiting for the host to rematch or return to the lobby…</p>
        )}
        <Button variant="ghost" onClick={onLeave}>
          Leave room
        </Button>
      </div>
    </motion.div>
  );
}
