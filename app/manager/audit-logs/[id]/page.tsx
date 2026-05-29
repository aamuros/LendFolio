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
import { Badge } from "@/components/ui/badge";

type PageProps = {
  params: Promise<{ id: string }>;
};

const actionLabels: Record<string, string> = {
  lender_approved: "Lender approved",
  lender_rejected: "Lender rejected",
  lender_signup_submitted: "Lender signup submitted",
  borrower_readiness_evaluated: "Borrower readiness evaluated",
  borrower_profile_created: "Borrower profile created",
  borrower_profile_updated: "Borrower profile updated",
  borrower_verification_approved: "Borrower verification approved",
  borrower_verification_rejected: "Borrower verification rejected",
  borrower_verification_resubmit: "Borrower verification resubmit",
  borrower_verification_submitted: "Borrower verification submitted",
  profile_created: "Profile created",
  profile_updated: "Profile updated",
  application_submitted: "Application submitted",
  application_withdrawn: "Application withdrawn",
  application_edited: "Application edited",
  offer_sent: "Offer sent",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  offer_expired: "Offer expired",
  loan_created: "Loan created",
  loan_activated: "Loan activated",
  loan_completed: "Loan completed",
  repayment_uploaded: "Repayment uploaded",
  repayment_verified: "Repayment verified",
  repayment_rejected: "Repayment rejected",
  consent_tos_accepted: "Terms of service accepted",
  consent_privacy_accepted: "Privacy notice accepted",
  consent_credit_authorized: "Credit review authorized",
  consent_doc_processing_accepted: "Doc processing consent accepted",
  notification_created: "Notification created",
  account_provisioned: "Account provisioned",
};

const targetTableLabels: Record<string, string> = {
  profiles: "Profile",
  lender_profiles: "Lender profile",
  borrower_portfolios: "Borrower portfolio",
  loan_applications: "Loan application",
  loans: "Loan",
  offers: "Offer",
  repayment_proofs: "Repayment proof",
  repayment_schedules: "Repayment schedule",
  borrower_verifications: "Borrower verification",
  audit_logs: "Audit log",
  notifications: "Notification",
  consents: "Consent",
};

type AuditCategory =
  | "Profile"
  | "Borrower"
  | "Lender"
  | "Application"
  | "Loan"
  | "Repayment"
  | "Consent"
  | "System"
  | "Other";

const categoryStyles: Record<AuditCategory, string> = {
  Profile: "bg-slate-100 text-slate-700 border-slate-200",
  Borrower: "bg-blue-50 text-blue-700 border-blue-200",
  Lender: "bg-violet-50 text-violet-700 border-violet-200",
  Application: "bg-amber-50 text-amber-700 border-amber-200",
  Loan: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Repayment: "bg-teal-50 text-teal-700 border-teal-200",
  Consent: "bg-pink-50 text-pink-700 border-pink-200",
  System: "bg-gray-100 text-gray-600 border-gray-200",
  Other: "bg-muted text-muted-foreground",
};

function humanizeAction(action: string): string {
  if (actionLabels[action]) return actionLabels[action];
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function humanizeTargetTable(table: string): string {
  return targetTableLabels[table] ?? table;
}

function getAuditCategory(action: string, targetTable: string): AuditCategory {
  if (action.startsWith("consent_") || targetTable === "consents") return "Consent";
  if (action.startsWith("borrower_") || targetTable === "borrower_portfolios" || targetTable === "borrower_verifications") return "Borrower";
  if (action.startsWith("lender_") || targetTable === "lender_profiles") return "Lender";
  if (targetTable === "loan_applications" || action.startsWith("application_")) return "Application";
  if (targetTable === "loans" || targetTable === "repayment_schedules" || action.startsWith("loan_")) return "Loan";
  if (targetTable === "repayment_proofs" || action.startsWith("repayment_")) return "Repayment";
  if (targetTable === "profiles" || action.startsWith("profile_")) return "Profile";
  if (action.startsWith("notification_") || action.startsWith("account_")) return "System";
  return "Other";
}

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
  const category = getAuditCategory(log.action, log.targetTable);

  return (
    <ManagerShell
      title={humanizeAction(log.action)}
      description="Read-only manager view of this audit event."
      showHeading={false}
    >
      <section className="grid gap-3">
        <BackLink href="/manager/audit-logs" label="Back to audit logs" />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-semibold">
              {humanizeAction(log.action)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Event {getShortId(log.id)} · {formatDateTime(log.timestamp)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={categoryStyles[category]}
            >
              {category}
            </Badge>
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold">
              {humanizeTargetTable(log.targetTable)}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailSection title="Overview">
            <DetailItem label="Event ID" value={log.id} />
            <DetailItem label="Action" value={log.action} />
            <DetailItem label="Action label" value={humanizeAction(log.action)} />
            <DetailItem label="Created" value={formatDateTime(log.timestamp)} />
            <DetailItem
              label="Actor"
              value={log.actor ? <PersonLabel person={log.actor} /> : "System"}
            />
          </DetailSection>

          <DetailSection title="Target">
            <DetailItem label="Target table" value={log.targetTable} />
            <DetailItem label="Target label" value={humanizeTargetTable(log.targetTable)} />
            <DetailItem label="Target ID" value={log.targetId} />
          </DetailSection>
        </div>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">Metadata</h2>
          <pre className="max-h-[28rem] overflow-auto rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 whitespace-pre-wrap">
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
      className="grid gap-3 rounded-3xl border border-border bg-card px-5 py-5 shadow-sm"
      role="alert"
    >
      <BackLink href="/manager/audit-logs" label="Back to audit logs" />
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {message}
        </p>
      </div>
    </section>
  );
}
