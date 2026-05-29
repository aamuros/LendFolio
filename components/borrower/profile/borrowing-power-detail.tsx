import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProfileSummaryRow } from "./profile-summary-row";
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
    <Card className="rounded-2xl">
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
          Based on your saved financials and any active loan balance.
        </p>
      </div>
      <div className="grid gap-4 px-5 pb-5">
        <div className="rounded-xl bg-muted/50 px-4 py-1">
          <ProfileSummaryRow
            label="Used credit"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.usedCredit)
                : "Not available"
            }
          />
          <ProfileSummaryRow
            label="Max eligible amount"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.calculatedCreditLimit)
                : "Not available"
            }
          />
          <ProfileSummaryRow
            label="Monthly revenue"
            value={
              portfolio
                ? formatCreditAmount(portfolio.monthlyGrossRevenue)
                : "Not provided"
            }
          />
          <ProfileSummaryRow
            label="Monthly expenses"
            value={
              portfolio
                ? formatCreditAmount(portfolio.monthlyExpenses)
                : "Not provided"
            }
          />
          <ProfileSummaryRow
            label="Existing loan payments"
            value={
              portfolio
                ? formatCreditAmount(portfolio.existingLoanPayments)
                : "Not provided"
            }
          />
          <ProfileSummaryRow
            label="Net monthly cash flow"
            value={
              creditSummary
                ? formatCreditAmount(creditSummary.monthlyNetCashFlow)
                : readiness
                  ? formatCreditAmount(readiness.monthlyNetCashFlow)
                  : "Not available"
            }
          />
          <ProfileSummaryRow
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
    </Card>
  );
}
