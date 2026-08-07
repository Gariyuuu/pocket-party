import { cn } from "@/lib/utils";
import { Crown, Check } from "lucide-react";

export type PlayerBadgeShape = "circle" | "triangle" | "square" | "diamond";

interface PlayerBadgeProps {
  name: string;
  color: string;
  shape?: PlayerBadgeShape;
  isHost?: boolean;
  isReady?: boolean;
  isYou?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SHAPE_CLASS: Record<PlayerBadgeShape, string> = {
  circle: "rounded-full",
  square: "rounded-md",
  triangle: "rounded-md [clip-path:polygon(50%_0%,0%_100%,100%_100%)]",
  diamond: "rounded-md rotate-45",
};

const SIZE_CLASS = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
};

export function PlayerBadge({
  name,
  color,
  shape = "circle",
  isHost,
  isReady,
  isYou,
  size = "md",
  className,
}: PlayerBadgeProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative shrink-0">
        <div
          className={cn(
            "flex items-center justify-center font-display font-bold text-white shadow-sm",
            SHAPE_CLASS[shape],
            SIZE_CLASS[size],
          )}
          style={{ backgroundColor: color }}
          aria-hidden="true"
        >
          <span className={shape === "diamond" ? "-rotate-45" : undefined}>
            {initial}
          </span>
        </div>
        {isHost && (
          <span
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-party-amber text-white shadow"
            aria-label="Room host"
          >
            <Crown className="size-3" />
          </span>
        )}
        {isReady && (
          <span
            className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-party-lime text-white shadow"
            aria-label="Ready"
          >
            <Check className="size-2.5" strokeWidth={3} />
          </span>
        )}
      </div>
      <span className="truncate font-medium">
        {name}
        {isYou && <span className="text-muted-foreground"> (you)</span>}
      </span>
    </div>
  );
}
