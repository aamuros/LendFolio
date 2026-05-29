import {
  ManagerShellSkeleton,
  HeaderWithBadgesSkeleton,
  FilterCardSkeleton,
  CardListSkeleton,
} from "../loading-skeletons";

export default function ManagerLendersLoading() {
  return (
    <ManagerShellSkeleton
      title="Lender review"
      description="Approve lender requests or reject accounts that should not access lender tools."
      showHeading={false}
    >
      <div className="space-y-6">
        <HeaderWithBadgesSkeleton badgeCount={3} />
        <FilterCardSkeleton fields={1} />
        <CardListSkeleton count={3} />
      </div>
    </ManagerShellSkeleton>
  );
}
