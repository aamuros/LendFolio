import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function LenderProfileDetailCard({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Card className="rounded-2xl">
      <div className="grid gap-0 px-5 pt-5 pb-4">
        {children}
      </div>
    </Card>
  );
}
