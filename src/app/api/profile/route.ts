import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { getCurrentActor } from "@/lib/identity/get-current-actor";
import { nicknameSchema } from "@/lib/validation/nickname";
import { logError } from "@/lib/log";

/**
 * Replaces profile-header.tsx's direct Supabase `.update()` calls (Phase 4)
 * — there's no client-side Neon access at all (no anon-key/RLS model to make
 * it safe), so display-name/avatar-color edits now go through this route,
 * with identity resolved server-side via getCurrentActor() rather than
 * trusting anything the client claims about who it is.
 */
export async function PATCH(request: Request) {
  try {
    const actor = await getCurrentActor();
    const body = (await request.json().catch(() => null)) as
      | { displayName?: unknown; avatarColor?: unknown }
      | null;
    if (!body) {
      return NextResponse.json({ error: "malformed_payload" }, { status: 400 });
    }

    const updates: { displayName?: string; avatarColor?: string } = {};

    if (typeof body.displayName === "string") {
      const parsed = nicknameSchema.safeParse(body.displayName);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid_display_name", message: parsed.error.issues[0]?.message ?? "Invalid name." },
          { status: 400 },
        );
      }
      updates.displayName = parsed.data;
    }

    if (typeof body.avatarColor === "string") {
      updates.avatarColor = body.avatarColor;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "malformed_payload" }, { status: 400 });
    }

    const db = getDb();
    const [updated] = await db
      .update(profiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(profiles.id, actor.profileId))
      .returning();

    return NextResponse.json({ profile: updated });
  } catch (error) {
    logError("api/profile:PATCH", error);
    return NextResponse.json({ error: "internal_error", message: "Something went wrong." }, { status: 500 });
  }
}
