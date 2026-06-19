import { CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { BorrowerCard } from "@/components/borrower/ui/borrower-card";
import { CardContent } from "@/components/ui/card";
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
        ? ClipboardList
        : Clock;

  return (
    <BorrowerCard
      className={cn(
        "rounded-3xl border-border/50 bg-card/80 shadow-sm",
        status.tone === "attention" && "bg-muted/30",
        status.tone === "ready" && "bg-muted/20",
        status.tone === "neutral" && "bg-muted/30",
      )}
    >
      <CardContent className="flex items-start gap-4 px-5 py-5">
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl border border-border/50 bg-background text-muted-foreground shadow-sm">
          <Icon className="size-4" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Badge
            variant="secondary"
            className="w-fit rounded-full bg-background px-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
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
            <Button size="sm" onClick={onAction} className="mt-1 w-fit rounded-full">
              {status.actionLabel}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </BorrowerCard>
  );
}
