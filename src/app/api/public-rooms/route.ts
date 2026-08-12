import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, safeQuery } from "@/lib/db/client";
import { publicRoomListings } from "@/lib/db/schema";
import { logError } from "@/lib/log";

/**
 * Backs /lobby's "browse public rooms" list — see src/lib/party/public-rooms.ts
 * for how this table gets kept in sync with the actual PartyKit room state
 * (party/game.ts is the source of truth; this table is a discovery index).
 * A Neon hiccup here degrades to an empty list rather than a 500 -- this is
 * pure discovery/display data, not the room's authoritative state.
 */
export async function GET() {
  try {
    const db = getDb();
    const rooms = await safeQuery(
      () => db.select().from(publicRoomListings).orderBy(desc(publicRoomListings.updatedAt)).limit(50),
      [],
    );
    return NextResponse.json({ rooms });
  } catch (error) {
    logError("api/public-rooms:GET", error);
    return NextResponse.json({ error: "internal_error", message: "Something went wrong." }, { status: 500 });
  }
}
