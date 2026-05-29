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
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
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
        <div className="mx-auto w-full max-w-5xl">
          <AccessDenied message={access.message} />
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

  return (
    <ManagerShell
      title="Borrower review"
      description="Review submitted borrower evidence before approving access."
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <ReviewStatus review={params.review} documentReview={params.documentReview} />
        <StatusMessage message={result.message} tone={result.ok ? "neutral" : "error"} />

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Borrower review
            </h1>
            <p className="text-sm text-muted-foreground">
              Review submitted borrower evidence before approving access.
            </p>
          </div>
          {result.verifications.length > 0 ? (
            <div className="flex items-center gap-2">
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
            </div>
          ) : null}
        </div>

        <BorrowerReviewFilters
          status={params.status}
          documentStatus={params.documentStatus}
          borrower={params.borrower}
        />

        <section className="grid gap-4">
          {result.verifications.length === 0 ? (
            <EmptyState
              title="No borrower verifications found"
              description="Borrower verification records and evidence will appear here."
            />
          ) : null}

          {result.verifications.map((verification) => (
            <BorrowerReviewCard
              key={verification.id}
              verification={verification}
            />
          ))}
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
  return (
    <Card>
      <CardContent>
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <TextFilter label="Borrower" name="borrower" defaultValue={borrower} />
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              asChild
            >
              <a href="?">Clear</a>
            </Button>
          </div>
        </form>
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
    return <StatusMessage message="Borrower verification returned to pending." />;
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
      <StatusMessage message="Could not update borrower verification." tone="error" />
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
      <StatusMessage message="Could not update verification document." tone="error" />
    );
  }

  return null;
}

