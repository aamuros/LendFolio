import type { ReactNode } from "react";
import { BorrowerCard } from "./borrower-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SectionCard({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <BorrowerCard variant="dashboard">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 pb-1 pt-4 sm:px-5 sm:pt-5">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="grid gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
        {children}
      </CardContent>
    </BorrowerCard>
  );
}
