import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FilterForm, SelectFilter, TextFilter } from "@/app/manager/manager-ui";

type LoanFiltersProps = {
  filters: {
    status?: string;
    lender?: string;
    borrower?: string;
    dueFrom?: string;
    dueTo?: string;
  };
  hasActiveFilters: boolean;
};

export function LoanFilters({ filters, hasActiveFilters }: LoanFiltersProps) {
  return (
    <Card>
      <CardContent>
        <FilterForm className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(260px,1.4fr)_auto]">
          <div className="min-w-0">
            <SelectFilter
              label="Status"
              name="status"
              defaultValue={filters.status}
              options={[
                { value: "active", label: "Active" },
                { value: "paid", label: "Paid" },
                { value: "overdue", label: "Overdue" },
                { value: "defaulted", label: "Defaulted" },
                { value: "closed", label: "Closed" },
              ]}
            />
          </div>
          <div className="min-w-0">
            <TextFilter
              label="Lender"
              name="lender"
              defaultValue={filters.lender}
            />
          </div>
          <div className="min-w-0">
            <TextFilter
              label="Borrower"
              name="borrower"
              defaultValue={filters.borrower}
            />
          </div>
          <div className="min-w-0">
            <div className="grid min-w-0 gap-1.5">
              <span className="text-xs font-medium">Due date</span>
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                <Input
                  name="dueFrom"
                  type="date"
                  defaultValue={filters.dueFrom ?? ""}
                  className="min-w-0"
                  aria-label="Due date from"
                />
                <Input
                  name="dueTo"
                  type="date"
                  defaultValue={filters.dueTo ?? ""}
                  className="min-w-0"
                  aria-label="Due date to"
                />
              </div>
            </div>
          </div>
          <div className="flex min-w-0 items-end gap-2 sm:col-span-2 xl:col-span-1">
            <Button type="submit" className="flex-1 sm:flex-none">Apply</Button>
            {hasActiveFilters ? (
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" asChild>
                <Link href="/manager/loans">Clear</Link>
              </Button>
            ) : null}
          </div>
        </FilterForm>
      </CardContent>
    </Card>
  );
}
