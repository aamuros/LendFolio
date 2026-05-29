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
        <FilterForm className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1">
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
          </div>
          <div className="min-w-[140px] flex-1">
            <TextFilter
              label="Borrower"
              name="borrower"
              defaultValue={filters.borrower}
            />
          </div>
          <div className="min-w-[140px] flex-1">
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
          </div>
          <div className="min-w-[200px] flex-1">
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
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasActiveFilters ? (
              <Button type="button" variant="outline" asChild>
                <Link href="/manager/applications">Clear</Link>
              </Button>
            ) : null}
          </div>
        </FilterForm>
      </CardContent>
    </Card>
  );
}
