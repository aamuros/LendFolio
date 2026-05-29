import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function ManagerEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border border-dashed border-border/60 bg-muted/30 ring-0",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center gap-2 py-8 text-center sm:py-10">
        {Icon ? (
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="grid gap-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
