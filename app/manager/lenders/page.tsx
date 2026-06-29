import Link from "next/link";
import { Suspense } from "react";
import { getManagerAccess } from "../manager-access";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  lenderVerificationDocumentTypeLabels,
  lenderProfileChangeRequestStatusLabels,
  type LenderVerificationDocumentPolicy,
} from "@/lib/lender-verification";
import {
  getShortId,
  loadManagerLenders,
  type ManagerLenderRow,
  type ManagerLenderVerificationDocumentRow,
  type ManagerLenderProfileChangeRequestRow,
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
import { LenderToast } from "@/app/manager/lenders/lender-toast";
import { LenderDecisionForm } from "@/app/manager/lenders/lender-decision-form";
import { LenderDocumentActionsCell } from "@/app/manager/lenders/lender-document-review-dialog";
import { LenderChangeRequestDecisionForm } from "@/app/manager/lenders/lender-change-request-decision-form";
import { DocumentAiReviewNote } from "@/components/document-ai-review-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertCircleIcon,
  Building2Icon,
  BanknoteIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ClipboardListIcon,
  CircleIcon,
  Edit3Icon,
  DownloadIcon,
  FileTextIcon,
  HistoryIcon,
  MessageSquareTextIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  XCircleIcon,
  CircleDotIcon,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { LenderEvidenceDocumentRow } from "@/app/manager/lenders/lender-evidence-document-row";
import { getLenderProfileCompletion } from "@/lib/lender-profile-completion";

type PageProps = {
  searchParams: Promise<{
    review?: string;
    documentReview?: string;
    changeRequestReview?: string;
    status?: string;
    q?: string;
    selected?: string;
    scrollY?: string;
  }>;
};

export default async function ManagerLendersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Lender review"
        description="Review submitted lender applications before approving access."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  if (params.selected) {
    const lenderResults = await loadManagerLenders(access.supabase, {
      verificationStatus: params.status,
    });

    const filteredResults = params.q
      ? lenderResults.lenders.filter((l) => {
          const q = params.q!.toLowerCase();
          return (
            l.organizationName.toLowerCase().includes(q) ||
            l.contactPerson.toLowerCase().includes(q) ||
            l.profile.displayName.toLowerCase().includes(q)
          );
        })
      : lenderResults.lenders;

    const selectedLender = filteredResults.find(
      (l) => l.id === params.selected,
    );

    const filterParams = new URLSearchParams();
    if (params.status) filterParams.set("status", params.status);
    if (params.q) filterParams.set("q", params.q);
    const filterQueryString = filterParams.toString();
    const backHref = filterQueryString
      ? `/manager/lenders?${filterQueryString}`
      : "/manager/lenders";

    return (
      <ManagerShell
        title="Lender review"
        description="Review submitted lender applications before approving access."
        showHeading={false}
      >
        <div className="space-y-4">
          <Suspense>
            <LenderToast />
          </Suspense>

          {!selectedLender ? (
            <div className="space-y-3">
              <StatusMessage
                message="Lender not found."
                tone="error"
              />
              <Button variant="outline" size="sm" asChild>
                <Link href={backHref}>
                  <ChevronLeftIcon className="size-4" />
                  Back to queue
                </Link>
              </Button>
            </div>
          ) : (
            <SelectedLenderDetail
              lender={selectedLender}
              backHref={backHref}
              selected={params.selected}
            />
          )}
        </div>
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

  return (
    <ManagerShell
      title="Lender review"
      description="Review submitted lender applications before approving access."
      showHeading={false}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Lender review
            </h1>
            <p className="text-sm text-muted-foreground">
              Review submitted lender applications before approving access.
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

        <Suspense>
          <LenderToast />
        </Suspense>

        {!result.ok ? (
          <StatusMessage message={result.message} tone="error" />
        ) : null}

        <LenderFilters status={params.status} q={params.q} />

        <section className="space-y-4">
          {lenderResults.length === 0 ? (
            <EmptyState
              title="No lenders found"
              description="Lender signup requests will appear here."
            />
          ) : (
            <LenderQueueTable
              lenders={lenderResults}
              filterQueryString={buildFilterQueryString(params)}
            />
          )}
        </section>
      </div>
    </ManagerShell>
  );
}

function buildFilterQueryString(params: {
  status?: string;
  q?: string;
}) {
  const filterParams = new URLSearchParams();
  if (params.status) filterParams.set("status", params.status);
  if (params.q) filterParams.set("q", params.q);
  return filterParams.toString();
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
  filterQueryString,
}: {
  lenders: ManagerLenderRow[];
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
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lenders.map((lender) => (
                <LenderQueueRow
                  key={lender.id}
                  lender={lender}
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
            filterQueryString={filterQueryString}
          />
        ))}
      </div>
    </>
  );
}

