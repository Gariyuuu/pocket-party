import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { publicRoomListings } from "@/lib/db/schema";
import type { StoredRoomState } from "./room-state";

/**
 * `public_room_listings` is a discovery index, not a source of truth
 * (DECISIONS.md D-015) — `live_rooms` remains the only authoritative owner
 * of room state. Called from the action route's saveRoomState() on every
 * single accepted action, so there's exactly one place that can forget to
 * keep the listing in sync, not one per action type.
 */

function connectedCount(state: StoredRoomState): number {
  return state.players.filter((p) => p.connectionStatus === "connected").length;
}

export async function syncPublicListing(state: StoredRoomState): Promise<void> {
  const db = getDb();
  const shouldBeListed = state.isPublic && state.status === "lobby";

  if (!shouldBeListed) {
    await db.delete(publicRoomListings).where(eq(publicRoomListings.code, state.code));
    return;
  }

  await db
    .insert(publicRoomListings)
    .values({
      code: state.code,
      selectedGameId: state.selectedGameId,
      playerCount: connectedCount(state),
      maxPlayers: state.maxPlayers,
    })
    .onConflictDoUpdate({
      target: publicRoomListings.code,
      set: {
        selectedGameId: state.selectedGameId,
        playerCount: connectedCount(state),
        maxPlayers: state.maxPlayers,
        updatedAt: new Date(),
      },
    });
}

/** Called from the cron cleanup route's idle-room sweep, and from leaveRoom's "room now empty" path. */
export async function removePublicListing(code: string): Promise<void> {
  const db = getDb();
  await db.delete(publicRoomListings).where(eq(publicRoomListings.code, code));
}
