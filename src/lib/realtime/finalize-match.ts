import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { profiles, matches, matchPlayers, leaderboardEntries, recentPlayers } from "@/lib/db/schema";
import { extractPlayerScore } from "@/lib/multiplayer/extract-score";
import { evaluateAchievementsForPlayer, grantAchievements } from "./achievements";
import type { StoredMatch, StoredRoomState } from "./room-state";

/**
 * Neon-writing side effects on match end — called from
 * src/app/api/rooms/[code]/action/route.ts only when a match ends
 * *naturally* (engine.checkOutcome stops returning "active"), matching the
 * original system's behavior exactly: a manually return-to-lobby'd
 * ("abandoned") match was never finalized either, so it never touched
 * profiles/leaderboard/achievements. Do not call this for an abandoned
 * match. Writes a summary `matches` + `match_players` row (not a
 * live/replayed one), updates each participant's `profiles` totals,
 * upserts their `leaderboard_entries` row, then best-effort (never throws
 * past this function) records `recent_players` and evaluates achievements
 * — same "progression extras are non-critical" contract the original had.
 */
export async function finalizeMatch(
  state: StoredRoomState,
  match: StoredMatch & { status: "completed" },
): Promise<void> {
  const db = getDb();

  const [matchRow] = await db
    .insert(matches)
    .values({
      roomCode: state.code,
      gameId: match.gameId,
      status: "completed",
      seed: match.seed,
      modifiers: match.modifiers,
      winnerPlayerId: match.winnerPlayerId,
      isDraw: match.isDraw,
      startedAt: new Date(match.startedAt),
      endedAt: new Date(match.endedAt ?? Date.now()),
    })
    .returning();

  const participantIds = match.participants.map((p) => p.profileId);

  for (const participant of match.participants) {
    const result: "win" | "loss" | "draw" = match.isDraw
      ? "draw"
      : match.winnerPlayerId === participant.profileId
        ? "win"
        : "loss";
    const score = extractPlayerScore(match.gameId, match.gameState, participant.profileId);

    await db.insert(matchPlayers).values({
      matchId: matchRow.id,
      profileId: participant.profileId,
      seat: participant.seat,
      result,
      score,
    });

    const [profile] = await db
      .select({ totalWins: profiles.totalWins, gamesPlayed: profiles.gamesPlayed })
      .from(profiles)
      .where(eq(profiles.id, participant.profileId));
    if (!profile) continue;

    const newTotalWins = profile.totalWins + (result === "win" ? 1 : 0);
    await db
      .update(profiles)
      .set({ gamesPlayed: profile.gamesPlayed + 1, totalWins: newTotalWins, updatedAt: new Date() })
      .where(eq(profiles.id, participant.profileId));

    const [entry] = await db
      .select()
      .from(leaderboardEntries)
      .where(
        and(
          eq(leaderboardEntries.profileId, participant.profileId),
          eq(leaderboardEntries.gameId, match.gameId),
        ),
      );

    await db
      .insert(leaderboardEntries)
      .values({
        profileId: participant.profileId,
        gameId: match.gameId,
        wins: (entry?.wins ?? 0) + (result === "win" ? 1 : 0),
        losses: (entry?.losses ?? 0) + (result === "loss" ? 1 : 0),
        draws: (entry?.draws ?? 0) + (result === "draw" ? 1 : 0),
        gamesPlayed: (entry?.gamesPlayed ?? 0) + 1,
      })
      .onConflictDoUpdate({
        target: [leaderboardEntries.profileId, leaderboardEntries.gameId],
        set: {
          wins: (entry?.wins ?? 0) + (result === "win" ? 1 : 0),
          losses: (entry?.losses ?? 0) + (result === "loss" ? 1 : 0),
          draws: (entry?.draws ?? 0) + (result === "draw" ? 1 : 0),
          gamesPlayed: (entry?.gamesPlayed ?? 0) + 1,
          updatedAt: new Date(),
        },
      });

    try {
      for (const opponentId of participantIds) {
        if (opponentId === participant.profileId) continue;
        const [existing] = await db
          .select({ timesPlayed: recentPlayers.timesPlayed })
          .from(recentPlayers)
          .where(
            and(
              eq(recentPlayers.profileId, participant.profileId),
              eq(recentPlayers.opponentId, opponentId),
            ),
          );
        await db
          .insert(recentPlayers)
          .values({
            profileId: participant.profileId,
            opponentId,
            timesPlayed: (existing?.timesPlayed ?? 0) + 1,
          })
          .onConflictDoUpdate({
            target: [recentPlayers.profileId, recentPlayers.opponentId],
            set: {
              timesPlayed: (existing?.timesPlayed ?? 0) + 1,
              lastPlayedAt: new Date(),
            },
          });
      }

      const outcome = match.isDraw
        ? ({ status: "draw" } as const)
        : ({ status: "win", winnerPlayerId: match.winnerPlayerId! } as const);
      const grants = await evaluateAchievementsForPlayer({
        roomCode: state.code,
        gameId: match.gameId,
        finalState: match.gameState,
        profileId: participant.profileId,
        result,
        newTotalWins,
        outcome,
      });
      await grantAchievements(grants);

      const [topGame] = await db
        .select({ gameId: leaderboardEntries.gameId, gamesPlayed: leaderboardEntries.gamesPlayed })
        .from(leaderboardEntries)
        .where(eq(leaderboardEntries.profileId, participant.profileId))
        .orderBy((t) => t.gamesPlayed)
        .limit(1);
      if (topGame) {
        await db
          .update(profiles)
          .set({ favoriteGameId: topGame.gameId })
          .where(eq(profiles.id, participant.profileId));
      }
    } catch {
      // Progression extras are non-critical — the match itself already finalized above.
    }
  }
}
