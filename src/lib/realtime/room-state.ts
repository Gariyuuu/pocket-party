import type { GameId } from "@/games/core/registry";
import { getGameMeta } from "@/games/core/registry";
import { getGameEngine } from "@/games/core/engines";
import { randomSeed } from "@/games/core/rng";
import { isRealWord } from "@/games/word-clash/dictionary";
import { nicknameSchema, withCollisionSuffix } from "@/lib/validation/nickname";
import type { EnginePlayer } from "@/games/core/game-engine";
import type { AvatarColorId } from "@/lib/design/tokens";
import type { LiveRoomPlayer } from "./protocol";

/**
 * The pure room/match reducer — originally ported from the Supabase-era
 * match-runtime.ts/create-room.ts/join-room.ts/room-actions.ts, then from a
 * PartyKit Durable Object's shell (party/game.ts, removed — see
 * DECISIONS.md D-018). Nothing in this file changed across either
 * migration: it's deliberately free of any I/O (no database, no HTTP, no
 * Ably) so it stays unit-testable independent of whatever's calling it —
 * today that's src/app/api/rooms/[code]/action/route.ts, a thin Next.js API
 * route that loads/saves the JSON blob this operates on from Neon
 * (`live_rooms`) and publishes the result to Ably.
 */

export interface MatchParticipant {
  profileId: string;
  nickname: string;
  seat: number;
}

export interface StoredMatch {
  id: string;
  gameId: GameId;
  status: "active" | "completed" | "abandoned";
  seed: string;
  modifiers: Record<string, unknown>;
  winnerPlayerId: string | null;
  isDraw: boolean;
  startedAt: number;
  endedAt: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gameState: any;
  sequence: number;
  /**
   * Snapshotted at match start, independent of `state.players` — leaveRoom()
   * removes a player from the live roster entirely, but their match
   * participation (score, result, achievements) must survive that so
   * finalizeMatch() still has someone to write a result for even if they
   * left before the match ended.
   */
  participants: MatchParticipant[];
}

export interface StoredRoomState {
  code: string;
  hostId: string | null;
  selectedGameId: GameId | null;
  isPublic: boolean;
  maxPlayers: number;
  modifiers: Record<string, unknown>;
  status: "lobby" | "in_game" | "finished" | "closed";
  players: LiveRoomPlayer[];
  match: StoredMatch | null;
  createdAt: number;
  updatedAt: number;
}

export type RoomActionError =
  | "room_closed"
  | "room_full"
  | "not_host"
  | "not_participant"
  | "wrong_state"
  | "game_unavailable"
  | "player_count"
  | "not_all_ready"
  | "nickname_unavailable"
  | "wrong_turn"
  | "wrong_player"
  | "invalid_move"
  | "duplicate_action"
  | "stale_sequence"
  | "match_not_active"
  | "malformed_payload"
  | "rate_limited";

export type RoomActionResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; error: RoomActionError; message: string };

export function createEmptyRoom(code: string): StoredRoomState {
  const now = Date.now();
  return {
    code,
    hostId: null,
    selectedGameId: null,
    isPublic: false,
    maxPlayers: 4,
    modifiers: {},
    status: "lobby",
    players: [],
    match: null,
    createdAt: now,
    updatedAt: now,
  };
}

function connectedPlayers(state: StoredRoomState): LiveRoomPlayer[] {
  return state.players.filter((p) => p.connectionStatus === "connected");
}

/**
 * Join or reconnect. Mirrors create-room.ts (first player becomes host,
 * seat 1, auto-ready) + join-room.ts (nickname collision suffixing, lowest
 * free seat, room-full/mid-game/closed rejections, reconnect-not-duplicate).
 */
