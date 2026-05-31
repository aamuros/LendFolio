import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BadgeTone = "attention" | "danger" | "neutral" | "success";

export function toneBadgeClassName(tone: BadgeTone) {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
    case "attention":
      return "bg-amber-50 text-amber-800 hover:bg-amber-50";
    case "danger":
      return "bg-destructive/10 text-destructive hover:bg-destructive/10";
    case "neutral":
      return "bg-secondary text-secondary-foreground hover:bg-secondary";
  }
}

export function ToneBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: BadgeTone;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "shrink-0 whitespace-normal break-words text-center text-xs font-semibold leading-tight",
        toneBadgeClassName(tone),
      )}
    >
      {children}
    </Badge>
  );
}
