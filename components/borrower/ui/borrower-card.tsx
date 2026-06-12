import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BorrowerCardVariant = "default" | "dashboard" | "accent" | "dashed";

type BorrowerCardProps = ComponentProps<"div"> & {
  variant?: BorrowerCardVariant;
};

const variantClassName: Record<BorrowerCardVariant, string> = {
  default:
    "border-border/80 bg-card/90 shadow-[0_18px_50px_rgba(14,26,18,0.08)]",
  dashboard:
    "border-border/80 bg-card/90 shadow-[0_18px_50px_rgba(14,26,18,0.08)]",
  accent:
    "border-border/80 bg-muted/70 shadow-[0_18px_50px_rgba(14,26,18,0.06)]",
  dashed: "border-dashed border-border/90 bg-card/70",
};

export function BorrowerCard({
  variant = "default",
  className,
  ...props
}: BorrowerCardProps) {
  return (
    <Card
      className={cn("rounded-2xl", variantClassName[variant], className)}
      {...props}
    />
  );
}
