import {
  ManagerShellSkeleton,
  FilterCardSkeleton,
  CardListSkeleton,
} from "../loading-skeletons";

export default function ManagerLendersLoading() {
  return (
    <ManagerShellSkeleton
      title="Lender review"
      description="Approve lender requests or reject accounts that should not access lender tools."
    >
      <FilterCardSkeleton fields={1} />
      <CardListSkeleton count={3} />
    </ManagerShellSkeleton>
  );
}
