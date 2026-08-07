"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IdentityDialog } from "@/components/room/identity-dialog";
import { normalizeRoomCode, isPlausibleRoomCode } from "@/lib/multiplayer/room-code";

/** Joining now happens on /room/[code] itself (useRealtimeRoom sends "join") — this just navigates there. */
export function JoinRoomForm({ className }: { className?: string }) {
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const normalized = normalizeRoomCode(code);

  async function handleConfirm() {
    setOpen(false);
    router.push(`/room/${normalized}?autojoin=1`);
  }

  return (
    <div className={className}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (isPlausibleRoomCode(normalized)) setOpen(true);
        }}
      >
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ROOM CODE"
          maxLength={6}
          className="font-mono uppercase tracking-widest"
          aria-label="Room code"
        />
        <Button type="submit" variant="secondary" disabled={!isPlausibleRoomCode(normalized)}>
          Join
        </Button>
      </form>

      <IdentityDialog
        open={open}
        onOpenChange={setOpen}
        title={`Join room ${normalized}`}
        description="Pick how you'll show up to your friends."
        confirmLabel="Join room"
        onConfirm={handleConfirm}
      />
    </div>
  );
}
