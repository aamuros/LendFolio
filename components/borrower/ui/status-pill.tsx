import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  toneBadgeClassName,
  type BadgeTone,
} from "@/components/borrower-status-badge";
import { cn } from "@/lib/utils";

export function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: BadgeTone;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-semibold", toneBadgeClassName(tone))}
    >
      {children}
    </Badge>
  );
}
