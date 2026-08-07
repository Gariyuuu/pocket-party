import { describe, expect, it } from "vitest";
import {
  createEmptyRoom,
  joinRoom,
  setReady,
  selectGame,
  startMatch,
  applyGameAction,
  leaveRoom,
  returnToLobby,
  rematch,
} from "@/lib/realtime/room-state";

/**
 * This pure reducer is the room/match orchestration layer every online game
 * goes through (see src/app/api/rooms/[code]/action/route.ts), and unlike
 * that route, it has no I/O, so it can be tested directly instead of only
 * indirectly through e2e specs.
 */

function join(room: ReturnType<typeof createEmptyRoom>, profileId: string, nickname: string) {
  const result = joinRoom(room, profileId, nickname, "violet");
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe("joinRoom", () => {
  it("makes the first player the host, seated and auto-ready", () => {
    const room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    expect(room.hostId).toBe("p1");
    expect(room.players).toEqual([
      expect.objectContaining({ profileId: "p1", isHost: true, isReady: true, seat: 1 }),
    ]);
  });

  it("does not make the second player host or auto-ready", () => {
    let room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    room = join(room, "p2", "Bob");
    const bob = room.players.find((p) => p.profileId === "p2");
    expect(bob).toMatchObject({ isHost: false, isReady: false, seat: 2 });
  });

  it("reconnects an existing player instead of duplicating them", () => {
    let room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    room = { ...room, players: room.players.map((p) => ({ ...p, connectionStatus: "disconnected" })) };
    const result = joinRoom(room, "p1", "Alice", "violet");
    if (!result.ok) throw new Error(result.message);
    expect(result.value.players).toHaveLength(1);
    expect(result.value.players[0].connectionStatus).toBe("connected");
  });

  it("suffixes a colliding nickname", () => {
    let room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    room = join(room, "p2", "Alice");
    expect(room.players.map((p) => p.nickname)).toEqual(["Alice", "Alice (2)"]);
  });

  it("rejects joining a full room", () => {
    let room = createEmptyRoom("ABC123");
    room = { ...room, maxPlayers: 2 };
    room = join(room, "p1", "Alice");
    room = join(room, "p2", "Bob");
    const result = joinRoom(room, "p3", "Carl", "violet");
    expect(result).toMatchObject({ ok: false, error: "room_full" });
  });

  it("rejects joining a room that's already mid-game", () => {
    const room = { ...join(createEmptyRoom("ABC123"), "p1", "Alice"), status: "in_game" as const };
    const result = joinRoom(room, "p2", "Bob", "violet");
    expect(result).toMatchObject({ ok: false, error: "room_closed" });
  });
});

describe("host-only actions", () => {
  it("rejects select-game from a non-host", () => {
    let room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    room = join(room, "p2", "Bob");
    const result = selectGame(room, "p2", "grid-three");
    expect(result).toMatchObject({ ok: false, error: "not_host" });
  });

  it("allows select-game from the host", () => {
    const room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    const result = selectGame(room, "p1", "grid-three");
    expect(result.ok && result.value.selectedGameId).toBe("grid-three");
  });
});

describe("startMatch", () => {
  it("requires a selected, available game", () => {
    const room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    const result = startMatch(room, Date.now());
    expect(result).toMatchObject({ ok: false, error: "game_unavailable" });
  });

  it("requires everyone connected to be ready", () => {
    let room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    room = join(room, "p2", "Bob");
    const selected = selectGame(room, "p1", "grid-three");
    if (!selected.ok) throw new Error(selected.message);
    const result = startMatch(selected.value, Date.now());
    expect(result).toMatchObject({ ok: false, error: "not_all_ready" });
  });

  it("starts a match once everyone connected is ready, snapshotting participants", () => {
    let room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    room = join(room, "p2", "Bob");
    room = setReady(room, "p2", true);
    const selected = selectGame(room, "p1", "grid-three");
    if (!selected.ok) throw new Error(selected.message);
    const result = startMatch(selected.value, Date.now());
    if (!result.ok) throw new Error(result.message);
    expect(result.value.status).toBe("in_game");
    expect(result.value.match?.status).toBe("active");
    expect(result.value.match?.participants.map((p) => p.profileId).sort()).toEqual(["p1", "p2"]);
  });
});

describe("applyGameAction", () => {
  async function startedGridThree() {
    let room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    room = join(room, "p2", "Bob");
    room = setReady(room, "p2", true);
    const selected = selectGame(room, "p1", "grid-three");
    if (!selected.ok) throw new Error(selected.message);
    const started = startMatch(selected.value, Date.now());
    if (!started.ok) throw new Error(started.message);
    return started.value;
  }

  it("rejects a stale sequence", async () => {
    const room = await startedGridThree();
    const result = await applyGameAction(room, "p1", "place", { index: 0 }, 99, Date.now());
    expect(result).toMatchObject({ ok: false, error: "stale_sequence" });
  });

  it("rejects an action from someone not in the match", async () => {
    const room = await startedGridThree();
    const result = await applyGameAction(room, "intruder", "place", { index: 0 }, 0, Date.now());
    expect(result).toMatchObject({ ok: false, error: "not_participant" });
  });

  it("survives a mid-match leave for finalization purposes (participants snapshot doesn't shrink)", async () => {
    const room = await startedGridThree();
    const afterLeave = leaveRoom(room, "p2");
    // p2 is gone from the live roster...
    expect(afterLeave.players.some((p) => p.profileId === "p2")).toBe(false);
    // ...but still a match participant, so they'd still get a finalize row.
    expect(afterLeave.match?.participants.some((p) => p.profileId === "p2")).toBe(true);
  });
});

describe("returnToLobby / rematch", () => {
  it("returnToLobby is host-only and resets ready state", async () => {
    let room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    room = join(room, "p2", "Bob");
    room = setReady(room, "p2", true);
    const denied = returnToLobby(room, "p2");
    expect(denied).toMatchObject({ ok: false, error: "not_host" });

    const allowed = returnToLobby(room, "p1");
    if (!allowed.ok) throw new Error(allowed.message);
    expect(allowed.value.status).toBe("lobby");
    expect(allowed.value.players.every((p) => !p.isReady)).toBe(true);
  });

  it("rematch is host-only and requires a selected game", () => {
    const room = join(createEmptyRoom("ABC123"), "p1", "Alice");
    const result = rematch(room, "p1", Date.now());
    expect(result).toMatchObject({ ok: false, error: "game_unavailable" });
  });
});
