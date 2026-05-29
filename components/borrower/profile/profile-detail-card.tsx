import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card className="rounded-2xl shadow-sm overflow-hidden border-border bg-card">
      <div className="flex items-center justify-end px-4 pt-4 pb-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAction}
          className="h-8 gap-1.5 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3" />
          {actionLabel}
        </Button>
      </div>
      <CardContent className="grid gap-0 px-4 pt-2 pb-4">
        {children}
      </CardContent>
    </Card>
  );
}
