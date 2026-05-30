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
  FilterForm,
  ManagerShell,
  PersonLabel,
  SelectFilter,
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
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleDotIcon,
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
  const completedLenders = result.lenders.filter(
    (l) => l.verificationStatus !== "pending",
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

        <LenderFilters status={params.status} />

        {result.lenders.length === 0 ? (
          <EmptyState
            title="No lenders found"
            description="Lender signup requests will appear here."
          />
        ) : null}

        {pendingLenders.length > 0 ? (
          <section className="space-y-4">
            {pendingLenders.map((lender) => (
              <PendingLenderCard key={lender.id} lender={lender} />
            ))}
          </section>
        ) : null}

        {completedLenders.length > 0 ? (
          <section className="space-y-3">
            {pendingLenders.length > 0 ? (
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs font-medium text-muted-foreground">
                  Reviewed lenders
                </span>
                <Separator className="flex-1" />
              </div>
            ) : null}
            {completedLenders.map((lender) => (
              <CompletedLenderCard key={lender.id} lender={lender} />
            ))}
          </section>
        ) : null}
      </div>
    </ManagerShell>
  );
}

function LenderFilters({ status }: { status?: string }) {
  const hasActiveFilters = Boolean(status);

  return (
    <Card>
      <CardContent>
        <FilterForm className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1">
            <SelectFilter
              label="Status"
              name="status"
              defaultValue={status}
              options={[
                { value: "incomplete", label: "Incomplete" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasActiveFilters ? (
              <Button type="button" variant="outline" asChild>
                <Link href="?">Clear</Link>
              </Button>
            ) : null}
          </div>
        </FilterForm>
      </CardContent>
    </Card>
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
    return <StatusMessage message="Could not update lender review." tone="error" />;
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

function PendingLenderCard({ lender }: { lender: ManagerLenderRow }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">
              {lender.organizationName}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <PersonLabel person={lender.profile} />
            </p>
          </div>
          <StatusBadge status={lender.verificationStatus} />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <MetaField label="Contact" value={lender.contactPerson} />
          <MetaField label="Operating area" value={lender.operatingArea} />
          <MetaField
            label="Loan range"
            value={`${formatCurrency(lender.minLoanAmount)} – ${formatCurrency(lender.maxLoanAmount)}`}
          />
          <MetaField
            label="Requested at"
            value={formatDateTime(lender.createdAt)}
          />
        </dl>
      </CardHeader>

      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            <CompactConsentSummary status={lender.consentStatus} />

            <Separator />

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
              <MetaField
                label="Lender ID"
                value={getShortId(lender.userId)}
              />
              <MetaField
                label="Request ID"
                value={getShortId(lender.id)}
              />
              <MetaField
                label="Registration no."
                value={lender.businessRegistrationNumber ?? "Not provided"}
              />
            </dl>

            {lender.lenderDescription ? (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Lender description
                  </p>
                  <p className="text-sm">{lender.lenderDescription}</p>
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <PendingReviewActions lender={lender} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompletedLenderCard({ lender }: { lender: ManagerLenderRow }) {
  const isApproved = lender.verificationStatus === "approved";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">
              {lender.organizationName}
            </p>
            <StatusBadge status={lender.verificationStatus} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span>{lender.contactPerson}</span>
            <span>{lender.operatingArea}</span>
            <span>
              {formatCurrency(lender.minLoanAmount)} –{" "}
              {formatCurrency(lender.maxLoanAmount)}
            </span>
            <span>
              {isApproved ? "Approved" : "Rejected"}{" "}
              {formatDateTime(
                isApproved ? lender.approvedAt! : lender.rejectedAt!,
              )}
              {(isApproved ? lender.approvedBy : lender.rejectedBy)
                ? ` by ${(isApproved ? lender.approvedBy : lender.rejectedBy)!.displayName}`
                : ""}
            </span>
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

function PendingReviewActions({ lender }: { lender: ManagerLenderRow }) {
  const returnPath = `/manager/lenders`;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Review decision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
          <Button type="submit" className="w-full">
            <CheckCircle2Icon className="size-4" />
            Approve lender
          </Button>
        </form>

        <Separator />

        <RejectLenderDialog
          lenderId={lender.id}
          organizationName={lender.organizationName}
          returnPath={returnPath}
        />
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

function CompactConsentSummary({ status }: { status: ConsentStatus }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Lender disclosures</h3>
        <Badge
          variant={status.isCurrent ? "default" : "destructive"}
          className={
            status.isCurrent
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
              : undefined
          }
        >
          {status.isCurrent ? "Current" : "Missing"}
        </Badge>
      </div>
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
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
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="mt-2 inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Show details
            <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 grid gap-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
              {status.required.map((consent) => {
                const accepted = status.accepted.find(
                  (item) =>
                    item.consentType === consent.consentType &&
                    item.version === consent.version,
                );

                return (
                  <p key={`detail-${consent.consentType}-${consent.version}`}>
                    <span className="font-medium text-foreground">
                      {consentTypeLabels[consent.consentType]}
                    </span>
                    {accepted
                      ? ` \u00b7 ${consent.version}, accepted ${formatDateTime(accepted.acceptedAt)}`
                      : ` \u00b7 ${consent.version} not accepted`}
                  </p>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
