import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BadgeTone = "attention" | "danger" | "neutral" | "success";

export function toneBadgeClassName(tone: BadgeTone) {
  switch (tone) {
    case "success":
      return "border border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C] hover:bg-[#EFF3EA]";
    case "attention":
      return "border border-[#E2DAC6] bg-[#F8F1DD] text-[#6A4B17] hover:bg-[#F8F1DD]";
    case "danger":
      return "border border-[#D9A7A0] bg-[#FFF4F1] text-[#8A2A1E] hover:bg-[#FFF4F1]";
    case "neutral":
      return "border border-border/80 bg-card text-muted-foreground hover:bg-card";
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
