import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
  description?: string;
  icon?: LucideIcon;
}

export function EmptyState({ message, description, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-[14.5px] font-medium text-foreground">{message}</p>
      {description && (
        <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
