/**
 * Replacement for supabase/seed.sql. Run with `npm run db:seed` against
 * whatever DATABASE_URL is set — safe to re-run (upserts on conflict), same
 * as the original `on conflict (id) do nothing` behavior.
 *
 * Builds its own Drizzle client instead of importing `./client`'s `getDb()`:
 * this script runs standalone via `tsx`, outside Next.js's bundler, so the
 * `server-only` import at the top of `client.ts` (which relies on webpack/
 * turbopack aliasing it away server-side) throws unconditionally here.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "./env";
import { achievements } from "./schema";

const ACHIEVEMENT_CATALOG: (typeof achievements.$inferInsert)[] = [
  { id: "first-win", name: "First Blood", description: "Win your first match.", icon: "trophy" },
  {
    id: "three-peat",
    name: "Three-peat",
    description: "Win three matches in a row in the same room.",
    icon: "flame",
  },
  {
    id: "all-rounder",
    name: "All-Rounder",
    description: "Win at least one match in five different games.",
    icon: "star",
  },
  {
    id: "word-wizard",
    name: "Word Wizard",
    description: "Score 30+ points in a single Word Clash round.",
    icon: "sparkles",
  },
  {
    id: "perfect-game",
    name: "Perfect Game",
    description: "Win a Grid Three match without your opponent scoring.",
    icon: "crown",
  },
];

async function main() {
  const db = drizzle(neon(getDatabaseUrl()));
  await db.insert(achievements).values(ACHIEVEMENT_CATALOG).onConflictDoNothing();
  console.log(`Seeded ${ACHIEVEMENT_CATALOG.length} achievements.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
