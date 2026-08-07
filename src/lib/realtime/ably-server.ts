import "server-only";
import Ably from "ably";
import { getAblyApiKey } from "./env";
import type { RoomStateEvent } from "./protocol";

/**
 * Server-side Ably usage — minting scoped tokens for clients and publishing
 * state updates after an action is accepted. Never import this from a
 * "use client" file; the raw API key must stay server-only (see
 * SECURITY.md). The client SDK is a completely separate entry point
 * (`ably` exposes both from one package) — see use-realtime-room.ts.
 */

let cached: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest {
  if (!cached) cached = new Ably.Rest(getAblyApiKey());
  return cached;
}

export function roomChannelName(code: string): string {
  return `room:${code}`;
}

/**
 * Scoped to exactly one room's channel, with the caller's own resolved
 * profileId as the Ably `clientId` — this is what lets a client filter out
 * its own `"broadcast"` publishes (compare `message.connectionId` against
 * its own connection) without the server needing to track connections at
 * all, the same way party/game.ts's `[connection.id]` exclusion used to.
 * 1-hour TTL, matching the old signed room token's lifetime.
 */
export async function createRoomTokenRequest(
  profileId: string,
  code: string,
): Promise<Ably.TokenRequest> {
  const rest = getAblyRest();
  return rest.auth.createTokenRequest({
    clientId: profileId,
    capability: { [roomChannelName(code)]: ["subscribe", "publish", "presence"] },
    ttl: 60 * 60 * 1000,
  });
}

/** Published after every accepted room/match action — see the API route that calls this. */
export async function publishRoomState(code: string, event: RoomStateEvent): Promise<void> {
  const rest = getAblyRest();
  await rest.channels.get(roomChannelName(code)).publish("state", event);
}
