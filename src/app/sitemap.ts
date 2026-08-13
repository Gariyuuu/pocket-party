import type { MetadataRoute } from "next";
import { AVAILABLE_GAMES } from "@/games/core/registry";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pocket-party-eta.vercel.app";

const PUBLIC_ROUTES = ["/", "/lobby", "/leaderboard", "/patch-notes"];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));

  const gameEntries = AVAILABLE_GAMES.map((game) => ({
    url: `${SITE_URL}/game/${game.id}`,
    lastModified: new Date(),
  }));

  return [...staticEntries, ...gameEntries];
}
