function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Server-only. Never import this from a "use client" file. */
export function getDatabaseUrl(): string {
  return requireEnv("DATABASE_URL");
}
