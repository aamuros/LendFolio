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
          Your starting limit is based on your declared cash flow. Higher limits
          unlock after successful repayments.
        </p>
      </div>
      <div className="grid gap-4 px-5 pb-5">
        <div className="rounded-xl bg-muted/50 px-4 py-1">
          <SummaryRow
            label="Available credit"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.availableCredit)
                : "Not available"
            }
          />
          <SummaryRow
            label="Income-based starting limit"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.incomeBasedCapacity)
                : "Not available"
            }
          />
          <SummaryRow
            label="Safe monthly repayment capacity"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.safeMonthlyRepaymentCapacity)
                : "Not available"
            }
          />
          <SummaryRow
            label="Credit history cap"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.repaymentHistoryCap)
                : "Not available"
            }
          />
          <SummaryRow
            label="Used credit"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.usedCredit)
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
          Income decides the safe starting amount. Repayment history decides how
          far the limit can grow. Active loans and pending applications reduce
          available credit.
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
