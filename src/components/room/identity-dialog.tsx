"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AVATAR_COLOR_OPTIONS, type AvatarColorId } from "@/lib/design/tokens";
import { useGuestIdentity } from "@/lib/identity/use-guest-identity";
import { isValidNickname, sanitizeNickname } from "@/lib/validation/nickname";

interface IdentityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: (nickname: string, avatarColor: AvatarColorId) => Promise<void> | void;
}

export function IdentityDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: IdentityDialogProps) {
  const { nickname, avatarColor, setNickname, setAvatarColor } = useGuestIdentity();
  const [draftNickname, setDraftNickname] = useState(nickname);
  const [draftColor, setDraftColor] = useState<AvatarColorId>(avatarColor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = sanitizeNickname(draftNickname);
  const valid = isValidNickname(trimmed);

  async function handleConfirm() {
    if (!valid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      setNickname(trimmed);
      setAvatarColor(draftColor);
      await onConfirm(trimmed, draftColor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={draftNickname}
              onChange={(e) => setDraftNickname(e.target.value)}
              maxLength={18}
              autoComplete="off"
              placeholder="Your name in-game"
            />
            {!valid && draftNickname.length > 0 && (
              <p className="text-sm text-destructive">
                2-18 characters: letters, numbers, spaces, - _ &apos; .
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Avatar color</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar color">
              {AVATAR_COLOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={draftColor === option.id}
                  aria-label={option.label}
                  onClick={() => setDraftColor(option.id)}
                  className={cn(
                    "size-9 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                    draftColor === option.id && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: option.value }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!valid || isSubmitting} className="w-full">
            {isSubmitting ? "One moment…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
