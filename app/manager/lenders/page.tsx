import Link from "next/link";
import { getManagerAccess } from "../manager-access";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  getShortId,
  loadManagerLenders,
  type ManagerLenderRow,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  EmptyState,
  ManagerShell,
  StatusBadge,
  StatusMessage,
  formatCurrency,
  formatDateTime,
} from "../manager-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleDotIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import { reviewLenderAction } from "@/app/manager/actions";
import { RejectLenderDialog } from "@/components/manager/lenders/reject-lender-dialog";

type PageProps = {
  searchParams: Promise<{
    review?: string;
    status?: string;
  }>;
};

const STATUS_TABS = [
  { value: undefined, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "incomplete", label: "Incomplete" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export default async function ManagerLendersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Lender review"
        description="Approve lender requests or reject accounts that should not access lender tools."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerLenders(access.supabase, {
    verificationStatus: params.status,
  });

  const incompleteCount = result.lenders.filter(
    (l) => l.verificationStatus === "incomplete",
  ).length;
  const pendingCount = result.lenders.filter(
    (l) => l.verificationStatus === "pending",
  ).length;
  const approvedCount = result.lenders.filter(
    (l) => l.verificationStatus === "approved",
  ).length;
  const rejectedCount = result.lenders.filter(
    (l) => l.verificationStatus === "rejected",
  ).length;

  const pendingLenders = result.lenders.filter(
    (l) => l.verificationStatus === "pending",
  );
  const incompleteLenders = result.lenders.filter(
    (l) => l.verificationStatus === "incomplete",
  );
  const reviewedLenders = result.lenders.filter(
    (l) =>
      l.verificationStatus === "approved" ||
      l.verificationStatus === "rejected",
  );

  return (
    <ManagerShell
      title="Lender review"
      description="Approve lender requests or reject accounts that should not access lender tools."
      showHeading={false}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Lender review
            </h1>
            <p className="text-sm text-muted-foreground">
              Approve lender requests or reject accounts that should not access
              lender tools.
            </p>
          </div>
          {result.lenders.length > 0 ? (
            <div className="flex items-center gap-2">
              {incompleteCount > 0 ? (
                <Badge variant="outline" className="gap-1">
                  <CircleDotIcon className="size-3" />
                  {incompleteCount} incomplete
                </Badge>
              ) : null}
              {pendingCount > 0 ? (
                <Badge variant="secondary" className="gap-1">
                  <CircleDotIcon className="size-3" />
                  {pendingCount} pending
                </Badge>
              ) : null}
              {approvedCount > 0 ? (
                <Badge
                  variant="default"
                  className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle2Icon className="size-3" />
                  {approvedCount} approved
                </Badge>
              ) : null}
              {rejectedCount > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <XCircleIcon className="size-3" />
                  {rejectedCount} rejected
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        <ReviewStatus review={params.review} />

        {!result.ok ? (
          <StatusMessage message={result.message} tone="error" />
        ) : null}

        <StatusTabs activeStatus={params.status} />

        {result.lenders.length === 0 ? (
          <EmptyState
            title="No lenders found"
            description="Lender signup requests will appear here."
          />
        ) : null}

        {pendingLenders.length > 0 ? (
          <section className="space-y-3">
            {!params.status || params.status === "pending" ? (
              <SectionHeading
                title="Pending review"
                count={pendingLenders.length}
              />
            ) : null}
            {pendingLenders.map((lender) => (
              <PendingLenderCard key={lender.id} lender={lender} />
            ))}
          </section>
        ) : null}

        {incompleteLenders.length > 0 ? (
          <section className="space-y-3">
            {!params.status || params.status === "incomplete" ? (
              <SectionHeading
                title="Incomplete profiles"
                count={incompleteLenders.length}
              />
            ) : null}
            {incompleteLenders.map((lender) => (
              <IncompleteLenderCard key={lender.id} lender={lender} />
            ))}
          </section>
        ) : null}

        {reviewedLenders.length > 0 ? (
          <section className="space-y-3">
            {!params.status ||
            params.status === "approved" ||
            params.status === "rejected" ? (
              <SectionHeading
                title="Reviewed lenders"
                count={reviewedLenders.length}
              />
            ) : null}
            {reviewedLenders.map((lender) => (
              <ReviewedLenderRow key={lender.id} lender={lender} />
            ))}
          </section>
        ) : null}
      </div>
    </ManagerShell>
  );
}

function StatusTabs({ activeStatus }: { activeStatus?: string }) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1"
      aria-label="Filter lenders by status"
    >
      {STATUS_TABS.map((tab) => {
        const isActive = tab.value === activeStatus || (!tab.value && !activeStatus);
        const href = tab.value ? `?status=${tab.value}` : "?";

        return (
          <Link
            key={tab.label}
            href={href}
            className={`inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SectionHeading({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <Badge variant="secondary" className="text-xs">
        {count}
      </Badge>
    </div>
  );
}

function ReviewStatus({ review }: { review?: string }) {
  if (review === "approved") {
    return <StatusMessage message="Lender approved." />;
  }

  if (review === "rejected") {
    return <StatusMessage message="Lender rejected." />;
  }

  if (review === "pending") {
    return <StatusMessage message="Lender returned to pending." />;
  }

  if (review === "error") {
    return (
      <StatusMessage message="Could not update lender review." tone="error" />
    );
  }

  if (review === "consent-required") {
    return (
      <StatusMessage
        message="Lender must accept the required disclosures before approval."
        tone="error"
      />
    );
  }

  return null;
}

function getReadinessBadge(lender: ManagerLenderRow): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
} {
  const profileIncomplete =
    !lender.organizationName ||
    !lender.contactPerson ||
    !lender.operatingArea;

  if (profileIncomplete) {
    return { label: "Incomplete profile", variant: "outline" };
  }

  if (!lender.consentStatus.isCurrent) {
    return { label: "Missing disclosures", variant: "destructive" };
  }

  return {
    label: "Ready for review",
    variant: "default",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  };
}

function getMissingProfileFields(lender: ManagerLenderRow): string[] {
  const fields: string[] = [];
  if (!lender.contactPerson) fields.push("contact");
  if (!lender.operatingArea) fields.push("area");
  if (lender.minLoanAmount === 0 && lender.maxLoanAmount === 0) fields.push("loan range");
  if (!lender.businessRegistrationNumber) fields.push("registration number");
  return fields;
}

function formatLoanRange(min: number, max: number): string | null {
  if (min === 0 && max === 0) return null;
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

function PendingLenderCard({ lender }: { lender: ManagerLenderRow }) {
  const readiness = getReadinessBadge(lender);
  const disclosuresMissing = !lender.consentStatus.isCurrent;
  const acceptedCount = lender.consentStatus.required.filter((req) =>
    lender.consentStatus.accepted.some(
      (a) => a.consentType === req.consentType && a.version === req.version,
    ),
  ).length;
  const totalCount = lender.consentStatus.required.length;
  const missingNames = lender.consentStatus.missing.map(
    (m) => consentTypeLabels[m.consentType],
  );
  const missingFields = getMissingProfileFields(lender);
  const loanRange = formatLoanRange(lender.minLoanAmount, lender.maxLoanAmount);

  return (
    <Card size="sm">
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">
            {lender.organizationName || "Not provided"}
          </p>
          <StatusBadge status={lender.verificationStatus} />
          <Badge variant={readiness.variant} className={readiness.className}>
            {readiness.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {getShortId(lender.userId)}
          </span>
        </div>

        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {lender.contactPerson ? (
            <CompactField label="Contact" value={lender.contactPerson} />
          ) : null}
          {lender.operatingArea ? (
            <CompactField label="Area" value={lender.operatingArea} />
          ) : null}
          {loanRange ? (
            <CompactField label="Range" value={loanRange} />
          ) : null}
          <CompactField label="Requested" value={formatDateTime(lender.createdAt)} />
        </dl>

        {missingFields.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Missing profile details: {missingFields.join(", ")}
          </p>
        ) : null}

        <DisclosureSummary
          status={lender.consentStatus}
          acceptedCount={acceptedCount}
          totalCount={totalCount}
          missingNames={missingNames}
        />

        <PendingCardActions
          lender={lender}
          disclosuresMissing={disclosuresMissing}
        />
      </CardContent>
    </Card>
  );
}

function CompactField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}

function DisclosureSummary({
  status,
  acceptedCount,
  totalCount,
  missingNames,
}: {
  status: ConsentStatus;
  acceptedCount: number;
  totalCount: number;
  missingNames: string[];
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheckIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium">
          Disclosures: {acceptedCount}/{totalCount} complete
        </span>
        {!status.isCurrent && missingNames.length > 0 ? (
          <span className="text-xs text-destructive">
            Missing: {missingNames.join(", ")}
          </span>
        ) : null}
      </div>

      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          Show details
          <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1.5 rounded-lg border border-border/60 bg-muted/30 p-2.5">
            <div className="grid gap-1 text-xs text-muted-foreground">
              {status.required.map((consent) => {
                const accepted = status.accepted.find(
                  (item) =>
                    item.consentType === consent.consentType &&
                    item.version === consent.version,
                );

                return (
                  <div
                    key={`${consent.consentType}-${consent.version}`}
                    className="flex items-start gap-1.5"
                  >
                    {accepted ? (
                      <CheckCircle2Icon className="mt-0.5 size-3 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircleIcon className="mt-0.5 size-3 shrink-0 text-destructive" />
                    )}
                    <span>
                      <span className="font-medium text-foreground">
                        {consentTypeLabels[consent.consentType]}
                      </span>
                      {accepted
                        ? ` \u00b7 ${consent.version}`
                        : " \u00b7 Missing current version"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function PendingCardActions({
  lender,
  disclosuresMissing,
}: {
  lender: ManagerLenderRow;
  disclosuresMissing: boolean;
}) {
  const returnPath = `/manager/lenders`;

  if (disclosuresMissing) {
    return (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/manager/lenders/${lender.id}`}>View details</Link>
        </Button>
        <RejectLenderDialog
          lenderId={lender.id}
          organizationName={lender.organizationName || "this lender"}
          returnPath={returnPath}
        />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldAlertIcon className="size-3 text-destructive" />
          Approval blocked
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      <form action={reviewLenderAction} className="flex flex-col gap-2">
        <input type="hidden" name="lenderProfileId" value={lender.id} />
        <input type="hidden" name="decision" value="approve" />
        <input type="hidden" name="returnPath" value={returnPath} />
        <div className="grid gap-1.5">
          <Label
            htmlFor={`notes-approve-${lender.id}`}
            className="text-xs font-medium"
          >
            Review notes
          </Label>
          <Textarea
            id={`notes-approve-${lender.id}`}
            name="managerReviewNotes"
            rows={2}
            maxLength={1000}
            placeholder="Optional note for this approval..."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm">
            <CheckCircle2Icon className="size-4" />
            Approve lender
          </Button>
          <RejectLenderDialog
            lenderId={lender.id}
            organizationName={lender.organizationName || "this lender"}
            returnPath={returnPath}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/manager/lenders/${lender.id}`}>View details</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

function IncompleteLenderCard({ lender }: { lender: ManagerLenderRow }) {
  const missingFields = getMissingProfileFields(lender);

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {lender.organizationName || lender.profile.displayName}
            </p>
            <StatusBadge status={lender.verificationStatus} />
          </div>
          <p className="text-xs text-muted-foreground">
            Profile incomplete. Waiting for the lender to complete onboarding
            before manager review.
          </p>
          <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
            {lender.contactPerson ? (
              <div className="flex gap-1">
                <dt className="text-muted-foreground">Contact:</dt>
                <dd className="font-medium">{lender.contactPerson}</dd>
              </div>
            ) : null}
            {lender.operatingArea ? (
              <div className="flex gap-1">
                <dt className="text-muted-foreground">Area:</dt>
                <dd className="font-medium">{lender.operatingArea}</dd>
              </div>
            ) : null}
            <div className="flex gap-1">
              <dt className="text-muted-foreground">Requested:</dt>
              <dd className="font-medium">{formatDateTime(lender.createdAt)}</dd>
            </div>
          </dl>
          {missingFields.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Missing profile details: {missingFields.join(", ")}
            </p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/manager/lenders/${lender.id}`}>View details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ReviewedLenderRow({ lender }: { lender: ManagerLenderRow }) {
  const isApproved = lender.verificationStatus === "approved";
  const statusDate = isApproved ? lender.approvedAt : lender.rejectedAt;
  const statusBy = isApproved ? lender.approvedBy : lender.rejectedBy;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {lender.organizationName || lender.profile.displayName}
            </p>
            <StatusBadge status={lender.verificationStatus} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {statusDate ? (
              <span>
                {isApproved ? "Approved" : "Rejected"}{" "}
                {formatDateTime(statusDate)}
                {statusBy ? ` by ${statusBy.displayName}` : ""}
              </span>
            ) : null}
          </div>
          {!isApproved && lender.rejectionReason ? (
            <p className="mt-1 text-xs text-destructive">
              {lender.rejectionReason}
            </p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/manager/lenders/${lender.id}`}>View details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
