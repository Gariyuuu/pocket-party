import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE_NAME, generateGuestId } from "@/lib/identity/guest-cookie";

/**
 * Two identity mechanisms run side by side (DECISIONS.md D-010/D-011) — real
 * accounts via Clerk's own middleware, and a hand-rolled `guest_id` cookie
 * for no-signup guest play (read by get-current-actor.ts). The third
 * mechanism this file used to also bootstrap — a Supabase anonymous-session
 * sign-in — was removed in Phase 5 once every Supabase-backed code path it
 * existed for (the old room/match routes) was itself removed.
 */
function ensureGuestCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.cookies.get(GUEST_COOKIE_NAME)) {
    response.cookies.set(GUEST_COOKIE_NAME, generateGuestId(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return response;
}

export default clerkMiddleware(async (_auth, request) => {
  return ensureGuestCookie(request, NextResponse.next({ request }));
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|ogg)$).*)",
  ],
};
