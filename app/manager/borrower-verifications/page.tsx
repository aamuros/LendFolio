import Link from "next/link";
import {
  reviewBorrowerVerificationAction,
  reviewBorrowerVerificationDocumentAction,
} from "@/app/manager/actions";
import { getManagerAccess } from "../manager-access";
import { borrowerVerificationDocumentTypeLabels } from "@/lib/borrower-verification";
import { consentTypeLabels, type ConsentStatus } from "@/lib/consents";
import {
  getShortId,
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
  FileTextIcon,
  ShieldCheckIcon,
  ClipboardListIcon,
  HistoryIcon,
  MessageSquareTextIcon,
  ExternalLinkIcon,
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

  const result = await loadManagerBorrowerVerifications(access.supabase, {
    status: params.status,
    documentStatus: params.documentStatus,
    borrower: params.borrower,
  });

  const selectedVerification = params.selected
    ? result.verifications.find((v) => v.id === params.selected)
    : undefined;

  const submittedCount = result.verifications.filter(
    (v) => v.verificationStatus === "submitted",
  ).length;
  const underReviewCount = result.verifications.filter(
    (v) => v.verificationStatus === "under_review",
  ).length;
  const approvedCount = result.verifications.filter(
    (v) => v.verificationStatus === "approved",
  ).length;

  const filterParams = new URLSearchParams();
  if (params.status) filterParams.set("status", params.status);
  if (params.documentStatus)
    filterParams.set("documentStatus", params.documentStatus);
  if (params.borrower) filterParams.set("borrower", params.borrower);
  const filterQueryString = filterParams.toString();
  const backHref = filterQueryString ? `?${filterQueryString}` : "?";

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

        <ReviewStatus
          review={params.review}
          documentReview={params.documentReview}
        />

        {!result.ok ? (
          <StatusMessage message={result.message} tone="error" />
        ) : null}

        <BorrowerReviewFilters
          status={params.status}
          documentStatus={params.documentStatus}
          borrower={params.borrower}
        />

        {selectedVerification ? (
          <SelectedBorrowerDetail
            verification={selectedVerification}
            backHref={backHref}
          />
        ) : null}

        <section className="space-y-4">
          {result.verifications.length === 0 ? (
            <EmptyState
              title="No borrower verifications found"
              description="Borrower verification records and evidence will appear here."
            />
          ) : (
            <BorrowerQueueTable
              verifications={result.verifications}
              selectedId={params.selected}
              filterQueryString={filterQueryString}
            />
          )}
        </section>
      </div>
    </ManagerShell>
  );
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

function ReviewStatus({
  review,
  documentReview,
}: {
  review?: string;
  documentReview?: string;
}) {
  if (review === "approved") {
    return <StatusMessage message="Borrower verification approved." />;
  }

  if (review === "rejected") {
    return <StatusMessage message="Borrower verification rejected." />;
  }

  if (review === "pending") {
    return (
      <StatusMessage message="Borrower verification returned to pending." />
    );
  }

  if (review === "needs-resubmission") {
    return (
      <StatusMessage message="Borrower verification marked for resubmission." />
    );
  }

  if (review === "documents-required") {
    return (
      <StatusMessage
        message="Accept the required documents before approving verification."
        tone="error"
      />
    );
  }

  if (review === "error") {
    return (
      <StatusMessage
        message="Could not update borrower verification."
        tone="error"
      />
    );
  }

  if (documentReview === "accepted") {
    return <StatusMessage message="Verification document accepted." />;
  }

  if (documentReview === "rejected") {
    return <StatusMessage message="Verification document rejected." />;
  }

  if (documentReview === "error") {
    return (
      <StatusMessage
        message="Could not update verification document."
        tone="error"
      />
    );
  }

  return null;
}

