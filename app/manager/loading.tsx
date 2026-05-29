import {
  ManagerShellSkeleton,
  SummaryCardsSkeleton,
  OperationsTableSkeleton,
  KpiOverviewSkeleton,
  PerformancePanelSkeleton,
  AnalyticsCardSkeleton,
} from "./loading-skeletons";

export default function ManagerLoading() {
  return (
    <ManagerShellSkeleton
      title="Manager dashboard"
      description="Operations console for platform activity, pending actions, and performance."
      showHeading={false}
    >
      <div className="@container/main flex flex-1 flex-col gap-4 md:gap-6">
        <SummaryCardsSkeleton count={4} />

        <OperationsTableSkeleton />

        <KpiOverviewSkeleton />

        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <PerformancePanelSkeleton />
          <PerformancePanelSkeleton />
        </div>

        <AnalyticsCardSkeleton />
      </div>
    </ManagerShellSkeleton>
  );
}
