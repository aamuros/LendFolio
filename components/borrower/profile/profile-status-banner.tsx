import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ProfileStatusBanner({
  onAction,
  status,
}: {
  onAction: () => void;
  status: {
    tone: "neutral" | "attention" | "ready";
    label: string;
    title: string;
    description: string;
    action: string | null;
    actionLabel: string | null;
  };
}) {
  const Icon =
    status.tone === "ready"
      ? CheckCircle2
      : status.tone === "attention"
        ? AlertCircle
        : Clock;

  return (
    <Card
      className={cn(
        "rounded-2xl border-border/50 shadow-sm",
        status.tone === "attention" && "bg-muted/40",
        status.tone === "ready" && "bg-muted/40",
        status.tone === "neutral" && "bg-muted",
      )}
    >
      <CardContent className="flex items-start gap-3.5 px-5 py-4">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Badge
            variant="secondary"
            className="w-fit text-[10px] font-medium uppercase tracking-wider"
          >
            {status.label}
          </Badge>
          <p className="text-sm font-medium text-foreground leading-snug">
            {status.title}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {status.description}
          </p>
          {status.actionLabel ? (
            <Button size="sm" onClick={onAction} className="mt-1 w-fit">
              {status.actionLabel}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
