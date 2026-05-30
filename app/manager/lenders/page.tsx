import Link from "next/link";
import { getManagerAccess } from "../manager-access";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  loadManagerLenders,
  type ManagerLenderRow,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  EmptyState,
  ManagerShell,
  PersonLabel,
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
  CardHeader,
  CardTitle,
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
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
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

function formatLoanRange(min: number, max: number): string {
  if (min === 0 && max === 0) return "Not provided";
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">
                {lender.organizationName || "Not provided"}
              </CardTitle>
              <StatusBadge status={lender.verificationStatus} />
              <Badge variant={readiness.variant} className={readiness.className}>
                {readiness.label}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <PersonLabel person={lender.profile} />
            </p>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <MetaField
            label="Contact"
            value={lender.contactPerson || "Not provided"}
          />
          <MetaField
            label="Operating area"
            value={lender.operatingArea || "Not provided"}
          />
          <MetaField
            label="Loan range"
            value={formatLoanRange(lender.minLoanAmount, lender.maxLoanAmount)}
          />
          <MetaField
            label="Requested at"
            value={formatDateTime(lender.createdAt)}
          />
          <MetaField
            label="Registration no."
            value={lender.businessRegistrationNumber || "Not provided"}
          />
        </dl>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-4">
            <DisclosureSummary
              status={lender.consentStatus}
              acceptedCount={acceptedCount}
              totalCount={totalCount}
              missingNames={missingNames}
            />

            {lender.lenderDescription ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Lender description
                </p>
                <p className="text-sm">{lender.lenderDescription}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <PendingReviewActions
              lender={lender}
              disclosuresMissing={disclosuresMissing}
            />
          </div>
        </div>
      </CardContent>
    </Card>
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">
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
          <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-3">
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

function PendingReviewActions({
  lender,
  disclosuresMissing,
}: {
  lender: ManagerLenderRow;
  disclosuresMissing: boolean;
}) {
  const returnPath = `/manager/lenders`;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Review decision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {disclosuresMissing ? (
          <Alert variant="destructive">
            <ShieldAlertIcon />
            <AlertDescription>
              Cannot approve until required lender disclosures are accepted.
            </AlertDescription>
          </Alert>
        ) : null}

        <form action={reviewLenderAction} className="grid gap-3">
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
          <Button
            type="submit"
            className="w-full"
            disabled={disclosuresMissing}
          >
            <CheckCircle2Icon className="size-4" />
            Approve lender
          </Button>
        </form>

        <Separator />

        <RejectLenderDialog
          lenderId={lender.id}
          organizationName={lender.organizationName || "this lender"}
          returnPath={returnPath}
        />
      </CardContent>
    </Card>
  );
}

function IncompleteLenderCard({ lender }: { lender: ManagerLenderRow }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
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
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {lender.contactPerson ? (
              <span>{lender.contactPerson}</span>
            ) : null}
            {lender.operatingArea ? (
              <span>{lender.operatingArea}</span>
            ) : null}
            <span>Requested {formatDateTime(lender.createdAt)}</span>
          </div>
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
    <Card>
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

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
