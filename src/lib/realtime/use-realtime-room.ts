"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Ably from "ably";
import type { GameId } from "@/games/core/registry";
import type { AvatarColorId } from "@/lib/design/tokens";
import type {
  RoomActionRequest,
  RoomStateEvent,
  RoomActionErrorResponse,
  LiveRoom,
  LiveRoomPlayer,
  LiveMatch,
} from "./protocol";

declare global {
  interface Window {
    /** Attached by the CDN <Script> tag RoomPageClient renders — see this file's own header comment for why. */
    Ably?: typeof import("ably");
  }
}

/**
 * Resolves once `window.Ably` exists — the <Script> tag may still be
 * loading (or, on a very slow connection, not yet requested) by the time
 * this effect runs, and there's no reliable synchronous signal for "has it
 * loaded" from inside a hook that isn't the one rendering the tag.
 */
function waitForAblyGlobal(signal: { cancelled: boolean }): Promise<typeof import("ably")> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (signal.cancelled) {
        clearInterval(interval);
        return;
      }
      if (window.Ably) {
        clearInterval(interval);
        resolve(window.Ably);
        return;
      }
      if (Date.now() - start > 15_000) {
        clearInterval(interval);
        reject(new Error("Ably failed to load."));
      }
    }, 50);
  });
}

export interface RoomActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export interface UseRealtimeRoomResult {
  status: "connecting" | "ready";
  myPlayerId: string | null;
  room: LiveRoom | null;
  players: LiveRoomPlayer[];
  match: LiveMatch | null;
  gameState: unknown;
  sequence: number;
  join: (nickname: string, avatarColor: AvatarColorId) => Promise<RoomActionResult>;
  setReady: (isReady: boolean) => Promise<RoomActionResult>;
  selectGame: (gameId: GameId) => Promise<RoomActionResult>;
  setVisibility: (isPublic: boolean) => Promise<RoomActionResult>;
  setModifiers: (modifiers: Record<string, unknown>) => Promise<RoomActionResult>;
  start: () => Promise<RoomActionResult>;
  submitAction: (
    actionType: string,
    payload: Record<string, unknown> & { type?: string },
  ) => Promise<RoomActionResult>;
  rematch: () => Promise<RoomActionResult>;
  returnToLobby: () => Promise<RoomActionResult>;
  leaveRoom: () => void;
  /** Ephemeral, unvalidated pub/sub — see protocol.ts. Used by Orb Hockey/Quick Draw for paddle/puck/stroke sync. */
  sendBroadcast: (channel: string, payload: unknown) => void;
  /** Returns an unsubscribe function. Safe to call from a board's own useEffect. */
  onBroadcast: (channel: string, handler: (payload: unknown, fromProfileId: string) => void) => () => void;
}

function roomChannelName(code: string): string {
  return `room:${code}`;
}

/**
 * Two separate transports, deliberately: every room/match action is a
 * plain HTTP POST to src/app/api/rooms/[code]/action/route.ts (the
 * response IS the new state — no round-trip through Ably needed for the
 * caller's own action), while Ably's pub/sub delivers that same state to
 * every *other* connected client, and carries the ephemeral "broadcast"
 * passthrough Orb Hockey/Quick Draw use (published directly
 * client-to-client, never touching this app's server at all).
 *
 * Ably is loaded from Ably's own CDN via a <Script> tag (rendered by
 * RoomPageClient, the one place this hook is used) rather than imported as
 * an npm package here, deliberately: Ably's bundled output (both the
 * default browser build and the tree-shakeable "ably/modular" one) contains
 * a `super(...args)` pattern — valid modern JS (an arrow function inside a
 * constructor, inheriting `super`) — that Next.js's React Server Components
 * client-boundary analyzer (`next-flight-client-module-loader`) fails to
 * parse, for any client-side npm import of it, static or dynamic. Loading it
 * as an un-bundled `<script>` tag instead means webpack/RSC never sees
 * Ably's source at all — see `waitForAblyGlobal` above, which this effect
 * uses to wait out whatever load-order race that implies.
 */
