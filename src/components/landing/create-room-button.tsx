"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IdentityDialog } from "@/components/room/identity-dialog";
import { generateRoomCode } from "@/lib/multiplayer/room-code";

/**
 * A room is created implicitly the moment its first "join" action lands
 * (see room-state.ts's joinRoom()). This just picks a fresh code and
 * navigates; the actual join happens on /room/[code] via useRealtimeRoom +
 * a "join" action using the identity chosen here. Client-side code
 * generation is safe (32^6 code space) — the negligible collision risk is
 * the same order of magnitude the old server-side retry-loop was already
 * accepting.
 */
export function CreateRoomButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    setOpen(false);
    router.push(`/room/${generateRoomCode()}?autojoin=1`);
  }

  return (
    <>
      <Button size="lg" className={className} onClick={() => setOpen(true)}>
        Create Room
      </Button>
      <IdentityDialog
        open={open}
        onOpenChange={setOpen}
        title="Create a room"
        description="Pick how you'll show up to your friends."
        confirmLabel="Create room"
        onConfirm={handleConfirm}
      />
    </>
  );
}