function BorrowerQueueTable({
  verifications,
  selectedId,
  filterQueryString,
}: {
  verifications: ManagerBorrowerVerificationRow[];
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
                  isSelected={v.id === selectedId}
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
            isSelected={v.id === selectedId}
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
  isSelected,
  filterQueryString,
}: {
  verification: ManagerBorrowerVerificationRow;
  isSelected: boolean;
  filterQueryString: string;
}) {
  const { acceptedRequired, totalRequired } =
    getQueueDocumentProgress(verification);
  const consentsCurrent = getQueueConsentStatus(verification);

  return (
    <TableRow className={isSelected ? "bg-muted/50" : undefined}>
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
        <Button
          variant={isSelected ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link
            href={buildQueueHref(filterQueryString, verification.id)}
          >
            {isSelected ? "Selected" : "Review"}
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function BorrowerQueueMobileCard({
  verification,
  isSelected,
  filterQueryString,
}: {
  verification: ManagerBorrowerVerificationRow;
  isSelected: boolean;
  filterQueryString: string;
}) {
  const { acceptedRequired, totalRequired } =
    getQueueDocumentProgress(verification);
  const consentsCurrent = getQueueConsentStatus(verification);

  return (
    <Card size="sm" className={isSelected ? "border-primary" : undefined}>
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
          variant={isSelected ? "secondary" : "outline"}
          size="sm"
          className="w-full"
          asChild
        >
          <Link
            href={buildQueueHref(filterQueryString, verification.id)}
          >
            {isSelected ? "Selected" : "Review"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SelectedBorrowerDetail({
  verification,
  backHref,
}: {
  verification: ManagerBorrowerVerificationRow;
  backHref: string;
}) {
  const hasNotes =
    verification.rejectionReason || verification.managerReviewNotes;
  const isApproved = verification.verificationStatus === "approved";

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
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            <RequiredDocumentsSection verification={verification} />

            <Separator />

            <ReadinessSummaryCard verification={verification} />

            <Separator />

            <Collapsible defaultOpen={false}>
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

            <Separator />

            <EvidenceHistorySection documents={verification.documents} />

            {hasNotes ? (
              <>
                <Separator />
                <ExistingNotesSection
                  rejectionReason={verification.rejectionReason}
                  managerReviewNotes={verification.managerReviewNotes}
                />
              </>
            ) : null}
          </div>

          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            {isApproved ? (
              <ApprovedStatusCard verification={verification} />
            ) : (
              <ManagerDecisionPanel verification={verification} />
            )}
          </div>
        </div>
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
    <div className="rounded-lg border bg-muted/30 p-3">
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
}: {
  verification: ManagerBorrowerVerificationRow;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardListIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Required documents</h3>
        <span className="text-xs text-muted-foreground">
          {acceptedRequired}/{totalRequired} accepted
        </span>
      </div>

      <div className="hidden overflow-hidden rounded-lg border sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">File</th>
              <th className="px-3 py-2 text-left">Uploaded</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documentPolicy.requiredDocumentTypes.map((docType, i) => {
              const latest = latestByType.get(docType);
              const isAccepted =
                documentPolicy.acceptedDocumentTypes.includes(docType);
              const isSubmitted =
                documentPolicy.submittedDocumentTypes.includes(docType);
              const isRejected =
                documentPolicy.rejectedDocumentTypes.includes(docType);

              return (
                <tr
                  key={docType}
                  className={
                    i < documentPolicy.requiredDocumentTypes.length - 1
                      ? "border-b"
                      : ""
                  }
                >
                  <td className="px-3 py-2.5 font-medium">
                    {borrowerVerificationDocumentTypeLabels[docType]}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {latest ? (
                      <span className="flex items-center gap-1.5">
                        <FileTextIcon className="size-3.5 shrink-0" />
                        <span className="max-w-[200px] truncate">
                          {latest.fileName}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Not uploaded
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {latest ? formatDateTime(latest.uploadedAt) : "\u2014"}
                  </td>
                  <td className="px-3 py-2.5">
                    <DocumentStatusBadge
                      isAccepted={isAccepted}
                      isSubmitted={isSubmitted}
                      isRejected={isRejected}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DocumentActions
                      document={latest}
                      isAccepted={isAccepted}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        {documentPolicy.requiredDocumentTypes.map((docType) => {
          const latest = latestByType.get(docType);
          const isAccepted =
            documentPolicy.acceptedDocumentTypes.includes(docType);
          const isSubmitted =
            documentPolicy.submittedDocumentTypes.includes(docType);
          const isRejected =
            documentPolicy.rejectedDocumentTypes.includes(docType);

          return (
            <Card key={docType} size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {borrowerVerificationDocumentTypeLabels[docType]}
                  </span>
                  <DocumentStatusBadge
                    isAccepted={isAccepted}
                    isSubmitted={isSubmitted}
                    isRejected={isRejected}
                  />
                </div>
                {latest ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileTextIcon className="size-3 shrink-0" />
                    {latest.fileName}
                    {" \u00b7 "}
                    {formatDateTime(latest.uploadedAt)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Not uploaded
                  </p>
                )}
                <DocumentActions document={latest} isAccepted={isAccepted} />
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

function DocumentActions({
  document,
  isAccepted,
}: {
  document: ManagerBorrowerVerificationDocumentRow | undefined;
  isAccepted: boolean;
}) {
  if (!document) {
    return null;
  }

  const canReview = document.status === "submitted" && !isAccepted;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {document.viewUrl ? (
        <Button variant="outline" size="sm" asChild>
          <a href={document.viewUrl} target="_blank" rel="noreferrer">
            <ExternalLinkIcon className="size-3.5" />
            View
          </a>
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">
          File unavailable
        </span>
      )}

      {canReview ? (
        <form
          action={reviewBorrowerVerificationDocumentAction}
          className="flex items-center gap-1.5"
        >
          <input type="hidden" name="documentId" value={document.id} />
          <input type="hidden" name="reviewNotes" value="" />
          <Button type="submit" name="decision" value="accept" size="sm">
            Accept
          </Button>
          <Button
            type="submit"
            name="decision"
            value="reject"
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
          >
            Reject
          </Button>
        </form>
      ) : null}
    </div>
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
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
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
              <div
                key={doc.id}
                className="flex items-start gap-3 rounded-md border border-border/50 px-3 py-2 sm:items-center"
              >
                <FileTextIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground sm:mt-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {doc.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {
                      borrowerVerificationDocumentTypeLabels[
                        doc.documentType
                      ]
                    }
                    {" \u00b7 "}
                    {formatFileSize(doc.fileSize)}
                    {" \u00b7 "}
                    {formatDateTime(doc.uploadedAt)}
                  </p>
                  {doc.reviewNotes ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Note: {doc.reviewNotes}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={doc.status} />
                  {doc.viewUrl ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      asChild
                    >
                      <a
                        href={doc.viewUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="View document"
                      >
                        <ExternalLinkIcon className="size-3.5" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
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

function ReadinessSummaryCard({
  verification,
}: {
  verification: ManagerBorrowerVerificationRow;
}) {
  const { documentPolicy } = verification;
  const consentsCurrent =
    verification.documentUploadConsentStatus.isCurrent &&
    verification.loanApplicationConsentStatus.isCurrent;
  const acceptedRequired = documentPolicy.requiredDocumentTypes.filter((dt) =>
    documentPolicy.acceptedDocumentTypes.includes(dt),
  ).length;
  const totalRequired = documentPolicy.requiredDocumentTypes.length;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Review readiness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Consents</span>
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
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Documents</span>
          {documentPolicy.documentsAccepted ? (
            <Badge
              variant="default"
              className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle2Icon className="size-3" />
              {acceptedRequired}/{totalRequired}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <CircleDotIcon className="size-3" />
              {acceptedRequired}/{totalRequired}
            </Badge>
          )}
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge status={verification.verificationStatus} />
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovedStatusCard({
  verification,
}: {
  verification: ManagerBorrowerVerificationRow;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Review status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2Icon className="size-4 text-emerald-600" />
          <span className="text-sm font-medium">Borrower approved</span>
        </div>
        {verification.reviewedAt ? (
          <p className="text-xs text-muted-foreground">
            Reviewed {formatDateTime(verification.reviewedAt)}
            {verification.reviewedBy
              ? ` by ${verification.reviewedBy.displayName}`
              : ""}
          </p>
        ) : null}
        {verification.managerReviewNotes ? (
          <p className="text-xs text-muted-foreground">
            Note: {verification.managerReviewNotes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ManagerDecisionPanel({
  verification,
}: {
  verification: ManagerBorrowerVerificationRow;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Manager decision</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={reviewBorrowerVerificationAction} className="grid gap-3">
          <input
            type="hidden"
            name="borrowerId"
            value={verification.borrower.id}
          />
          <div className="grid gap-1.5">
            <Label
              htmlFor={`notes-${verification.id}`}
              className="text-xs font-medium"
            >
              Manager note
            </Label>
            <Textarea
              id={`notes-${verification.id}`}
              name="managerReviewNotes"
              rows={2}
              maxLength={1000}
              placeholder="Add a note for this review..."
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor={`reason-${verification.id}`}
              className="text-xs font-medium"
            >
              Rejection reason
            </Label>
            <Textarea
              id={`reason-${verification.id}`}
              name="rejectionReason"
              rows={2}
              maxLength={1000}
              placeholder="Provide a reason if rejecting..."
            />
          </div>
          <div className="grid gap-2">
            <Button
              type="submit"
              name="decision"
              value="approve"
              className="w-full"
            >
              <CheckCircle2Icon className="size-4" />
              Approve
            </Button>
            <Button
              type="submit"
              name="decision"
              value="reject"
              variant="destructive"
              className="w-full"
            >
              <XCircleIcon className="size-4" />
              Reject
            </Button>
            <Button
              type="submit"
              name="decision"
              value="needs_resubmission"
              variant="outline"
              className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              Needs resubmission
            </Button>
            <Button
              type="submit"
              name="decision"
              value="return_to_pending"
              variant="ghost"
              className="w-full"
            >
              Return to pending
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
