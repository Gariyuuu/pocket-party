"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { IdentityDialog } from "@/components/room/identity-dialog";
import { Lobby } from "@/components/room/lobby";
import { useRealtimeRoom } from "@/lib/realtime/use-realtime-room";
import { useGuestIdentity } from "@/lib/identity/use-guest-identity";
import type { AvatarColorId } from "@/lib/design/tokens";

/**
 * There's no more server-side "resolve room id from code, check RLS" step
 * — an initial `GET /api/rooms/[code]` fetch plus an Ably subscription is
 * the resolve step now (see useRealtimeRoom). `?autojoin=1` (set by
 * CreateRoomButton / JoinRoomForm, which already ran the identity dialog on
 * the landing page) skips the in-page dialog and joins immediately with the
 * persisted guest identity; opening a bare `/room/CODE` link shows the
 * dialog first, same as before.
 *
 * The Ably <Script> tag lives here (not in the root layout) since only
 * room pages need realtime sync — see use-realtime-room.ts's header
 * comment for why it's loaded from Ably's CDN instead of the npm package.
 */
export function RoomPageClient({ code }: { code: string }) {
  const autojoin = useSearchParams().get("autojoin") === "1";
  const party = useRealtimeRoom(code);
  const { nickname, avatarColor } = useGuestIdentity();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoJoined, setAutoJoined] = useState(false);

  const isMember = !!party.myPlayerId && party.players.some((p) => p.profileId === party.myPlayerId);

  useEffect(() => {
    if (party.status !== "ready" || isMember || autoJoined) return;
    if (autojoin) {
      party.join(nickname, avatarColor);
      setAutoJoined(true);
    }
  }, [party, isMember, autojoin, autoJoined, nickname, avatarColor]);

  async function handleConfirm(confirmedNickname: string, confirmedAvatarColor: AvatarColorId) {
    party.join(confirmedNickname, confirmedAvatarColor);
    setDialogOpen(false);
  }

  if (party.status === "connecting" || (autojoin && !isMember)) {
    return (
      <>
        <Script src="https://cdn.ably.com/lib/ably.min-2.js" strategy="afterInteractive" />
        <p className="p-8 text-center text-muted-foreground">Looking for room {code}…</p>
      </>
    );
  }

  if (!isMember) {
    return (
      <>
        <Script src="https://cdn.ably.com/lib/ably.min-2.js" strategy="afterInteractive" />
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4 p-8 text-center">
          <p className="font-display text-xl font-bold">Join room {code}?</p>
          <p className="text-muted-foreground">
            You&apos;ll need a nickname to hop in — this room might also not exist or may have expired.
          </p>
          <Button size="lg" onClick={() => setDialogOpen(true)}>
            Join room
          </Button>
          <IdentityDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title={`Join room ${code}`}
            description="Pick how you'll show up to your friends."
            confirmLabel="Join room"
            onConfirm={handleConfirm}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Script src="https://cdn.ably.com/lib/ably.min-2.js" strategy="afterInteractive" />
      <Lobby code={code} party={party} />
    </>
  );
}
