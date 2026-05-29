import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-1.5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
    </div>
  );
}

export function SummaryCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="grid gap-2 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FilterCardSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <Card>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="grid gap-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <div className="flex items-end gap-2">
            <Skeleton className="h-9 flex-1 sm:w-20" />
            <Skeleton className="h-9 flex-1 sm:w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Card className="py-0">
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th
                  key={i}
                  className="h-10 px-2 text-left align-middle font-medium whitespace-nowrap"
                >
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {Array.from({ length: rows }).map((_, row) => (
              <tr key={row} className="border-b">
                {Array.from({ length: cols }).map((_, col) => (
                  <td key={col} className="p-2 align-middle whitespace-nowrap">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="grid gap-3 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1.5 flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="rounded-lg border bg-muted/30 px-3 py-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-1 h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ManagerShellSkeleton({
  showHeading = true,
  children,
}: {
  title?: string;
  description?: string;
  showHeading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center bg-background px-4 py-2">
        <Skeleton className="size-7 rounded-md" />
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
        <div className="mx-auto w-full max-w-[1600px]">
          {showHeading ? (
            <div className="mb-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-72" />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </>
  );
}
