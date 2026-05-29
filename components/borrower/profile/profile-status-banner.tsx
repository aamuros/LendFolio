import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
        : ShieldAlert;

  const iconClassName =
    status.tone === "ready"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : status.tone === "attention"
        ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-muted text-muted-foreground";

  const badgeClassName =
    status.tone === "ready"
      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400"
      : status.tone === "attention"
        ? "bg-amber-50 text-amber-800 hover:bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-muted text-muted-foreground hover:bg-muted";

  return (
    <Card className="rounded-2xl shadow-sm border-border bg-card">
      <CardContent className="flex items-start gap-3 p-4">
        <span
          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${iconClassName}`}
        >
          <Icon className="size-4" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Badge
            variant="secondary"
            className={`mb-0.5 w-fit text-xs font-medium ${badgeClassName}`}
          >
            {status.label}
          </Badge>
          <p className="text-sm font-semibold leading-snug text-card-foreground">
            {status.title}
          </p>
          <p className="text-xs leading-snug text-muted-foreground">
            {status.description}
          </p>
          {status.actionLabel ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onAction}
              className="mt-2.5 h-8 w-fit rounded-full px-3 text-xs font-semibold"
            >
              {status.actionLabel}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
