import {
  ManagerShellSkeleton,
  PageHeaderSkeleton,
  SummaryCardsSkeleton,
  FilterCardSkeleton,
  TableSkeleton,
} from "../loading-skeletons";

export default function ManagerLoansLoading() {
  return (
    <ManagerShellSkeleton
      title="Active loans"
      description="Review funded loans by status, borrower, lender, balance, and due date."
      showHeading={false}
    >
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <SummaryCardsSkeleton />
        <FilterCardSkeleton />
        <TableSkeleton rows={6} cols={6} />
      </div>
    </ManagerShellSkeleton>
  );
}
