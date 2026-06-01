import { ManagerShellSkeleton } from "./loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ManagerLoading() {
  return (
    <ManagerShellSkeleton title="Manager dashboard" description="Review platform activity, pending approvals, and lending operations.">
      <div className="flex flex-1 flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/60">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <Skeleton className="size-4 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded-full" />
                    <Skeleton className="size-4 shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-0 space-y-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="flex gap-1 pt-2 sm:pt-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-md" />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </ManagerShellSkeleton>
  );
}
