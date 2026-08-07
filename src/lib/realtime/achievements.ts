import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { matches, matchPlayers, profileAchievements } from "@/lib/db/schema";

/**
 * The 5 seeded achievements, evaluated server-side after every match
 * finalization. Best-effort by design — called inside a try/catch in
 * finalize-match.ts, never blocks the match itself from finalizing.
 */

export interface AchievementGrant {
  profileId: string;
  achievementId: string;
}

interface EvaluateParams {
  roomCode: string;
  gameId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  finalState: any;
  profileId: string;
  result: "win" | "loss" | "draw";
  newTotalWins: number;
  outcome: { status: "win"; winnerPlayerId: string } | { status: "draw" };
}

export async function evaluateAchievementsForPlayer(
  params: EvaluateParams,
): Promise<AchievementGrant[]> {
  const grants: AchievementGrant[] = [];
  const db = getDb();

  if (params.result === "win" && params.newTotalWins === 1) {
    grants.push({ profileId: params.profileId, achievementId: "first-win" });
  }

  if (params.result === "win") {
    const recentInRoom = await db
      .select({ result: matchPlayers.result })
      .from(matches)
      .innerJoin(matchPlayers, eq(matchPlayers.matchId, matches.id))
      .where(and(eq(matches.roomCode, params.roomCode), eq(matchPlayers.profileId, params.profileId)))
      .orderBy(desc(matches.endedAt))
      .limit(3);

    if (recentInRoom.length === 3 && recentInRoom.every((r) => r.result === "win")) {
      grants.push({ profileId: params.profileId, achievementId: "three-peat" });
    }
  }

  if (params.result === "win") {
    const wins = await db
      .select({ gameId: matches.gameId })
      .from(matches)
      .innerJoin(matchPlayers, eq(matchPlayers.matchId, matches.id))
      .where(and(eq(matchPlayers.profileId, params.profileId), eq(matchPlayers.result, "win")));

    const distinctGamesWon = new Set(wins.map((w) => w.gameId));
    if (distinctGamesWon.size >= 5) {
      grants.push({ profileId: params.profileId, achievementId: "all-rounder" });
    }
  }

  if (params.gameId === "word-clash") {
    const roundHistory = params.finalState?.roundHistory as
      | { scores?: Record<string, number> }[]
      | undefined;
    const scoredThirtyPlus = roundHistory?.some(
      (round) => (round.scores?.[params.profileId] ?? 0) >= 30,
    );
    if (scoredThirtyPlus) {
      grants.push({ profileId: params.profileId, achievementId: "word-wizard" });
    }
  }

  if (
    params.gameId === "grid-three" &&
    params.outcome.status === "win" &&
    params.outcome.winnerPlayerId === params.profileId &&
    params.finalState?.moveCount === 5
  ) {
    grants.push({ profileId: params.profileId, achievementId: "perfect-game" });
  }

  return grants;
}

export async function grantAchievements(grants: AchievementGrant[]): Promise<void> {
  if (grants.length === 0) return;
  const db = getDb();
  await db
    .insert(profileAchievements)
    .values(grants.map((g) => ({ profileId: g.profileId, achievementId: g.achievementId })))
    .onConflictDoNothing();
}
