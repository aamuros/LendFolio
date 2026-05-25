import { requireManager } from "@/lib/access-control";
import Link from "next/link";
import { getShortId, loadManagerAuditLogs } from "@/lib/manager-operations";
import {
  AccessDenied,
  AutoFilterGrid,
  EmptyState,
  ManagerDetailsLink,
  ManagerRecordHeader,
  ManagerRecordList,
  ManagerRecordRow,
  ManagerShell,
  PersonLabel,
  StatusMessage,
  TextFilter,
  formatDateTime,
} from "../manager-ui";

export const dynamic = "force-dynamic";

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
  const access = await requireManager();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Audit logs"
        description="Read-only workflow event history for manager review."
        activeTab="audit"
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerAuditLogs(access.supabase, filters);
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const auditLogGridClass =
    "sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_4.5rem] sm:items-center sm:gap-3";

  return (
    <ManagerShell
      title="Audit logs"
      description="Review workflow events by actor, action, target, and date."
      activeTab="audit"
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
          className="w-fit text-xs font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
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
          <ManagerRecordList>
            <ManagerRecordHeader className={auditLogGridClass}>
              <span>Event</span>
              <span>Actor</span>
              <span>Target</span>
              <span>Created</span>
              <span className="justify-self-center">Details</span>
            </ManagerRecordHeader>

            {result.logs.map((log) => (
              <ManagerRecordRow key={log.id}>
                <article
                  className={`grid gap-2 px-3 py-2.5 sm:grid ${auditLogGridClass}`}
                >
                  <div className="flex items-start justify-between gap-3 sm:hidden">
                    <h2 className="truncate text-sm font-semibold">{log.action}</h2>
                    <ManagerDetailsLink href={`/manager/audit-logs/${log.id}`} />
                  </div>

                  <p className="text-xs sm:hidden">
                    {log.actor ? <PersonLabel person={log.actor} /> : "System"}
                  </p>

                  <p className="truncate text-xs text-[var(--muted-foreground)] sm:hidden">
                    {log.targetTable} · {getShortId(log.targetId)}
                  </p>

                  <p className="text-xs text-[var(--muted-foreground)] sm:hidden">
                    {formatDateTime(log.timestamp)}
                  </p>

                  <div className="hidden min-w-0 sm:block">
                    <h2 className="truncate text-sm font-semibold">
                      {log.action}
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Event {getShortId(log.id)}
                    </p>
                  </div>

                  <div className="hidden min-w-0 text-xs sm:block sm:text-sm">
                    {log.actor ? <PersonLabel person={log.actor} /> : "System"}
                  </div>

                  <p className="hidden min-w-0 truncate text-sm sm:block">
                    {log.targetTable} · {getShortId(log.targetId)}
                  </p>

                  <p className="hidden text-sm sm:block">
                    {formatDateTime(log.timestamp)}
                  </p>

                  <span className="hidden sm:inline-flex sm:justify-self-center">
                    <ManagerDetailsLink href={`/manager/audit-logs/${log.id}`} />
                  </span>
                </article>
              </ManagerRecordRow>
            ))}
          </ManagerRecordList>
        ) : null}
      </section>
    </ManagerShell>
  );
}
