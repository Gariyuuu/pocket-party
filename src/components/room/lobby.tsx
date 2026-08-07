"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Copy, LogOut, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlayerBadge, type PlayerBadgeShape } from "@/components/ui/player-badge";
import { GameCard } from "@/components/ui/game-card";
import type { UseRealtimeRoomResult } from "@/lib/realtime/use-realtime-room";
import { AVATAR_COLOR_OPTIONS } from "@/lib/design/tokens";
import { ALL_GAMES, getGameMeta, type GameId } from "@/games/core/registry";
import { OnlineGameShell } from "@/components/game-shell/online-game-shell";
import { ThemedBackground } from "@/components/themed-background";

const SHAPES: PlayerBadgeShape[] = ["circle", "triangle", "square", "diamond"];

const WIND_CAPABLE_GAMES = new Set<GameId>(["bounce-cup", "mini-hoops"]);

function colorValue(id: string): string {
  return AVATAR_COLOR_OPTIONS.find((c) => c.id === id)?.value ?? "var(--color-party-violet)";
}

/**
 * Everything here comes from one useRealtimeRoom connection (passed down
 * from RoomPageClient) — actions POST to the room's action route, state
 * updates arrive over Ably. `connectionStatus` ("Reconnecting…" below) is a
 * best-effort client-side heuristic (a `sendBeacon` fired on
 * pagehide/visibilitychange — see use-realtime-room.ts), not a guaranteed
 * signal — there's no persistent server-side connection object to notice a
 * closed tab the way a PartyKit Durable Object's onClose once did. Honest
 * tradeoff for dropping Cloudflare's $5/mo minimum (see DECISIONS.md D-018).
 */
export function Lobby({ code, party }: { code: string; party: UseRealtimeRoomResult }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const { room, players, match, gameState, myPlayerId } = party;
  const me = useMemo(() => players.find((p) => p.profileId === myPlayerId), [players, myPlayerId]);
  const isHost = me?.isHost ?? false;

  async function handleCopyInvite() {
    const url = `${window.location.origin}/room/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  }

  function handleLeave() {
    party.leaveRoom();
    router.push("/");
  }

  async function handleStart() {
    setStarting(true);
    const result = await party.start();
    setStarting(false);
    if (!result.ok) toast.error(result.message ?? "Couldn't start the game.");
  }

  if (!room || !me) {
    return <p className="p-8 text-center text-muted-foreground">Loading room…</p>;
  }

  if ((room.status === "in_game" || room.status === "finished") && match && gameState) {
    return (
      <OnlineGameShell
        roomCode={code}
        party={party}
        myPlayerId={myPlayerId!}
        isHost={isHost}
        players={players}
      />
    );
  }

  const selectedMeta = room.selectedGameId ? getGameMeta(room.selectedGameId) : null;
  const connectedPlayers = players.filter((p) => p.connectionStatus === "connected");
  const allReady = connectedPlayers.length > 0 && connectedPlayers.every((p) => p.isReady);
  const countOk = selectedMeta
    ? connectedPlayers.length >= selectedMeta.minPlayers && connectedPlayers.length <= selectedMeta.maxPlayers
    : false;
  const canStart = isHost && selectedMeta?.status === "available" && allReady && countOk;

  let startDisabledReason = "Pick an available game first.";
  if (selectedMeta?.status === "available" && !countOk) {
    startDisabledReason = `${selectedMeta.name} needs ${selectedMeta.minPlayers === selectedMeta.maxPlayers ? selectedMeta.minPlayers : `${selectedMeta.minPlayers}-${selectedMeta.maxPlayers}`} players.`;
  } else if (selectedMeta?.status === "available" && !allReady) {
    startDisabledReason = "Everyone needs to be ready first.";
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <ThemedBackground className="absolute inset-0 -z-10" />
      <div className="relative mx-auto flex max-w-3xl flex-col gap-6 p-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/90 p-4 backdrop-blur-sm">
        <div>
          <p className="text-sm text-muted-foreground">Room code</p>
          <p className="font-mono text-2xl font-bold tracking-widest">{code}</p>
        </div>
        <Button variant="secondary" onClick={handleCopyInvite}>
          <Copy className="size-4" /> Copy invite link
        </Button>
      </div>

      <div className="rounded-2xl border bg-card/90 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-bold">
            <Users className="size-4" /> Players ({players.length}/{room.maxPlayers})
          </h2>
          {isHost && (
            <div className="flex items-center gap-2">
              <Label htmlFor="visibility" className="flex items-center gap-1 text-sm text-muted-foreground">
                {room.isPublic ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
                {room.isPublic ? "Public" : "Private"}
              </Label>
              <Switch
                id="visibility"
                checked={room.isPublic}
                onCheckedChange={(checked) => party.setVisibility(checked)}
              />
            </div>
          )}
        </div>

        <ul className="flex flex-col gap-3">
          {players.map((player, i) => (
            <li key={player.profileId} className="flex items-center justify-between">
              <PlayerBadge
                name={player.nickname}
                color={colorValue(player.avatarColor)}
                shape={SHAPES[i % SHAPES.length]}
                isHost={player.isHost}
                isReady={player.isReady}
                isYou={player.profileId === myPlayerId}
              />
              {player.connectionStatus === "disconnected" && (
                <Badge variant="outline" className="text-muted-foreground">
                  Reconnecting…
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border bg-card/90 p-4 backdrop-blur-sm">
        <h2 className="mb-3 font-display font-bold">Choose a game</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ALL_GAMES.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              selected={room.selectedGameId === game.id}
              onSelect={isHost ? (id) => party.selectGame(id) : undefined}
              disabled={!isHost}
            />
          ))}
        </div>
      </div>

      {selectedMeta && WIND_CAPABLE_GAMES.has(selectedMeta.id) && (
        <div className="rounded-2xl border bg-card/90 p-4 backdrop-blur-sm">
          <h2 className="mb-3 font-display font-bold">Party modifiers</h2>
          <div className="flex items-center justify-between">
            <Label htmlFor="wind-modifier" className="text-sm text-muted-foreground">
              Wind — adds a random gust to every shot
            </Label>
            <Switch
              id="wind-modifier"
              disabled={!isHost}
              checked={room.modifiers.windEnabled === true}
              onCheckedChange={(checked) => party.setModifiers({ ...room.modifiers, windEnabled: checked })}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {me && (
          <Button
            variant={me.isReady ? "secondary" : "default"}
            onClick={() => party.setReady(!me.isReady)}
          >
            {me.isReady ? "Not ready" : "I'm ready"}
          </Button>
        )}

        <div className="flex items-center gap-2">
          {isHost ? (
            canStart ? (
              <Button onClick={handleStart} disabled={starting}>
                {starting ? "Starting…" : "Start game"}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} />}>
                  <Button disabled>Start game</Button>
                </TooltipTrigger>
                <TooltipContent>{startDisabledReason}</TooltipContent>
              </Tooltip>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for the host to start…</p>
          )}
          <Button variant="ghost" onClick={handleLeave}>
            <LogOut className="size-4" /> Leave
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