function LenderQueueRow({
  lender,
  filterQueryString,
}: {
  lender: ManagerLenderRow;
  filterQueryString: string;
}) {
  const { acceptedCount, totalCount } = getDisclosureProgress(lender);

  return (
    <TableRow>
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
      <TableCell className="text-muted-foreground">
        {formatDateTime(lender.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" asChild>
          <Link href={buildQueueHref(filterQueryString, lender.id)}>
            Review
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function LenderQueueMobileCard({
  lender,
  filterQueryString,
}: {
  lender: ManagerLenderRow;
  filterQueryString: string;
}) {
  const { acceptedCount, totalCount } = getDisclosureProgress(lender);

  return (
    <Card size="sm">
      <CardContent className="grid gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <PersonLabel person={{ id: lender.userId, displayName: lender.organizationName || lender.profile.displayName }} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lender.verificationStatus === "approved" ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/manager/lenders/${lender.id}/export`}>
                  <DownloadIcon className="size-4" />
                  Export PDF
                </Link>
              </Button>
            ) : null}
            <StatusBadge status={lender.verificationStatus} />
          </div>
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
          <span>Created: {formatDateTime(lender.createdAt)}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          asChild
        >
          <Link href={buildQueueHref(filterQueryString, lender.id)}>
            Review
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SelectedLenderDetail({
  lender,
  backHref,
  selected,
}: {
  lender: ManagerLenderRow;
  backHref: string;
  selected: string;
}) {
  const hasAction =
    lender.verificationStatus === "pending" ||
    lender.verificationStatus === "rejected";

  const hasNotes = lender.rejectionReason || lender.managerReviewNotes;
  const missingFields = getMissingProfileFields(lender);
  const disclosuresCurrent = lender.consentStatus.isCurrent;
  const profileComplete = missingFields.length === 0;
  const allRequiredDocumentsAccepted =
    lender.documentPolicy.requiredDocumentTypes.every((docType) =>
      lender.documentPolicy.acceptedDocumentTypes.includes(docType),
    );
  const documentsComplete = allRequiredDocumentsAccepted;
  const blocked = !profileComplete || !documentsComplete || !disclosuresCurrent;
  const blockerReason = blocked
    ? [
        !profileComplete
          ? `Waiting for lender to complete profile details: ${missingFields.join(", ")}`
          : null,
        !documentsComplete
          ? "Accept all required documents before approving this lender."
          : null,
        !disclosuresCurrent ? "Needs disclosures" : null,
      ]
        .filter(Boolean)
        .join(". ")
    : null;

  const mainContent = (
    <div className="min-w-0 space-y-6">
      <ReviewReadinessSummary
        profileComplete={profileComplete}
        missingFields={missingFields}
        documentPolicy={lender.documentPolicy}
        disclosuresCurrent={disclosuresCurrent}
        blocked={blocked}
        blockerReason={blockerReason}
      />

      <LenderDetailsSection lender={lender} />

      <LenderDocumentsSection
        lender={lender}
        selected={selected}
      />

      <Collapsible defaultOpen={!disclosuresCurrent}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                Disclosures &amp; consents
              </h3>
              {disclosuresCurrent ? (
                <Badge
                  variant="default"
                  className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle2Icon className="size-3" />
                  Current
                </Badge>
              ) : null}
            </div>
            <CollapsibleTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Show
              <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <DisclosureSection status={lender.consentStatus} />
          </CollapsibleContent>
        </div>
      </Collapsible>

      <EvidenceHistorySection documents={lender.documents} />

      <Collapsible defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2Icon className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Profile details</h3>
            </div>
            <CollapsibleTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Show
              <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <ProfileDetailsContent lender={lender} />
          </CollapsibleContent>
        </div>
      </Collapsible>

      {lender.changeRequests.length > 0 ? (
        <LenderChangeRequestsSection
          lender={lender}
          selected={selected}
        />
      ) : null}

      {hasNotes ? (
        <ExistingNotesSection
          rejectionReason={lender.rejectionReason}
          managerReviewNotes={lender.managerReviewNotes}
        />
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
              <PersonLabel person={{ id: lender.userId, displayName: lender.organizationName || lender.profile.displayName }} />
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Review ID: {getShortId(lender.id)}
            </p>
          </div>
          <StatusBadge status={lender.verificationStatus} />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <MetaField
            label="Created"
            value={formatDateTime(lender.createdAt)}
          />
          <MetaField
            label="Contact"
            value={lender.contactPerson || "No contact"}
          />
          <MetaField
            label="Reviewed"
            value={
              lender.approvedAt
                ? `${formatDateTime(lender.approvedAt)}${lender.approvedBy ? ` by ${lender.approvedBy.displayName}` : ""}`
                : lender.rejectedAt
                  ? `${formatDateTime(lender.rejectedAt)}${lender.rejectedBy ? ` by ${lender.rejectedBy.displayName}` : ""}`
                  : "Not reviewed"
            }
          />
          <MetaField
            label="Documents"
            value={`${lender.documents.length} uploaded`}
          />
        </dl>
      </CardHeader>

      <CardContent>
        {hasAction ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
            {mainContent}
            <div className="space-y-4 lg:sticky lg:top-16 lg:self-start lg:mt-7">
              <ManagerDecisionPanel
                lender={lender}
                selected={selected}
                blocked={blocked}
                blockerReason={blockerReason}
              />
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

function getMissingProfileFields(lender: ManagerLenderRow): string[] {
  return getLenderProfileCompletion(lender).missingFields;
}

function ReviewReadinessSummary({
  profileComplete,
  missingFields,
  documentPolicy,
  disclosuresCurrent,
  blocked,
  blockerReason,
}: {
  profileComplete: boolean;
  missingFields: string[];
  documentPolicy: LenderVerificationDocumentPolicy;
  disclosuresCurrent: boolean;
  blocked: boolean;
  blockerReason: string | null;
}) {
  const acceptedDocs = documentPolicy.acceptedDocumentTypes.length;
  const requiredDocs = documentPolicy.requiredDocumentTypes.length;

  return (
    <Card size="sm">
      <CardContent className="grid gap-2">
        <div className="grid gap-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Profile details</span>
            {profileComplete ? (
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <CheckCircle2Icon className="size-3" />
                Complete
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-destructive">
                <AlertCircleIcon className="size-3" />
                Missing: {missingFields.join(", ")}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Required documents</span>
            {documentPolicy.documentsAccepted ? (
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <CheckCircle2Icon className="size-3" />
                {acceptedDocs}/{requiredDocs} accepted
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-destructive">
                <AlertCircleIcon className="size-3" />
                {acceptedDocs}/{requiredDocs} accepted
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Disclosures</span>
            {disclosuresCurrent ? (
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <CheckCircle2Icon className="size-3" />
                Current
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-destructive">
                <AlertCircleIcon className="size-3" />
                Missing
              </span>
            )}
          </div>
        </div>
        <div className="border-t border-border/60 pt-2">
          {blocked ? (
            <div className="flex items-start gap-2 text-xs text-amber-700">
              <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              <span className="font-medium">{blockerReason}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
              <CheckCircle2Icon className="size-3.5" />
              Ready for manager decision
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetaCard({
  label,
  value,
  fallback = "\u2014",
}: {
  label: string;
  value: string | null;
  fallback?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words">
        {value || fallback}
      </dd>
    </div>
  );
}

function LenderDetailsSection({ lender }: { lender: ManagerLenderRow }) {
  const loanRange =
    lender.minLoanAmount === 0 && lender.maxLoanAmount === 0
      ? null
      : `${formatCurrency(lender.minLoanAmount)} \u2013 ${formatCurrency(lender.maxLoanAmount)}`;
  const fullAddress = [
    lender.businessAddress,
    lender.addressBarangay,
    lender.addressCityOrMunicipality,
    lender.addressRegion,
    lender.addressZipCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BanknoteIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Submitted lender details</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <MetaCard
          label="Organization"
          value={lender.organizationName || null}
          fallback="Missing"
        />
        <MetaCard
          label="Contact person"
          value={lender.contactPerson || null}
          fallback="Missing"
        />
        <MetaCard
          label="Phone"
          value={lender.phoneNumber || null}
          fallback="Missing"
        />
        <MetaCard
          label="Business address"
          value={fullAddress || lender.businessAddress || null}
          fallback="Missing"
        />
        <MetaCard
          label="Region"
          value={lender.addressRegion}
          fallback="Missing"
        />
        <MetaCard
          label="City / Municipality"
          value={lender.addressCityOrMunicipality}
          fallback="Missing"
        />
        <MetaCard
          label="Barangay"
          value={lender.addressBarangay}
          fallback="Missing"
        />
        <MetaCard
          label="ZIP code"
          value={lender.addressZipCode}
          fallback="Missing"
        />
        <MetaCard
          label="Registration number"
          value={lender.businessRegistrationNumber}
          fallback="Not provided"
        />
        <MetaCard
          label="Lending area"
          value={lender.operatingArea || null}
          fallback="Missing"
        />
        <MetaCard label="Loan range" value={loanRange} fallback="Missing" />
        {lender.typicalRepaymentTerms ? (
          <MetaCard
            label="Repayment terms"
            value={lender.typicalRepaymentTerms}
          />
        ) : null}
        {lender.lenderDescription ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 sm:col-span-3">
            <p className="text-xs font-medium text-muted-foreground">
              Description
            </p>
            <p className="mt-1 text-sm">{lender.lenderDescription}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProfileDetailsContent({ lender }: { lender: ManagerLenderRow }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <MetaCard label="Organization" value={lender.organizationName} />
      <MetaCard label="Contact person" value={lender.contactPerson} />
      <MetaCard label="Phone" value={lender.phoneNumber} />
      <MetaCard label="Business address" value={lender.businessAddress} />
      <MetaCard label="Region" value={lender.addressRegion} />
      <MetaCard
        label="City / Municipality"
        value={lender.addressCityOrMunicipality}
      />
      <MetaCard label="Barangay" value={lender.addressBarangay} />
      <MetaCard label="ZIP code" value={lender.addressZipCode} />
      <MetaCard
        label="Registration number"
        value={lender.businessRegistrationNumber}
        fallback="Not provided"
      />
      <MetaCard label="Operating area" value={lender.operatingArea} />
      {lender.lenderDescription ? (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 sm:col-span-2 lg:col-span-3">
          <p className="text-xs font-medium text-muted-foreground">
            Description
          </p>
          <p className="mt-1 text-sm">{lender.lenderDescription}</p>
        </div>
      ) : null}
    </div>
  );
}

function DisclosureSection({ status }: { status: ConsentStatus }) {
  return (
    <div className="grid gap-3 sm:grid-cols-1">
      <DisclosureCard title="Lender disclosures" status={status} />
    </div>
  );
}

function DisclosureCard({
  title,
  status,
}: {
  title: string;
  status: ConsentStatus;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
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
                  ? ` \u00b7 ${consent.version}, ${formatDateTime(accepted.acceptedAt)}`
                  : " \u00b7 Missing current version"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExistingNotesSection({
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

function LenderDocumentsSection({
  lender,
  selected,
}: {
  lender: ManagerLenderRow;
  selected: string;
}) {
  const { documentPolicy, documents } = lender;
  const canReview = lender.verificationStatus === "pending" || lender.verificationStatus === "rejected";

  const latestByType = new Map<string, ManagerLenderVerificationDocumentRow>();
  for (const doc of documents) {
    if (!latestByType.has(doc.documentType)) {
      latestByType.set(doc.documentType, doc);
    }
  }

  const acceptedRequired = documentPolicy.requiredDocumentTypes.filter((dt) =>
    documentPolicy.acceptedDocumentTypes.includes(dt),
  ).length;
  const totalRequired = documentPolicy.requiredDocumentTypes.length;
  const hasMissing = documentPolicy.missingRequiredDocumentTypes.length > 0;
  const hasSubmittedNotAccepted = documentPolicy.requiredDocumentTypes.some(
    (dt) =>
      documentPolicy.submittedDocumentTypes.includes(dt) &&
      !documentPolicy.acceptedDocumentTypes.includes(dt),
  );
  const requiredDocuments = documentPolicy.requiredDocumentTypes.map(
    (docType) => latestByType.get(docType),
  );
  const hasAiMismatch = requiredDocuments.some(
    (doc) => doc?.aiReview.aiReviewStatus === "fail",
  );
  const hasAiNeedsManualReview = requiredDocuments.some(
    (doc) => doc?.aiReview.aiReviewStatus === "needs_manual_review",
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardListIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Required documents</h3>
        <span className="text-xs text-muted-foreground">
          {acceptedRequired}/{totalRequired} accepted
        </span>
      </div>

      {!hasMissing && hasSubmittedNotAccepted ? (
        <Alert>
          <AlertCircleIcon />
          <AlertDescription>
            All required documents are uploaded. Accept each document before
            approving lender verification.
          </AlertDescription>
        </Alert>
      ) : null}

      {hasAiMismatch ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>AI detected a possible document mismatch.</AlertTitle>
          <AlertDescription>
            One or more uploaded lender files may not match the required document
            type. Review the document manually or request resubmission.
          </AlertDescription>
        </Alert>
      ) : hasAiNeedsManualReview ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Some documents need closer review.</AlertTitle>
          <AlertDescription>
            AI could not confidently determine that every uploaded lender
            document matches the requested type.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        {documentPolicy.requiredDocumentTypes.map((docType) => {
          const latest = latestByType.get(docType);
          const isAccepted =
            documentPolicy.acceptedDocumentTypes.includes(docType);
          const isSubmitted =
            documentPolicy.submittedDocumentTypes.includes(docType);
          const isRejected =
            documentPolicy.rejectedDocumentTypes.includes(docType);

          const docLabel = lenderVerificationDocumentTypeLabels[docType];
          const canReviewDoc = canReview && latest?.status === "submitted" && !isAccepted;

          return (
            <Card key={docType} size="sm">
              <CardContent className="grid min-w-0 gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{docLabel}</span>
                    <DocumentStatusBadge
                      isAccepted={isAccepted}
                      isSubmitted={isSubmitted}
                      isRejected={isRejected}
                    />
                  </div>
                  {latest ? (
                    <>
                      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                        <FileTextIcon className="size-3 shrink-0" />
                        <span className="break-all">{latest.fileName}</span>
                        <span>{"\u00b7"}</span>
                        <span>{formatDateTime(latest.uploadedAt)}</span>
                      </p>
                      <DocumentAiReviewNote review={latest.aiReview} />
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Not uploaded
                    </p>
                  )}
                </div>
                {latest ? (
                  <div className="border-t border-border/60 pt-3">
                    <LenderDocumentActionsCell
                    documentId={latest.id}
                    documentType={latest.documentType}
                    fileName={latest.fileName}
                    fileSize={latest.fileSize}
                    fileType={latest.fileType}
                    viewUrl={latest.viewUrl}
                    canReview={canReviewDoc}
                    aiReviewStatus={latest.aiReview.aiReviewStatus}
                    selected={selected}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function DocumentStatusBadge({
  isAccepted,
  isSubmitted,
  isRejected,
}: {
  isAccepted: boolean;
  isSubmitted: boolean;
  isRejected: boolean;
}) {
  if (isAccepted) {
    return (
      <Badge
        variant="default"
        className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
      >
        <CheckCircle2Icon className="size-3" />
        Accepted
      </Badge>
    );
  }

  if (isRejected) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircleIcon className="size-3" />
        Rejected
      </Badge>
    );
  }

  if (isSubmitted) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
      >
        <CircleDotIcon className="size-3" />
        Submitted
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleIcon className="size-3" />
      Missing
    </Badge>
  );
}

function EvidenceHistorySection({
  documents,
}: {
  documents: ManagerLenderVerificationDocumentRow[];
}) {
  if (documents.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Evidence history</h3>
        </div>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          No documents uploaded.
        </div>
      </div>
    );
  }

  return (
    <Collapsible defaultOpen={false}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Evidence history</h3>
            <span className="text-xs text-muted-foreground">
              {documents.length} document
              {documents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <CollapsibleTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Show
            <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="space-y-1.5">
            {documents.map((doc) => (
              <LenderEvidenceDocumentRow
                key={doc.id}
                fileName={doc.fileName}
                fileSize={doc.fileSize}
                fileType={doc.fileType}
                documentType={doc.documentType}
                uploadedAt={doc.uploadedAt}
                reviewNotes={doc.reviewNotes}
                viewUrl={doc.viewUrl}
                aiReview={doc.aiReview}
                statusBadge={<StatusBadge status={doc.status} />}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}



function LenderChangeRequestsSection({
  lender,
  selected,
}: {
  lender: ManagerLenderRow;
  selected: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Edit3Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Profile change requests</h3>
      </div>
      <div className="grid gap-3">
        {lender.changeRequests.map((request) => (
          <LenderChangeRequestCard
            key={request.id}
            request={request}
            lender={lender}
            selected={selected}
          />
        ))}
      </div>
    </div>
  );
}

function LenderChangeRequestCard({
  request,
  lender,
  selected,
}: {
  request: ManagerLenderProfileChangeRequestRow;
  lender: ManagerLenderRow;
  selected: string;
}) {
  const isPending = request.status === "pending";

  return (
    <Card size="sm">
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant={
              request.status === "approved"
                ? "default"
                : request.status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
            className={
              request.status === "approved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                : undefined
            }
          >
            {lenderProfileChangeRequestStatusLabels[request.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(request.submittedAt)}
          </span>
        </div>

        <div className="grid gap-2">
          {renderChangeField("Organization", lender.organizationName, request.proposedOrganizationName)}
          {renderChangeField("Contact person", lender.contactPerson, request.proposedContactPerson)}
          {renderChangeField("Business address", lender.businessAddress, request.proposedBusinessAddress)}
          {renderChangeField("Operating area", lender.operatingArea, request.proposedOperatingArea)}
          {renderChangeField("Registration number", lender.businessRegistrationNumber ?? "", request.proposedBusinessRegistrationNumber)}
          {renderChangeField("Min loan amount", lender.minLoanAmount ? formatCurrency(lender.minLoanAmount) : "", request.proposedMinLoanAmount ? formatCurrency(request.proposedMinLoanAmount) : null)}
          {renderChangeField("Max loan amount", lender.maxLoanAmount ? formatCurrency(lender.maxLoanAmount) : "", request.proposedMaxLoanAmount ? formatCurrency(request.proposedMaxLoanAmount) : null)}
          {renderChangeField("Repayment terms", lender.typicalRepaymentTerms, request.proposedTypicalRepaymentTerms)}
          {renderChangeField("Description", lender.lenderDescription, request.proposedLenderDescription)}
        </div>

        {request.rejectionReason ? (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              <span className="font-medium">Rejection reason:</span>{" "}
              {request.rejectionReason}
            </AlertDescription>
          </Alert>
        ) : null}
        {request.managerReviewNotes ? (
          <Alert>
            <AlertDescription className="text-xs">
              <span className="font-medium">Manager note:</span>{" "}
              {request.managerReviewNotes}
            </AlertDescription>
          </Alert>
        ) : null}

        {isPending ? (
          <LenderChangeRequestDecisionForm
            requestId={request.id}
            selected={selected}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function renderChangeField(
  label: string,
  current: string,
  proposed: string | null,
) {
  if (!proposed || proposed === current) return null;

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div>
        <p className="text-muted-foreground">{label}</p>
        <p className="text-muted-foreground line-through">
          {current || "\u2014"}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Proposed</p>
        <p className="font-medium text-foreground">{proposed}</p>
      </div>
    </div>
  );
}

function ManagerDecisionPanel({
  lender,
  selected,
  blocked,
  blockerReason,
}: {
  lender: ManagerLenderRow;
  selected: string;
  blocked: boolean;
  blockerReason: string | null;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Manager decision</CardTitle>
      </CardHeader>
      <CardContent>
        <LenderDecisionForm
          lenderId={lender.id}
          selected={selected}
          disclosuresCurrent={lender.consentStatus.isCurrent}
          blocked={blocked}
          blockerReason={blockerReason}
        />
      </CardContent>
    </Card>
  );
}
