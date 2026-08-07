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
