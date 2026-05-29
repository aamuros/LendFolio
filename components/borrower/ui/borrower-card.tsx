import type { ComponentProps } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BorrowerCardVariant = "default" | "dashboard" | "accent" | "dashed";

type BorrowerCardProps = ComponentProps<"div"> & {
  variant?: BorrowerCardVariant;
};

const variantClassName: Record<BorrowerCardVariant, string> = {
  default: "",
  dashboard: "border-border/50 shadow-sm",
  accent: "bg-muted/30",
  dashed: "border-dashed",
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
