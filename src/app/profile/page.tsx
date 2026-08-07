import { and, desc, eq, inArray } from "drizzle-orm";
import { SiteNav } from "@/components/landing/site-nav";
import { ProfileHeader, type ProfileData } from "@/components/profile/profile-header";
import { MatchHistoryList, type MatchHistoryEntry } from "@/components/profile/match-history-list";
import { AchievementsGrid, type AchievementDisplay } from "@/components/profile/achievements-grid";
import { RecentOpponentsList, type RecentOpponent } from "@/components/profile/recent-opponents-list";
import { getDb } from "@/lib/db/client";
import { achievements, matchPlayers, matches, profileAchievements, profiles, recentPlayers } from "@/lib/db/schema";
import { getCurrentActor } from "@/lib/identity/get-current-actor";

/**
 * Phase 4 — the Neon/Drizzle replacement for the Supabase-era version. There
 * is no more RLS to lean on (the old version's queries were scoped by RLS,
 * not explicit WHERE clauses on the caller's own id in every case) — every
 * query here explicitly filters to `profileId` from getCurrentActor().
 */
export default async function ProfilePage() {
  const actor = await getCurrentActor();
  const db = getDb();

  const [myProfile] = await db.select().from(profiles).where(eq(profiles.id, actor.profileId));

  const [myMatches, achievementRows, catalog, recent] = await Promise.all([
    db
      .select({
        matchId: matches.id,
        gameId: matches.gameId,
        endedAt: matches.endedAt,
        result: matchPlayers.result,
        score: matchPlayers.score,
      })
      .from(matches)
      .innerJoin(matchPlayers, eq(matchPlayers.matchId, matches.id))
      .where(and(eq(matchPlayers.profileId, actor.profileId), eq(matches.status, "completed")))
      .orderBy(desc(matches.endedAt))
      .limit(20),
    db
      .select({ achievementId: profileAchievements.achievementId })
      .from(profileAchievements)
      .where(eq(profileAchievements.profileId, actor.profileId)),
    db.select().from(achievements),
    db
      .select({
        opponentId: recentPlayers.opponentId,
        timesPlayed: recentPlayers.timesPlayed,
        displayName: profiles.displayName,
        avatarColor: profiles.avatarColor,
      })
      .from(recentPlayers)
      .innerJoin(profiles, eq(profiles.id, recentPlayers.opponentId))
      .where(eq(recentPlayers.profileId, actor.profileId))
      .orderBy(desc(recentPlayers.lastPlayedAt))
      .limit(10),
  ]);

  const matchIds = myMatches.map((m) => m.matchId);
  const roster = matchIds.length
    ? await db
        .select({
          matchId: matchPlayers.matchId,
          profileId: matchPlayers.profileId,
          displayName: profiles.displayName,
        })
        .from(matchPlayers)
        .innerJoin(profiles, eq(profiles.id, matchPlayers.profileId))
        .where(inArray(matchPlayers.matchId, matchIds))
    : [];

  const matchHistory: MatchHistoryEntry[] = myMatches.map((m) => ({
    matchId: m.matchId,
    gameId: m.gameId,
    result: m.result,
    score: m.score,
    endedAt: m.endedAt?.toISOString() ?? null,
    opponents: roster
      .filter((r) => r.matchId === m.matchId && r.profileId !== actor.profileId)
      .map((r) => ({ displayName: r.displayName })),
  }));

  const earnedIds = new Set(achievementRows.map((r) => r.achievementId));
  const achievementsDisplay: AchievementDisplay[] = catalog.map((a) => ({ ...a, earned: earnedIds.has(a.id) }));

  const recentOpponents: RecentOpponent[] = recent.map((r) => ({
    displayName: r.displayName,
    avatarColor: r.avatarColor,
    timesPlayed: r.timesPlayed,
  }));

  const profileData: ProfileData | null = myProfile
    ? {
        displayName: myProfile.displayName,
        avatarColor: myProfile.avatarColor,
        isGuest: myProfile.isGuest,
        totalWins: myProfile.totalWins,
        gamesPlayed: myProfile.gamesPlayed,
      }
    : null;

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
        <div>
          <h1 className="mb-6 font-display text-2xl font-bold">Profile</h1>
          <ProfileHeader initialProfile={profileData} />
        </div>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Achievements</h2>
          <AchievementsGrid achievements={achievementsDisplay} />
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Match history</h2>
          <MatchHistoryList entries={matchHistory} />
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Recent opponents</h2>
          <RecentOpponentsList opponents={recentOpponents} />
        </section>
      </main>
    </>
  );
}
