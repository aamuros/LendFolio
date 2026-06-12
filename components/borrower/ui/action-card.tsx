import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionCardState = "enabled" | "locked" | "empty";

type ActionCardProps = {
  title: string;
  description: string;
  state?: ActionCardState;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  icon?: ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
};

export function ActionCard({
  title,
  description,
  state = "enabled",
  badge,
  badgeVariant = "secondary",
  icon,
  onClick,
  "aria-label": ariaLabel,
}: ActionCardProps) {
  const isLocked = state === "locked";

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={isLocked}
      aria-label={ariaLabel ?? title}
      className={cn(
        "h-auto w-full justify-between gap-3 rounded-xl border-border/80 bg-card/80 px-4 py-3.5 text-left font-normal shadow-[0_10px_30px_rgba(14,26,18,0.05)] hover:bg-muted/80 hover:text-foreground focus-visible:ring-ring",
        isLocked && "opacity-70",
      )}
    >
      <span className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 shrink-0 text-accent-foreground">{icon}</span>
        ) : null}
        <span className="grid gap-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            {badge ? (
              <Badge variant={badgeVariant} className="text-[10px] font-semibold">
                {badge}
              </Badge>
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">
            {isLocked ? (
              <span className="flex items-center gap-1">
                <Lock className="size-3" />
                {description}
              </span>
            ) : (
              description
            )}
          </span>
        </span>
      </span>
      {isLocked ? null : (
        <ArrowRight className="size-4 shrink-0 text-accent-foreground" />
      )}
    </Button>
  );
}

type OnboardingCalloutProps = {
  title: string;
  description: string;
  cta: string;
  badge?: string;
  progressPercent?: number;
  progressLabel?: string;
  onAction: () => void;
};

export function OnboardingCallout({
  title,
  description,
  cta,
  badge,
  progressPercent,
  progressLabel,
  onAction,
}: OnboardingCalloutProps) {
  return (
    <Card className="rounded-2xl border-border/80 bg-card/90 shadow-[0_18px_50px_rgba(14,26,18,0.08)]">
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {badge ? (
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {progressPercent !== undefined ? (
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{progressLabel ?? "Profile progress"}</span>
              <span className="font-semibold">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/80">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>
        ) : null}
        <Button
          onClick={onAction}
          className="w-full rounded-xl font-semibold hover:bg-[#0E1A12] sm:w-fit"
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}
