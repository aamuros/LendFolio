import {
  ManagerShellSkeleton,
  FilterCardSkeleton,
  SummaryCountCardsSkeleton,
  TableSkeleton,
} from "../loading-skeletons";

export default function ManagerLookupLoading() {
  return (
    <ManagerShellSkeleton
      title="Users"
      description="Search users, borrower records, applications, loans, and repayment activity."
    >
      <div className="space-y-6">
        <FilterCardSkeleton fields={3} />
        <SummaryCountCardsSkeleton count={4} />
        <TableSkeleton rows={8} cols={5} />
      </div>
    </ManagerShellSkeleton>
  );
}
