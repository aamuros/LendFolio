import {
  ManagerShellSkeleton,
  FilterCardSkeleton,
  CardListSkeleton,
} from "../loading-skeletons";

export default function ManagerBorrowerVerificationsLoading() {
  return (
    <ManagerShellSkeleton
      title="Borrower review"
      description="Review submitted borrower evidence before approving access."
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-64 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <FilterCardSkeleton fields={3} />
        <CardListSkeleton count={2} />
      </div>
    </ManagerShellSkeleton>
  );
}
