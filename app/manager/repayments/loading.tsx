import {
  ManagerShellSkeleton,
  FilterCardSkeleton,
  TableSkeleton,
} from "../loading-skeletons";

export default function ManagerRepaymentsLoading() {
  return (
    <ManagerShellSkeleton
      title="Repayment proofs"
      description="Monitor submitted evidence, repayment status, and lender review notes."
    >
      <FilterCardSkeleton fields={7} />
      <TableSkeleton rows={8} cols={6} />
    </ManagerShellSkeleton>
  );
}
