import type { AvatarColorId } from "@/lib/design/tokens";

/**
 * Still used by every game board + game-surface.tsx + solo-game-shell.tsx —
 * the shape of a room roster entry, independent of which backend produced
 * it. The Supabase-row-shaped types/mappers that used to live alongside this
 * (RoomRow, RoomPlayerRow, mapRoomRow, mapRoomPlayerRow) were deleted along
 * with the rest of src/lib/multiplayer's Supabase-era code — see
 * src/lib/realtime/protocol.ts's LiveRoomPlayer for the equivalent shape
 * the current backend uses.
 */
export interface RoomPlayer {
  id: string;
  playerId: string;
  nickname: string;
  avatarColor: AvatarColorId;
  isHost: boolean;
  isReady: boolean;
  connectionStatus: "connected" | "disconnected";
  seat: number | null;
}
