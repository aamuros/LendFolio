import {
  ManagerShellSkeleton,
  PageHeaderSkeleton,
  SummaryCardsSkeleton,
  FilterCardSkeleton,
  TableSkeleton,
} from "../loading-skeletons";

export default function ManagerRepaymentsLoading() {
  return (
    <ManagerShellSkeleton
      title="Repayment proofs"
      description="Monitor submitted payment evidence, review status, due dates, and lender decisions."
      showHeading={false}
    >
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <SummaryCardsSkeleton />
        <FilterCardSkeleton fields={4} />
        <TableSkeleton rows={8} cols={6} />
      </div>
    </ManagerShellSkeleton>
  );
}
