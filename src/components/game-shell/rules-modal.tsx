"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GameContent } from "@/games/core/game-content";

export function RulesModal({ title, content }: { title: string; content: GameContent }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" aria-label="Rules" />}>
        <Info className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{title} rules</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {content.rules.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
