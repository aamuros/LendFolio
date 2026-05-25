import { requireManager } from "@/lib/access-control";
import { getShortId, loadManagerAuditLogs } from "@/lib/manager-operations";
import {
  AccessDenied,
  DataCard,
  Field,
  FilterGrid,
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
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerAuditLogs(access.supabase, filters);

  return (
    <ManagerShell
      title="Audit logs"
      description="Review workflow events by actor, action, target, and date."
    >
      <FilterGrid>
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
      </FilterGrid>

      <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

      <section className="grid gap-3">
        {result.logs.map((log) => (
          <DataCard key={log.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{log.action}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {formatDateTime(log.timestamp)}
                </p>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs font-semibold">
                {log.targetTable}
              </span>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Actor"
                value={
                  log.actor ? <PersonLabel person={log.actor} /> : "System event"
                }
              />
              <Field label="Target ID" value={getShortId(log.targetId)} />
              <Field label="Event ID" value={getShortId(log.id)} />
              <Field label="Metadata" value={log.metadataPreview} />
            </dl>
          </DataCard>
        ))}
      </section>
    </ManagerShell>
  );
}
