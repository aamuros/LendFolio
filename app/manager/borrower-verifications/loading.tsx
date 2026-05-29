import {
  ManagerShellSkeleton,
  HeaderWithBadgesSkeleton,
  FilterCardSkeleton,
  TableSkeleton,
} from "../loading-skeletons";

export default function ManagerBorrowerVerificationsLoading() {
  return (
    <ManagerShellSkeleton
      title="Borrower review"
      description="Review submitted borrower evidence before approving access."
      showHeading={false}
    >
      <div className="space-y-6">
        <HeaderWithBadgesSkeleton badgeCount={3} />
        <FilterCardSkeleton fields={3} />
        <TableSkeleton rows={5} cols={6} />
      </div>
    </ManagerShellSkeleton>
  );
}
