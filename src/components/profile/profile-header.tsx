"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlayerBadge } from "@/components/ui/player-badge";
import { isValidNickname, sanitizeNickname } from "@/lib/validation/nickname";
import { AVATAR_COLOR_OPTIONS, type AvatarColorId } from "@/lib/design/tokens";
import { AccountLinking } from "./account-linking";

export interface ProfileData {
  displayName: string;
  avatarColor: string;
  isGuest: boolean;
  totalWins: number;
  gamesPlayed: number;
}

/**
 * Phase 4 — the Neon/Drizzle replacement. Seeded from a server-rendered
 * prop (ProfilePage already resolved identity + fetched this via Drizzle)
 * instead of fetching client-side on mount; edits go through
 * `PATCH /api/profile` instead of a direct Supabase `.update()` — there's no
 * client-side Neon access at all under the new stack. The old is_guest
 * "reconcile on page load" workaround is gone: getCurrentActor() already
 * resolves isGuest correctly on every server render, synchronously, so
 * there's nothing left to reconcile.
 */
export function ProfileHeader({ initialProfile }: { initialProfile: ProfileData | null }) {
  const [profile, setProfile] = useState(initialProfile);
  const [draftName, setDraftName] = useState(initialProfile?.displayName ?? "");

  async function patchProfile(body: { displayName?: string; avatarColor?: string }) {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { profile?: ProfileData; message?: string; error?: string };
    if (!response.ok) {
      toast.error(data.message ?? data.error ?? "Couldn't update your profile.");
      return null;
    }
    return data.profile ?? null;
  }

  async function handleSaveName() {
    const trimmed = sanitizeNickname(draftName);
    if (!isValidNickname(trimmed)) return;
    const updated = await patchProfile({ displayName: trimmed });
    if (!updated) return;
    setProfile((p) => (p ? { ...p, displayName: trimmed } : p));
    toast.success("Display name updated");
  }

  async function handlePickColor(color: AvatarColorId) {
    const updated = await patchProfile({ avatarColor: color });
    if (!updated) return;
    setProfile((p) => (p ? { ...p, avatarColor: color } : p));
  }

  if (!profile) {
    return <p className="text-muted-foreground">Loading profile…</p>;
  }

  const winRate = profile.gamesPlayed > 0 ? Math.round((profile.totalWins / profile.gamesPlayed) * 100) : 0;
  const avatarValue = AVATAR_COLOR_OPTIONS.find((c) => c.id === profile.avatarColor)?.value ?? "var(--color-party-violet)";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border p-4">
        <div className="flex items-center gap-3">
          <PlayerBadge name={profile.displayName} color={avatarValue} size="lg" />
          <Badge variant={profile.isGuest ? "secondary" : "default"}>
            {profile.isGuest ? "Guest" : "Account"}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-muted p-3">
            <p className="font-display text-xl font-bold">{profile.gamesPlayed}</p>
            <p className="text-xs text-muted-foreground">Games played</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="font-display text-xl font-bold">{profile.totalWins}</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="font-display text-xl font-bold">{winRate}%</p>
            <p className="text-xs text-muted-foreground">Win rate</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">Display name</Label>
          <div className="flex gap-2">
            <Input id="display-name" value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={18} />
            <Button onClick={handleSaveName} disabled={!isValidNickname(sanitizeNickname(draftName))}>
              Save
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Avatar color</Label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLOR_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-label={option.label}
                aria-pressed={profile.avatarColor === option.id}
                onClick={() => handlePickColor(option.id)}
                className="size-8 rounded-full ring-offset-2 ring-offset-background transition-shadow data-[active=true]:ring-2 data-[active=true]:ring-foreground"
                data-active={profile.avatarColor === option.id}
                style={{ backgroundColor: option.value }}
              />
            ))}
          </div>
        </div>
      </div>

      <AccountLinking />
    </div>
  );
}
