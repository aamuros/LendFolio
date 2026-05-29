import {
  ManagerShellSkeleton,
  PageHeaderSkeleton,
  SummaryCardsSkeleton,
  FilterCardSkeleton,
  TableSkeleton,
} from "../loading-skeletons";

export default function ManagerApplicationsLoading() {
  return (
    <ManagerShellSkeleton
      title="Applications & offers"
      description="Track borrower requests, preferred terms, offer counts, and accepted terms."
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
