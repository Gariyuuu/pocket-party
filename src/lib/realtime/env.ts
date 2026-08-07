function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Server-only — the raw Ably API key must never reach the browser. See src/lib/realtime/ably-server.ts. */
export function getAblyApiKey(): string {
  return requireEnv("ABLY_API_KEY");
}
