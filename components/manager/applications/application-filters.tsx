import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FilterForm, SelectFilter, TextFilter } from "@/app/manager/manager-ui";

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
      <CardContent>
        <FilterForm className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(160px,1fr)_minmax(140px,1fr)_minmax(260px,1.4fr)_auto]">
          <TextFilter
            label="Borrower"
            name="borrower"
            defaultValue={filters.borrower}
          />
          <SelectFilter
            label="Status"
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
          <SelectFilter
            label="Term"
            name="preferredTerm"
            defaultValue={filters.preferredTerm}
            options={[
              { value: "1_month", label: "1 month" },
              { value: "3_months", label: "3 months" },
              { value: "6_months", label: "6 months" },
              { value: "12_months", label: "12 months" },
            ]}
          />
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
          <div className="flex min-w-0 items-end gap-2 sm:col-span-2 xl:col-span-1">
            <Button type="submit" className="flex-1 sm:flex-none">
              Apply
            </Button>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                asChild
              >
                <Link href="/manager/applications">Clear</Link>
              </Button>
            ) : null}
          </div>
        </FilterForm>
      </CardContent>
    </Card>
  );
}
