import { cn } from "@/lib/utils";
import { Crown, Flame, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  flame: Flame,
  star: Star,
  sparkles: Sparkles,
  crown: Crown,
};

export interface AchievementDisplay {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export function AchievementsGrid({ achievements }: { achievements: AchievementDisplay[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {achievements.map((achievement) => {
        const Icon = ICONS[achievement.icon] ?? Trophy;
        return (
          <div
            key={achievement.id}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center",
              !achievement.earned && "opacity-40",
            )}
            title={achievement.description}
          >
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full",
                achievement.earned ? "bg-gradient-party text-white" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
            </div>
            <p className="text-xs font-medium">{achievement.name}</p>
          </div>
        );
      })}
    </div>
  );
}
