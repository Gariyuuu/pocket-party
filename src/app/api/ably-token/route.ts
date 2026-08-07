import { NextResponse, type NextRequest } from "next/server";
import { getCurrentActor } from "@/lib/identity/get-current-actor";
import { createRoomTokenRequest } from "@/lib/realtime/ably-server";
import { normalizeRoomCode, isPlausibleRoomCode } from "@/lib/multiplayer/room-code";
import { logError } from "@/lib/log";

/**
 * Resolves (and provisions, if needed) the caller's profiles row, then
 * mints an Ably TokenRequest scoped to exactly one room's channel, with the
 * caller's profileId as the Ably clientId. Called by use-realtime-room.ts
 * as Ably's own `authUrl` — the client SDK exchanges this for a real,
 * short-lived token and renews it automatically before it expires. Replaces
 * the old custom-signed room token (src/lib/party/room-token.ts, removed)
 * — Ably's own token-auth mechanism does the signing now, and there's no
 * longer a separate Worker runtime that couldn't call Clerk directly.
 */
export async function GET(request: NextRequest) {
  try {
    const code = normalizeRoomCode(request.nextUrl.searchParams.get("code") ?? "");
    if (!isPlausibleRoomCode(code)) {
      return NextResponse.json({ error: "malformed_payload", message: "Missing or invalid room code." }, { status: 400 });
    }
    const actor = await getCurrentActor();
    const tokenRequest = await createRoomTokenRequest(actor.profileId, code);
    return NextResponse.json(tokenRequest);
  } catch (error) {
    logError("api/ably-token:GET", error);
    return NextResponse.json({ error: "internal_error", message: "Something went wrong." }, { status: 500 });
  }
}