export function joinRoom(
  state: StoredRoomState,
  profileId: string,
  rawNickname: string,
  avatarColor: AvatarColorId,
): RoomActionResult<StoredRoomState> {
  const nicknameResult = nicknameSchema.safeParse(rawNickname);
  if (!nicknameResult.success) {
    return { ok: false, error: "malformed_payload", message: "Invalid nickname." };
  }
  const nickname = nicknameResult.data;

  const existing = state.players.find((p) => p.profileId === profileId);
  if (existing) {
    const players = state.players.map((p) =>
      p.profileId === profileId ? { ...p, connectionStatus: "connected" as const } : p,
    );
    return { ok: true, value: { ...state, players, updatedAt: Date.now() } };
  }

  if (state.status === "closed") {
    return { ok: false, error: "room_closed", message: "This room is no longer active." };
  }
  if (state.status === "in_game") {
    return {
      ok: false,
      error: "room_closed",
      message: "This room already started a game — ask the host for a rematch invite.",
    };
  }
  if (connectedPlayers(state).length >= state.maxPlayers) {
    return { ok: false, error: "room_full", message: "This room is full." };
  }

  const takenNicknames = new Set(state.players.map((p) => p.nickname.toLowerCase()));
  let finalNickname = nickname;
  let attempt = 1;
  while (takenNicknames.has(finalNickname.toLowerCase())) {
    attempt += 1;
    if (attempt > 6) {
      return {
        ok: false,
        error: "nickname_unavailable",
        message: "Too many players with similar nicknames — try a different one.",
      };
    }
    finalNickname = withCollisionSuffix(nickname, attempt);
  }

  const takenSeats = new Set(state.players.map((p) => p.seat));
  let seat = 1;
  while (takenSeats.has(seat)) seat += 1;

  const isFirstPlayer = state.players.length === 0;
  const newPlayer: LiveRoomPlayer = {
    profileId,
    nickname: finalNickname,
    avatarColor,
    isHost: isFirstPlayer,
    isReady: isFirstPlayer,
    connectionStatus: "connected",
    seat,
  };

  return {
    ok: true,
    value: {
      ...state,
      hostId: isFirstPlayer ? profileId : state.hostId,
      players: [...state.players, newPlayer],
      updatedAt: Date.now(),
    },
  };
}

export function setReady(state: StoredRoomState, profileId: string, isReady: boolean): StoredRoomState {
  return {
    ...state,
    players: state.players.map((p) => (p.profileId === profileId ? { ...p, isReady } : p)),
    updatedAt: Date.now(),
  };
}

function requireHost(state: StoredRoomState, profileId: string): RoomActionResult<void> {
  if (state.hostId !== profileId) {
    return { ok: false, error: "not_host", message: "Only the host can do that." };
  }
  return { ok: true, value: undefined };
}

export function selectGame(
  state: StoredRoomState,
  profileId: string,
  gameId: GameId,
): RoomActionResult<StoredRoomState> {
  const hostCheck = requireHost(state, profileId);
  if (!hostCheck.ok) return hostCheck;
  return { ok: true, value: { ...state, selectedGameId: gameId, updatedAt: Date.now() } };
}

export function setVisibility(
  state: StoredRoomState,
  profileId: string,
  isPublic: boolean,
): RoomActionResult<StoredRoomState> {
  const hostCheck = requireHost(state, profileId);
  if (!hostCheck.ok) return hostCheck;
  return { ok: true, value: { ...state, isPublic, updatedAt: Date.now() } };
}

export function setModifiers(
  state: StoredRoomState,
  profileId: string,
  modifiers: Record<string, unknown>,
): RoomActionResult<StoredRoomState> {
  const hostCheck = requireHost(state, profileId);
  if (!hostCheck.ok) return hostCheck;
  return { ok: true, value: { ...state, modifiers, updatedAt: Date.now() } };
}

/**
 * Best-effort presence heuristic, not a guaranteed one — there's no
 * persistent server-side connection object to notice a closed tab the way
 * the PartyKit Durable Object's onClose did. The client fires this via
 * `navigator.sendBeacon` on `visibilitychange`/`pagehide` instead (see
 * use-realtime-room.ts), same mechanism the pre-PartyKit Supabase-era
 * design used. Mirrors leave_room()'s host-migration rule: if the host
 * disconnects, host stays assigned to them (unlike leaveRoom, which
 * reassigns) — a disconnect is not a departure.
 */
export function markDisconnected(state: StoredRoomState, profileId: string): StoredRoomState {
  const players = state.players.map((p) =>
    p.profileId === profileId ? { ...p, connectionStatus: "disconnected" as const } : p,
  );
  return { ...state, players, updatedAt: Date.now() };
}

export function leaveRoom(state: StoredRoomState, profileId: string): StoredRoomState {
  const players = state.players.filter((p) => p.profileId !== profileId);
  if (players.length === 0) {
    return { ...state, players, status: "closed", updatedAt: Date.now() };
  }
  const wasHost = state.hostId === profileId;
  const nextHostId = wasHost ? players[0].profileId : state.hostId;
  const nextPlayers = wasHost
    ? players.map((p, i) => ({ ...p, isHost: i === 0 }))
    : players;
  return { ...state, players: nextPlayers, hostId: nextHostId, updatedAt: Date.now() };
}

