import type { GameId } from "@/games/core/registry";
import type { AvatarColorId } from "@/lib/design/tokens";

/**
 * Shared shapes between the client (use-realtime-room.ts) and the server
 * (src/app/api/rooms/[code]/action/route.ts). Two different transports
 * carry these now, deliberately: `RoomActionRequest` is the POST body for
 * every room/match action (a plain HTTP request, since the API route runs
 * in the same Next.js runtime as Clerk and can resolve identity directly —
 * unlike the old PartyKit Worker, there's no need for a signed room token
 * just to know who's calling); `RoomStateEvent` is what the server publishes
 * to Ably afterward so every *other* connected client finds out too. A
 * request's own response already tells the caller the outcome, so unlike
 * the old WebSocket protocol there's no first-message-wins correlation
 * problem to solve here — HTTP requests are inherently 1:1 with their
 * response.
 */

export interface LiveRoomPlayer {
  profileId: string;
  nickname: string;
  avatarColor: AvatarColorId;
  isHost: boolean;
  isReady: boolean;
  connectionStatus: "connected" | "disconnected";
  seat: number;
}

export interface LiveRoom {
  code: string;
  hostId: string | null;
  selectedGameId: GameId | null;
  isPublic: boolean;
  maxPlayers: number;
  modifiers: Record<string, unknown>;
  status: "lobby" | "in_game" | "finished" | "closed";
}

export interface LiveMatch {
  id: string;
  gameId: GameId;
  status: "active" | "completed" | "abandoned";
  seed: string;
  modifiers: Record<string, unknown>;
  winnerPlayerId: string | null;
  isDraw: boolean;
}

export type RoomActionRequest =
  | { type: "join"; nickname: string; avatarColor: AvatarColorId }
  | { type: "set-ready"; isReady: boolean }
  | { type: "select-game"; gameId: GameId }
  | { type: "set-visibility"; isPublic: boolean }
  | { type: "set-modifiers"; modifiers: Record<string, unknown> }
  | { type: "start" }
  | { type: "action"; actionType: string; payload: Record<string, unknown>; sequence: number }
  | { type: "rematch" }
  | { type: "return-to-lobby" }
  | { type: "leave" }
  | { type: "disconnect" };

export interface RoomStateEvent {
  room: LiveRoom;
  players: LiveRoomPlayer[];
  match: LiveMatch | null;
  gameState: unknown;
  sequence: number;
  /**
   * `StoredRoomState.updatedAt`, carried through so the client can ignore
   * an out-of-order arrival — there are now two independent sources of a
   * `RoomStateEvent` (the initial `GET /api/rooms/[code]` fetch on mount,
   * and Ably's ongoing "state" publishes), and unlike a single WebSocket
   * connection's message ordering, nothing guarantees which one lands
   * first. See use-realtime-room.ts.
   */
  updatedAt: number;
}

export interface RoomActionErrorResponse {
  error: string;
  message: string;
}

/**
 * The generic, unvalidated, never-persisted ephemeral pub/sub Orb Hockey
 * and Quick Draw use for high-frequency sync (paddle/puck position, pen
 * strokes) — published directly client-to-client over Ably's `"broadcast"`
 * event on the room's channel, never touching this app's server at all
 * (a genuine simplification over the PartyKit version, which had to relay
 * through the Durable Object even for messages it never inspected).
 */
export interface RoomBroadcastEvent {
  channel: string;
  payload: unknown;
}
