import {
  ManagerShellSkeleton,
  FilterCardSkeleton,
  TableSkeleton,
} from "../loading-skeletons";

export default function ManagerLookupLoading() {
  return (
    <ManagerShellSkeleton
      title="Lookup"
      description="Review users and find borrower records by name, ID, business location, application ID, or loan purpose."
    >
      <FilterCardSkeleton fields={3} />
      <TableSkeleton rows={8} cols={5} />
    </ManagerShellSkeleton>
  );
}
