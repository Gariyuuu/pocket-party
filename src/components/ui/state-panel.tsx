import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Inbox, TriangleAlert } from "lucide-react";

interface StatePanelProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

function StatePanel({ title, description, icon: Icon = Inbox, action, className }: StatePanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState(props: Omit<StatePanelProps, "icon"> & { icon?: LucideIcon }) {
  return <StatePanel {...props} />;
}

export function ErrorState(props: Omit<StatePanelProps, "icon">) {
  return (
    <StatePanel
      {...props}
      icon={TriangleAlert}
      className={cn("border-destructive/40 bg-destructive/5", props.className)}
    />
  );
}
