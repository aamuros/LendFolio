import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterForm, SelectFilter, TextFilter } from "@/app/manager/manager-ui";

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
      <CardContent>
        <FilterForm className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(140px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(260px,1.4fr)_auto]">
          <div className="min-w-0">
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
          </div>
          <div className="min-w-0">
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
          </div>
          <div className="min-w-0">
            <TextFilter label="Lender" name="lender" defaultValue={filters.lender} />
          </div>
          <div className="min-w-0">
            <TextFilter
              label="Borrower"
              name="borrower"
              defaultValue={filters.borrower}
            />
          </div>
          <div className="min-w-0">
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
          </div>
          <div className="grid min-w-0 gap-1.5">
                <span className="text-xs font-medium">Submitted date</span>
                <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                  <Input
                    name="submittedFrom"
                    type="date"
                    defaultValue={filters.submittedFrom ?? ""}
                    className="min-w-0"
                    aria-label="Submitted from"
                  />
                  <Input
                    name="submittedTo"
                    type="date"
                    defaultValue={filters.submittedTo ?? ""}
                    className="min-w-0"
                    aria-label="Submitted to"
                  />
                </div>
              </div>
            <div className="flex min-w-0 items-end gap-2 sm:col-span-2 xl:col-span-3 2xl:col-span-1">
              <Button type="submit" className="flex-1 sm:flex-none">Apply</Button>
              {hasActiveFilters ? (
                <Button type="button" variant="outline" className="flex-1 sm:flex-none" asChild>
                  <Link href="/manager/repayments">Clear</Link>
                </Button>
              ) : null}
            </div>
        </FilterForm>
      </CardContent>
    </Card>
  );
}