function BorrowerReviewCard({
  verification,
}: {
  verification: ManagerBorrowerVerificationRow;
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <CardTitle className="text-base">
              <PersonLabel person={verification.borrower} />
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Review {getShortId(verification.id)}
            </p>
          </div>
          <StatusBadge status={verification.verificationStatus} />
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <MetaField label="Submitted" value={formatDateTime(verification.submittedAt)} />
          <MetaField label="Created" value={formatDateTime(verification.createdAt)} />
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
            value={verification.documents.length.toString()}
          />
        </dl>
      </CardHeader>

      <CardContent className="grid gap-5">
        <DisclosureSection
          documentUpload={verification.documentUploadConsentStatus}
          loanApplication={verification.loanApplicationConsentStatus}
        />

        <Separator />

        <RequiredDocumentsChecklist
          documentPolicy={verification.documentPolicy}
        />

        <Separator />

        <EvidenceHistorySection documents={verification.documents} />

        {(verification.rejectionReason || verification.managerReviewNotes) && (
          <>
            <Separator />
            <ExistingNotesSection
              rejectionReason={verification.rejectionReason}
              managerReviewNotes={verification.managerReviewNotes}
            />
          </>
        )}

        <Separator />

        <ManagerDecisionPanel verification={verification} />
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

function DisclosureSection({
  documentUpload,
  loanApplication,
}: {
  documentUpload: ConsentStatus;
  loanApplication: ConsentStatus;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Consent &amp; disclosures</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <DisclosureCard title="Document upload" status={documentUpload} />
        <DisclosureCard title="Loan application" status={loanApplication} />
      </div>
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

function RequiredDocumentsChecklist({
  documentPolicy,
}: {
  documentPolicy: ManagerBorrowerVerificationRow["documentPolicy"];
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <ClipboardListIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Required documents</h3>
      </div>
      <div className="rounded-lg border">
        {documentPolicy.requiredDocumentTypes.map((documentType, index) => {
          const isAccepted =
            documentPolicy.acceptedDocumentTypes.includes(documentType);
          const isSubmitted =
            documentPolicy.submittedDocumentTypes.includes(documentType);
          const isRejected =
            documentPolicy.rejectedDocumentTypes.includes(documentType);

          return (
            <div
              key={documentType}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${
                index < documentPolicy.requiredDocumentTypes.length - 1
                  ? "border-b"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {isAccepted ? (
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                ) : isRejected ? (
                  <XCircleIcon className="size-4 text-destructive" />
                ) : isSubmitted ? (
                  <CircleDotIcon className="size-4 text-amber-600" />
                ) : (
                  <CircleIcon className="size-4 text-muted-foreground" />
                )}
                <span>
                  {borrowerVerificationDocumentTypeLabels[documentType]}
                </span>
              </div>
              <DocumentStatusBadge
                isAccepted={isAccepted}
                isSubmitted={isSubmitted}
                isRejected={isRejected}
              />
            </div>
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
        className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
      >
        Accepted
      </Badge>
    );
  }

  if (isRejected) {
    return <Badge variant="destructive">Rejected</Badge>;
  }

  if (isSubmitted) {
    return (
      <Badge
        variant="secondary"
        className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
      >
        Submitted
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      Missing
    </Badge>
  );
}

function EvidenceHistorySection({
  documents,
}: {
  documents: ManagerBorrowerVerificationDocumentRow[];
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <HistoryIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Evidence history</h3>
      </div>
      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No documents uploaded.
        </div>
      ) : (
        <div className="hidden gap-2 sm:grid">
          {documents.map((document) => (
            <EvidenceDocumentRow key={document.id} document={document} />
          ))}
        </div>
      )}
      {documents.length > 0 ? (
        <div className="grid gap-2 sm:hidden">
          {documents.map((document) => (
            <EvidenceDocumentCard key={document.id} document={document} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EvidenceDocumentRow({
  document,
}: {
  document: ManagerBorrowerVerificationDocumentRow;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{document.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {borrowerVerificationDocumentTypeLabels[document.documentType]}
          {" \u00b7 "}
          {formatFileSize(document.fileSize)}
          {" \u00b7 "}
          {formatDateTime(document.uploadedAt)}
        </p>
      </div>
      <StatusBadge status={document.status} />
      <div className="flex shrink-0 items-center gap-1.5">
        {document.viewUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={document.viewUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon className="size-3.5" />
              View
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ExternalLinkIcon className="size-3.5" />
            Unavailable
          </Button>
        )}
        <form
          action={reviewBorrowerVerificationDocumentAction}
          className="flex items-center gap-1.5"
        >
          <input type="hidden" name="documentId" value={document.id} />
          <input type="hidden" name="reviewNotes" value="" />
          <Button
            type="submit"
            name="decision"
            value="accept"
            size="sm"
          >
            Accept
          </Button>
          <Button
            type="submit"
            name="decision"
            value="reject"
            variant="destructive"
            size="sm"
          >
            Reject
          </Button>
        </form>
      </div>
    </div>
  );
}

function EvidenceDocumentCard({
  document,
}: {
  document: ManagerBorrowerVerificationDocumentRow;
}) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{document.fileName}</p>
          </div>
          <StatusBadge status={document.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {borrowerVerificationDocumentTypeLabels[document.documentType]}
          {" \u00b7 "}
          {formatFileSize(document.fileSize)}
          {" \u00b7 "}
          {formatDateTime(document.uploadedAt)}
        </p>
        {document.reviewNotes ? (
          <p className="text-xs text-muted-foreground">{document.reviewNotes}</p>
        ) : null}
        <div className="flex items-center gap-1.5">
          {document.viewUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={document.viewUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon className="size-3.5" />
                View
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ExternalLinkIcon className="size-3.5" />
              Unavailable
            </Button>
          )}
          <form
            action={reviewBorrowerVerificationDocumentAction}
            className="flex items-center gap-1.5"
          >
            <input type="hidden" name="documentId" value={document.id} />
            <input type="hidden" name="reviewNotes" value="" />
            <Button
              type="submit"
              name="decision"
              value="accept"
              size="sm"
            >
              Accept
            </Button>
            <Button
              type="submit"
              name="decision"
              value="reject"
              variant="destructive"
              size="sm"
            >
              Reject
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
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
    <div className="grid gap-3">
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
}: {
  verification: ManagerBorrowerVerificationRow;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <FileTextIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Manager decision</h3>
      </div>
      <form action={reviewBorrowerVerificationAction} className="grid gap-4">
        <input type="hidden" name="borrowerId" value={verification.borrower.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`notes-${verification.id}`} className="text-xs font-medium">
              Manager note
            </Label>
            <Textarea
              id={`notes-${verification.id}`}
              name="managerReviewNotes"
              rows={3}
              maxLength={1000}
              placeholder="Add a note for this review..."
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`reason-${verification.id}`} className="text-xs font-medium">
              Rejection reason
            </Label>
            <Textarea
              id={`reason-${verification.id}`}
              name="rejectionReason"
              rows={3}
              maxLength={1000}
              placeholder="Provide a reason if rejecting..."
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="decision" value="approve">
            <CheckCircle2Icon className="size-4" />
            Approve
          </Button>
          <Button
            type="submit"
            name="decision"
            value="reject"
            variant="destructive"
          >
            <XCircleIcon className="size-4" />
            Reject
          </Button>
          <Button
            type="submit"
            name="decision"
            value="needs_resubmission"
            variant="outline"
            className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
          >
            Needs resubmission
          </Button>
          <Button
            type="submit"
            name="decision"
            value="return_to_pending"
            variant="ghost"
          >
            Return to pending
          </Button>
        </div>
      </form>
    </div>
  );
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
