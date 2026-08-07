import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturedGames } from "@/components/landing/featured-games";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <FeaturedGames />
      </main>
      <footer className="safe-bottom border-t py-8 text-center text-sm text-muted-foreground">
        Pocket Party — an original mini-game platform.
      </footer>
    </>
  );
}
