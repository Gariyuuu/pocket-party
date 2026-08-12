import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

/**
 * Neon's serverless driver talks HTTP, not raw TCP — no connection-pooling
 * setup needed from a stateless Next.js API route. This intentionally has
 * no "admin" vs "anon" split: there is no RLS to scope a lesser-privileged
 * client against, so every server-side caller gets full access and is
 * individually responsible for its own authorization checks (see
 * DECISIONS.md D-010).
 */
let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!cached) {
    const sql = neon(getDatabaseUrl());
    cached = drizzle(sql, { schema });
  }
  return cached;
}

/**
 * Wraps a *read* query so a Neon hiccup (quota, connection drop) degrades
 * to a safe empty value instead of throwing an uncaught error that crashes
 * the whole page with a 500. Logs server-side so the failure is still
 * visible. Never wrap a write (insert/update/delete) with this -- a failed
 * mutation must still surface to the caller, and never wrap anything on
 * the room/match action path (see room-state.ts) -- a degraded live-game
 * read there would corrupt gameplay rather than just a display page.
 */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("[db] query failed, returning fallback:", error);
    return fallback;
  }
}
