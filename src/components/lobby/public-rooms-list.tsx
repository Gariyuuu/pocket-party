"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state-panel";
import { IdentityDialog } from "@/components/room/identity-dialog";
import { getGameMeta, type GameId } from "@/games/core/registry";
import { Users } from "lucide-react";

interface PublicRoomListing {
  code: string;
  selectedGameId: GameId | null;
  playerCount: number;
  maxPlayers: number;
}

/**
 * Backed by a small Neon discovery index (see src/lib/party/public-rooms.ts)
 * kept in sync by party/game.ts — the room's actual state still lives
 * entirely in its PartyKit durable object; this table only answers "which
 * rooms are public and joinable right now" for browsing. Joining now just
 * navigates to /room/[code] with ?autojoin=1 (same as CreateRoomButton /
 * JoinRoomForm) — the PartySocket connection on that page does the rest.
 */
export function PublicRoomsList() {
  const [rooms, setRooms] = useState<PublicRoomListing[] | null>(null);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/public-rooms")
      .then(async (res) => {
        if (!res.ok) return [];
        const data = (await res.json()) as { rooms: PublicRoomListing[] };
        return data.rooms;
      })
      .then(setRooms)
      .catch(() => setRooms([]));
  }, []);

  async function handleConfirm() {
    if (!joiningCode) return;
    setJoiningCode(null);
    router.push(`/room/${joiningCode}?autojoin=1`);
  }

  if (rooms === null) {
    return <p className="text-center text-muted-foreground">Loading public rooms…</p>;
  }

  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No public rooms right now"
        description="Create a room and flip it to public from the lobby to see it listed here."
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {rooms.map((room) => {
          const meta = room.selectedGameId ? getGameMeta(room.selectedGameId) : null;
          return (
            <li
              key={room.code}
              className="flex items-center justify-between rounded-2xl border p-4"
            >
              <div>
                <p className="font-mono text-lg font-bold tracking-widest">{room.code}</p>
                <p className="text-sm text-muted-foreground">
                  {meta ? `${meta.name} — ` : ""}
                  {room.playerCount}/{room.maxPlayers} players
                </p>
              </div>
              <Button onClick={() => setJoiningCode(room.code)}>Join</Button>
            </li>
          );
        })}
      </ul>
      <IdentityDialog
        open={joiningCode !== null}
        onOpenChange={(open) => !open && setJoiningCode(null)}
        title={`Join room ${joiningCode ?? ""}`}
        description="Pick how you'll show up to your friends."
        confirmLabel="Join room"
        onConfirm={handleConfirm}
      />
    </>
  );
}
