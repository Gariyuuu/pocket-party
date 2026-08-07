export interface LogErrorMeta {
  [key: string]: unknown;
}

/**
 * Single choke point for reporting an unexpected error, across every
 * runtime this app touches — Next.js server code, the browser (client
 * components), and the Cloudflare Worker (party/game.ts) — deliberately
 * dependency-free and Web-standard-only (no Node-specific APIs), the same
 * isomorphic-by-necessity approach as src/lib/party/room-token.ts.
 *
 * Structured JSON to console.error today, since no monitoring service
 * (Sentry or similar) is connected yet — see SECURITY.md's recommended
 * fixes. Every real call site goes through this one function instead of a
 * bare console.error, so wiring up a real APM later is a one-file change,
 * not a repo-wide find-and-replace.
 */
export function logError(context: string, error: unknown, meta?: LogErrorMeta): void {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      context,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...(meta ? { meta } : {}),
    }),
  );
}
