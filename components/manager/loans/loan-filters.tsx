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
        <FilterForm className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1">
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
          <div className="min-w-[140px] flex-1">
            <TextFilter
              label="Lender"
              name="lender"
              defaultValue={filters.lender}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <TextFilter
              label="Borrower"
              name="borrower"
              defaultValue={filters.borrower}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <div className="grid gap-1.5">
              <span className="text-xs font-medium">Due date</span>
              <div className="flex gap-2">
                <Input
                  name="dueFrom"
                  type="date"
                  defaultValue={filters.dueFrom ?? ""}
                  className="flex-1"
                  aria-label="Due date from"
                />
                <Input
                  name="dueTo"
                  type="date"
                  defaultValue={filters.dueTo ?? ""}
                  className="flex-1"
                  aria-label="Due date to"
                />
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasActiveFilters ? (
              <Button type="button" variant="outline" asChild>
                <Link href="/manager/loans">Clear</Link>
              </Button>
            ) : null}
          </div>
        </FilterForm>
      </CardContent>
    </Card>
  );
}
