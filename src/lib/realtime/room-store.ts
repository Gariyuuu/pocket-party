import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { liveRooms } from "@/lib/db/schema";
import { createEmptyRoom, type StoredRoomState } from "./room-state";
import type { RoomStateEvent } from "./protocol";

/**
 * Reads/writes the same `StoredRoomState` shape a PartyKit Durable Object
 * used to hold in its own in-memory storage — now a single JSONB row in
 * Neon (`live_rooms`), since Ably has no compute or storage of its own and
 * the Next.js API route calling this is stateless between requests. See
 * DECISIONS.md D-018.
 */

export async function loadRoomState(code: string): Promise<StoredRoomState> {
  const db = getDb();
  const [row] = await db.select().from(liveRooms).where(eq(liveRooms.code, code));
  if (!row) return createEmptyRoom(code);
  return row.state as StoredRoomState;
}

export async function saveRoomState(state: StoredRoomState): Promise<void> {
  const db = getDb();
  await db
    .insert(liveRooms)
    .values({ code: state.code, state })
    .onConflictDoUpdate({
      target: liveRooms.code,
      set: { state, updatedAt: new Date() },
    });
}

export async function deleteRoomState(code: string): Promise<void> {
  const db = getDb();
  await db.delete(liveRooms).where(eq(liveRooms.code, code));
}

/**
 * Shared by both `GET /api/rooms/[code]` (the initial-state fetch a client
 * makes on mount, replacing what a PartyKit Durable Object's onConnect used
 * to send automatically) and `POST /api/rooms/[code]/action` (published to
 * Ably after every accepted action).
 */
export function toRoomStateEvent(state: StoredRoomState): RoomStateEvent {
  return {
    room: {
      code: state.code,
      hostId: state.hostId,
      selectedGameId: state.selectedGameId,
      isPublic: state.isPublic,
      maxPlayers: state.maxPlayers,
      modifiers: state.modifiers,
      status: state.status,
    },
    players: state.players,
    match: state.match
      ? {
          id: state.match.id,
          gameId: state.match.gameId,
          status: state.match.status,
          seed: state.match.seed,
          modifiers: state.match.modifiers,
          winnerPlayerId: state.match.winnerPlayerId,
          isDraw: state.match.isDraw,
        }
      : null,
    gameState: state.match?.gameState ?? null,
    sequence: state.match?.sequence ?? 0,
    updatedAt: state.updatedAt,
  };
}
