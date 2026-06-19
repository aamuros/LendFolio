import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationsLoading() {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-10">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading notifications.</p>
    </div>
  );
}

export function NotificationsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/80">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_1fr] items-start gap-3 px-4 py-4 sm:px-5"
        >
          <Skeleton className="mt-0.5 size-8 rounded-full" />
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
