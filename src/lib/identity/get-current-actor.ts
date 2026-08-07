import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { GUEST_COOKIE_NAME } from "./guest-cookie";

export interface CurrentActor {
  profileId: string;
  isGuest: boolean;
  clerkUserId: string | null;
}

/**
 * Resolves "who is making this request" against the new profiles table,
 * from either a signed-in Clerk session or the guest_id cookie
 * middleware.ts guarantees exists on every request — this is the Neon/Drizzle
 * + Clerk replacement for Supabase's `auth.uid()`, which unified guests and
 * real accounts under one id for free. Clerk doesn't do that for us, so this
 * function is where that unification happens instead.
 *
 * The one subtle piece: the first time a guest signs up with Clerk, there is
 * no `profiles` row for their new `clerkUserId` yet, but there IS one for
 * their `guest_id` cookie — if that guest row is still unclaimed
 * (`clerkUserId is null`), it gets claimed (same row, same stats) rather than
 * starting a fresh, empty profile. A guest row that's already claimed by a
 * *different* Clerk user is never re-claimed.
 *
 * Not wired into the room/match code paths yet (those are still
 * Supabase-backed pending Phase 3/4 — see TASKS.md T-003). Currently only
 * consumed by src/components/profile/account-linking.tsx's data needs.
 */
export async function getCurrentActor(): Promise<CurrentActor> {
  const { userId: clerkUserId } = await auth();
  const db = getDb();

  if (clerkUserId) {
    const existing = await db.query.profiles.findFirst({
      where: eq(profiles.clerkUserId, clerkUserId),
    });
    if (existing) {
      return { profileId: existing.id, isGuest: false, clerkUserId };
    }

    const cookieStore = await cookies();
    const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;
    if (guestId) {
      const guestProfile = await db.query.profiles.findFirst({
        where: eq(profiles.guestCookieId, guestId),
      });
      if (guestProfile && guestProfile.clerkUserId === null) {
        const [claimed] = await db
          .update(profiles)
          .set({ clerkUserId, isGuest: false, updatedAt: new Date() })
          .where(eq(profiles.id, guestProfile.id))
          .returning();
        return { profileId: claimed.id, isGuest: false, clerkUserId };
      }
    }

    const [created] = await db
      .insert(profiles)
      .values({ clerkUserId, displayName: "Player", isGuest: false })
      .returning();
    return { profileId: created.id, isGuest: false, clerkUserId };
  }

  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  if (!guestId) {
    throw new Error(
      "No guest_id cookie found. middleware.ts should set one on every request — check the middleware matcher covers this route.",
    );
  }

  const existingGuest = await db.query.profiles.findFirst({
    where: eq(profiles.guestCookieId, guestId),
  });
  if (existingGuest) {
    return {
      profileId: existingGuest.id,
      isGuest: existingGuest.isGuest,
      clerkUserId: existingGuest.clerkUserId,
    };
  }

  const [created] = await db
    .insert(profiles)
    .values({ guestCookieId: guestId, displayName: "Player", isGuest: true })
    .returning();
  return { profileId: created.id, isGuest: true, clerkUserId: null };
}
