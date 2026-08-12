import { desc, eq } from "drizzle-orm";
import { SiteNav } from "@/components/landing/site-nav";
import { EmptyState } from "@/components/ui/state-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";
import { getDb, safeQuery } from "@/lib/db/client";
import { leaderboardEntries, profiles } from "@/lib/db/schema";
import { AVAILABLE_GAMES } from "@/games/core/registry";

interface LeaderboardRow {
  profileId: string;
  gameId: string;
  wins: number;
  winRate: string | null;
  displayName: string;
}

/**
 * Phase 4 — Neon/Drizzle replacement. `winRate` is a generated `numeric`
 * column; the neon-http driver deserializes `numeric` as a string, not a
 * number, so it needs an explicit Number() conversion before the old
 * `Math.round(entry.win_rate * 100)` math still works.
 *
 * Forced dynamic: the Supabase-era version got this for free from
 * `getSupabaseServerClient()`'s `cookies()` call, which opts a route out of
 * static generation. This version has no such call, so without this,
 * `next build` tries to prerender the page at build time and fails on a
 * missing DATABASE_URL — leaderboard data should be per-request fresh
 * anyway, not statically cached.
 */
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const db = getDb();
  const entries: LeaderboardRow[] = await safeQuery(
    () =>
      db
        .select({
          profileId: leaderboardEntries.profileId,
          gameId: leaderboardEntries.gameId,
          wins: leaderboardEntries.wins,
          winRate: leaderboardEntries.winRate,
          displayName: profiles.displayName,
        })
        .from(leaderboardEntries)
        .innerJoin(profiles, eq(profiles.id, leaderboardEntries.profileId))
        .orderBy(desc(leaderboardEntries.wins)),
    [],
  );

  const byGame = new Map<string, LeaderboardRow[]>();
  for (const entry of entries) {
    const list = byGame.get(entry.gameId) ?? [];
    list.push(entry);
    byGame.set(entry.gameId, list);
  }

  const gamesWithData = AVAILABLE_GAMES.filter((g) => (byGame.get(g.id)?.length ?? 0) > 0);

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="mb-6 font-display text-2xl font-bold">Leaderboard</h1>

        {gamesWithData.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No games played yet"
            description="Leaderboards fill in as matches finish — check back soon."
          />
        ) : (
          <Tabs defaultValue={gamesWithData[0].id}>
            <TabsList className="mb-4 flex-wrap">
              {gamesWithData.map((game) => (
                <TabsTrigger key={game.id} value={game.id}>
                  {game.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {gamesWithData.map((game) => (
              <TabsContent key={game.id} value={game.id}>
                <ol className="flex flex-col gap-2">
                  {(byGame.get(game.id) ?? []).slice(0, 20).map((entry, i) => (
                    <li
                      key={`${entry.profileId}-${entry.gameId}`}
                      className="flex items-center justify-between rounded-xl border p-3"
                    >
                      <span className="font-medium">
                        {i + 1}. {entry.displayName ?? "Player"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {entry.wins} wins · {Math.round(Number(entry.winRate ?? 0) * 100)}% win rate
                      </span>
                    </li>
                  ))}
                </ol>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </>
  );
}
