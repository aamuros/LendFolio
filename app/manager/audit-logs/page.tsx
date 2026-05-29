import { getManagerAccess } from "../manager-access";
import Link from "next/link";
import { getShortId, loadManagerAuditLogs } from "@/lib/manager-operations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AccessDenied,
  AutoFilterGrid,
  EmptyState,
  ManagerDetailsLink,
  ManagerShell,
  PersonLabel,
  StatusMessage,
  TextFilter,
  formatDateTime,
} from "../manager-ui";
import { withServerTiming } from "@/lib/perf";



type PageProps = {
  searchParams: Promise<{
    action?: string;
    targetTable?: string;
    actor?: string;
    createdFrom?: string;
    createdTo?: string;
  }>;
};

export default async function ManagerAuditLogsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Audit logs"
        description="Read-only workflow event history for manager review."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const { result } = await withServerTiming(
    "loadManagerAuditLogs",
    () => loadManagerAuditLogs(access.supabase, filters),
  );
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <ManagerShell
      title="Audit logs"
      description="Review workflow events by actor, action, target, and date."
    >
      <AutoFilterGrid>
        <TextFilter label="Action" name="action" defaultValue={filters.action} />
        <TextFilter
          label="Target table"
          name="targetTable"
          defaultValue={filters.targetTable}
        />
        <TextFilter label="Actor" name="actor" defaultValue={filters.actor} />
        <TextFilter
          label="Created from"
          name="createdFrom"
          type="date"
          defaultValue={filters.createdFrom}
        />
        <TextFilter
          label="Created to"
          name="createdTo"
          type="date"
          defaultValue={filters.createdTo}
        />
      </AutoFilterGrid>

      {hasActiveFilters ? (
        <Link
          href="/manager/audit-logs"
          className="w-fit text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Reset filters
        </Link>
      ) : null}

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section>
        {result.logs.length === 0 ? (
          <EmptyState
            title="No audit logs found"
            description="Audit events matching the current filters will appear here."
          />
        ) : null}

        {result.logs.length > 0 ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {log.action}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Event {getShortId(log.id)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.actor ? (
                          <PersonLabel person={log.actor} />
                        ) : (
                          <span className="text-sm text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {log.targetTable} · {getShortId(log.targetId)}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ManagerDetailsLink href={`/manager/audit-logs/${log.id}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {result.logs.map((log) => (
                <article
                  key={log.id}
                  className="grid gap-2 rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="truncate text-sm font-semibold">{log.action}</h2>
                    <ManagerDetailsLink href={`/manager/audit-logs/${log.id}`} />
                  </div>
                  <p className="text-xs">
                    {log.actor ? <PersonLabel person={log.actor} /> : "System"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {log.targetTable} · {getShortId(log.targetId)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(log.timestamp)}
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </ManagerShell>
  );
}
