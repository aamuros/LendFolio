import Link from "next/link";
import { reviewLenderAction } from "@/app/manager/actions";
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
  TextFilter,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  MessageSquareTextIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  XCircleIcon,
  CircleDotIcon,
} from "lucide-react";
import { RejectLenderDialog } from "@/components/manager/lenders/reject-lender-dialog";

type PageProps = {
  searchParams: Promise<{
    review?: string;
    status?: string;
    q?: string;
    selected?: string;
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

  const lenderResults = params.q
    ? result.lenders.filter((l) => {
        const q = params.q!.toLowerCase();
        return (
          l.organizationName.toLowerCase().includes(q) ||
          l.contactPerson.toLowerCase().includes(q) ||
          l.profile.displayName.toLowerCase().includes(q)
        );
      })
    : result.lenders;

  const selectedLender = params.selected
    ? lenderResults.find((l) => l.id === params.selected)
    : undefined;

  const incompleteCount = lenderResults.filter(
    (l) => l.verificationStatus === "incomplete",
  ).length;
  const pendingCount = lenderResults.filter(
    (l) => l.verificationStatus === "pending",
  ).length;
  const approvedCount = lenderResults.filter(
    (l) => l.verificationStatus === "approved",
  ).length;
  const rejectedCount = lenderResults.filter(
    (l) => l.verificationStatus === "rejected",
  ).length;

  const filterParams = new URLSearchParams();
  if (params.status) filterParams.set("status", params.status);
  if (params.q) filterParams.set("q", params.q);
  const filterQueryString = filterParams.toString();
  const backHref = filterQueryString ? `?${filterQueryString}` : "?";

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
          {lenderResults.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
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

        <LenderFilters status={params.status} q={params.q} />

        {selectedLender ? (
          <SelectedLenderDetail
            lender={selectedLender}
            backHref={backHref}
          />
        ) : null}

        <section className="space-y-4">
          {lenderResults.length === 0 ? (
            <EmptyState
              title="No lenders found"
              description="Lender signup requests will appear here."
            />
          ) : (
            <LenderQueueTable
              lenders={lenderResults}
              selectedId={params.selected}
              filterQueryString={filterQueryString}
            />
          )}
        </section>
      </div>
    </ManagerShell>
  );
}

function LenderFilters({
  status,
  q,
}: {
  status?: string;
  q?: string;
}) {
  const hasFilters = Boolean(status || q);

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
          <div className="min-w-[140px] flex-1">
            <TextFilter label="Lender" name="q" defaultValue={q} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply</Button>
            {hasFilters ? (
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
  if (lender.minLoanAmount === 0 && lender.maxLoanAmount === 0)
    fields.push("loan range");
  return fields;
}

function getDisclosureProgress(lender: ManagerLenderRow) {
  const acceptedCount = lender.consentStatus.required.filter((req) =>
    lender.consentStatus.accepted.some(
      (a) => a.consentType === req.consentType && a.version === req.version,
    ),
  ).length;
  const totalCount = lender.consentStatus.required.length;
  return { acceptedCount, totalCount };
}

function buildQueueHref(
  filterQueryString: string,
  lenderId: string,
) {
  const params = new URLSearchParams(filterQueryString);
  params.set("selected", lenderId);
  return `?${params.toString()}`;
}

function LenderQueueTable({
  lenders,
  selectedId,
  filterQueryString,
}: {
  lenders: ManagerLenderRow[];
  selectedId?: string;
  filterQueryString: string;
}) {
  return (
    <>
      <div className="hidden sm:block">
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Disclosures</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lenders.map((lender) => (
                <LenderQueueRow
                  key={lender.id}
                  lender={lender}
                  isSelected={lender.id === selectedId}
                  filterQueryString={filterQueryString}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="space-y-3 sm:hidden">
        {lenders.map((lender) => (
          <LenderQueueMobileCard
            key={lender.id}
            lender={lender}
            isSelected={lender.id === selectedId}
            filterQueryString={filterQueryString}
          />
        ))}
      </div>
    </>
  );
}

function LenderQueueRow({
  lender,
  isSelected,
  filterQueryString,
}: {
  lender: ManagerLenderRow;
  isSelected: boolean;
  filterQueryString: string;
}) {
  const { acceptedCount, totalCount } = getDisclosureProgress(lender);
  const readiness = getReadinessBadge(lender);

  return (
    <TableRow className={isSelected ? "bg-muted/50" : undefined}>
      <TableCell>
        <PersonLabel person={{ id: lender.userId, displayName: lender.organizationName || lender.profile.displayName }} />
      </TableCell>
      <TableCell>
        <StatusBadge status={lender.verificationStatus} />
      </TableCell>
      <TableCell>
        {lender.consentStatus.isCurrent ? (
          <Badge
            variant="default"
            className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          >
            <CheckCircle2Icon className="size-3" />
            Complete
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">
            {acceptedCount}/{totalCount}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={readiness.variant} className={readiness.className}>
          {readiness.label}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDateTime(lender.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant={isSelected ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link
            href={buildQueueHref(filterQueryString, lender.id)}
          >
            {isSelected ? "Selected" : "Review"}
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function LenderQueueMobileCard({
  lender,
  isSelected,
  filterQueryString,
}: {
  lender: ManagerLenderRow;
  isSelected: boolean;
  filterQueryString: string;
}) {
  const { acceptedCount, totalCount } = getDisclosureProgress(lender);
  const readiness = getReadinessBadge(lender);

  return (
    <Card size="sm" className={isSelected ? "border-primary" : undefined}>
      <CardContent className="grid gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <PersonLabel person={{ id: lender.userId, displayName: lender.organizationName || lender.profile.displayName }} />
          </div>
          <StatusBadge status={lender.verificationStatus} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Disclosures:{" "}
            {lender.consentStatus.isCurrent ? (
              <span className="font-medium text-emerald-700">Complete</span>
            ) : (
              <span className="font-medium text-muted-foreground">
                {acceptedCount}/{totalCount}
              </span>
            )}
          </span>
          <span>
            <Badge variant={readiness.variant} className={readiness.className}>
              {readiness.label}
            </Badge>
          </span>
          <span>Created: {formatDateTime(lender.createdAt)}</span>
        </div>
        <Button
          variant={isSelected ? "secondary" : "outline"}
          size="sm"
          className="w-full"
          asChild
        >
          <Link
            href={buildQueueHref(filterQueryString, lender.id)}
          >
            {isSelected ? "Selected" : "Review"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SelectedLenderDetail({
  lender,
  backHref,
}: {
  lender: ManagerLenderRow;
  backHref: string;
}) {
  const hasNotes = lender.rejectionReason || lender.managerReviewNotes;
  const hasAction =
    lender.verificationStatus === "pending" ||
    lender.verificationStatus === "rejected";

  const missingFields = getMissingProfileFields(lender);

  const mainContent = (
    <div className="min-w-0 space-y-6">
      <LenderSummarySection lender={lender} />

      <Separator />

      <Collapsible defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                Disclosures &amp; details
              </h3>
            </div>
            <CollapsibleTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Show
              <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="space-y-4">
              <ConsentDisclosureSection status={lender.consentStatus} />
              <LenderDetailsInline lender={lender} />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {missingFields.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Missing profile details: {missingFields.join(", ")}
        </p>
      ) : null}

      {hasNotes ? (
        <>
          <Separator />
          <PreviousNotesSection
            rejectionReason={lender.rejectionReason}
            managerReviewNotes={lender.managerReviewNotes}
          />
        </>
      ) : null}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 gap-1"
              asChild
            >
              <Link href={backHref}>
                <ChevronLeftIcon className="size-4" />
                Back to queue
              </Link>
            </Button>
            <CardTitle className="text-base">
              {lender.organizationName || lender.profile.displayName}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lender ID: {getShortId(lender.userId)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={lender.verificationStatus} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/manager/lenders/${lender.id}`}>
                Full details
              </Link>
            </Button>
          </div>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <MetaField
            label="Organization"
            value={lender.organizationName || "Not provided"}
          />
          <MetaField
            label="Contact"
            value={lender.contactPerson || "Not provided"}
          />
          <MetaField
            label="Area"
            value={lender.operatingArea || "Not provided"}
          />
          <MetaField
            label="Created"
            value={formatDateTime(lender.createdAt)}
          />
        </dl>
      </CardHeader>

      <CardContent>
        {hasAction ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
            {mainContent}
            <div className="space-y-4 lg:sticky lg:top-16 lg:self-start">
              {lender.verificationStatus === "pending" ? (
                <SelectedReviewActions lender={lender} />
              ) : null}
              {lender.verificationStatus === "rejected" ? (
                <SelectedReturnToPending lender={lender} />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-6">{mainContent}</div>
        )}
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

function LenderSummarySection({ lender }: { lender: ManagerLenderRow }) {
  const readiness = getReadinessBadge(lender);
  const { acceptedCount, totalCount } = getDisclosureProgress(lender);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Review readiness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Disclosures</span>
          {lender.consentStatus.isCurrent ? (
            <Badge
              variant="default"
              className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle2Icon className="size-3" />
              Complete
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircleIcon className="size-3" />
              {acceptedCount}/{totalCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Profile</span>
          <Badge variant={readiness.variant} className={readiness.className}>
            {readiness.label}
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge status={lender.verificationStatus} />
        </div>
      </CardContent>
    </Card>
  );
}

function LenderDetailsInline({ lender }: { lender: ManagerLenderRow }) {
  const loanRange =
    lender.minLoanAmount === 0 && lender.maxLoanAmount === 0
      ? null
      : `${formatCurrency(lender.minLoanAmount)} \u2013 ${formatCurrency(lender.maxLoanAmount)}`;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground">
        Profile &amp; lending details
      </h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">Contact person</dt>
          <dd className="font-medium">{lender.contactPerson || "\u2014"}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="font-medium">{lender.phoneNumber || "\u2014"}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">Business address</dt>
          <dd className="font-medium">{lender.businessAddress || "\u2014"}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">Registration number (optional)</dt>
          <dd className="font-medium">
            {lender.businessRegistrationNumber || "Not provided"}
          </dd>
        </div>
        {loanRange ? (
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">Loan range</dt>
            <dd className="font-medium">{loanRange}</dd>
          </div>
        ) : null}
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">Repayment terms</dt>
          <dd className="font-medium">{lender.typicalRepaymentTerms || "\u2014"}</dd>
        </div>
      </dl>
      {lender.lenderDescription ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Description
          </p>
          <p className="text-xs">{lender.lenderDescription}</p>
        </div>
      ) : null}
    </div>
  );
}

function ConsentDisclosureSection({ status }: { status: ConsentStatus }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">
          Disclosures: {status.accepted.length}/{status.required.length} complete
        </span>
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
                    ? ` \u00b7 ${consent.version}, accepted ${formatDateTime(accepted.acceptedAt)}`
                    : " \u00b7 Missing current version"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquareTextIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Previous notes</h3>
      </div>
      <div className="grid gap-2">
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
      </div>
    </div>
  );
}

function SelectedReviewActions({
  lender,
}: {
  lender: ManagerLenderRow;
}) {
  const returnPath = `/manager/lenders`;
  const disclosuresMissing = !lender.consentStatus.isCurrent;

  if (disclosuresMissing) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Manager decision</CardTitle>
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
        <CardTitle className="text-sm">Manager decision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form action={reviewLenderAction} className="grid gap-3">
          <input type="hidden" name="lenderProfileId" value={lender.id} />
          <input type="hidden" name="decision" value="approve" />
          <input type="hidden" name="returnPath" value={returnPath} />
          <div className="grid gap-1.5">
            <Label
              htmlFor={`notes-${lender.id}`}
              className="text-xs font-medium"
            >
              Review notes
            </Label>
            <Textarea
              id={`notes-${lender.id}`}
              name="managerReviewNotes"
              rows={2}
              maxLength={1000}
              placeholder="Optional note for this review..."
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

function SelectedReturnToPending({
  lender,
}: {
  lender: ManagerLenderRow;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Return to pending</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={reviewLenderAction} className="grid gap-3">
          <input type="hidden" name="lenderProfileId" value={lender.id} />
          <input type="hidden" name="decision" value="return_to_pending" />
          <input
            type="hidden"
            name="returnPath"
            value="/manager/lenders"
          />
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