export function useRealtimeRoom(code: string | null): UseRealtimeRoomResult {
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [players, setPlayers] = useState<LiveRoomPlayer[]>([]);
  const [match, setMatch] = useState<LiveMatch | null>(null);
  const [gameState, setGameState] = useState<unknown>(null);
  const [sequence, setSequence] = useState(0);
  const sequenceRef = useRef(0);
  const lastUpdatedAtRef = useRef(0);
  const clientRef = useRef<Ably.RealtimeClient | null>(null);
  const broadcastHandlersRef = useRef<Map<string, Set<(payload: unknown, fromProfileId: string) => void>>>(
    new Map(),
  );

  /**
   * Guarded by `updatedAt` because there are now two independent sources of
   * a state event (the initial GET fetch below, and Ably's ongoing "state"
   * publishes) with no ordering guarantee between them — a single
   * WebSocket connection's message order was enough to trust before, this
   * isn't anymore. An out-of-order arrival is silently dropped rather than
   * regressing the UI backward.
   */
  const applyStateEvent = useCallback((event: RoomStateEvent) => {
    if (event.updatedAt < lastUpdatedAtRef.current) return;
    lastUpdatedAtRef.current = event.updatedAt;
    setRoom(event.room);
    setPlayers(event.players);
    setMatch(event.match);
    setGameState(event.gameState);
    setSequence(event.sequence);
    sequenceRef.current = event.sequence;
  }, []);

  useEffect(() => {
    if (!code) return;
    const signal = { cancelled: false };
    let channel: Ably.RealtimeChannel | null = null;

    function handleUnload() {
      navigator.sendBeacon(
        `/api/rooms/${code}/action`,
        new Blob([JSON.stringify({ type: "disconnect" })], { type: "application/json" }),
      );
    }

    waitForAblyGlobal(signal)
      .then((Ably) => {
        if (signal.cancelled) return;

        const client = new Ably.Realtime({
          authCallback: async (_tokenParams, callback) => {
            try {
              const res = await fetch(`/api/ably-token?code=${code}`);
              if (!res.ok) throw new Error("Couldn't authenticate with the realtime service.");
              const tokenRequest = (await res.json()) as Ably.TokenRequest;
              if (tokenRequest.clientId) setMyPlayerId(tokenRequest.clientId);
              callback(null, tokenRequest);
            } catch (err) {
              callback(err instanceof Error ? err.message : "Auth failed", null);
            }
          },
        });
        clientRef.current = client;
        channel = client.channels.get(roomChannelName(code));

        // Subscribe *before* the initial fetch below, so anything another
        // client publishes while that fetch is in flight is still caught
        // (the updatedAt guard above sorts out whichever response is newer).
        channel.subscribe("state", (message) => {
          applyStateEvent(message.data as RoomStateEvent);
        });

        channel.subscribe("broadcast", (message) => {
          // Ably delivers a client's own publishes back to itself too,
          // unlike the old PartyKit relay which explicitly excluded the sender.
          if (message.connectionId === client.connection.id) return;
          const { channel: broadcastChannel, payload } = message.data as { channel: string; payload: unknown };
          const handlers = broadcastHandlersRef.current.get(broadcastChannel);
          handlers?.forEach((handler) => handler(payload, message.clientId ?? ""));
        });

        // Ably has no equivalent of a PartyKit Durable Object's onConnect
        // auto-sending the current room state — fetch it explicitly once so
        // the UI isn't stuck on "connecting" forever waiting for someone
        // else to trigger a state change first.
        fetch(`/api/rooms/${code}`)
          .then((res) => (res.ok ? (res.json() as Promise<RoomStateEvent>) : null))
          .then((event) => {
            if (event && !signal.cancelled) applyStateEvent(event);
          })
          .catch(() => {
            /* the Ably subscription above will still eventually catch us up */
          });

        // Best-effort presence heuristic — there's no persistent server-side
        // connection object to notice a closed tab the way a PartyKit
        // Durable Object's onClose did, so fire a beacon on the way out
        // instead. Not guaranteed (a crashed tab or killed network never
        // fires this), but neither was the pre-migration Supabase-era design
        // this mirrors.
        document.addEventListener("pagehide", handleUnload);
      })
      .catch(() => {
        /* status stays "connecting" — see waitForAblyGlobal's 15s timeout */
      });

    return () => {
      signal.cancelled = true;
      document.removeEventListener("pagehide", handleUnload);
      channel?.unsubscribe();
      clientRef.current?.close();
      clientRef.current = null;
    };
  }, [code, applyStateEvent]);

  const sendAction = useCallback(
    async (msg: RoomActionRequest): Promise<RoomActionResult> => {
      if (!code) return { ok: false, error: "malformed_payload", message: "No room code." };
      const res = await fetch(`/api/rooms/${code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
      const data = (await res.json()) as RoomStateEvent | RoomActionErrorResponse;
      if (!res.ok) {
        const err = data as RoomActionErrorResponse;
        return { ok: false, error: err.error, message: err.message };
      }
      applyStateEvent(data as RoomStateEvent);
      return { ok: true };
    },
    [code, applyStateEvent],
  );

  return {
    status: room ? "ready" : "connecting",
    myPlayerId,
    room,
    players,
    match,
    gameState,
    sequence,
    join: (nickname, avatarColor) => sendAction({ type: "join", nickname, avatarColor }),
    setReady: (isReady) => sendAction({ type: "set-ready", isReady }),
    selectGame: (gameId) => sendAction({ type: "select-game", gameId }),
    setVisibility: (isPublic) => sendAction({ type: "set-visibility", isPublic }),
    setModifiers: (modifiers) => sendAction({ type: "set-modifiers", modifiers }),
    start: () => sendAction({ type: "start" }),
    submitAction: (actionType, payload) =>
      sendAction({ type: "action", actionType, payload, sequence: sequenceRef.current }),
    rematch: () => sendAction({ type: "rematch" }),
    returnToLobby: () => sendAction({ type: "return-to-lobby" }),
    leaveRoom: () => {
      void sendAction({ type: "leave" });
    },
    sendBroadcast: (channel, payload) => {
      if (!code) return;
      void clientRef.current?.channels.get(roomChannelName(code)).publish("broadcast", { channel, payload });
    },
    onBroadcast: (channel, handler) => {
      const handlers = broadcastHandlersRef.current;
      if (!handlers.has(channel)) handlers.set(channel, new Set());
      handlers.get(channel)!.add(handler);
      return () => handlers.get(channel)?.delete(handler);
    },
  };
}
