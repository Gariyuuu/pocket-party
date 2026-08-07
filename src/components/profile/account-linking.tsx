"use client";

import { useClerk, useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * Rebuilt for Clerk (DECISIONS.md D-010/D-011) — replaces the old
 * Supabase-based email/Google linking form entirely. No longer takes an
 * `isGuest` prop from Supabase-derived data; Clerk's own `useUser()` is the
 * source of truth for "is this browser signed into a real account now."
 *
 * There is no "link this exact guest session" API call to make here, unlike
 * the old Supabase version — Clerk's sign-up flow always creates a new
 * Clerk user. The stats-preserving "link" instead happens server-side, the
 * next time src/lib/identity/get-current-actor.ts resolves this browser's
 * identity after sign-up: it finds the still-unclaimed guest profile (by
 * the guest_id cookie) and attaches the new clerkUserId to that same row.
 * Nothing here needs to know that happened — it's just Clerk's stock UI.
 */
export function AccountLinking() {
  const { isSignedIn } = useUser();
  const clerk = useClerk();

  if (isSignedIn) {
    return (
      <div className="flex items-center justify-between rounded-2xl border p-4">
        <p className="text-sm text-muted-foreground">
          Signed in with an account — your stats sync across devices.
        </p>
        <UserButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-4">
      <div>
        <h2 className="font-display font-bold">Save your progress</h2>
        <p className="text-sm text-muted-foreground">
          You&apos;re playing as a guest on this device. Create an account to keep
          this exact profile — same stats, same match history — across devices.
        </p>
      </div>

      <Button onClick={() => clerk.openSignUp({ fallbackRedirectUrl: "/profile" })}>
        Create an account
      </Button>

      <button
        type="button"
        className="text-left text-xs text-muted-foreground underline"
        onClick={() => clerk.openSignIn({ fallbackRedirectUrl: "/profile" })}
      >
        Already have an account on another device? Sign in instead.
      </button>
    </div>
  );
}
