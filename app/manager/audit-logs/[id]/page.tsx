import { getManagerAccess } from "../../manager-access";
import { getShortId, loadManagerAuditLogDetail } from "@/lib/manager-operations";
import {
  AccessDenied,
  DetailItem,
  DetailSection,
  ManagerShell,
  PersonLabel,
  formatDateTime,
  BackLink,
} from "../../manager-ui";



type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ManagerAuditLogDetailPage({ params }: PageProps) {
  const { id } = await params;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Audit log detail"
        description="Read-only audit log event."
        
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerAuditLogDetail(access.supabase, id);

  if (result.mode === "invalid-id") {
    return (
      <ManagerShell
        title="Invalid audit log link"
        description="This audit log link is not valid."
        
        showHeading={false}
      >
        <ManagerAuditLogErrorState
          title="Invalid audit log link"
          message={`This audit log link is not valid. Received ID: ${id}. Return to audit logs and try again.`}
        />
      </ManagerShell>
    );
  }

  if (result.mode === "not-found") {
    return (
      <ManagerShell
        title="Audit log not found"
        description="This audit log event could not be found."
        
        showHeading={false}
      >
        <ManagerAuditLogErrorState
          title="Audit log not found"
          message="This audit log event could not be found. Return to audit logs and try again."
        />
      </ManagerShell>
    );
  }

  if (result.mode === "supabase") {
    return (
      <ManagerShell
        title="Could not load audit log"
        description="This audit log event could not be loaded."
        
        showHeading={false}
      >
        <ManagerAuditLogErrorState
          title="Could not load audit log"
          message={result.message}
        />
      </ManagerShell>
    );
  }

  if (!result.log) {
    return (
      <ManagerShell
        title="Could not load audit log"
        description="This audit log event could not be loaded."
        
        showHeading={false}
      >
        <ManagerAuditLogErrorState
          title="Could not load audit log"
          message="This audit log event could not be loaded. Return to audit logs and try again."
        />
      </ManagerShell>
    );
  }

  const log = result.log;

  return (
    <ManagerShell
      title={log.action}
      description="Read-only manager view of this audit event."
      
      showHeading={false}
    >
      <section className="grid gap-3">
        <BackLink href="/manager/audit-logs" label="Back to audit logs" />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-semibold">
              {log.action}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Event {getShortId(log.id)} · {formatDateTime(log.timestamp)}
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs font-semibold">
            {log.targetTable}
          </span>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailSection title="Overview">
            <DetailItem label="Event ID" value={log.id} />
            <DetailItem label="Action" value={log.action} />
            <DetailItem label="Created" value={formatDateTime(log.timestamp)} />
            <DetailItem
              label="Actor"
              value={log.actor ? <PersonLabel person={log.actor} /> : "System"}
            />
          </DetailSection>

          <DetailSection title="Target">
            <DetailItem label="Target table" value={log.targetTable} />
            <DetailItem label="Target ID" value={log.targetId} />
          </DetailSection>
        </div>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">Metadata</h2>
          <pre className="max-h-[28rem] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-xs leading-5 whitespace-pre-wrap">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </section>
      </section>
    </ManagerShell>
  );
}

function ManagerAuditLogErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section
      className="grid gap-3 rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm"
      role="alert"
    >
      <BackLink href="/manager/audit-logs" label="Back to audit logs" />
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {message}
        </p>
      </div>
    </section>
  );
}