function toEnginePlayers(players: LiveRoomPlayer[]): EnginePlayer[] {
  return players.map((p) => ({ playerId: p.profileId, seat: p.seat, nickname: p.nickname }));
}

/** Mirrors match-runtime.ts's startMatch/createMatchForRoom. */
export function startMatch(state: StoredRoomState, now: number): RoomActionResult<StoredRoomState> {
  if (state.status !== "lobby") {
    return { ok: false, error: "wrong_state", message: "This room isn't in its lobby." };
  }
  if (!state.selectedGameId) {
    return { ok: false, error: "game_unavailable", message: "Pick a game first." };
  }
  const engine = getGameEngine(state.selectedGameId);
  const meta = getGameMeta(state.selectedGameId);
  if (!engine || meta.status !== "available") {
    return { ok: false, error: "game_unavailable", message: "That game isn't playable yet." };
  }

  const players = connectedPlayers(state);
  if (players.length < meta.minPlayers || players.length > meta.maxPlayers) {
    return {
      ok: false,
      error: "player_count",
      message: `${meta.name} needs ${meta.minPlayers === meta.maxPlayers ? meta.minPlayers : `${meta.minPlayers}-${meta.maxPlayers}`} players.`,
    };
  }
  if (!players.every((p) => p.isReady)) {
    return { ok: false, error: "not_all_ready", message: "Everyone needs to be ready first." };
  }

  const seed = randomSeed();
  const gameState = engine.createInitialState({
    seed,
    players: toEnginePlayers(players),
    modifiers: state.modifiers,
    now,
  });

  const match: StoredMatch = {
    id: crypto.randomUUID(),
    gameId: state.selectedGameId,
    status: "active",
    seed,
    modifiers: state.modifiers,
    winnerPlayerId: null,
    isDraw: false,
    startedAt: now,
    endedAt: null,
    gameState,
    sequence: 0,
    participants: players.map((p) => ({ profileId: p.profileId, nickname: p.nickname, seat: p.seat })),
  };

  return { ok: true, value: { ...state, status: "in_game", match, updatedAt: now } };
}

/**
 * Per-game wall-clock special-casing, ported verbatim from
 * match-runtime.ts's submitAction — see that file's original comments for
 * why each of these exists. Async only because Word Clash's dictionary
 * check is (lazy-loaded word list).
 */
async function applySpecialCasing(
  gameId: GameId,
  gameState: unknown,
  actionType: string,
  payload: Record<string, unknown>,
  now: number,
  fromProfileId: string,
): Promise<RoomActionResult<Record<string, unknown>>> {
  let action: Record<string, unknown> = { ...payload, type: actionType };

  if (gameId === "word-clash") {
    if (actionType === "submit-word") {
      const word = typeof payload.word === "string" ? payload.word : "";
      if (word.length < 3 || !(await isRealWord(word))) {
        return { ok: false, error: "invalid_move", message: "Not a real word." };
      }
    }
    if (actionType === "advance-round") {
      const state = gameState as { roundEndsAt: number };
      if (now < state.roundEndsAt) {
        return { ok: false, error: "rate_limited", message: "The round isn't over yet." };
      }
      action = { type: "advance-round", now };
    }
  }

  if (gameId === "tank-tactics") {
    if (actionType === "fire") {
      action = { ...action, now };
    }
    if (actionType === "skip-turn") {
      const state = gameState as { turnEndsAt: number };
      if (now < state.turnEndsAt) {
        return { ok: false, error: "rate_limited", message: "The turn timer hasn't run out yet." };
      }
      action = { type: "skip-turn", now };
    }
  }

  if (gameId === "orb-hockey") {
    if (actionType === "score-goal") {
      const state = gameState as { players: { playerId: string }[] };
      if (state.players[0]?.playerId !== fromProfileId) {
        return {
          ok: false,
          error: "not_participant",
          message: "Only the designated host client can report goals.",
        };
      }
      action = { ...action, now };
    }
    if (actionType === "start-serve") {
      const state = gameState as { countdownEndsAt: number };
      if (now < state.countdownEndsAt) {
        return { ok: false, error: "rate_limited", message: "The countdown isn't over yet." };
      }
      action = { type: "start-serve", now };
    }
  }

  if (gameId === "quick-draw") {
    if (actionType === "submit-guess") {
      action = { ...action, now };
    }
    if (actionType === "advance-round") {
      const state = gameState as {
        roundEndsAt: number;
        guesses: Record<string, unknown>;
        players: unknown[];
      };
      const everyoneGuessed = Object.keys(state.guesses).length >= state.players.length - 1;
      if (now < state.roundEndsAt && !everyoneGuessed) {
        return { ok: false, error: "rate_limited", message: "The round isn't over yet." };
      }
      action = { type: "advance-round", now };
    }
  }

  if (gameId === "tile-rush") {
    if (actionType === "end-round") {
      const state = gameState as { roundEndsAt: number };
      if (now < state.roundEndsAt) {
        return { ok: false, error: "rate_limited", message: "The round isn't over yet." };
      }
      action = { type: "end-round", now };
    } else if (actionType === "clear-tile") {
      action = { ...action, now };
    }
  }

  return { ok: true, value: action };
}

