"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Maximize, Minimize } from "lucide-react";
import type { UseRealtimeRoomResult } from "@/lib/realtime/use-realtime-room";
import { GameSurface } from "./game-surface";
import { MatchResult } from "./match-result";
import { RulesModal } from "./rules-modal";
import { TutorialOverlay } from "./tutorial-overlay";
import { LandscapeHint } from "./landscape-hint";
import { PHYSICS_HEAVY_GAMES } from "./physics-heavy-games";
import { Button } from "@/components/ui/button";
import { GAME_CONTENT } from "@/games/core/game-content";
import { getGameMeta } from "@/games/core/registry";
import { playSfx } from "@/lib/audio/sfx";
import { vibrate } from "@/lib/audio/use-audio-settings";
import { useFullscreen } from "@/lib/design/use-fullscreen";
import type { LiveRoomPlayer } from "@/lib/realtime/protocol";

interface OnlineGameShellProps {
  roomCode: string;
  party: UseRealtimeRoomResult;
  myPlayerId: string;
  isHost: boolean;
  players: LiveRoomPlayer[];
}

/** Everything here comes from the shared useRealtimeRoom connection (see Lobby, which owns it) — actions POST to the room's action route, state updates arrive over Ably. */
export function OnlineGameShell({ roomCode, party, myPlayerId, isHost, players }: OnlineGameShellProps) {
  const router = useRouter();
  const { match, gameState: state } = party;
  const [busy, setBusy] = useState(false);
  const lastAnnouncedStatus = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen, supported: fullscreenSupported } = useFullscreen(
    () => containerRef.current,
  );

  const gameId = match?.gameId ?? null;
  const meta = gameId ? getGameMeta(gameId) : null;
  const content = gameId ? GAME_CONTENT[gameId] : null;

  useEffect(() => {
    if (!match || lastAnnouncedStatus.current === match.status) return;
    lastAnnouncedStatus.current = match.status;
    if (match.status === "completed") {
      if (match.isDraw) {
        playSfx("draw");
      } else {
        const won = match.winnerPlayerId === myPlayerId;
        playSfx(won ? "win" : "draw");
        vibrate(won ? [0, 60, 40, 60] : [0, 120]);
      }
    }
  }, [match, myPlayerId]);

  const onAction = useCallback(
    async (action: Record<string, unknown> & { type: string }) => {
      const result = await party.submitAction(action.type, action);
      if (!result.ok) {
        // Auto-fired timeout actions (advance-round, skip-turn) race across
        // every connected client by design — only one wins, and the rest
        // losing that race to a stale sequence is expected, not a real error.
        const isExpectedTimerRace =
          ["advance-round", "skip-turn", "start-serve", "end-round"].includes(action.type) &&
          result.error === "stale_sequence";
        if (!isExpectedTimerRace) {
          playSfx("error");
          vibrate(25);
          toast.error(result.message ?? "That move wasn't allowed.");
        }
        return;
      }
      playSfx(action.type === "place" || action.type === "drop" ? "place" : "select");
    },
    [party],
  );

  async function handleRematch() {
    setBusy(true);
    const result = await party.rematch();
    setBusy(false);
    if (!result.ok) toast.error(result.message ?? "Couldn't start a rematch.");
  }

  async function handleBackToLobby() {
    setBusy(true);
    const result = await party.returnToLobby();
    setBusy(false);
    if (!result.ok) toast.error(result.message ?? "Couldn't return to the lobby.");
  }

  function handleLeave() {
    party.leaveRoom();
    router.push("/");
  }

  if (!match || !state || !meta) {
    return <p className="p-8 text-center text-muted-foreground">Loading match…</p>;
  }

  const isMatchOver = match.status === "completed" || match.status === "abandoned";

  return (
    <div ref={containerRef} className="mx-auto flex max-w-lg flex-col items-center gap-4 bg-background p-4 py-8">
      <p className="sr-only" role="status" aria-live="polite">
        {isMatchOver
          ? match.isDraw
            ? `${meta.name} ended in a draw.`
            : `${meta.name} ended. ${players.find((p) => p.profileId === match.winnerPlayerId)?.nickname ?? "Opponent"} won.`
          : `${meta.name} round in progress.`}
      </p>
      <div className="flex w-full items-center justify-between">
        <h1 className="font-display text-xl font-bold">{meta.name}</h1>
        <div className="flex items-center">
          {fullscreenSupported && (
            <Button variant="ghost" size="icon" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </Button>
          )}
          {content && <RulesModal title={meta.name} content={content} />}
        </div>
      </div>

      {PHYSICS_HEAVY_GAMES.has(meta.id) && <LandscapeHint />}

      {content && <TutorialOverlay gameId={meta.id} title={meta.name} content={content} />}

      <GameSurface
        gameId={meta.id}
        state={state}
        myPlayerId={myPlayerId}
        players={players.map((p) => ({ ...p, playerId: p.profileId, id: p.profileId }))}
        onAction={onAction}
        disabled={isMatchOver}
        matchId={roomCode}
        broadcast={party}
      />

      {isMatchOver && (
        <MatchResult
          outcome={match.isDraw ? "draw" : "win"}
          winnerName={players.find((p) => p.profileId === match.winnerPlayerId)?.nickname}
          isMe={match.winnerPlayerId === myPlayerId}
          isHost={isHost}
          busy={busy}
          onRematch={handleRematch}
          onBackToLobby={handleBackToLobby}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
