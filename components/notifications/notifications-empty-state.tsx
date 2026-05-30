import { BellOff } from "lucide-react";

export function NotificationsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <BellOff className="size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">
        No notifications yet
      </p>
      <p className="text-xs text-muted-foreground/70">
        Workflow updates will appear here.
      </p>
    </div>
  );
}
