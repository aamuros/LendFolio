import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LenderProfileDetailCard({
  children,
  headerLabel,
  headerTitle,
  headerSubtitle,
}: {
  children: ReactNode;
  headerLabel?: string;
  headerTitle?: string;
  headerSubtitle?: string;
}) {
  const hasHeader = headerLabel || headerTitle || headerSubtitle;

  return (
    <Card className="rounded-2xl">
      {hasHeader ? (
        <div className="px-5 pt-5 pb-0">
          {headerLabel ? (
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {headerLabel}
            </p>
          ) : null}
          {headerTitle ? (
            <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {headerTitle}
            </p>
          ) : null}
          {headerSubtitle ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {headerSubtitle}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className={cn("grid gap-0 px-5 pb-4", hasHeader ? "pt-3" : "pt-5")}>
        {children}
      </div>
    </Card>
  );
}
