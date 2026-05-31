import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BorrowerCard } from "@/components/borrower/ui/borrower-card";
import { Pencil } from "lucide-react";

export function ProfileDetailCard({
  actionLabel,
  children,
  headerLabel,
  headerTitle,
  headerSubtitle,
  onAction,
}: {
  actionLabel: string;
  children: ReactNode;
  headerLabel?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  onAction: () => void;
}) {
  return (
    <BorrowerCard>
      {(headerLabel || headerTitle || headerSubtitle) ? (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-0">
          <div className="min-w-0">
            {headerLabel ? (
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {headerLabel}
              </p>
            ) : null}
            {headerTitle ? (
              <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
                {headerTitle}
              </p>
            ) : null}
            {headerSubtitle ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {headerSubtitle}
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={onAction}
            className="mt-0.5 shrink-0 gap-1 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3" />
            {actionLabel}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-end px-5 pt-4">
          <Button
            variant="ghost"
            size="xs"
            onClick={onAction}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3" />
            {actionLabel}
          </Button>
        </div>
      )}
      <div className="grid gap-0 px-5 pt-3 pb-4">
        {children}
      </div>
    </BorrowerCard>
  );
}
