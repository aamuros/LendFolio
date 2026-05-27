import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
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
        : ShieldAlert;

  const iconClassName =
    status.tone === "ready"
      ? "bg-emerald-50 text-emerald-700"
      : status.tone === "attention"
        ? "bg-amber-50 text-amber-800"
        : "bg-muted text-muted-foreground";

  return (
    <section className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:grid-cols-[2.25rem_1fr_auto] sm:items-center">
      <span
        className={`mt-0.5 grid size-9 place-items-center self-start rounded-full ${iconClassName}`}
      >
        <Icon className="size-5" />
      </span>
      <div className="grid min-w-0 items-start gap-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className={
              status.tone === "ready"
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                : status.tone === "attention"
                  ? "bg-amber-50 text-amber-800 hover:bg-amber-50"
                  : "bg-muted text-muted-foreground hover:bg-muted"
            }
          >
            {status.label}
          </Badge>
          <p className="text-sm font-semibold leading-5 text-card-foreground">
            {status.title}
          </p>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {status.description}
        </p>
        {status.actionLabel ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            className="mt-2 justify-self-start rounded-full text-xs font-semibold sm:hidden"
          >
            {status.actionLabel}
          </Button>
        ) : null}
      </div>
      {status.actionLabel ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="hidden rounded-full text-xs font-semibold sm:inline-flex"
        >
          {status.actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
