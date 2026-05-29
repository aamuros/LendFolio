import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { BorrowerCard } from "./borrower-card";

export function EmptyState({
  action,
  message,
  onAction,
}: {
  action?: string;
  message: string;
  onAction?: () => void;
}) {
  return (
    <BorrowerCard variant="dashed">
      <CardContent className="grid gap-3 p-5">
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        {onAction ? (
          <Button
            onClick={onAction}
            className="h-11 w-full rounded-full font-semibold sm:w-fit"
          >
            {action}
          </Button>
        ) : null}
      </CardContent>
    </BorrowerCard>
  );
}
