import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <Card className="rounded-3xl shadow-sm overflow-hidden border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-end p-5 pb-0 space-y-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          className="rounded-full h-10 gap-1 font-semibold"
        >
          {actionLabel}
          <ChevronRight className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-2 p-5 pt-3">
        {children}
      </CardContent>
    </Card>
  );
}
