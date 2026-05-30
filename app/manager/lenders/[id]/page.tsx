import { reviewLenderAction } from "@/app/manager/actions";
import { getManagerAccess } from "../../manager-access";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  getShortId,
  loadManagerLenderDetail,
  type ManagerLenderRow,
} from "@/lib/manager-operations";
import {
  AccessDenied,
  BackLink,
  EmptyState,
  ManagerShell,
  StatusMessage,
  formatCurrency,
  formatDateTime,
} from "../../manager-ui";
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
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  MessageSquareTextIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import { RejectLenderDialog } from "@/components/manager/lenders/reject-lender-dialog";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    review?: string;
  }>;
};

export default async function ManagerLenderDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Lender detail"
        description="Review lender profile information before workspace access."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  const result = await loadManagerLenderDetail(access.supabase, id);

  return (
    <ManagerShell
      title="Lender detail"
      description="Review lender profile information before workspace access."
      showHeading={false}
    >
      <div className="grid gap-4 md:gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BackLink href="/manager/lenders" label="Back to lender review" />
            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Lender detail
            </h1>
            <p className="text-sm text-muted-foreground">
              Review lender profile information before workspace access.
            </p>
          </div>
        </div>

        <ReviewStatus review={query.review} />

        {!result.ok ? (
          <StatusMessage message={result.message} tone="error" />
        ) : null}

        {result.lender ? (
          <LenderDetail lender={result.lender} />
        ) : (
          <EmptyState
            title="Lender not found"
            description="This lender profile is unavailable or no longer exists."
          />
        )}
      </div>
    </ManagerShell>
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

function LenderDetail({ lender }: { lender: ManagerLenderRow }) {
  const hasAction =
    lender.verificationStatus === "pending" ||
    lender.verificationStatus === "rejected";

  if (hasAction) {
    return (
      <div className="grid gap-4 md:gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4 md:space-y-6">
          <LenderSummaryCard lender={lender} />
          <LenderProfileCard lender={lender} />
          <LenderDetailsCard lender={lender} />
          <CompactConsentSummary status={lender.consentStatus} />
          <LenderMetadataCard lender={lender} />
          {lender.rejectionReason || lender.managerReviewNotes ? (
            <PreviousNotesSection
              rejectionReason={lender.rejectionReason}
              managerReviewNotes={lender.managerReviewNotes}
            />
          ) : null}
        </div>

        <div className="space-y-4 lg:sticky lg:top-16 lg:self-start">
          {lender.verificationStatus === "pending" ? (
            <ReviewActions lender={lender} />
          ) : null}

          {lender.verificationStatus === "rejected" ? (
            <ReturnToPendingAction lender={lender} />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6">
      <LenderSummaryCard lender={lender} />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <LenderProfileCard lender={lender} />
        <LenderDetailsCard lender={lender} />
      </div>
      <CompactConsentSummary status={lender.consentStatus} />
      <LenderMetadataCard lender={lender} />
      {lender.rejectionReason || lender.managerReviewNotes ? (
        <PreviousNotesSection
          rejectionReason={lender.rejectionReason}
          managerReviewNotes={lender.managerReviewNotes}
        />
      ) : null}
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{value}</dd>
    </div>
  );
}

function LenderSummaryCard({ lender }: { lender: ManagerLenderRow }) {
  const isApproved = lender.verificationStatus === "approved";
  const isRejected = lender.verificationStatus === "rejected";
  const statusDate = isApproved
    ? lender.approvedAt
    : isRejected
      ? lender.rejectedAt
      : null;
  const statusBy = isApproved
    ? lender.approvedBy
    : isRejected
      ? lender.rejectedBy
      : null;

  return (
    <Card>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <MetaField label="Organization" value={lender.organizationName} />
          <MetaField label="Contact person" value={lender.contactPerson} />
          <MetaField label="Operating area" value={lender.operatingArea} />
          <MetaField
            label="Loan range"
            value={`${formatCurrency(lender.minLoanAmount)} – ${formatCurrency(lender.maxLoanAmount)}`}
          />
          <MetaField
            label="Created"
            value={formatDateTime(lender.createdAt)}
          />
          <MetaField
            label="Disclosures"
            value={
              <Badge
                variant={lender.consentStatus.isCurrent ? "default" : "destructive"}
                className={
                  lender.consentStatus.isCurrent
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                    : undefined
                }
              >
                {lender.consentStatus.isCurrent ? "Current" : "Missing"}
              </Badge>
            }
          />
        </dl>
        {(isApproved || isRejected) && statusDate ? (
          <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
            {isApproved ? (
              <CheckCircle2Icon className="size-4 text-emerald-600" />
            ) : (
              <XCircleIcon className="size-4 text-destructive" />
            )}
            <p className="text-sm font-medium">
              {isApproved ? "Approved" : "Rejected"}{" "}
              {formatDateTime(statusDate)}
              {statusBy ? ` by ${statusBy.displayName}` : ""}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LenderProfileCard({ lender }: { lender: ManagerLenderRow }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile information</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <MetaField label="Display name" value={lender.profile.displayName} />
          <MetaField label="Contact person" value={lender.contactPerson} />
          <MetaField label="Phone number" value={lender.phoneNumber} />
          <MetaField label="Operating area" value={lender.operatingArea} />
          <MetaField label="Business address" value={lender.businessAddress} />
          <MetaField
            label="Registration number"
            value={lender.businessRegistrationNumber ?? "Not provided"}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function LenderDetailsCard({ lender }: { lender: ManagerLenderRow }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lending details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <MetaField
            label="Minimum loan"
            value={formatCurrency(lender.minLoanAmount)}
          />
          <MetaField
            label="Maximum loan"
            value={formatCurrency(lender.maxLoanAmount)}
          />
          <MetaField
            label="Typical repayment terms"
            value={lender.typicalRepaymentTerms}
          />
          <MetaField
            label="Lender ID"
            value={getShortId(lender.userId)}
          />
        </dl>
        {lender.lenderDescription ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Description
            </p>
            <p className="text-sm">{lender.lenderDescription}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LenderMetadataCard({ lender }: { lender: ManagerLenderRow }) {
  return (
    <Collapsible defaultOpen={false}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Request metadata</CardTitle>
            <CollapsibleTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Details
              <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <MetaField label="Request ID" value={lender.id} />
              <MetaField
                label="Short lender ID"
                value={getShortId(lender.userId)}
              />
              <MetaField
                label="Verification status"
                value={lender.verificationStatus}
              />
              <MetaField
                label="Created"
                value={formatDateTime(lender.createdAt)}
              />
              <MetaField
                label="Updated"
                value={formatDateTime(lender.updatedAt)}
              />
              <MetaField
                label="Approved"
                value={
                  lender.approvedAt
                    ? `${formatDateTime(lender.approvedAt)} by ${
                        lender.approvedBy?.displayName ?? "Manager"
                      }`
                    : "Not approved"
                }
              />
              <MetaField
                label="Rejected"
                value={
                  lender.rejectedAt
                    ? `${formatDateTime(lender.rejectedAt)} by ${
                        lender.rejectedBy?.displayName ?? "Manager"
                      }`
                    : "Not rejected"
                }
              />
            </dl>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function CompactConsentSummary({ status }: { status: ConsentStatus }) {
  return (
    <Collapsible defaultOpen={false}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Disclosures</CardTitle>
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
            <CollapsibleTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Details
              <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="grid gap-1.5 text-xs text-muted-foreground">
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
                        ? ` \u00b7 ${consent.version}, accepted ${formatDateTime(accepted.acceptedAt)}`
                        : " \u00b7 Missing current version"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function PreviousNotesSection({
  rejectionReason,
  managerReviewNotes,
}: {
  rejectionReason: string | null;
  managerReviewNotes: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquareTextIcon className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Previous notes</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rejectionReason ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              <span className="font-medium">Rejection reason:</span>{" "}
              {rejectionReason}
            </AlertDescription>
          </Alert>
        ) : null}
        {managerReviewNotes ? (
          <Alert>
            <MessageSquareTextIcon />
            <AlertDescription>
              <span className="font-medium">Manager note:</span>{" "}
              {managerReviewNotes}
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReviewActions({ lender }: { lender: ManagerLenderRow }) {
  const returnPath = `/manager/lenders/${lender.id}`;
  const disclosuresMissing = !lender.consentStatus.isCurrent;

  if (disclosuresMissing) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Review decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>
    );
  }

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
          organizationName={lender.organizationName || "this lender"}
          returnPath={returnPath}
        />
      </CardContent>
    </Card>
  );
}

function ReturnToPendingAction({ lender }: { lender: ManagerLenderRow }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Return to pending</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={reviewLenderAction} className="grid gap-3">
          <input type="hidden" name="lenderProfileId" value={lender.id} />
          <input type="hidden" name="decision" value="return_to_pending" />
          <input type="hidden" name="returnPath" value={`/manager/lenders/${lender.id}`} />
          <div className="grid gap-1.5">
            <Label
              htmlFor={`notes-return-${lender.id}`}
              className="text-xs font-medium"
            >
              Review notes
            </Label>
            <Textarea
              id={`notes-return-${lender.id}`}
              name="managerReviewNotes"
              rows={2}
              maxLength={1000}
              placeholder="Optional note..."
            />
          </div>
          <Button type="submit" variant="outline" className="w-full">
            Return to pending
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
