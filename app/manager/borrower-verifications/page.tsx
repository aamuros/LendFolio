import Link from "next/link";
import { Suspense } from "react";
import { getManagerAccess } from "../manager-access";
import { borrowerVerificationDocumentTypeLabels } from "@/lib/borrower-verification";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  getShortId,
  loadManagerBorrowerVerification,
  loadManagerBorrowerVerifications,
  type ManagerBorrowerVerificationDocumentRow,
  type ManagerBorrowerVerificationRow,
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
  formatDateTime,
} from "../manager-ui";
import { VerificationDecisionForm } from "@/app/manager/verification-decision-form";
import { VerificationToast } from "@/app/manager/borrower-verifications/verification-toast";
import { DocumentActionsCell } from "@/app/manager/document-review-dialog";
import { EvidenceDocumentRow } from "@/app/manager/evidence-document-row";
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  FileTextIcon,
  ShieldCheckIcon,
  ClipboardListIcon,
  HistoryIcon,
  MessageSquareTextIcon,
  CircleDotIcon,
  CircleIcon,
  XCircleIcon,
} from "lucide-react";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    documentStatus?: string;
    borrower?: string;
    review?: string;
    documentReview?: string;
    selected?: string;
    scrollY?: string;
  }>;
};

export default async function ManagerBorrowerVerificationsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const access = await getManagerAccess();

  if (!access.ok) {
    return (
      <ManagerShell
        title="Borrower review"
        description="Review submitted borrower evidence before approving access."
      >
        <AccessDenied message={access.message} />
      </ManagerShell>
    );
  }

  if (params.selected) {
    const selectedResult = await loadManagerBorrowerVerification(
      access.supabase,
      params.selected,
    );

    const filterParams = new URLSearchParams();
    if (params.status) filterParams.set("status", params.status);
    if (params.documentStatus)
      filterParams.set("documentStatus", params.documentStatus);
    if (params.borrower) filterParams.set("borrower", params.borrower);
    const filterQueryString = filterParams.toString();
    const backHref = filterQueryString
      ? `/manager/borrower-verifications?${filterQueryString}`
      : "/manager/borrower-verifications";

    return (
      <ManagerShell
        title="Borrower review"
        description="Review submitted borrower evidence before approving access."
        showHeading={false}
      >
        <div className="space-y-4">
          <Suspense>
            <VerificationToast />
          </Suspense>

          {!selectedResult.ok || !selectedResult.verification ? (
            <div className="space-y-3">
              <StatusMessage
                message={selectedResult.message || "Borrower verification not found."}
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
            <SelectedBorrowerDetail
              verification={selectedResult.verification}
              backHref={backHref}
              selected={params.selected}
            />
          )}
        </div>
      </ManagerShell>
    );
  }

  const result = await loadManagerBorrowerVerifications(access.supabase, {
    status: params.status,
    documentStatus: params.documentStatus,
    borrower: params.borrower,
  });

  const submittedCount = result.verifications.filter(
    (v) => v.verificationStatus === "submitted",
  ).length;
  const underReviewCount = result.verifications.filter(
    (v) => v.verificationStatus === "under_review",
  ).length;
  const approvedCount = result.verifications.filter(
    (v) => v.verificationStatus === "approved",
  ).length;

  return (
    <ManagerShell
      title="Borrower review"
      description="Review submitted borrower evidence before approving access."
      showHeading={false}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Borrower review
            </h1>
            <p className="text-sm text-muted-foreground">
              Review submitted borrower evidence before approving access.
            </p>
          </div>
          {result.verifications.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {submittedCount > 0 ? (
                <Badge variant="secondary" className="gap-1">
                  <CircleDotIcon className="size-3" />
                  {submittedCount} submitted
                </Badge>
              ) : null}
              {underReviewCount > 0 ? (
                <Badge variant="outline" className="gap-1">
                  <CircleDotIcon className="size-3" />
                  {underReviewCount} under review
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
            </div>
          ) : null}
        </div>

        <Suspense>
          <VerificationToast />
        </Suspense>

        {!result.ok ? (
          <StatusMessage message={result.message} tone="error" />
        ) : null}

        <BorrowerReviewFilters
          status={params.status}
          documentStatus={params.documentStatus}
          borrower={params.borrower}
        />

        <section className="space-y-4">
          {result.verifications.length === 0 ? (
            <EmptyState
              title="No borrower verifications found"
              description="Borrower verification records and evidence will appear here."
            />
          ) : (
            <BorrowerQueueTable
              verifications={result.verifications}
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
  documentStatus?: string;
  borrower?: string;
}) {
  const filterParams = new URLSearchParams();
  if (params.status) filterParams.set("status", params.status);
  if (params.documentStatus)
    filterParams.set("documentStatus", params.documentStatus);
  if (params.borrower) filterParams.set("borrower", params.borrower);
  return filterParams.toString();
}

function BorrowerReviewFilters({
  status,
  documentStatus,
  borrower,
}: {
  status?: string;
  documentStatus?: string;
  borrower?: string;
}) {
  const hasFilters = Boolean(status || documentStatus || borrower);

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
                { value: "pending_documents", label: "Pending documents" },
                { value: "submitted", label: "Submitted" },
                { value: "under_review", label: "Under review" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "needs_resubmission", label: "Needs resubmission" },
              ]}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <SelectFilter
              label="Document"
              name="documentStatus"
              defaultValue={documentStatus}
              options={[
                { value: "submitted", label: "Submitted" },
                { value: "accepted", label: "Accepted" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <TextFilter
              label="Borrower"
              name="borrower"
              defaultValue={borrower}
            />
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

function BorrowerQueueTable({
  verifications,
  filterQueryString,
}: {
  verifications: ManagerBorrowerVerificationRow[];
  filterQueryString: string;
}) {
  return (
    <>
      <div className="hidden sm:block">
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Consents</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verifications.map((v) => (
                <BorrowerQueueRow
                  key={v.id}
                  verification={v}
                  filterQueryString={filterQueryString}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="space-y-3 sm:hidden">
        {verifications.map((v) => (
          <BorrowerQueueMobileCard
            key={v.id}
            verification={v}
            filterQueryString={filterQueryString}
          />
        ))}
      </div>
    </>
  );
}

function getQueueDocumentProgress(verification: ManagerBorrowerVerificationRow) {
  const { documentPolicy } = verification;
  const acceptedRequired = documentPolicy.requiredDocumentTypes.filter((dt) =>
    documentPolicy.acceptedDocumentTypes.includes(dt),
  ).length;
  const totalRequired = documentPolicy.requiredDocumentTypes.length;
  return { acceptedRequired, totalRequired };
}

function getQueueConsentStatus(verification: ManagerBorrowerVerificationRow) {
  return (
    verification.documentUploadConsentStatus.isCurrent &&
    verification.loanApplicationConsentStatus.isCurrent
  );
}

function buildQueueHref(
  filterQueryString: string,
  verificationId: string,
) {
  const params = new URLSearchParams(filterQueryString);
  params.set("selected", verificationId);
  return `?${params.toString()}`;
}

function BorrowerQueueRow({
  verification,
  filterQueryString,
}: {
  verification: ManagerBorrowerVerificationRow;
  filterQueryString: string;
}) {
  const { acceptedRequired, totalRequired } =
    getQueueDocumentProgress(verification);
  const consentsCurrent = getQueueConsentStatus(verification);

  return (
    <TableRow>
      <TableCell>
        <PersonLabel person={verification.borrower} />
      </TableCell>
      <TableCell>
        <StatusBadge status={verification.verificationStatus} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {acceptedRequired}/{totalRequired} accepted
      </TableCell>
      <TableCell>
        {consentsCurrent ? (
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
            Missing
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {verification.submittedAt
          ? formatDateTime(verification.submittedAt)
          : "\u2014"}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" asChild>
          <Link href={buildQueueHref(filterQueryString, verification.id)}>
            Review
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function BorrowerQueueMobileCard({
  verification,
  filterQueryString,
}: {
  verification: ManagerBorrowerVerificationRow;
  filterQueryString: string;
}) {
  const { acceptedRequired, totalRequired } =
    getQueueDocumentProgress(verification);
  const consentsCurrent = getQueueConsentStatus(verification);

  return (
    <Card size="sm">
      <CardContent className="grid gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <PersonLabel person={verification.borrower} />
          </div>
          <StatusBadge status={verification.verificationStatus} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Docs: {acceptedRequired}/{totalRequired} accepted
          </span>
          <span>
            Consents:{" "}
            {consentsCurrent ? (
              <span className="font-medium text-emerald-700">Complete</span>
            ) : (
              <span className="font-medium text-destructive">Missing</span>
            )}
          </span>
          {verification.submittedAt ? (
            <span>Submitted: {formatDateTime(verification.submittedAt)}</span>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          asChild
        >
          <Link href={buildQueueHref(filterQueryString, verification.id)}>
            Review
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SelectedBorrowerDetail({
  verification,
  backHref,
  selected,
}: {
  verification: ManagerBorrowerVerificationRow;
  backHref: string;
  selected: string;
}) {
  const hasNotes =
    verification.rejectionReason || verification.managerReviewNotes;
  const hasAction =
    verification.verificationStatus === "submitted" ||
    verification.verificationStatus === "under_review" ||
    verification.verificationStatus === "needs_resubmission" ||
    verification.verificationStatus === "pending_documents" ||
    verification.verificationStatus === "rejected";

  const mainContent = (
    <div className="min-w-0 space-y-6">
      <RequiredDocumentsSection
        verification={verification}
        selected={selected}
      />

      <Collapsible defaultOpen={true}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                Consents &amp; disclosures
              </h3>
            </div>
            <CollapsibleTrigger className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Show
              <ChevronDownIcon className="size-3 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <ConsentSection
              documentUpload={
                verification.documentUploadConsentStatus
              }
              loanApplication={
                verification.loanApplicationConsentStatus
              }
            />
          </CollapsibleContent>
        </div>
      </Collapsible>

      <EvidenceHistorySection documents={verification.documents} />

      {hasNotes ? (
        <ExistingNotesSection
          rejectionReason={verification.rejectionReason}
          managerReviewNotes={verification.managerReviewNotes}
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
              <PersonLabel person={verification.borrower} />
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Review ID: {getShortId(verification.id)}
            </p>
          </div>
          <StatusBadge status={verification.verificationStatus} />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          <MetaField
            label="Submitted"
            value={
              verification.submittedAt
                ? formatDateTime(verification.submittedAt)
                : "\u2014"
            }
          />
          <MetaField
            label="Created"
            value={formatDateTime(verification.createdAt)}
          />
          <MetaField
            label="Reviewed"
            value={
              verification.reviewedAt
                ? `${formatDateTime(verification.reviewedAt)} by ${
                    verification.reviewedBy?.displayName ?? "Manager"
                  }`
                : "Not reviewed"
            }
          />
          <MetaField
            label="Documents"
            value={`${verification.documents.length} uploaded`}
          />
        </dl>
      </CardHeader>

      <CardContent>
        {hasAction ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
            {mainContent}
            <div className="space-y-4 lg:sticky lg:top-16 lg:self-start lg:mt-7">
              <ManagerDecisionPanel
                verification={verification}
                selected={selected}
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

function ConsentSection({
  documentUpload,
  loanApplication,
}: {
  documentUpload: ConsentStatus;
  loanApplication: ConsentStatus;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <DisclosureCard title="Document upload" status={documentUpload} />
      <DisclosureCard title="Loan application" status={loanApplication} />
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

function RequiredDocumentsSection({
  verification,
  selected,
}: {
  verification: ManagerBorrowerVerificationRow;
  selected: string;
}) {
  const { documentPolicy, documents } = verification;

  const latestByType = new Map<string, ManagerBorrowerVerificationDocumentRow>();
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
            approving borrower verification.
          </AlertDescription>
        </Alert>
      ) : null}

      {hasAiMismatch ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>AI detected a possible document mismatch.</AlertTitle>
          <AlertDescription>
            One or more uploaded files may not match the required document type.
            Review the document manually or request resubmission.
          </AlertDescription>
        </Alert>
      ) : hasAiNeedsManualReview ? (
        <Alert>
          <AlertCircleIcon />
          <AlertTitle>Some documents need closer review.</AlertTitle>
          <AlertDescription>
            AI could not confidently determine that every uploaded document
            matches the requested type.
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

          const docLabel = borrowerVerificationDocumentTypeLabels[docType];
          const canReview = latest?.status === "submitted" && !isAccepted;

          return (
            <Card key={docType} size="sm">
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
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
                      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                        <FileTextIcon className="size-3 shrink-0" />
                        <span className="break-all">{latest.fileName}</span>
                        <span>{"\u00b7"}</span>
                        <span>{formatDateTime(latest.uploadedAt)}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Not uploaded
                      </p>
                    )}
                  </div>
                  {latest ? (
                    <DocumentActionsCell
                      documentId={latest.id}
                      documentLabel={docLabel}
                      fileName={latest.fileName}
                      fileSize={latest.fileSize}
                      fileType={latest.fileType}
                      viewUrl={latest.viewUrl}
                      canReview={canReview}
                      aiReviewStatus={latest.aiReview.aiReviewStatus}
                      selected={selected}
                    />
                  ) : null}
                </div>
                {latest ? (
                  <DocumentAiReviewNote review={latest.aiReview} />
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
  documents: ManagerBorrowerVerificationDocumentRow[];
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
              <EvidenceDocumentRow
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

function ManagerDecisionPanel({
  verification,
  selected,
}: {
  verification: ManagerBorrowerVerificationRow;
  selected: string;
}) {
  const allRequiredDocumentsAccepted =
    verification.documentPolicy.requiredDocumentTypes.every((docType) =>
      verification.documentPolicy.acceptedDocumentTypes.includes(docType),
    );

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Manager decision</CardTitle>
      </CardHeader>
      <CardContent>
        <VerificationDecisionForm
          borrowerId={verification.borrower.id}
          verificationId={verification.id}
          selected={selected}
          approvalBlocked={!allRequiredDocumentsAccepted}
          approvalBlockReason="Accept all required documents before approving this verification."
        />
      </CardContent>
    </Card>
  );
}
