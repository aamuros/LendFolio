import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="rounded-3xl shadow-sm border-border bg-card">
      <CardContent className="grid gap-4 p-5">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-muted-foreground">
            Available to request
          </p>
          <p className="text-3xl font-semibold tabular-nums">
            {creditSummary
              ? formatCreditAmount(creditSummary.availableCredit)
              : "Not available"}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Based on your saved financials and any active loan balance.
          </p>
        </div>

        <div className="grid gap-2">
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

        <p className="rounded-2xl bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground">
          LendFolio estimates borrowing power from net monthly cash flow, time in
          operation, revenue limits, and existing active loans. Updating your
          profile refreshes this amount.
        </p>

        <Button
          variant="outline"
          onClick={onUpdateProfile}
          className="rounded-full h-11 font-semibold sm:w-fit"
        >
          Update profile details
        </Button>
      </CardContent>
    </Card>
  );
}
