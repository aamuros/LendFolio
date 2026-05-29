import {
  ManagerShellSkeleton,
  FilterCardSkeleton,
  TableSkeleton,
} from "../loading-skeletons";

export default function ManagerAuditLogsLoading() {
  return (
    <ManagerShellSkeleton
      title="Audit logs"
      description="Review workflow events by actor, action, target, and date."
    >
      <FilterCardSkeleton fields={5} />
      <TableSkeleton rows={8} cols={5} />
    </ManagerShellSkeleton>
  );
}
