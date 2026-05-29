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
      <div className="space-y-4">
        <FilterCardSkeleton fields={5} />
        <TableSkeleton rows={8} cols={6} />
      </div>
    </ManagerShellSkeleton>
  );
}
