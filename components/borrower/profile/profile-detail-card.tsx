import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil } from "lucide-react";

export function ProfileDetailCard({
  actionLabel,
  children,
  onAction,
}: {
  actionLabel: string;
  children: ReactNode;
  onAction: () => void;
}) {
  return (
    <Card className="rounded-2xl">
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
      <div className="grid gap-0 px-5 pt-1 pb-4">
        {children}
      </div>
    </Card>
  );
}
