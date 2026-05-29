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
        <FilterForm className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto]">
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
          <TextFilter
            label="Borrower"
            name="borrower"
            defaultValue={filters.borrower}
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
          <div className="grid gap-1.5">
            <span className="text-xs font-medium">Submitted date</span>
            <div className="flex gap-2">
              <Input
                name="submittedFrom"
                type="date"
                defaultValue={filters.submittedFrom ?? ""}
                className="flex-1"
                aria-label="Submitted from"
              />
              <Input
                name="submittedTo"
                type="date"
                defaultValue={filters.submittedTo ?? ""}
                className="flex-1"
                aria-label="Submitted to"
              />
            </div>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
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
