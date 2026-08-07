import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/landing/site-nav";
import { EmptyState } from "@/components/ui/state-panel";
import { Button } from "@/components/ui/button";
import { GAME_REGISTRY, type GameId } from "@/games/core/registry";
import { SoloGameShell } from "@/components/game-shell/solo-game-shell";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ mode?: string; difficulty?: string }>;
}) {
  const { gameId } = await params;
  const { mode, difficulty } = await searchParams;
  const game = GAME_REGISTRY[gameId as GameId];
  if (!game) notFound();

  if (game.status !== "available") {
    return (
      <>
        <SiteNav />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-16">
          <EmptyState
            title={`${game.name} isn't playable yet`}
            description="This game's engine ships in an upcoming phase. Head back to a room to see what's live."
          />
          <Button render={<Link href="/" />}>Back to Pocket Party</Button>
        </main>
      </>
    );
  }

  if (mode === "solo") {
    const safeDifficulty = difficulty === "easy" || difficulty === "hard" ? difficulty : "medium";
    return (
      <>
        <SiteNav />
        <SoloGameShell gameId={game.id} difficulty={safeDifficulty} />
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-16">
        <EmptyState
          title={`${game.name} is played from a room`}
          description="Create or join a room with a friend to play — or play solo against a bot from the landing page."
        />
        <Button render={<Link href="/" />}>Back to Pocket Party</Button>
      </main>
    </>
  );
}
