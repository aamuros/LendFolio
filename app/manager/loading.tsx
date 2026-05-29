import {
  ManagerShellSkeleton,
  SummaryCardsSkeleton,
  TableSkeleton,
  CardListSkeleton,
} from "./loading-skeletons";

export default function ManagerLoading() {
  return (
    <ManagerShellSkeleton
      title="Manager dashboard"
      description="Operations console for platform activity, pending actions, and performance."
      showHeading={false}
    >
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SummaryCardsSkeleton count={4} />

          <div className="px-4 lg:px-6">
            <div className="rounded-lg border bg-card">
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid gap-1">
                    <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-3.5 w-48 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-8 w-36 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-[250px] w-full rounded bg-muted/50 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="px-4 lg:px-6">
            <TableSkeleton rows={5} cols={5} />
          </div>

          <div className="px-4 lg:px-6">
            <div className="rounded-lg border bg-card">
              <div className="p-6">
                <div className="h-5 w-40 rounded bg-muted animate-pulse mb-2" />
                <div className="h-3.5 w-64 rounded bg-muted animate-pulse mb-4" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border bg-muted/30 p-3">
                      <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                      <div className="mt-1 h-6 w-12 rounded bg-muted animate-pulse" />
                      <div className="mt-0.5 h-3 w-28 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-4 md:gap-6 lg:grid-cols-2 lg:px-6">
            <CardListSkeleton count={1} />
            <CardListSkeleton count={1} />
          </div>
        </div>
      </div>
    </ManagerShellSkeleton>
  );
}
