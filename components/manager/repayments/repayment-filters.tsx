import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AutoFilterForm } from "@/app/manager/auto-filter-form";
import { SelectFilter, TextFilter } from "@/app/manager/manager-ui";

type RepaymentFiltersProps = {
  filters: {
    proofStatus?: string;
    repaymentStatus?: string;
    lender?: string;
    borrower?: string;
    range?: string;
    submittedFrom?: string;
    submittedTo?: string;
  };
  hasActiveFilters: boolean;
};

export function RepaymentFilters({ filters, hasActiveFilters }: RepaymentFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Filters</CardTitle>
        <CardDescription className="text-xs">
          Narrow repayment proofs by status, reviewer, borrower, lender, or submission date.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AutoFilterForm className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectFilter
            label="Proof status"
            name="proofStatus"
            defaultValue={filters.proofStatus}
            options={[
              { value: "submitted", label: "Submitted" },
              { value: "verified", label: "Verified" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
          <SelectFilter
            label="Repayment status"
            name="repaymentStatus"
            defaultValue={filters.repaymentStatus}
            options={[
              { value: "due", label: "Due" },
              { value: "submitted", label: "Submitted" },
              { value: "verified", label: "Verified" },
              { value: "rejected", label: "Rejected" },
              { value: "late", label: "Late" },
            ]}
          />
          <TextFilter label="Lender" name="lender" defaultValue={filters.lender} />
          <TextFilter
            label="Borrower"
            name="borrower"
            defaultValue={filters.borrower}
          />
          <SelectFilter
            label="Submitted range"
            name="range"
            defaultValue={filters.range}
            emptyLabel="Any time"
            options={[
              { value: "this_week", label: "This week" },
              { value: "this_month", label: "This month" },
              { value: "this_year", label: "This year" },
              { value: "custom", label: "Custom" },
            ]}
          />
          <TextFilter
            label="Submitted from"
            name="submittedFrom"
            type="date"
            defaultValue={filters.submittedFrom}
          />
          <TextFilter
            label="Submitted to"
            name="submittedTo"
            type="date"
            defaultValue={filters.submittedTo}
          />
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              Apply filters
            </Button>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                asChild
              >
                <Link href="/manager/repayments">Clear filters</Link>
              </Button>
            ) : null}
          </div>
        </AutoFilterForm>
      </CardContent>
    </Card>
  );
}
