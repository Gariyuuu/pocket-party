/**
 * The no-signup guest identity (see DECISIONS.md D-010) — deliberately not
 * Clerk. A guest is just this random id, set once by src/middleware.ts and
 * read thereafter by src/lib/identity/get-current-actor.ts to resolve (or
 * provision) their `profiles` row. Not a secret — it doesn't grant any
 * permission by itself, it's an identity handle, not a credential.
 */
export const GUEST_COOKIE_NAME = "guest_id";

export function generateGuestId(): string {
  return crypto.randomUUID();
}
