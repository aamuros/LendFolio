import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";
import { AutoFilterForm } from "@/app/manager/auto-filter-form";
import { SelectFilter, TextFilter } from "@/app/manager/manager-ui";

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
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <SlidersHorizontal className="size-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Filters</CardTitle>
            <CardDescription className="text-xs">
              Narrow loans by status, lender, borrower, or due date.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AutoFilterForm className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <TextFilter
            label="Lender"
            name="lender"
            defaultValue={filters.lender}
          />
          <TextFilter
            label="Borrower"
            name="borrower"
            defaultValue={filters.borrower}
          />
          <TextFilter
            label="Due date from"
            name="dueFrom"
            type="date"
            defaultValue={filters.dueFrom}
          />
          <TextFilter
            label="Due date to"
            name="dueTo"
            type="date"
            defaultValue={filters.dueTo}
          />
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
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
                <Link href="/manager/loans">Clear filters</Link>
              </Button>
            ) : null}
          </div>
        </AutoFilterForm>
      </CardContent>
    </Card>
  );
}
