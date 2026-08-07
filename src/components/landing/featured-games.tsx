import { ALL_GAMES } from "@/games/core/registry";
import { GameCard } from "@/components/ui/game-card";

export function FeaturedGames() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Featured games</h2>
          <p className="text-muted-foreground">Ten original mini-games, rolling out over the coming weeks.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {ALL_GAMES.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}
