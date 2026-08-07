import { NextResponse } from "next/server";
import { normalizeRoomCode } from "@/lib/multiplayer/room-code";
import { loadRoomState, toRoomStateEvent } from "@/lib/realtime/room-store";
import { logError } from "@/lib/log";

/**
 * The initial-state fetch every client makes once on mount, before its Ably
 * subscription is even set up — replaces what a PartyKit Durable Object's
 * onConnect used to send automatically the moment a WebSocket connected.
 * Read-only: a room with no `live_rooms` row yet (nobody has ever joined
 * it) returns a fresh empty-lobby state without writing anything — the
 * first real write happens on "join" (see the action route).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  try {
    const state = await loadRoomState(code);
    return NextResponse.json(toRoomStateEvent(state));
  } catch (error) {
    logError("api/rooms/[code]:GET", error, { roomCode: code });
    return NextResponse.json({ error: "internal_error", message: "Something went wrong." }, { status: 500 });
  }
}
