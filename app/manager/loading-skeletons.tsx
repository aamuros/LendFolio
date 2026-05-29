import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <div className="sticky top-0 z-30 flex h-12 shrink-0 items-center bg-background px-4">
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

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-1.5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
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

export function TableSkeleton({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: cols }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, row) => (
            <TableRow key={row}>
              {Array.from({ length: cols }).map((_, col) => (
                <TableCell key={col}>
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
                <div
                  key={j}
                  className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                >
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

export function BadgeSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-5 w-16 rounded-full", className)} />;
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function DetailPageSkeleton() {
  return (
    <div className="grid gap-4 md:gap-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-1 h-4 w-40" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>

      <Card>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-0.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="grid gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                >
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function OperationsTableSkeleton() {
  return (
    <Card className="py-0">
      <div className="px-4 py-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-1 h-3.5 w-56" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead className="text-right">
              <Skeleton className="ml-auto h-4 w-14" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-14 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-3.5 w-16" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-8 w-16 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function KpiOverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3.5 w-64" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
            >
              <Skeleton className="size-8 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformancePanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function HeaderWithBadgesSkeleton({
  badgeCount = 3,
}: {
  badgeCount?: number;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: badgeCount }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function SummaryCountCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} size="sm">
          <CardContent>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-1 h-6 w-12" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function AnalyticsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3.5 w-72" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-8 text-center">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-1 h-3 w-64" />
        </div>
      </CardContent>
    </Card>
  );
}
