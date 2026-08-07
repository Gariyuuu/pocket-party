"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { GameMeta } from "@/games/core/registry";
import {
  Grid3x3,
  ArrowDownToLine,
  Type,
  Martini,
  CircleDot,
  Crosshair,
  Waves,
  Target,
  PenTool,
  Sparkles,
  Flag,
  Puzzle,
  Anchor,
  Crown,
  Circle,
  Locate,
  Package2,
  Disc,
  BoxSelect,
  Dices,
  Rows3,
  CircleHelp,
} from "lucide-react";

const GAME_ICONS: Record<GameMeta["id"], React.ComponentType<{ className?: string }>> = {
  "grid-three": Grid3x3,
  fourfall: ArrowDownToLine,
  "word-clash": Type,
  "bounce-cup": Martini,
  "mini-hoops": CircleDot,
  "tank-tactics": Crosshair,
  "orb-hockey": Waves,
  "pocket-shots": Target,
  "quick-draw": PenTool,
  "tile-rush": Sparkles,
  "mini-golf": Flag,
  "word-bites": Puzzle,
  "sea-battle": Anchor,
  checkers: Circle,
  chess: Crown,
  darts: Locate,
  cornhole: Package2,
  reversi: Disc,
  "dots-and-boxes": BoxSelect,
  yahtzee: Dices,
  mancala: Rows3,
  "trivia-blitz": CircleHelp,
};

const ACCENT_GRADIENT: Record<GameMeta["accent"], string> = {
  violet: "from-party-violet/25 to-party-violet/5",
  pink: "from-party-pink/25 to-party-pink/5",
  cyan: "from-party-cyan/25 to-party-cyan/5",
  amber: "from-party-amber/25 to-party-amber/5",
  lime: "from-party-lime/25 to-party-lime/5",
};

interface GameCardProps {
  game: GameMeta;
  onSelect?: (id: GameMeta["id"]) => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

export function GameCard({ game, onSelect, selected, disabled, className }: GameCardProps) {
  const Icon = GAME_ICONS[game.id];
  const isComingSoon = game.status === "coming-soon";

  return (
    <motion.button
      type="button"
      whileHover={disabled || isComingSoon ? undefined : { y: -4 }}
      whileTap={disabled || isComingSoon ? undefined : { scale: 0.98 }}
      onClick={() => !disabled && !isComingSoon && onSelect?.(game.id)}
      disabled={disabled || isComingSoon}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-colors",
        "bg-gradient-to-br",
        ACCENT_GRADIENT[game.accent],
        selected ? "border-primary ring-2 ring-primary" : "border-border",
        (disabled || isComingSoon) && "opacity-60",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex size-11 items-center justify-center rounded-xl bg-background/80 shadow-sm">
          <Icon className="size-6" />
        </div>
        {isComingSoon ? (
          <Badge variant="outline">Coming soon</Badge>
        ) : (
          <Badge variant="secondary">
            {game.minPlayers === game.maxPlayers
              ? `${game.minPlayers} players`
              : `${game.minPlayers}-${game.maxPlayers} players`}
          </Badge>
        )}
      </div>
      <div>
        <h3 className="font-display text-lg font-bold">{game.name}</h3>
        <p className="text-sm text-muted-foreground">{game.tagline}</p>
      </div>
    </motion.button>
  );
}
