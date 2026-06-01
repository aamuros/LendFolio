"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LenderPerformancePanel } from "@/app/manager/lender-performance-panel";
import { BorrowerReadinessPanel } from "@/app/manager/borrower-readiness-panel";
import type {
  ManagerLenderPerformanceRow,
  ManagerBorrowerPerformanceRow,
} from "@/lib/manager-dashboard";

export function InsightsSection({
  lenderPerformance,
  borrowerPerformance,
}: {
  lenderPerformance: ManagerLenderPerformanceRow[];
  borrowerPerformance: ManagerBorrowerPerformanceRow[];
}) {
  return (
    <section aria-label="Insights">
      <Tabs defaultValue="lenders">
        <TabsList>
          <TabsTrigger value="lenders">Lender performance</TabsTrigger>
          <TabsTrigger value="borrowers">Borrower readiness</TabsTrigger>
        </TabsList>
        <TabsContent value="lenders">
          <LenderPerformancePanel rows={lenderPerformance} />
        </TabsContent>
        <TabsContent value="borrowers">
          <BorrowerReadinessPanel rows={borrowerPerformance} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
