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

type ApplicationFiltersProps = {
  filters: {
    status?: string;
    borrower?: string;
    preferredTerm?: string;
    submittedFrom?: string;
    submittedTo?: string;
  };
  hasActiveFilters: boolean;
};

export function ApplicationFilters({
  filters,
  hasActiveFilters,
}: ApplicationFiltersProps) {
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
              Narrow applications by status, borrower, preferred term, or
              submission date.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <AutoFilterForm className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectFilter
            label="Application status"
            name="status"
            defaultValue={filters.status}
            options={[
              { value: "submitted", label: "Submitted" },
              { value: "open", label: "Open" },
              { value: "accepted", label: "Accepted" },
              { value: "declined", label: "Declined" },
              { value: "withdrawn", label: "Withdrawn" },
            ]}
          />
          <TextFilter
            label="Borrower"
            name="borrower"
            defaultValue={filters.borrower}
          />
          <SelectFilter
            label="Preferred term"
            name="preferredTerm"
            defaultValue={filters.preferredTerm}
            options={[
              { value: "1_month", label: "1 month" },
              { value: "3_months", label: "3 months" },
              { value: "6_months", label: "6 months" },
              { value: "12_months", label: "12 months" },
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
                <Link href="/manager/applications">Clear filters</Link>
              </Button>
            ) : null}
          </div>
        </AutoFilterForm>
      </CardContent>
    </Card>
  );
}