export interface ApplyActionOutcome {
  nextState: StoredRoomState;
  matchJustEnded: boolean;
}

/**
 * Mirrors match-runtime.ts's submitAction (minus the rate limiter and DB
 * writes, which live in the API route calling this — this function is the
 * pure validate-and-apply core). Tile Rush's own tighter per-action rate
 * limit also lives at that call site, since it needs state this function
 * doesn't have.
 */
export async function applyGameAction(
  state: StoredRoomState,
  profileId: string,
  actionType: string,
  payload: Record<string, unknown>,
  sequence: number,
  now: number,
): Promise<RoomActionResult<ApplyActionOutcome>> {
  if (!state.match || state.status !== "in_game") {
    return { ok: false, error: "match_not_active", message: "This match already ended." };
  }
  const match = state.match;
  if (match.status !== "active") {
    return { ok: false, error: "match_not_active", message: "This match already ended." };
  }
  if (!match.participants.some((p) => p.profileId === profileId)) {
    return { ok: false, error: "not_participant", message: "You're not in this match." };
  }
  if (sequence !== match.sequence) {
    return { ok: false, error: "stale_sequence", message: "Out of date — refreshing." };
  }

  const engine = getGameEngine(match.gameId);
  if (!engine) {
    return { ok: false, error: "game_unavailable", message: "Unsupported game." };
  }

  const specialCased = await applySpecialCasing(
    match.gameId,
    match.gameState,
    actionType,
    payload,
    now,
    profileId,
  );
  if (!specialCased.ok) return specialCased;

  const result = engine.applyAction(match.gameState, specialCased.value, profileId);
  if (!result.ok) {
    return { ok: false, error: result.reason, message: result.message };
  }

  const outcome = engine.checkOutcome(result.nextState);
  const nextMatch: StoredMatch = {
    ...match,
    gameState: result.nextState,
    sequence: match.sequence + 1,
    status: outcome.status === "active" ? "active" : "completed",
    endedAt: outcome.status === "active" ? null : now,
    isDraw: outcome.status === "draw",
    winnerPlayerId: outcome.status === "win" ? outcome.winnerPlayerId : null,
  };

  return {
    ok: true,
    value: {
      nextState: {
        ...state,
        match: nextMatch,
        status: outcome.status === "active" ? state.status : "finished",
        updatedAt: now,
      },
      matchJustEnded: outcome.status !== "active",
    },
  };
}

export function rematch(state: StoredRoomState, profileId: string, now: number): RoomActionResult<StoredRoomState> {
  const hostCheck = requireHost(state, profileId);
  if (!hostCheck.ok) return hostCheck;
  if (state.match?.status === "active") {
    return { ok: false, error: "wrong_state", message: "That match hasn't ended yet." };
  }
  if (!state.selectedGameId) {
    return { ok: false, error: "game_unavailable", message: "Pick a game first." };
  }
  return startMatch({ ...state, status: "lobby" }, now);
}

export function returnToLobby(state: StoredRoomState, profileId: string): RoomActionResult<StoredRoomState> {
  const hostCheck = requireHost(state, profileId);
  if (!hostCheck.ok) return hostCheck;
  const match =
    state.match && state.match.status === "active"
      ? { ...state.match, status: "abandoned" as const, endedAt: Date.now() }
      : state.match;
  return {
    ok: true,
    value: {
      ...state,
      status: "lobby",
      match,
      players: state.players.map((p) => ({ ...p, isReady: false })),
      updatedAt: Date.now(),
    },
  };
}
