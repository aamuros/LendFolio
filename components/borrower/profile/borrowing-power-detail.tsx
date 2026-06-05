import { Button } from "@/components/ui/button";
import { BorrowerCard } from "@/components/borrower/ui/borrower-card";
import { SummaryRow } from "@/components/borrower/ui/summary-row";
import {
  formatCreditAmount,
  type BorrowerCreditSummary,
} from "@/lib/credit-limit";
import { type BorrowerPortfolioInput } from "@/lib/borrower-portfolio";
import { type BorrowerReadinessResult } from "@/lib/borrower-readiness";

export function BorrowingPowerDetail({
  creditSummary,
  onUpdateProfile,
  portfolio,
  readiness,
}: {
  creditSummary: BorrowerCreditSummary | null;
  onUpdateProfile: () => void;
  portfolio: BorrowerPortfolioInput | null;
  readiness: BorrowerReadinessResult | null;
}) {
  function formatReadinessStatus(value: string) {
    return value
      .split("_")
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(" ");
  }

  return (
    <BorrowerCard>
      <div className="px-5 pt-5 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Available to request
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground">
          {creditSummary
            ? formatCreditAmount(creditSummary.availableCredit)
            : "Not available"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Lenders will add interest and fees on top of your principal. The total
          repayment must fit within this amount.
        </p>
      </div>
      <div className="grid gap-4 px-5 pb-5">
        <div className="rounded-xl bg-muted/50 px-4 py-1">
          <SummaryRow
            label="Used credit"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.usedCredit)
                : "Not available"
            }
          />
          <SummaryRow
            label="Max eligible amount"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.calculatedCreditLimit)
                : "Not available"
            }
          />
          <SummaryRow
            label="Monthly revenue"
            value={
              portfolio
                ? formatCreditAmount(portfolio.monthlyGrossRevenue)
                : "Not provided"
            }
          />
          <SummaryRow
            label="Monthly expenses"
            value={
              portfolio
                ? formatCreditAmount(portfolio.monthlyExpenses)
                : "Not provided"
            }
          />
          <SummaryRow
            label="Existing loan payments"
            value={
              portfolio
                ? formatCreditAmount(portfolio.existingLoanPayments)
                : "Not provided"
            }
          />
          <SummaryRow
            label="Net monthly cash flow"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.monthlyNetCashFlow)
                : readiness
                  ? formatCreditAmount(readiness.monthlyNetCashFlow)
                  : "Not available"
            }
          />
          <SummaryRow
            label="Readiness"
            value={
              readiness
                ? formatReadinessStatus(readiness.readinessStatus)
                : "Not available"
            }
          />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          LendFolio estimates borrowing power from net monthly cash flow, time in
          operation, revenue limits, and existing active loans. Updating your
          profile refreshes this amount.
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={onUpdateProfile}
          className="w-full rounded-lg text-sm font-medium"
        >
          Update profile details
        </Button>
      </div>
    </BorrowerCard>
  );
}
