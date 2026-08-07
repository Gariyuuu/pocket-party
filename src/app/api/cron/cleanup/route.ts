import { NextResponse, type NextRequest } from "next/server";
import { lt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { liveRooms } from "@/lib/db/schema";
import { removePublicListing } from "@/lib/realtime/public-rooms";
import { logError } from "@/lib/log";

const IDLE_EXPIRY_MS = 1000 * 60 * 60 * 4; // 4 hours — matches the threshold party/game.ts's onAlarm used to enforce.

/**
 * Reclaims idle rooms. There's no Durable Object alarm anymore to do this
 * per-room automatically (see DECISIONS.md D-018) — Ably has no equivalent
 * primitive, so this is a real scheduled sweep again, same shape as the
 * original pre-migration design (`vercel.json`'s cron entry). Optionally
 * protected by `CRON_SECRET`, which Vercel attaches automatically as a
 * bearer header to its own cron requests when that env var is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - IDLE_EXPIRY_MS);
    const deleted = await db
      .delete(liveRooms)
      .where(lt(liveRooms.updatedAt, cutoff))
      .returning({ code: liveRooms.code });

    for (const { code } of deleted) {
      try {
        await removePublicListing(code);
      } catch (error) {
        logError("removePublicListing", error, { roomCode: code });
      }
    }

    return NextResponse.json({ deletedRooms: deleted.length });
  } catch (error) {
    logError("api/cron/cleanup:GET", error);
    return NextResponse.json({ error: "internal_error", message: "Something went wrong." }, { status: 500 });
  }
}
