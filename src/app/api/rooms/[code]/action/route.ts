import { NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/identity/get-current-actor";
import { checkRateLimit } from "@/lib/multiplayer/rate-limit";
import { normalizeRoomCode } from "@/lib/multiplayer/room-code";
import {
  applyGameAction,
  joinRoom,
  leaveRoom,
  markDisconnected,
  rematch,
  returnToLobby,
  selectGame,
  setModifiers,
  setReady,
  setVisibility,
  startMatch,
  type StoredRoomState,
} from "@/lib/realtime/room-state";
import { loadRoomState, saveRoomState, toRoomStateEvent } from "@/lib/realtime/room-store";
import { syncPublicListing } from "@/lib/realtime/public-rooms";
import { publishRoomState } from "@/lib/realtime/ably-server";
import { finalizeMatch } from "@/lib/realtime/finalize-match";
import { logError } from "@/lib/log";
import type { RoomActionRequest } from "@/lib/realtime/protocol";

/**
 * The single entry point every room/match action goes through — the direct
 * successor to party/game.ts's onMessage switch, now a stateless Next.js
 * API route instead of a stateful Durable Object (see DECISIONS.md D-018).
 * Loads the room's live state from Neon, delegates to the same pure
 * room-state.ts reducer PartyKit used, saves the result back, and publishes
 * it to Ably so every *other* connected client finds out — the caller
 * itself gets the new state directly in this response, no round-trip
 * through Ably needed for its own action.
 */
async function afterStateChange(state: StoredRoomState): Promise<void> {
  await saveRoomState(state);
  try {
    await syncPublicListing(state);
  } catch (error) {
    // The public-rooms directory is a discovery aid, not authoritative
    // state — never let a Neon hiccup block the room/match itself.
    logError("syncPublicListing", error, { roomCode: state.code });
  }
  await publishRoomState(state.code, toRoomStateEvent(state));
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeRoomCode(rawCode);

  try {
    const actor = await getCurrentActor();
    const msg = (await request.json().catch(() => null)) as RoomActionRequest | null;
    if (!msg || typeof msg.type !== "string") {
      return NextResponse.json({ error: "malformed_payload", message: "Malformed request." }, { status: 400 });
    }

    const now = Date.now();
    const state = await loadRoomState(code);

    switch (msg.type) {
      case "join": {
        const rate = checkRateLimit(`join:${code}:${actor.profileId}`, 5, 10_000);
        if (!rate.allowed) {
          return NextResponse.json({ error: "rate_limited", message: "Slow down a little." }, { status: 429 });
        }
        const result = joinRoom(state, actor.profileId, msg.nickname, msg.avatarColor);
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        await afterStateChange(result.value);
        return NextResponse.json(toRoomStateEvent(result.value));
      }

      case "set-ready": {
        const next = setReady(state, actor.profileId, msg.isReady);
        await afterStateChange(next);
        return NextResponse.json(toRoomStateEvent(next));
      }

      case "select-game": {
        const result = selectGame(state, actor.profileId, msg.gameId);
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        await afterStateChange(result.value);
        return NextResponse.json(toRoomStateEvent(result.value));
      }

      case "set-visibility": {
        const result = setVisibility(state, actor.profileId, msg.isPublic);
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        await afterStateChange(result.value);
        return NextResponse.json(toRoomStateEvent(result.value));
      }

      case "set-modifiers": {
        const result = setModifiers(state, actor.profileId, msg.modifiers);
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        await afterStateChange(result.value);
        return NextResponse.json(toRoomStateEvent(result.value));
      }

      case "start": {
        // Host-only, checked here rather than in room-state.ts, since only
        // this call site needs it (rematch reuses startMatch() internally
        // after its own host check).
        if (state.hostId !== actor.profileId) {
          return NextResponse.json({ error: "not_host", message: "Only the host can start the game." }, { status: 400 });
        }
        const result = startMatch(state, now);
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        await afterStateChange(result.value);
        return NextResponse.json(toRoomStateEvent(result.value));
      }

      case "action": {
        const rate = checkRateLimit(`action:${code}:${actor.profileId}`, 30, 10_000);
        if (!rate.allowed) {
          return NextResponse.json({ error: "rate_limited", message: "Slow down a little." }, { status: 429 });
        }
        if (msg.actionType === "clear-tile") {
          const tileRate = checkRateLimit(`tile-rush:${code}:${actor.profileId}`, 8, 1_000);
          if (!tileRate.allowed) {
            return NextResponse.json({ error: "rate_limited", message: "Slow down a little." }, { status: 429 });
          }
        }

        const result = await applyGameAction(state, actor.profileId, msg.actionType, msg.payload, msg.sequence, now);
        if (!result.ok) return NextResponse.json(result, { status: 400 });

        await afterStateChange(result.value.nextState);

        if (result.value.matchJustEnded && result.value.nextState.match?.status === "completed") {
          try {
            await finalizeMatch(
              result.value.nextState,
              result.value.nextState.match as typeof result.value.nextState.match & { status: "completed" },
            );
          } catch (error) {
            logError("finalizeMatch", error, {
              roomCode: result.value.nextState.code,
              matchId: result.value.nextState.match?.id,
            });
          }
        }
        return NextResponse.json(toRoomStateEvent(result.value.nextState));
      }

      case "rematch": {
        const result = rematch(state, actor.profileId, now);
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        await afterStateChange(result.value);
        return NextResponse.json(toRoomStateEvent(result.value));
      }

      case "return-to-lobby": {
        const result = returnToLobby(state, actor.profileId);
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        await afterStateChange(result.value);
        return NextResponse.json(toRoomStateEvent(result.value));
      }

      case "leave": {
        const next = leaveRoom(state, actor.profileId);
        await afterStateChange(next);
        return NextResponse.json(toRoomStateEvent(next));
      }

      case "disconnect": {
        // Best-effort presence heuristic — see room-state.ts's
        // markDisconnected doc comment for why this exists instead of a
        // real connection-close hook.
        const next = markDisconnected(state, actor.profileId);
        await afterStateChange(next);
        return NextResponse.json(toRoomStateEvent(next));
      }

      default:
        return NextResponse.json({ error: "malformed_payload", message: "Unknown action type." }, { status: 400 });
    }
  } catch (error) {
    logError("api/rooms/[code]/action:POST", error, { roomCode: code });
    return NextResponse.json({ error: "internal_error", message: "Something went wrong." }, { status: 500 });
  }
}
